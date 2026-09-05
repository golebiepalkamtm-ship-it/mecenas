"""Testy Export Gate i Audit Trail — integracja z infrastrukturą LexMind."""
import json
import tempfile
from pathlib import Path

import pytest

from services.export_validation import ExportValidationResult, validate_export
from services.audit_trail import (
    AUDIT_LOG_DIR,
    append_audit_event,
    get_session_audit_log,
    verify_hash_chain,
)


# ==============================================================================
# Export Gate
# ==============================================================================

class TestExportValidation:
    """Testy bramki eksportowej (deterministyczna walidacja cytowań)."""

    PISMO_CZYSTE = (
        "Szanowny Panie Sędzio,\n\n"
        "Na podstawie art. 77 § 1 ordynacji podatkowej wnoszę o stwierdzenie "
        "nadpłaty w podatku dochodowym.\n\n"
        "Zgodnie z art. 72 § 1 Op. nadpłatą jest kwota…"
    )

    PISMO_Z_HALUCYNACJA = (
        "Na podstawie art. 9999 KPK wnoszę o umorzenie postępowania.\n"
        "Jednocześnie powołuję się na art. 77 § 1 KPA.\n"
    )

    KORPUS = (
        "art. 77 § 1 ordynacja podatkowa treść przepisu o stwierdzeniu nadpłaty "
        "art. 72 § 1 ordynacja podatkowa definicja nadpłaty "
        "art. 77 § 1 kpa treść przepisu o dowodach "
    )

    def test_off_mode_always_passes(self):
        result = validate_export(self.PISMO_Z_HALUCYNACJA, mode="off")
        assert result.passed is True
        assert result.action == "allow"
        assert result.total_citations == 0

    def test_empty_document(self):
        result = validate_export("", mode="strict")
        assert result.passed is True
        assert result.total_citations == 0

    def test_no_citations_passes(self):
        result = validate_export(
            "Szanowny Panie, wnoszę o rozpatrzenie sprawy.",
            mode="strict",
        )
        assert result.passed is True
        assert result.total_citations == 0

    def test_verified_citations_pass(self):
        result = validate_export(
            self.PISMO_CZYSTE,
            verification_corpus=self.KORPUS,
            mode="strict",
        )
        assert result.passed is True
        assert result.verified_count >= 1
        assert result.action == "allow"

    def test_unverified_citation_warn(self):
        result = validate_export(
            self.PISMO_Z_HALUCYNACJA,
            verification_corpus="",  # pusty korpus → nic nie zweryfikuje
            mode="warn",
        )
        assert result.passed is True  # warn nie blokuje
        assert result.action == "warn"
        assert result.unverified_count > 0
        assert len(result.unverified_citations) > 0

    def test_unverified_citation_strict_blocks(self):
        result = validate_export(
            self.PISMO_Z_HALUCYNACJA,
            verification_corpus="",
            mode="strict",
        )
        assert result.passed is False
        assert result.action == "block"

    def test_partial_verification(self):
        """Art. 77 § 1 KPA jest w korpusie, art. 9999 KPK nie."""
        result = validate_export(
            self.PISMO_Z_HALUCYNACJA,
            verification_corpus=self.KORPUS,
            mode="warn",
        )
        assert result.verified_count >= 1
        assert result.unverified_count >= 1

    def test_to_dict(self):
        result = validate_export(self.PISMO_CZYSTE, mode="off")
        d = result.to_dict()
        assert isinstance(d, dict)
        assert "passed" in d
        assert "action" in d


# ==============================================================================
# Audit Trail
# ==============================================================================

class TestAuditTrail:
    """Testy immutable audit trail z hash-chain SHA-256."""

    def test_append_and_read(self, tmp_path: Path):
        session_id = "test-session-001"
        append_audit_event(
            session_id,
            "PIPELINE_START",
            {"query_length": 42},
            log_dir=tmp_path,
        )
        append_audit_event(
            session_id,
            "CITATION_AUDIT",
            {"verified": 5, "unverified": 1},
            log_dir=tmp_path,
        )

        log = get_session_audit_log(session_id, log_dir=tmp_path)
        assert len(log) == 2
        assert log[0]["event"] == "PIPELINE_START"
        assert log[1]["event"] == "CITATION_AUDIT"
        assert log[1]["payload"]["verified"] == 5

    def test_hash_chain_integrity(self, tmp_path: Path):
        session_id = "test-integrity"
        for i in range(5):
            append_audit_event(
                session_id,
                f"EVENT_{i}",
                {"index": i},
                log_dir=tmp_path,
            )

        log_path = tmp_path / f"{session_id}.jsonl"
        result = verify_hash_chain(log_path)
        assert result["valid"] is True
        assert result["entries"] == 5
        assert result["first_broken_at"] is None

    def test_tampered_log_detected(self, tmp_path: Path):
        session_id = "test-tamper"
        for i in range(3):
            append_audit_event(
                session_id,
                f"EVENT_{i}",
                {"index": i},
                log_dir=tmp_path,
            )

        # Tamper: zmień payload w środkowym wpisie
        log_path = tmp_path / f"{session_id}.jsonl"
        lines = log_path.read_text(encoding="utf-8").strip().split("\n")
        entry = json.loads(lines[1])
        entry["payload"]["index"] = 999  # tamper!
        lines[1] = json.dumps(entry, ensure_ascii=False)
        log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

        result = verify_hash_chain(log_path)
        assert result["valid"] is False
        assert result["first_broken_at"] == 1

    def test_chain_continuity(self, tmp_path: Path):
        session_id = "test-chain"
        h1 = append_audit_event(session_id, "A", {"x": 1}, log_dir=tmp_path)
        h2 = append_audit_event(session_id, "B", {"x": 2}, log_dir=tmp_path)
        assert h1 != h2  # różne hashe

        log = get_session_audit_log(session_id, log_dir=tmp_path)
        assert log[1]["prev_hash"] == log[0]["hash"]

    def test_empty_session_id_skips(self, tmp_path: Path):
        h = append_audit_event("", "TEST", {"x": 1}, log_dir=tmp_path)
        assert h == "0" * 64  # genesis hash = skipped

    def test_nonexistent_log_verification(self, tmp_path: Path):
        result = verify_hash_chain(tmp_path / "nonexistent.jsonl")
        assert result["valid"] is False
        assert result["error"] == "file_not_found"

    def test_empty_log_valid(self, tmp_path: Path):
        log_path = tmp_path / "empty.jsonl"
        log_path.touch()
        result = verify_hash_chain(log_path)
        assert result["valid"] is True
        assert result["entries"] == 0
