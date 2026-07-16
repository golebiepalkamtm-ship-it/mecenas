import asyncio
import logging
from typing import Any, List, Tuple, Optional
from dataclasses import dataclass

from services.orchestrator_types import OrchestratorInputParams
from services.orchestrator_v2.history_formatter import format_chat_history
from services.orchestrator_v2.routing import resolve_skip_debate
from services.retrieval_service import retrieval_service
from services.rerank_service import rerank_legal_chunks, rerank_external_sources
from services.pii_mask import mask_pii
from services.orchestrator_v2.briefing_engine import BriefingEngine
from services.pipeline.attachments import extract_all_attachments_text
from services.pipeline.fast_path import is_fast_statutory_query, fast_path_keywords
from services.query_planner import QueryPlan, plan_query, apply_plan_to_retrieval_counts
from services.legal_basis_validator import ValidArticlesCache
from config import settings

logger = logging.getLogger(__name__)

@dataclass
class InvestigationContext:
    legal_blocks: str
    user_blocks: str
    saos_blocks: str
    eli_blocks: str
    chat_history: str
    document_text: str
    combined_full_text: str
    raw_legal_results: List[Any]
    raw_saos_results: List[Any]
    raw_eli_results: List[Any]
    query_plan: Optional[QueryPlan] = None
    case_brief: Optional[Any] = None
    valid_articles_cache: Optional[ValidArticlesCache] = None
    skip_debate: bool = False
    route_reason: str = ""
    use_fast_path: bool = False

