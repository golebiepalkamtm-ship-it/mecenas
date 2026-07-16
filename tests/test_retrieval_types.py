from services.retrieval.types import (
    get_retrieval_score,
    get_retrieval_source,
    infer_retrieval_source_type,
    normalize_retrieval_row,
)


def test_normalize_retrieval_row_fills_title_and_tytul() -> None:
    out = normalize_retrieval_row({"content": "x", "tytul": "T"})
    assert out["title"] == "T"
    assert out["tytul"] == "T"

    out2 = normalize_retrieval_row({"content": "x", "title": "T2"})
    assert out2["title"] == "T2"
    assert out2["tytul"] == "T2"


def test_normalize_retrieval_row_fills_source_from_metadata() -> None:
    out = normalize_retrieval_row({"content": "x", "metadata": {"filename": "plik.pdf"}})
    assert out["source"] == "plik.pdf"


def test_normalize_retrieval_row_coerces_content_to_str() -> None:
    out = normalize_retrieval_row({"content": 123})
    assert out["content"] == "123"


def test_normalize_retrieval_row_normalizes_score_fields() -> None:
    out = normalize_retrieval_row({"content": "x", "rrf_score": 0.87})
    assert out["score"] == 0.87
    assert out["similarity"] == 0.87
    assert get_retrieval_score(out) == 0.87


def test_infer_retrieval_source_type_prefers_metadata_and_known_prefixes() -> None:
    out = normalize_retrieval_row(
        {"content": "x", "metadata": {"source_type": "user_doc", "filename": "a.pdf"}}
    )
    assert out["source_type"] == "user_doc"

    saos = normalize_retrieval_row({"content": "x", "source": "SAOS — II SA/Wa 1/24"})
    assert infer_retrieval_source_type(saos) == "SAOS"


def test_get_retrieval_source_prefers_existing_source_then_metadata_then_title() -> None:
    assert get_retrieval_source({"source": "ELI — Dz.U."}) == "ELI — Dz.U."
    assert get_retrieval_source({"metadata": {"filename": "plik.pdf"}}) == "plik.pdf"
    assert get_retrieval_source({"title": "Kodeks postępowania administracyjnego"}) == (
        "Kodeks postępowania administracyjnego"
    )
