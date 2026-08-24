import pytest
from services.nalegalu_bridge import (
    parse_legal_citation,
    format_act_as_nalegalu_markdown,
    MAJOR_POLISH_CODES,
)
from services.mcp_tool_bridge import nalegalu_article_lookup

def test_parse_polish_legal_citations():
    """Weryfikacja precyzyjnego parsowania polskich sygnatur ustaw i kodeksów."""
    c1 = parse_legal_citation("art. 118 § 1 k.c.")
    assert c1 is not None
    assert c1.act_code == "kc"
    assert c1.article == "118"
    assert c1.paragraph == "1"
    assert "Kodeks cywilny" in c1.act_name

    c2 = parse_legal_citation("art. 145 ust. 1 pkt 1 ppsa")
    assert c2 is not None
    assert c2.act_code == "ppsa"
    assert c2.article == "145"
    assert c2.paragraph == "1"
    assert c2.point == "1"
    assert "sądami administracyjnymi" in c2.act_name

    c3 = parse_legal_citation("art. 7 kpa")
    assert c3 is not None
    assert c3.act_code == "kpa"
    assert c3.article == "7"

def test_format_act_as_nalegalu_markdown():
    """Weryfikacja formatowania struktury aktu do NaLegalu Markdown."""
    md = format_act_as_nalegalu_markdown(
        title="Kodeks cywilny",
        eli="DU/1964/93",
        provisions=[
            {"article": "1", "content": "Kodeks niniejszy reguluje stosunki cywilnoprawne..."},
            {"article": "2", "content": "Wykładnia oświadczeń woli..."}
        ]
    )
    assert "# Kodeks cywilny" in md
    assert "## Artykuł 1" in md
    assert "NaLegalu Markdown" in md

@pytest.mark.asyncio
async def test_nalegalu_article_lookup_structure():
    """Weryfikacja narzędzia MCP nalegalu_article_lookup."""
    res = await nalegalu_article_lookup(citation="art. 118 kc", fetch_judgments=False)
    assert res["status"] == "ok"
    assert res["act_code"] == "kc"
    assert res["article"] == "118"
    assert "Kodeks cywilny — Art. 118" in res["markdown_header"]
