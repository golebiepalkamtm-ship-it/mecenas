"""Testy jednostkowe: Legal Basis Validator (sidecar) + enriched ExpertArgument schema."""
import pytest
from schemas.moa_contracts import ExpertArgument, ExpertAnalysis
from services.legal_basis_validator import (
    ValidArticlesCache,
    ValidationResult,
    _normalize_basis,
    extract_article_keys_from_text,
    validate_single_basis,
    validate_expert_arguments,
    build_regeneration_prompt,
)


# --- Schema Tests ---


class TestExpertArgumentSchema:
    """Testy rozszerzonego schematu ExpertArgument."""

    def test_new_fields_have_defaults(self):
        """Nowe pola (rag_chunk_ids, countered_by, validated) mają defaults — backward compat."""
        arg = ExpertArgument(
            id="ARG_001",
            legal_basis=["art. 77 §1 O.p."],
            argument_short="Nadpłata podatku wymaga zwrotu",
            criticality="HIGH",
        )
        assert arg.rag_chunk_ids == []
        assert arg.countered_by == []
        assert arg.validated is False

    def test_full_schema(self):
        """Pełny schemat z wszystkimi polami."""
        arg = ExpertArgument(
            id="ARG_002",
            legal_basis=["art. 77 §1 O.p.", "art. 72 KPA"],
            rag_chunk_ids=["chunk_abc123", "chunk_def456"],
            argument_short="Dwuinstancyjność postępowania",
            countered_by=["ARG_003"],
            criticality="CRITICAL",
            validated=True,
        )
        assert len(arg.legal_basis) == 2
        assert arg.rag_chunk_ids == ["chunk_abc123", "chunk_def456"]
        assert arg.countered_by == ["ARG_003"]
        assert arg.validated is True

    def test_legal_basis_is_list(self):
        """legal_basis musi być listą (zmiana z string na List[str])."""
        arg = ExpertArgument(
            id="ARG_003",
            legal_basis=["art. 415 KC"],
            argument_short="Odpowiedzialność deliktowa",
            criticality="MEDIUM",
        )
        assert isinstance(arg.legal_basis, list)

    def test_expert_analysis_with_enriched_arguments(self):
        """ExpertAnalysis z wzbogaconymi argumentami."""
        analysis = ExpertAnalysis(
            role="obrona",
            key_arguments=[
                ExpertArgument(
                    id="ARG_001",
                    legal_basis=["art. 77 §1 O.p."],
                    rag_chunk_ids=["chunk_001"],
                    argument_short="Nadpłata",
                    criticality="HIGH",
                    validated=True,
                ),
                ExpertArgument(
                    id="ARG_002",
                    legal_basis=["art. 72 §1 KPA"],
                    argument_short="Umorzenie",
                    criticality="MEDIUM",
                    countered_by=["ARG_001"],
                ),
            ],
            synthesis_advice="Złożyć wniosek o zwrot nadpłaty",
        )
        assert len(analysis.key_arguments) == 2
        assert analysis.key_arguments[0].validated is True
        assert analysis.key_arguments[1].validated is False

    def test_json_roundtrip(self):
        """Schema serializuje się i deserializuje poprawnie."""
        arg = ExpertArgument(
            id="ARG_001",
            legal_basis=["art. 77 §1 O.p."],
            rag_chunk_ids=["chunk_abc"],
            argument_short="Test roundtrip",
            countered_by=["ARG_002"],
            criticality="HIGH",
            validated=True,
        )
        json_str = arg.model_dump_json()
        restored = ExpertArgument.model_validate_json(json_str)
        assert restored.id == arg.id
        assert restored.legal_basis == arg.legal_basis
        assert restored.rag_chunk_ids == arg.rag_chunk_ids
        assert restored.validated is True


# --- Normalization Tests ---


class TestNormalization:
    def test_basic_article(self):
        assert _normalize_basis("art. 415 KC") == "art. 415"

    def test_with_paragraph(self):
        assert _normalize_basis("art. 77 § 1 O.p.") == "art. 77 §1"

    def test_artykul_form(self):
        assert _normalize_basis("artykuł 58") == "art. 58"

    def test_case_insensitive(self):
        assert _normalize_basis("Art. 77 § 1") == "art. 77 §1"

    def test_extra_whitespace(self):
        assert _normalize_basis("  art.   77   §  1  ") == "art. 77 §1"


# --- Extraction Tests ---


class TestArticleExtraction:
    def test_extract_from_legal_text(self):
        text = "Na podstawie art. 77 § 1 ordynacji podatkowej oraz art. 72 KPA"
        keys = extract_article_keys_from_text(text)
        assert "art. 77 §1" in keys
        assert "art. 77" in keys  # bez paragrafu też
        assert "art. 72" in keys

    def test_extract_artykul_form(self):
        text = "Zgodnie z artykuł 58 kodeksu cywilnego"
        keys = extract_article_keys_from_text(text)
        assert "art. 58" in keys

    def test_empty_text(self):
        assert extract_article_keys_from_text("") == set()

    def test_no_articles(self):
        keys = extract_article_keys_from_text("To jest zwykły tekst bez artykułów.")
        assert len(keys) == 0


