from services.legal_rank import (
    allowed_source_types_for_query,
    annotate_with_legal_rank,
    classify_legal_rank,
)


def test_source_type_is_ssot_for_rank():
    rank, label = classify_legal_rank(source_type="constitution", title="cokolwiek")
    assert rank == 100
    assert label == "Konstytucja"


def test_annotate_uses_source_type():
    row = {"content": "X", "source_type": "regulation", "metadata": {"filename": "foo.pdf"}}
    out = annotate_with_legal_rank(row)
    assert out["legal_rank_label"] == "Rozporządzenie"
    assert out["legal_rank"] == 65


def test_allowed_source_types_for_query_constitution_only():
    assert allowed_source_types_for_query("Proszę o wykładnię Konstytucji RP") == [
        "constitution",
        "statute",
    ]


def test_allowed_source_types_for_query_no_filter_when_mentions_statute():
    assert allowed_source_types_for_query("Konstytucja a ustawa o VAT") is None

