"""Audit Trail — immutable per-session event log z hash-chain SHA-256.

Zgodność: AI Act art. 12 (automatyczne rejestrowanie zdarzeń).
Rozszerza istniejący observability.py o persystentny, tamper-evident log.

Każdy wpis zawiera:
    - hash poprzedniego wpisu (chain-of-custody)
    - timestamp
    - typ zdarzenia (HARDGATE_CHECK, CITATION_VERIFIED, SIDECAR_REJECT,
      EXPORT_GATE, SYNTHESIS_BLOCKED, RETRIEVAL_RESULT, ...)
    - session_id
    - payload (zależny od typu)

Format: JSON Lines (audit_logs/<session_id>.jsonl)

Weryfikacja integralności:
    verify_hash_chain("audit_logs/abc-123.jsonl") → True/False
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Katalog logów — obok main app directory
AUDIT_LOG_DIR = Path("audit_logs")

# Seed hash dla pierwszego wpisu w łańcuchu
_GENESIS_HASH = "0" * 64


def _compute_hash(prev_hash: str, event_json: str) -> str:
    """SHA-256(prev_hash + event_json) — deterministyczny chain link."""
    return hashlib.sha256(f"{prev_hash}{event_json}".encode("utf-8")).hexdigest()


def _get_log_path(session_id: str) -> Path:
    """Ścieżka do pliku logu dla danej sesji."""
    safe_id = "".join(c for c in session_id if c.isalnum() or c in "-_")
    return AUDIT_LOG_DIR / f"{safe_id}.jsonl"


def _read_last_hash(log_path: Path) -> str:
    """Odczytuje hash ostatniego wpisu lub genesis hash."""
    if not log_path.exists():
        return _GENESIS_HASH
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            last_line = ""
            for line in f:
                line = line.strip()
                if line:
                    last_line = line
            if last_line:
                entry = json.loads(last_line)
                return entry.get("hash", _GENESIS_HASH)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("[AUDIT_TRAIL] Błąd odczytu logu %s: %s", log_path, e)
    return _GENESIS_HASH


def append_audit_event(
    session_id: str,
    event_type: str,
    payload: Dict[str, Any],
    *,
    log_dir: Optional[Path] = None,
) -> str:
    """Dopisuje zdarzenie z hash-chain do logu sesji.

    Args:
        session_id: ID sesji (np. z frontendu).
        event_type: Typ zdarzenia, np.:
            - PIPELINE_START
            - RETRIEVAL_RESULT (RAG/ELI/SAOS)
            - HARDGATE_CHECK
            - SIDECAR_VALIDATION
            - CITATION_AUDIT
            - SYNTHESIS_COMPLETE
            - EXPORT_GATE
            - PIPELINE_COMPLETE
        payload: Dane zdarzenia (zależne od typu).
        log_dir: Opcjonalny katalog logów (domyślnie AUDIT_LOG_DIR).

    Returns:
        Hash nowo dodanego wpisu.
    """
    if not session_id:
        logger.debug("[AUDIT_TRAIL] Brak session_id — pomijam audit event.")
        return _GENESIS_HASH

    target_dir = log_dir or AUDIT_LOG_DIR
    target_dir.mkdir(parents=True, exist_ok=True)

    log_path = target_dir / f"{''.join(c for c in session_id if c.isalnum() or c in '-_')}.jsonl"

    prev_hash = _read_last_hash(log_path)

    # Buduj event BEZ hasha (hash obliczany z tego stringa)
    event_body = {
        "ts": time.time(),
        "iso": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "event": event_type,
        "session_id": session_id,
        "payload": payload,
    }
    event_json = json.dumps(event_body, ensure_ascii=False, sort_keys=True)
    new_hash = _compute_hash(prev_hash, event_json)

    # Pełny wpis z hashem
    full_entry = {**event_body, "hash": new_hash, "prev_hash": prev_hash}

    try:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(full_entry, ensure_ascii=False) + "\n")
    except OSError as e:
        logger.error("[AUDIT_TRAIL] Zapis do %s: %s", log_path, e)
        return _GENESIS_HASH

    logger.debug(
        "[AUDIT_TRAIL] %s → %s (hash: %s…)",
        session_id[:12],
        event_type,
        new_hash[:16],
    )
    return new_hash


def verify_hash_chain(
    log_path: str | Path,
) -> Dict[str, Any]:
    """Weryfikuje integralność łańcucha skrótów w pliku logu.

    Returns:
        {
            "valid": True/False,
            "entries": int,
            "first_broken_at": int | None,  # numer linii (0-indexed)
            "error": str | None,
        }
    """
    path = Path(log_path)
    if not path.exists():
        return {"valid": False, "entries": 0, "first_broken_at": None, "error": "file_not_found"}

    entries: List[Dict[str, Any]] = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    entries.append(json.loads(line))
    except (json.JSONDecodeError, OSError) as e:
        return {"valid": False, "entries": 0, "first_broken_at": None, "error": str(e)}

    if not entries:
        return {"valid": True, "entries": 0, "first_broken_at": None, "error": None}

    prev_hash = _GENESIS_HASH

    for idx, entry in enumerate(entries):
        stored_hash = entry.get("hash", "")
        stored_prev = entry.get("prev_hash", "")

        # Sprawdź ciągłość łańcucha
        if stored_prev != prev_hash:
            return {
                "valid": False,
                "entries": len(entries),
                "first_broken_at": idx,
                "error": f"prev_hash mismatch at entry {idx}",
            }

        # Odtwórz event_body (bez hash i prev_hash) i przelicz
        event_body = {k: v for k, v in entry.items() if k not in ("hash", "prev_hash")}
        event_json = json.dumps(event_body, ensure_ascii=False, sort_keys=True)
        expected_hash = _compute_hash(prev_hash, event_json)

        if stored_hash != expected_hash:
            return {
                "valid": False,
                "entries": len(entries),
                "first_broken_at": idx,
                "error": f"hash mismatch at entry {idx}",
            }

        prev_hash = stored_hash

    return {"valid": True, "entries": len(entries), "first_broken_at": None, "error": None}


def get_session_audit_log(session_id: str, *, log_dir: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Odczytuje pełny log sesji."""
    target_dir = log_dir or AUDIT_LOG_DIR
    safe_id = "".join(c for c in session_id if c.isalnum() or c in "-_")
    log_path = target_dir / f"{safe_id}.jsonl"

    if not log_path.exists():
        return []

    entries = []
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    entries.append(json.loads(line))
    except (json.JSONDecodeError, OSError) as e:
        logger.error("[AUDIT_TRAIL] Odczyt %s: %s", log_path, e)
    return entries
