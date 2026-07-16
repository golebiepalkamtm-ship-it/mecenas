from __future__ import annotations

from config import settings
from services.rerank_service import rerank_external_sources, rerank_mixed_kb_chunks
from services.retrieval.types import RetrievalItem


async def rerank_kb_mixed(
    legal_res: list[RetrievalItem],
    user_res: list[RetrievalItem],
    query: str,
) -> tuple[list[RetrievalItem], list[RetrievalItem]]:
    return await rerank_mixed_kb_chunks(
        legal_res,
        user_res,
        query,
        provider=settings.rerank_provider,
        legal_top_k=settings.rerank_top_k,
        user_top_k=settings.rag_user_top_k,
    )


async def rerank_saos_eli(
    saos_results: list[RetrievalItem],
    eli_results: list[RetrievalItem],
    query: str,
) -> tuple[list[RetrievalItem], list[RetrievalItem]]:
    return await rerank_external_sources(
        saos_results,
        eli_results,
        query,
        provider=settings.rerank_provider,
        top_k=settings.external_rerank_top_k,
    )
