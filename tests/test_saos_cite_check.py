import pytest
from services.mcp_tool_bridge import saos_cite_check, _STRONG_OVERRULE_PATTERNS, _CAUTION_OVERRULE_PATTERNS

def test_overrule_patterns_match_polish_phrases():
    """Weryfikacja czy regexy poprawnie identyfikują zwroty odstąpienia od linii orzeczniczej."""
    sample_reasoning_1 = "Sąd Apelacyjny odstępuje od poglądu wyrażonego w wyroku z dnia 12 maja..."
    assert any(pat.search(sample_reasoning_1) for pat, _ in _STRONG_OVERRULE_PATTERNS)

    sample_reasoning_2 = "Sąd w obecnym składzie nie podziela poglądu zaprezentowanego w orzeczeniu..."
    assert any(pat.search(sample_reasoning_2) for pat, _ in _STRONG_OVERRULE_PATTERNS)

    sample_reasoning_3 = "Należy wskazać, że pogląd ten utracił aktualność w świetle nowelizacji..."
    assert any(pat.search(sample_reasoning_3) for pat, _ in _STRONG_OVERRULE_PATTERNS)

    sample_caution = "Zagadnienie to rozstrzygnęła uchwała składu siedmiu sędziów Sądu Najwyższego..."
    assert any(pat.search(sample_caution) for pat, _ in _CAUTION_OVERRULE_PATTERNS)

@pytest.mark.asyncio
async def test_saos_cite_check_empty_case():
    res = await saos_cite_check(case_number="")
    assert res.get("status") == "error"
