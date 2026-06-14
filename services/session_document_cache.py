"""Pamięć dokumentów w sesji czatu — wiele plików, dysk + RAM (przetrwa reload serwera)."""
from __future__ import annotations

import json
import re
import threading
import time
from pathlib import Path
from typing import Dict, Optional

_lock = threading.Lock()
_files: dict[str, dict[str, str]] = {}
_sheet_store: dict[str, tuple[dict, float]] = {}
_DEFAULT_TTL_SEC = 86_400
_DISK_DIR = Path("local_storage") / "session_documents"


def _safe_session_id(session_id: str) -> str:
    return re.sub(r"[^\w\-]", "_", session_id)[:120]


def _manifest_path(session_id: str) -> Path:
    return _DISK_DIR / f"{_safe_session_id(session_id)}.json"


def _load_disk_manifest(session_id: str) -> dict[str, str]:
    path = _manifest_path(session_id)
    try:
        if path.is_file():
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return {str(k): str(v) for k, v in data.items() if v}
    except (OSError, json.JSONDecodeError, TypeError):
        pass
    return {}


def _save_disk_manifest(session_id: str, files: dict[str, str]) -> None:
    try:
        _DISK_DIR.mkdir(parents=True, exist_ok=True)
        _manifest_path(session_id).write_text(
            json.dumps(files, ensure_ascii=False),
            encoding="utf-8",
        )
    except OSError:
        pass


def _get_session_files(session_id: str) -> dict[str, str]:
    with _lock:
        mem = dict(_files.get(session_id) or {})
    disk = _load_disk_manifest(session_id)
    merged = {**disk, **mem}
    return merged


def append_session_document(
    session_id: str,
    text: str,
    *,
    file_label: str = "dokument",
    ttl_sec: int = _DEFAULT_TTL_SEC,
) -> None:
    cleaned = (text or "").strip()
    if not session_id or not cleaned:
        return
    label = (file_label or "dokument").strip()[:200]
    with _lock:
        bucket = _files.setdefault(session_id, {})
        bucket[label] = cleaned
    all_files = _get_session_files(session_id)
    _save_disk_manifest(session_id, all_files)
    _ = ttl_sec
    try:
        from config import settings
        from services.document_fact_sheet import build_fact_sheet

        if settings.feature_compact_fact_sheet:
            combined = join_session_documents(session_id)
            if combined:
                set_session_fact_sheet(session_id, build_fact_sheet(combined))
    except Exception:
        pass


def join_session_documents(session_id: Optional[str]) -> str:
    if not session_id:
        return ""
    files = _get_session_files(session_id)
    if not files:
        return ""
    parts = [f"--- PLIK: {name} ---\n{body}" for name, body in files.items()]
    return "\n\n".join(parts).strip()


def set_session_fact_sheet(session_id: str, sheet: dict, *, ttl_sec: int = _DEFAULT_TTL_SEC) -> None:
    if not session_id or not sheet:
        return
    with _lock:
        _sheet_store[session_id] = (sheet, time.time())
    _ = ttl_sec


def get_session_fact_sheet(session_id: str, *, ttl_sec: int = _DEFAULT_TTL_SEC) -> Optional[dict]:
    if not session_id:
        return None
    with _lock:
        entry = _sheet_store.get(session_id)
    if not entry:
        return None
    sheet, ts = entry
    if time.time() - ts > ttl_sec:
        with _lock:
            _sheet_store.pop(session_id, None)
        return None
    return sheet


def _ingest_incoming_corpus(session_id: str, incoming: str, *, default_label: str) -> None:
    """Rozbija korpus z frontendu (--- PLIK: nazwa ---) na osobne wpisy w sesji."""
    text = (incoming or "").strip()
    if not text:
        return
    if "--- PLIK:" not in text:
        append_session_document(session_id, text, file_label=default_label)
        return
    normalized = text if text.startswith("--- PLIK:") else f"--- PLIK: {default_label} ---\n{text}"
    for block in re.split(r"(?=--- PLIK:\s*)", normalized):
        block = block.strip()
        if not block.startswith("--- PLIK:"):
            continue
        first_line, _, rest = block.partition("\n")
        name = first_line.replace("--- PLIK:", "").replace("---", "").strip() or default_label
        body = rest.strip()
        if body:
            append_session_document(session_id, body, file_label=name)


def merge_session_document(
    session_id: Optional[str],
    incoming: Optional[str],
    *,
    file_label: str = "dokument",
) -> str:
    """
    Nowy tekst dopisuje pliki w sesji (wiele plików, bez kasowania poprzednich).
    Puste żądanie — zwraca sklejone wszystkie pliki z tej sesji (RAM + dysk).
    """
    inc = (incoming or "").strip()
    if inc and session_id:
        _ingest_incoming_corpus(session_id, inc, default_label=file_label)
    if session_id:
        joined = join_session_documents(session_id)
        if joined:
            return joined
    return inc


def clear_session_documents(session_id: str) -> None:
    with _lock:
        _files.pop(session_id, None)
        _sheet_store.pop(session_id, None)
    try:
        _manifest_path(session_id).unlink(missing_ok=True)
    except OSError:
        pass
