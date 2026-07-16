from __future__ import annotations

from typing import Any, TypedDict


class RetrievalItem(TypedDict, total=False):
    id: str
    content: str
    source: str
    title: str
    tytul: str
    metadata: dict[str, Any]
    similarity: float
    score: float
    rrf_score: float
    source_type: str
    sygnatura: str
    full_text: str
    legal_rank: int
    legal_rank_label: str
    rerank_score: float
    rerank_method: str


def _as_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return ""
    return str(value)


def _as_float(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def get_retrieval_title(row: dict[str, Any]) -> str:
    return _as_str(row.get("title") or row.get("tytul"))


def get_retrieval_score(row: dict[str, Any]) -> float:
    for key in ("rerank_score", "score", "similarity", "rrf_score"):
        val = _as_float(row.get(key))
        if val is not None:
            return val
    return 0.0


def get_retrieval_source(row: dict[str, Any]) -> str:
    source = _as_str(row.get("source"))
    if source:
        return source
    metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
    if isinstance(metadata, dict):
        source = _as_str(metadata.get("filename") or metadata.get("source"))
        if source:
            return source
    title = get_retrieval_title(row)
    if title:
        return title
    return _as_str(row.get("source_type"))


def infer_retrieval_source_type(row: dict[str, Any]) -> str:
    source_type = _as_str(row.get("source_type"))
    if source_type:
        return source_type

    metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
    if isinstance(metadata, dict):
        metadata_source_type = _as_str(metadata.get("source_type"))
        if metadata_source_type:
            return metadata_source_type
        category = _as_str(metadata.get("category")).lower()
        if category == "rag_legal":
            return "statute"
        if category == "rag_user":
            return "user_doc"

    source = get_retrieval_source(row).upper()
    if source.startswith("SAOS"):
        return "SAOS"
    if source.startswith("ELI"):
        return "ELI"
    if row.get("sygnatura") or row.get("full_text"):
        return "SAOS"
    return ""


def normalize_retrieval_row(row: dict[str, Any]) -> RetrievalItem:
    out: dict[str, Any] = dict(row)

    content = out.get("content")
    out["content"] = _as_str(content)

    metadata = out.get("metadata")
    out["metadata"] = dict(metadata) if isinstance(metadata, dict) else {}

    title = out.get("title")
    tytul = out.get("tytul")
    if title and not tytul:
        out["tytul"] = _as_str(title)
    elif tytul and not title:
        out["title"] = _as_str(tytul)
    elif title and tytul:
        out["title"] = _as_str(title)
        out["tytul"] = _as_str(tytul)

    source = get_retrieval_source(out)
    if source:
        out["source"] = source

    source_type = infer_retrieval_source_type(out)
    if source_type:
        out["source_type"] = source_type

    if "score" in out or "similarity" in out or "rrf_score" in out:
        score = get_retrieval_score(out)
        out["score"] = score
        out["similarity"] = score

    return out  # type: ignore[return-value]


def normalize_retrieval_rows(rows: list[dict[str, Any]]) -> list[RetrievalItem]:
    return [normalize_retrieval_row(r) for r in rows if isinstance(r, dict)]
