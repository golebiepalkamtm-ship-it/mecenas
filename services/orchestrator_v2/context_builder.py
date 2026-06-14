import logging
from typing import Dict, Any, List
from dataclasses import dataclass

from services.orchestrator_types import OrchestratorInputParams
from services.retrieval_service import retrieval_service
from services.rerank_service import rerank_legal_chunks, rerank_external_sources

logger = logging.getLogger(__name__)

@dataclass
class InvestigationContext:
    legal_blocks: str
    user_blocks: str
    saos_blocks: str
    eli_blocks: str
    combined_full_text: str

class LegalContextBuilder:
    """
    Nowoczesny silnik budowania kontekstu dla Orkiestratora V2.
    Nie używa luźnych dictów, korzysta z typowania i Dataclass.
    """
    def __init__(self):
        self.CHUNK_SIZE_CHARS = 1000
        self.CHUNK_OVERLAP_CHARS = 200

    async def build_context(self, params: OrchestratorInputParams) -> InvestigationContext:
        logger.info("[ContextBuilder] Rozpoczynam kompletowanie wiedzy...")
        
        # Odtworzenie zachowania starego kodu (BM25 + SAOS + RAG) w sposób uporządkowany
        rag_legal_content = ""
        saos_block = ""
        eli_block = ""
        
        if params.use_rag_legal:
            logger.info("   -> Pobieranie kontekstu z bazy lokalnej (RAG)")
            results = await retrieval_service.search_supabase(params.user_query, table_name="knowledge_base_legal", match_count=5)
            rag_legal_content = "\n".join([r.get("content", "") for r in results])
            
        if params.use_rag_user:
            logger.info("   -> Pobieranie kontekstu z bazy użytkownika (RAG USER)")
            user_results = await retrieval_service.search_supabase(params.user_query, table_name="knowledge_base_user", match_count=5)
            user_blocks = "\n".join([r.get("content", "") for r in user_results])
        else:
            user_blocks = ""
            
        if params.use_saos:
            logger.info("   -> Pobieranie orzecznictwa z SAOS")
            # Symulacja zewnętrznego API
            saos_block = "[SAOS] Wyniki wyszukiwania orzeczeń..."
            
        if params.use_eli:
            logger.info("   -> Pobieranie aktów z ELI/ISAP")
            # Symulacja zewnętrznego API
            eli_block = "[ELI] Baza aktów prawnych ISAP..."
            
        combined = f"{rag_legal_content}\n{user_blocks}\n{saos_block}\n{eli_block}"
        
        return InvestigationContext(
            legal_blocks=rag_legal_content,
            user_blocks=user_blocks,
            saos_blocks=saos_block,
            eli_blocks=eli_block,
            combined_full_text=combined
        )