# --- Cache Tests ---


class TestValidArticlesCache:
    def _make_cache(self):
        results = [
            {"content": "Na podstawie art. 77 § 1 ordynacji podatkowej, organ podatkowy..."},
            {"content": "art. 72 KPA stanowi, że postępowanie umarza się..."},
            {"content": "W myśl art. 415 kodeksu cywilnego, kto z winy swej..."},
            {"content": "Artykuł 58 k.c. mówi o nieważności czynności prawnej..."},
        ]
        return ValidArticlesCache.build_from_rag_results(legal_results=results)

    def test_build_from_results(self):
        cache = self._make_cache()
        assert cache.size > 0

    def test_contains_valid_article(self):
        cache = self._make_cache()
        assert cache.contains("art. 77 § 1 O.p.") is True

    def test_contains_without_paragraph(self):
        cache = self._make_cache()
        assert cache.contains("art. 77") is True

    def test_rejects_nonexistent_article(self):
        cache = self._make_cache()
        assert cache.contains("art. 9999") is False

    def test_suggest_nearest(self):
        cache = self._make_cache()
        suggestions = cache.suggest_nearest("art. 78", top_k=3)
        assert len(suggestions) > 0
        # art. 77 powinien być blisko art. 78
        assert any("77" in s for s in suggestions)

    def test_empty_cache(self):
        cache = ValidArticlesCache.build_from_rag_results()
        assert cache.size == 0
        assert cache.contains("art. 77") is False


# --- Validation Tests ---


class TestValidation:
    def _make_cache(self):
        results = [
            {"content": "art. 77 § 1 ordynacji podatkowej"},
            {"content": "art. 415 kodeksu cywilnego"},
        ]
        return ValidArticlesCache.build_from_rag_results(legal_results=results)

    def test_valid_basis(self):
        cache = self._make_cache()
        result = validate_single_basis("art. 77 § 1 O.p.", cache)
        assert result.is_valid is True
        assert result.nearest_suggestions == []

    def test_invalid_basis(self):
        cache = self._make_cache()
        result = validate_single_basis("art. 9999 KPA", cache)
        assert result.is_valid is False
        assert len(result.nearest_suggestions) > 0

    def test_validate_expert_all_valid(self):
        cache = self._make_cache()
        analysis = {
            "role": "obrona",
            "key_arguments": [
                {
                    "id": "ARG_001",
                    "legal_basis": ["art. 77 §1 O.p."],
                    "argument_short": "Nadpłata",
                    "criticality": "HIGH",
                }
            ],
            "synthesis_advice": "Wniosek o zwrot",
        }
        result = validate_expert_arguments(analysis, cache)
        assert result.all_valid is True
        assert result.validated_count == 1
        assert result.rejected_count == 0
        # argument powinien mieć validated=True
        assert analysis["key_arguments"][0]["validated"] is True

    def test_validate_expert_with_hallucination(self):
        cache = self._make_cache()
        analysis = {
            "role": "obrona",
            "key_arguments": [
                {
                    "id": "ARG_001",
                    "legal_basis": ["art. 77 §1 O.p."],
                    "argument_short": "Nadpłata",
                    "criticality": "HIGH",
                },
                {
                    "id": "ARG_002",
                    "legal_basis": ["art. 9999 KPA"],
                    "argument_short": "Hallucynacja",
                    "criticality": "MEDIUM",
                },
            ],
            "synthesis_advice": "Test",
        }
        result = validate_expert_arguments(analysis, cache)
        assert result.all_valid is False
        assert result.validated_count == 1
        assert result.rejected_count == 1
        assert "ARG_002" in result.rejected_argument_ids
        assert analysis["key_arguments"][0]["validated"] is True
        assert analysis["key_arguments"][1]["validated"] is False

    def test_backward_compat_string_basis(self):
        """Stara schema z legal_basis jako string → konwertowane na listę."""
        cache = self._make_cache()
        analysis = {
            "role": "obrona",
            "key_arguments": [
                {
                    "id": "ARG_001",
                    "legal_basis": "art. 415 KC",  # string, nie lista!
                    "argument_short": "Delikt",
                    "criticality": "HIGH",
                }
            ],
            "synthesis_advice": "Test compat",
        }
        result = validate_expert_arguments(analysis, cache)
        assert result.all_valid is True
        # legal_basis powinno być skonwertowane na listę
        assert isinstance(analysis["key_arguments"][0]["legal_basis"], list)


# --- Regeneration Prompt Tests ---


class TestRegenerationPrompt:
    def test_builds_prompt_with_suggestions(self):
        rejected = [
            ValidationResult(
                basis="art. 9999 KPA",
                normalized="art. 9999",
                is_valid=False,
                nearest_suggestions=["art. 77 §1", "art. 72"],
            )
        ]
        original_arg = {
            "id": "ARG_002",
            "argument_short": "Hallucynacja testowa",
        }
        prompt = build_regeneration_prompt(
            rejected, original_arg, ["art. 77 §1", "art. 72", "art. 415"]
        )
        assert "art. 9999 KPA" in prompt
        assert "art. 77" in prompt
        assert "ZREGENERUJ" in prompt
