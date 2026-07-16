from __future__ import annotations

from services.retrieval_service import retrieval_service


class LegalRetrievalUseCase:
    async def search_legal(self, *, query: str, match_count: int = 5):
        return await retrieval_service.search_supabase(
            query=query,
            table_name="knowledge_base_legal",
            match_count=match_count,
            hybrid=True,
        )


legal_retrieval_use_case = LegalRetrievalUseCase()
