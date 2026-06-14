"""Inteligentna alokacja budżetu znaków kontekstu (zamiast ślepego head/tail truncate)."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from services.legal_rank import annotate_with_legal_rank


def _trim(text: str, max_len: int) -> str:
    t = (text or "").strip()
    if len(t) <= max_len:
        return t
    return t[: max_len - 40] + "\n[… skrócono …]\n"


def pack_combined_context(
    *,
    max_chars: int,
    doc_header: str = "",
    doc_excerpt: str = "",
    chunk_note: str = "",
    user_rag: str = "",
    legal_rag: str = "",
    saos_block: str = "",
    eli_block: str = "",
    procedural_block: str = "",
    timeline_block: str = "",
    hypothesis_block: str = "",
    deadline_block: str = "",
    doc_fraction: float = 0.32,
    preserve_full_doc: bool = False,
) -> str:
    """
    Priorytet alokacji: dokument > user RAG > legal RAG > procedural > timeline >
    SAOS > ELI > hipotezy > terminy.
    """
    doc_share = max(0.35, min(0.85, float(doc_fraction)))
    remainder = 1.0 - doc_share
    budgets = {
        "doc": int(max_chars * doc_share),
        "user": int(max_chars * remainder * 0.20),
        "legal": int(max_chars * remainder * 0.26),
        "proc": int(max_chars * remainder * 0.14),
        "time": int(max_chars * remainder * 0.08),
        "saos": int(max_chars * remainder * 0.14),
        "eli": int(max_chars * remainder * 0.12),
        "hyp": int(max_chars * remainder * 0.03),
        "dead": int(max_chars * remainder * 0.03),
    }

    parts: List[str] = []
    if doc_header or doc_excerpt or chunk_note:
        doc_body = f"{doc_header}{doc_excerpt}{chunk_note}"
        if preserve_full_doc and len(doc_body.strip()) <= budgets["doc"]:
            parts.append(doc_body)
        else:
            parts.append(_trim(doc_body, budgets["doc"]))
    if user_rag.strip():
        parts.append(
            _trim(
                f"\n[AKTA KLIENTA — RAG]\n{user_rag}\n",
                budgets["user"],
            )
        )
    if legal_rag.strip():
        parts.append(
            _trim(
                f"\n[PRZEPISY I ORZECZNICTWO BAZY PRAWNEJ]:\n{legal_rag}\n",
                budgets["legal"],
            )
        )
    if procedural_block.strip():
        parts.append(_trim(f"\n{procedural_block}\n", budgets["proc"]))
    if timeline_block.strip():
        parts.append(_trim(f"\n{timeline_block}\n", budgets["time"]))
    if saos_block.strip():
        parts.append(
            _trim(
                f"\n[ORZECZNICTWO SAOS]:\n{saos_block}\n",
                budgets["saos"],
            )
        )
    if eli_block.strip():
        parts.append(
            _trim(
                f"\n[AKTY PRAWNE ELI/ISAP]:\n{eli_block}\n",
                budgets["eli"],
            )
        )
    if hypothesis_block.strip():
        parts.append(
            _trim(
                f"\n[HIPOTEZY I DOWODY ZE ŚLEDZTWA]\n{hypothesis_block}\n",
                budgets["hyp"],
            )
        )
    if deadline_block.strip():
        parts.append(_trim(f"\n{deadline_block}\n", budgets["dead"]))

    combined = "".join(parts)
    if len(combined) <= max_chars:
        return combined
    return _trim(combined, max_chars)


def normalize_external_result(
    row: Dict[str, Any],
    source_type: str,
) -> Dict[str, Any]:
    """Ujednolica SAOS/ELI do formatu rerankera."""
    content = row.get("content") or ""
    source = (
        row.get("source")
        or row.get("sygnatura")
        or row.get("tytul")
        or row.get("title")
        or source_type
    )
    score = row.get("similarity") or row.get("score") or row.get("rrf_score") or 0.0
    out = dict(row)
    out["content"] = content
    out["source"] = str(source)
    out["source_type"] = source_type
    out.setdefault("similarity", score)
    return out


def format_external_blocks(
    rows: List[Dict[str, Any]],
    *,
    prefix: str,
) -> str:
    if not rows:
        return ""
    prepared: List[Dict[str, Any]] = []
    for r in rows:
        if isinstance(r, dict):
            prepared.append(annotate_with_legal_rank(r, default_source_type=prefix))
    if not prepared:
        return ""
    return "\n\n".join(
        (
            f"Źródło: {r.get('source', prefix)}"
            + (f" | Ranga: {r.get('legal_rank_label')}" if r.get("legal_rank_label") else "")
            + f"\n{r.get('content', '')}"
        )
        for r in prepared
    )


def format_kb_blocks(
    rows: List[Dict[str, Any]],
    *,
    prefix: str = "KB",
    max_content_chars: int = 3200,
) -> str:
    if not rows:
        return ""
    prepared: List[Dict[str, Any]] = []
    for r in rows:
        if isinstance(r, dict):
            prepared.append(annotate_with_legal_rank(r, default_source_type=prefix))
    if not prepared:
        return ""

    def _score_key(item: Dict[str, Any]):
        try:
            rs = float(item.get("rerank_score") or 0.0)
        except Exception:
            rs = 0.0
        try:
            sim = float(item.get("similarity") or item.get("score") or item.get("rrf_score") or 0.0)
        except Exception:
            sim = 0.0
        try:
            lr = int(item.get("legal_rank") or 0)
        except Exception:
            lr = 0
        return (-lr, -rs, -sim)

    ordered = sorted(prepared, key=_score_key)
    out_parts: List[str] = []
    for r in ordered:
        metadata = r.get("metadata") if isinstance(r.get("metadata"), dict) else {}
        filename = metadata.get("filename") if isinstance(metadata, dict) else None
        source = r.get("source") or filename or prefix
        header = f"Źródło: {source}"
        if r.get("legal_rank_label"):
            header += f" | Ranga: {r.get('legal_rank_label')}"
        content = (r.get("content") or "").strip()
        if max_content_chars and len(content) > max_content_chars:
            content = content[: max_content_chars - 40] + "\n[… skrócono …]\n"
        out_parts.append(f"{header}\n{content}")
    return "\n\n".join(out_parts)