class LegalContextBuilder:
    """
    Nowoczesny silnik budowania kontekstu dla Orkiestratora V2.
    W pełni uwzględnia historię czatu oraz załączone dokumenty.
    Zoptymalizowany asynchronicznie pod kątem wysokiej wydajności.
    """
    def __init__(self):
        self.CHUNK_SIZE_CHARS = 1000
        self.CHUNK_OVERLAP_CHARS = 200
        self.briefing_engine = BriefingEngine()

    async def build_context(self, params: OrchestratorInputParams, llm_service: Any) -> InvestigationContext:
        logger.info("[ContextBuilder] Rozpoczynam kompletowanie wiedzy...")
        
        # 1. Przetworzenie historii czatu i załączników
        doc_text, history_str, masked_doc, masked_history = await self._process_attachments_and_history(params, llm_service)

        # Wyszukiwanie w Semantic Cache
        query_emb = []
        cached_payload = None
        try:
            from services.indexing_service import indexing_service
            from services.semantic_cache import get_semantic_cache
            query_emb = await indexing_service.get_embedding(params.user_query)
            cached_payload = get_semantic_cache(query_emb, threshold=0.96)
        except Exception as cache_err:
            logger.warning(f"[ContextBuilder] Błąd sprawdzania semantic cache: {cache_err}")

        # 1b. Semantic routing — fast path / QueryPlanner
        use_fast_path = bool(
            settings.feature_fast_statutory_path
            and is_fast_statutory_query(
                params.user_query,
                document_text=doc_text,
                attachments=params.attachments,
            )
        )
        query_plan: Optional[QueryPlan] = None
        retrieval_map: dict = {}
        cached_brief_dict = None

        if cached_payload:
            logger.info("[ContextBuilder] Odczytano dane z semantic cache!")
            try:
                if "query_plan" in cached_payload and cached_payload["query_plan"]:
                    query_plan = QueryPlan(**cached_payload["query_plan"])
                    retrieval_map = apply_plan_to_retrieval_counts(
                        query_plan,
                        use_fast_path=False,
                        base_use_saos=params.use_saos,
                        base_use_eli=params.use_eli,
                    )
                if "case_brief" in cached_payload and cached_payload["case_brief"]:
                    cached_brief_dict = cached_payload["case_brief"]
            except Exception as parse_err:
                logger.warning(f"[ContextBuilder] Błąd parsowania danych z cache: {parse_err}")

        if not query_plan:
            if use_fast_path:
                logger.info("[ContextBuilder] Szybka ścieżka statutory — pomijam QueryPlanner LLM")
            elif settings.feature_query_planner:
                try:
                    async def _planner_llm(model_id, messages, max_tokens=220, temperature=0.1, timeout=20.0, **_):
                        return await llm_service.call_with_fallback(
                            model_id,
                            messages,
                            max_tokens=max_tokens,
                            temperature=temperature,
                            timeout=timeout,
                            log_context="QueryPlanner",
                        )

                    fallback_kw = fast_path_keywords(params.user_query) or params.user_query[:120]
                    from database import get_setting
                    planner_model = get_setting("assigned_model_query_planner", "google/gemini-2.5-flash-lite")
                    query_plan = await plan_query(
                        call_llm=_planner_llm,
                        model_id=params.selected_model or planner_model,
                        user_query=params.user_query,
                        document_excerpt=doc_text[:1200],
                        history_snippet=masked_history[:800],
                        fallback_keywords=fallback_kw,
                    )
                    retrieval_map = apply_plan_to_retrieval_counts(
                        query_plan,
                        use_fast_path=False,
                        base_use_saos=params.use_saos,
                        base_use_eli=params.use_eli,
                    )
                    logger.info(
                        "[ContextBuilder] QueryPlanner: intent=%s complexity=%s",
                        query_plan.intent,
                        query_plan.estimated_complexity,
                    )
                except Exception as e:
                    logger.warning("[ContextBuilder] QueryPlanner failed: %s", e)

        skip_debate, route_reason = resolve_skip_debate(
            params, query_plan=query_plan, use_fast_path=use_fast_path
        )
        if skip_debate:
            logger.info("[ContextBuilder] Routing: skip_debate=True (%s)", route_reason)
        
        # 2. Przygotowanie zapytania z historią dla systemów wektorowych
        query_for_rag = params.user_query
        if masked_history:
             history_part = masked_history[:2000]
             if len(masked_history) > 2000:
                 history_part += "\n... [Zbyt długa historia, przycięto]"
             query_for_rag = f"{params.user_query}\n\n[Kontekst wcześniejszej rozmowy]\n{history_part}"
        
        # 3. Pobranie wiedzy własnej użytkownika (RAG User)
        user_blocks = await self._gather_user_knowledge(params, query_for_rag)
                
        # 4. Wygenerowanie Karty Sprawy (Case Brief) za pomocą silnika dedukcyjnego
        raw_materials = doc_text + "\n" + user_blocks
        if cached_brief_dict:
            from services.orchestrator_v2.briefing_engine import CaseBrief
            case_brief = CaseBrief(**cached_brief_dict)
            logger.info("[ContextBuilder] Wykorzystano Kartę Sprawy z semantic cache.")
        else:
            case_brief = await self.briefing_engine.generate_brief(params, llm_service, raw_materials)
            # Jeśli nie było trafienia w cache, zapisujemy nowo wygenerowany plan i brief
            if query_emb and not cached_payload:
                try:
                    from services.semantic_cache import set_semantic_cache
                    cache_data = {
                        "query_plan": query_plan.model_dump() if query_plan and hasattr(query_plan, "model_dump") else (query_plan.dict() if query_plan else None),
                        "case_brief": case_brief.model_dump() if case_brief and hasattr(case_brief, "model_dump") else (case_brief.dict() if case_brief else None)
                    }
                    set_semantic_cache(params.user_query, query_emb, cache_data)
                except Exception as save_err:
                    logger.warning(f"[ContextBuilder] Błąd zapisu do semantic cache: {save_err}")
        
        # Ekstrakcja kluczowych zagadnień prawnych
        if case_brief and getattr(case_brief, 'wykryte_przepisy_prawne', None):
            saos_eli_keywords = ", ".join(case_brief.wykryte_przepisy_prawne[:8])
        else:
            import re
            matches = re.findall(r'(?i)(?:art\.|artyku[łl]|§)\s*\d+[a-z]*', params.user_query)
            saos_eli_keywords = ", ".join(matches[:8]) if matches else ""
            
        logger.info(f"   -> Wyekstrahowane słowa kluczowe SAOS/ELI z Karty Sprawy: {saos_eli_keywords}")
        
        # 5. Równoległe pobieranie szerokiej wiedzy prawniczej (Legal RAG, SAOS, ELI)
        res_legal, res_saos, res_eli = await self._gather_legal_intelligence(
            params, case_brief, query_for_rag, saos_eli_keywords,
            retrieval_map=retrieval_map,
            use_fast_path=use_fast_path,
        )
        
        # 5b. Budowanie ValidArticlesCache z wyników RAG (V3.0 feature)
        valid_articles_cache = None
        if settings.feature_legal_basis_sidecar:
            valid_articles_cache = ValidArticlesCache.build_from_rag_results(
                legal_results=res_legal,
                user_results=[{"content": user_blocks}] if user_blocks else None,
                saos_results=res_saos,
                eli_results=res_eli,
                document_text=masked_doc,
            )
        
        # 6. Kompilacja i formatowanie ostatecznego kontekstu badawczego
        return self._compile_investigation_context(
            case_brief=case_brief,
            masked_doc=masked_doc,
            masked_history=masked_history,
            user_blocks=user_blocks,
            res_legal=res_legal,
            res_saos=res_saos,
            res_eli=res_eli,
            valid_articles_cache=valid_articles_cache,
            query_plan=query_plan,
            skip_debate=skip_debate,
            route_reason=route_reason,
            use_fast_path=use_fast_path,
        )

    async def _process_attachments_and_history(self, params: OrchestratorInputParams, llm_service: Any) -> Tuple[str, str, str, str]:
        """Pobiera i parsuje historię czatu oraz ewentualne załączniki w tle, maskując dane wrażliwe PII."""
        history_str = format_chat_history(params.chat_history)
        doc_text = params.document_text or ""
        
        if params.attachments:
            try:
                extracted_parts = []
                async for chunk in extract_all_attachments_text(params.attachments, llm_service):
                    if isinstance(chunk, str):
                        extracted_parts.append(chunk)
                extracted = "".join(extracted_parts)
                if extracted:
                    doc_text += "\n" + extracted
            except Exception as e:
                logger.error(f"[ContextBuilder] Błąd ekstrakcji załączników: {e}")
                
        doc_text = doc_text.strip()
        masked_doc = mask_pii(doc_text) if doc_text else ""
        masked_history = mask_pii(history_str) if history_str else ""
        return doc_text, history_str, masked_doc, masked_history

    async def _gather_user_knowledge(self, params: OrchestratorInputParams, query_for_rag: str) -> str:
        """Pobiera zawartość prywatnej bazy wiedzy użytkownika (RAG_USER)."""
        user_blocks = ""
        
        # Ochrona przed zanieczyszczeniem kontekstu: Jeśli ładujesz plik, nie dociągaj starych spraw
        if params.attachments and params.use_rag_user:
            logger.info("   -> [Zabezpieczenie] Wykryto załączniki. Wymuszam wyłączenie RAG Użytkownika (zapobiega mieszaniu spraw).")
            params.use_rag_user = False

        if params.use_rag_user:
            try:
                current_sid = params.session_id
                if current_sid:
                    # Omijamy wyszukiwanie semantyczne – pobieramy wszystko z tej sesji
                    import asyncio
                    max_retries = 3
                    for attempt in range(max_retries):
                        user_results = await retrieval_service.fetch_user_knowledge_by_session(current_sid, limit=50)
                        if user_results:
                            user_blocks = "\n".join([r.get("content", "") for r in user_results])
                            logger.info(f"   -> [OK] Baza lokalna (RAG Użytkownika): pobrano wszystkie {len(user_results)} fragm. dla sesji '{current_sid}'")
                            break
                        else:
                            if attempt < max_retries - 1:
                                logger.info(f"   -> [OCZEKIWANIE] RAG Użytkownika: 0 trafień, próba {attempt+1}/{max_retries}. Czekam 2s na indeksowanie...")
                                await asyncio.sleep(2)
                            else:
                                logger.info(f"   -> [OK] Baza lokalna (RAG Użytkownika): 0 trafień dla sesji '{current_sid}' po {max_retries} próbach.")
                else:
                    # Brak sesji - używamy tradycyjnego wyszukiwania wektorowego (fallback)
                    user_results = await retrieval_service.search_supabase(
                        query_for_rag,
                        table_name="knowledge_base_user",
                        match_count=15,
                        match_threshold=settings.rag_match_threshold,
                    )
                    if user_results:
                        user_blocks = "\n".join([r.get("content", "") for r in user_results])
                        logger.info(f"   -> [OK] Baza lokalna (RAG Użytkownika): pobrano {len(user_results)} fragm. (wyszukiwanie semantyczne)")
                    else:
                        logger.info("   -> [OK] Baza lokalna (RAG Użytkownika): brak trafień.")
            except Exception as e:
                logger.error(f"[ContextBuilder] Błąd RAG_USER: {e}")
        return user_blocks

    async def _gather_legal_intelligence(
        self,
        params: OrchestratorInputParams,
        case_brief: Any,
        query_for_rag: str,
        saos_eli_keywords: str,
        *,
        retrieval_map: Optional[dict] = None,
        use_fast_path: bool = False,
    ) -> Tuple[List[Any], List[Any], List[Any]]:
        """Zrównoleglone pobieranie i re-ranking wiedzy prawnej z zewn. API (SAOS/ELI) oraz bazy RAG_LEGAL."""
        mapped = retrieval_map or {}
        rag_per_query = max(2, min(mapped.get("rag_n", 3), 6))
        saos_limit = mapped.get("saos_n", 2 if use_fast_path else 3)
        eli_limit = mapped.get("eli_n", 0 if use_fast_path else 3)
        use_saos_eff = mapped.get("use_saos_eff", params.use_saos)
        use_eli_eff = mapped.get("use_eli_eff", params.use_eli) and not use_fast_path
        rerank_k = min(settings.rerank_top_k, mapped.get("rag_n", settings.rerank_top_k))
        external_k = min(settings.external_rerank_top_k, max(saos_limit, eli_limit, 3))
        
        async def multi_pass_rag_legal():
            results = []
            seen_ids = set()
            
            stan_faktyczny = getattr(case_brief, 'stan_faktyczny', '') if case_brief else ''
            queries = [query_for_rag, stan_faktyczny]
            
            przepisy = getattr(case_brief, 'wykryte_przepisy_prawne', None) if case_brief else None
            if przepisy:
                queries.append(" ".join(przepisy))
            else:
                cele = getattr(case_brief, 'cele_analizy', '') if case_brief else ''
                queries.append(cele)
                
            tasks = []
            for q in queries:
                if q and q.strip():
                    tasks.append(asyncio.create_task(
                        retrieval_service.search_supabase(
                            q,
                            table_name="knowledge_base_legal",
                            match_count=rag_per_query,
                            match_threshold=settings.rag_match_threshold,
                        )
                    ))
                    
            if tasks:
                query_results = await asyncio.gather(*tasks, return_exceptions=True)
                for r in query_results:
                    if isinstance(r, list):
                        for item in r:
                            if isinstance(item, dict) and item.get("id") not in seen_ids:
                                seen_ids.add(item.get("id"))
                                results.append(item)
                    elif isinstance(r, BaseException):
                        logger.error(f"[ContextBuilder] Błąd pojedynczego wektora RAG Legal: {r}")
            return results

        tasks = {}
        if params.use_rag_legal:
            tasks['legal'] = asyncio.create_task(multi_pass_rag_legal())
        if use_saos_eff:
            tasks['saos'] = asyncio.create_task(
                retrieval_service.search_saos(keywords=saos_eli_keywords, limit=saos_limit)
            )
        if use_eli_eff:
            tasks['eli'] = asyncio.create_task(
                retrieval_service.search_eli(keywords=saos_eli_keywords, limit=eli_limit)
            )
            
        logger.info("   -> Rozpoczynam równoległe pobieranie danych (RAG Legal, SAOS, ELI)...")
        
        if tasks:
            results = await asyncio.gather(*tasks.values(), return_exceptions=True)
            result_map = dict(zip(tasks.keys(), results))
        else:
            result_map = {}
            
        res_legal_raw = result_map.get('legal')
        if isinstance(res_legal_raw, BaseException):
            logger.error(f"[ContextBuilder] Błąd Legal RAG: {res_legal_raw}")
            res_legal_raw = []
        elif not isinstance(res_legal_raw, list):
            res_legal_raw = []
            
        res_saos_raw = result_map.get('saos')
        if isinstance(res_saos_raw, BaseException):
            logger.error(f"[ContextBuilder] Błąd SAOS: {res_saos_raw}")
            res_saos_raw = []
        elif not isinstance(res_saos_raw, list):
            res_saos_raw = []
            
        res_eli_raw = result_map.get('eli')
        if isinstance(res_eli_raw, BaseException):
            logger.error(f"[ContextBuilder] Błąd ELI: {res_eli_raw}")
            res_eli_raw = []
        elif not isinstance(res_eli_raw, list):
            res_eli_raw = []

        if res_legal_raw:
            res_legal = await rerank_legal_chunks(
                res_legal_raw, 
                query_for_rag, 
                provider=settings.rerank_provider,
                top_k=rerank_k,
            )
        else:
            res_legal = []
            
        if res_saos_raw or res_eli_raw:
            res_saos, res_eli = await rerank_external_sources(
                res_saos_raw, 
                res_eli_raw, 
                query_for_rag, 
                provider=settings.rerank_provider,
                top_k=external_k,
            )
        else:
            res_saos, res_eli = [], []
            
        return res_legal, res_saos, res_eli

    def _compile_investigation_context(
        self,
        case_brief: Any,
        masked_doc: str,
        masked_history: str,
        user_blocks: str,
        res_legal: List[Any],
        res_saos: List[Any],
        res_eli: List[Any],
        *,
        valid_articles_cache: Optional[ValidArticlesCache] = None,
        query_plan: Optional[QueryPlan] = None,
        skip_debate: bool = False,
        route_reason: str = "",
        use_fast_path: bool = False,
    ) -> InvestigationContext:
        """Formatuje wyniki ze wszystkich źródeł w jeden potężny string do podpięcia jako prompt LLM."""
        
        brief_text = ""
        if case_brief:
            stan = getattr(case_brief, 'stan_faktyczny', '')
            cele = getattr(case_brief, 'cele_analizy', '')
            brief_text = (
                "=== KARTA SPRAWY (CASE BRIEF) ===\n"
                f"STAN FAKTYCZNY:\n{stan}\n\n"
                f"CELE ANALIZY:\n{cele}\n"
                "================================="
            )
            
        rag_legal_content = ""
        if res_legal:
            rag_legal_content = "\n".join([r.get("content", "") for r in res_legal])
            logger.info(f"   -> [OK] Baza legal (RAG): pobrano i zrerankowano {len(res_legal)} fragm.")
        else:
            logger.info("   -> [OK] Baza legal (RAG): brak trafień/wyłączone.")
            
        saos_block = ""
        if res_saos:
            saos_block = "\n\n".join([r.get("content", "") for r in res_saos])
            logger.info(f"   -> [OK] SAOS: pobrano i zrerankowano {len(res_saos)} orzeczeń.")
        else:
            logger.info("   -> [OK] SAOS: brak trafień/wyłączone.")
            
        eli_block = ""
        if res_eli:
            eli_block = "\n\n".join([r.get("content", "") for r in res_eli])
            logger.info(f"   -> [OK] ELI/ISAP: pobrano i zrerankowano {len(res_eli)} aktów.")
        else:
            logger.info("   -> [OK] ELI/ISAP: brak trafień/wyłączone.")
            
        logger.info("[ContextBuilder] [OK] Kompletowanie wiedzy zakończone sukcesem.")
            
        combined_parts = []
        if brief_text:
            combined_parts.append(brief_text)
        if masked_doc:
            combined_parts.append(f"=== ZAŁĄCZONY DOKUMENT / TEKST BAZOWY ===\n{masked_doc}\n==================================")
        if masked_history:
            combined_parts.append(f"=== HISTORIA CZATU ===\n{masked_history}\n==================================")
        if user_blocks:
            combined_parts.append(f"=== BAZA WIEDZY UŻYTKOWNIKA (DOKUMENTY SESJI) ===\n{user_blocks}\n==================================")
        if rag_legal_content:
            combined_parts.append(f"=== PRZEPISY PRAWNE ===\n{rag_legal_content}\n==================================")
        if saos_block:
            combined_parts.append(f"=== ORZECZNICTWO SAOS ===\n{saos_block}\n==================================")
        if eli_block:
            combined_parts.append(f"=== AKTY PRAWNE ELI ===\n{eli_block}\n==================================")
            
        combined = "\n\n".join(combined_parts)
        
        # Ograniczenie długości combined (aby LLM nie rzucał błędem przekroczenia limitu)
        if len(combined) > 120000:
            logger.warning(f"[ContextBuilder] Przekroczono limit znaków ({len(combined)}). Przycinam do 120 000.")
            combined = combined[:120000] + "\n\n... [Koniec kontekstu, przycięto z powodu limitu]"
        
        return InvestigationContext(
            legal_blocks=rag_legal_content,
            user_blocks=user_blocks,
            saos_blocks=saos_block,
            eli_blocks=eli_block,
            chat_history=masked_history,
            document_text=masked_doc,
            combined_full_text=combined,
            raw_legal_results=res_legal,
            raw_saos_results=res_saos,
            raw_eli_results=res_eli,
            query_plan=query_plan,
            case_brief=case_brief,
            valid_articles_cache=valid_articles_cache,
            skip_debate=skip_debate,
            route_reason=route_reason,
            use_fast_path=use_fast_path,
        )
