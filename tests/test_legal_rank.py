from services.legal_rank import classify_legal_rank, legal_rank_boost
from services.rerank_service import heuristic_rerank


def test_classify_constitution():
    rank, label = classify_legal_rank(title="Konstytucja Rzeczypospolitej Polskiej", source_type="ELI")
    assert rank == 100
    assert label == "Konstytucja"


def test_classify_saos_case_law():
    rank, label = classify_legal_rank(source_type="SAOS", title="Wyrok NSA")
    assert label == "Orzecznictwo"
    assert rank == 45


def test_rank_boost_prefers_norms_by_default():
    row_statute = {
        "content": "Art. 2 Konstytucji ...",
        "metadata": {"filename": "Konstytucja.txt"},
        "similarity": 0.1,
    }
    row_case = {
        "content": "Wyrok NSA ...",
        "source_type": "SAOS",
        "similarity": 0.1,
    }
    q = "Proszę o analizę art. 2 Konstytucji RP"
    assert legal_rank_boost(row_statute, q) > legal_rank_boost(row_case, q)


def test_heuristic_rerank_prefers_case_law_when_query_is_case_law():
    rows = [
        {"content": "Treść A", "source_type": "SAOS", "similarity": 0.1},
        {"content": "Treść B", "metadata": {"filename": "Kodeks postępowania administracyjnego"}, "similarity": 0.1},
    ]
    ranked = heuristic_rerank(rows, "Jakie jest orzecznictwo NSA w podobnych sprawach?", top_k=2)
    assert ranked[0].get("source_type") == "SAOS"

