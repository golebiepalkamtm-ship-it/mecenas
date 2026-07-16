"""Etap 6 — równoległe pobieranie Supabase (legal / user) / SAOS / ELI."""
from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional, Tuple

from services.pipeline.runtime_helpers import act_terms_for_table
from services.retrieval.types import RetrievalItem
from services.retrieval_service import retrieval_service


async def parallel_rag_gather(
    *,
    keywords: str,
    query_for_retrieval: str,
    use_rag_legal: bool,
    use_rag_user: bool = False,
    use_saos: bool,
    use_eli: bool,
    act_terms: Optional[list],
    allowed_source_types: Optional[list[str]] = None,
    rag_match_count: int = 5,
    user_match_count: int = 5,
    saos_limit: int = 5,
    eli_limit: int = 5,
) -> Tuple[List[RetrievalItem], List[RetrievalItem], List[RetrievalItem], List[RetrievalItem]]:
    legal_act_terms = act_terms_for_table("knowledge_base_legal", act_terms)

    async def _legal() -> List[RetrievalItem]:
        if use_rag_legal:
            return await retrieval_service.search_supabase(
                keywords,
                table_name="knowledge_base_legal",
                act_terms=legal_act_terms,
                match_count=rag_match_count,
                allowed_source_types=allowed_source_types,
            )
        return []

    async def _user() -> List[RetrievalItem]:
        if use_rag_user:
            return await retrieval_service.search_supabase(
                keywords,
                table_name="knowledge_base_user",
                act_terms=None,
                match_count=user_match_count,
            )
        return []

    async def _saos() -> List[RetrievalItem]:
        if use_saos:
            return await retrieval_service.search_saos(
                keywords, limit=saos_limit, user_query=query_for_retrieval
            )
        return []

    async def _eli() -> List[RetrievalItem]:
        if use_eli:
            return await retrieval_service.search_eli(
                keywords, limit=eli_limit, user_query=query_for_retrieval
            )
        return []

    legal_res, user_res, saos_results, eli_results = await asyncio.gather(
        _legal(), _user(), _saos(), _eli()
    )
    return legal_res, user_res, saos_results, eli_results
