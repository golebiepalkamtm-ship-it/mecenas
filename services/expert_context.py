from __future__ import annotations

from config import settings
from services.document_chunking import document_overview
from services.llm_service import chunk_document


def expert_context_with_chunk(
    *,
    base_context: str,
    full_document: str,
    expert_index: int,
    chunk_focus: str,
    chunk_size_chars: int | None = None,
    chunk_overlap_chars: int | None = None,
    document_context_chars: int | None = None,
) -> str:
    chunk_size = int(chunk_size_chars or settings.chunk_size_chars)
    overlap = int(chunk_overlap_chars or settings.chunk_overlap_chars)
    doc_cap = int(document_context_chars or settings.document_context_chars)

    chunks = chunk_document(
        full_document,
        chunk_size=chunk_size,
        overlap=overlap,
        max_chunks=settings.chunk_max_count,
    )
    if not chunks:
        return base_context
    if len(chunks) == 1 or len(full_document) <= doc_cap:
        if len(full_document) <= doc_cap and (full_document or "").strip():
            return (
                f"{base_context}\n\n"
                f"[PEŁNY TEKST AKT / PISMA — źródło faktów]\n{full_document}\n"
            )
        return base_context

    assigned = chunks[min(expert_index, len(chunks) - 1)]
    overview = document_overview(full_document)
    return (
        f"{base_context}\n\n"
        f"[DOKUMENT — fragment {assigned['index']}/{assigned['total']} | {chunk_focus}]\n"
        f"[UWAGA: Masz fragment {assigned['index']} z {assigned['total']}. "
        f"Nie zakładaj faktów z fragmentów, których nie widzisz. "
        f"Jeśli potrzebujesz informacji spoza swojego fragmentu — napisz 'BRAK DANYCH'.]\n"
        f"{assigned['text']}\n\n"
        f"[SKRÓT CAŁEGO PISMA — kontekst globalny]\n{overview[:3500]}"
    )
