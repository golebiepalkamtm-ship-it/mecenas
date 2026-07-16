import asyncio
import logging
import re
import time
from dataclasses import asdict
from typing import Any, Dict, List, Optional

from config import (
    settings,
)
from services.chat_history import format_chat_history
from services.citation_guard import CitationGuard, citations_to_display, format_citation_warning
from services.client_addressee import extract_client_addressee
from services.coi_guard import check_coi
from services.legal_basis_validator import ValidArticlesCache, validate_expert_arguments
from services.llm_client import _log_model_response
from services.llm_gateway import call_with_fallback
from services.model_resolution import resolve_model_id
from services.expert_prompts import build_expert_guards
from services.pipeline.attachments import extract_all_attachments_text
from services.pipeline.fast_path import (
    fast_path_keywords,
    is_fast_statutory_query,
    is_traffic_stop_topic,
)
from services.pipeline.rag_retrieval import parallel_rag_gather
from services.pii_mask import mask_pii
from services.retrieval_service import retrieval_service
from services.context_packer import (
    format_external_blocks,
    format_kb_blocks,
    pack_combined_context,
)
from services.confidence_scoring import compute_confidence_score
from services.observability import PipelineTimer, log_pipeline_timing
from services.long_context import should_use_long_context_path, long_context_expert_chunk_note
from services.pipeline.runtime_helpers import (
    resolve_use_rag_user,
    should_enable_investigation,
    hallucination_block_min_for_mode,
    merge_act_terms,
)
from services.legal_rank import allowed_source_types_for_query, suggest_act_terms_for_query
from services.security_guardrails import SecurityGuardrails
from services.context_relevance import assess_private_context_relevance
from moa.http_client import get_shared_openai_client
from moa.prompt_builder import merge_role_catalog, get_task_prompt
from domain.prompts.message_builder import PromptMessageBuilder
from schemas.chat_contract import ProcessSide, ResponseMode
from schemas.moa_contracts import ExpertAnalysis

logger = logging.getLogger(__name__)

# Kompatybilność wsteczna (importy spoza modułu)



def _parse_expert_success_percent(text: Any) -> Optional[float]:
    """Wyciąga z odpowiedzi eksperta jawny procent szans (bez zgadywania przy braku liczby w tekście)."""
    t = text if isinstance(text, str) else str(text or "")
    patterns = (
        r"(?:^|[^\d])(\d{1,3})\s*%",
        r"(?:szans\w*|powodzenia|sukces\w*|skuteczn\w*|wygr\w*|P\s*\(\s*sukces\))[^\d]{0,30}(\d{1,3})\s*%",
    )
    for pat in patterns:
        for m in re.finditer(pat, t, flags=re.IGNORECASE):
            val = float(m.group(1))
            if 1.0 <= val <= 100.0:
                return val
    return None


async def run_with_status_stream(coro):
    from services.async_utils import run_with_status_stream as _run

    async for event in _run(coro):
        yield event





class OrchestratorService:
    # Wspólny limit kontekstu dokumentu (eksperci + adwokat)
    DOCUMENT_CONTEXT_CHARS = settings.document_context_chars

    _citation_guard = CitationGuard()

    async def process_user_request_stream_v2(self, **kwargs):
        from services.orchestrator_v2.service import orchestrator_v2_service

        async for chunk in orchestrator_v2_service.process_user_request_stream_v2(**kwargs):
            yield chunk

    CHUNK_SIZE_CHARS = settings.chunk_size_chars
    CHUNK_OVERLAP_CHARS = settings.chunk_overlap_chars

    async def process_user_request_stream(
        self, 
        user_query: str, 
        attachments: Optional[list] = None, 
        selected_model: Optional[str] = None,
        selected_models: Optional[list] = None,
        aggregator_model: Optional[str] = None,
        use_saos: bool = True,
        use_eli: bool = True, 
        use_rag_legal: bool = True,
        use_rag_user: Optional[bool] = None,
        act_terms: Optional[list] = None,
        architect_prompt: Optional[str] = None,
        system_role_prompt: Optional[str] = None,
        expert_roles: Optional[dict] = None,
        expert_role_prompts: Optional[dict] = None,
        role_catalog: Optional[dict] = None,
        current_task: Optional[str] = None,
        task_prompt: Optional[str] = None,
        chat_mode: Optional[str] = None,
        response_mode: Optional[str] = None,
        process_side: Optional[str] = None,
        judge_system_prompt: Optional[str] = None,
        model_latencies: Optional[dict] = None,
        document_text: Optional[str] = None,
        chat_history: Optional[List[Dict[str, Any]]] = None,
        session_id: Optional[str] = None,
    ):
        _ = model_latencies  # kontrakt API (routes/chat_v2)
        start_pipeline_time = time.time()
        pipeline_timer = PipelineTimer() if settings.feature_pipeline_timing else None
        from services.session_document_cache import merge_session_document

        extracted_text = merge_session_document(
            session_id,
            document_text or "",
            file_label="upload_czat",
        )
        inbound_blocked = False
        inbound_matches: list[str] = []
        outbound_pii_masked = False
        private_context_used = False
        private_context_reason = "not_evaluated"
        private_context_markers: list[str] = []
        if settings.feature_inbound_guardrails:
            inbound = SecurityGuardrails.verify_inbound_prompt(user_query or "")
            inbound_matches = list(inbound.matched_patterns or [])
            if (not inbound.allowed) and settings.guardrails_block_on_injection:
                inbound_blocked = True
                msg = f"⚠️ **Błąd bezpieczeństwa**: {inbound.reason}\n"
                yield {"type": "chunk", "text": msg}
                final_metadata = {
                    "type": "final_metadata",
                    "sources": ["LexMind SecurityGuard"],
                    "expert_analyses": [],
                    "eli_explanation": "",
                    "pipeline_latency_ms": int((time.time() - start_pipeline_time) * 1000),
                    "final_answer": msg,
                    "urgency_alerts": [],
                    "timeline": None,
                    "gaps": [],
                    "inconsistencies": [],
                    "coi_conflicts": [],
                    "confidence_score": 0.0,
                    "hitl_escalated": True,
                    "low_confidence": True,
                    "synthesis_blocked": True,
                    "hallucinated_cites": [],
                    "verified_cites_count": 0,
                    "total_cites_count": 0,
                    "saos_count": 0,
                    "eli_count": 0,
                    "user_rag_count": 0,
                    "legal_rag_count": 0,
                    "use_rag_user": False,
                    "claim_scores": [],
                    "investigation_summary": None,
                    "pipeline_timing": pipeline_timer.as_dict() if pipeline_timer else None,
                    "cited_sources": [],
                    "circuit_breakers": retrieval_service.circuit_breakers_snapshot(),
                    "security": {
                        "inbound_blocked": True,
                        "inbound_injection_matches": inbound_matches,
                        "outbound_pii_masked": False,
                        "private_context_used": private_context_used,
                        "private_context_reason": private_context_reason,
                        "private_context_markers": private_context_markers,
                    },
                }
                yield final_metadata
                return
        reranked_user: list = []
        is_single_mode = (
            chat_mode == "single"
            or (selected_models is None and chat_mode not in ("moa", "consensus"))
        )
        skip_expert_debate = is_single_mode and not settings.debate_on_single
        use_fast_path = False
        agent_results: list = []
        p_sukces_val: Optional[float] = None
        cross_exam = ""
        prompt_side = ProcessSide.normalize(process_side).value
        merged_role_catalog = merge_role_catalog(role_catalog, side=prompt_side)  # type: ignore[arg-type]
        msg_builder = PromptMessageBuilder(
            ProcessSide.normalize(prompt_side),
            ResponseMode.normalize(response_mode),
            guards=build_expert_guards(),
        )
        resolved_task_block = (task_prompt or "").strip()
        if not resolved_task_block and current_task:
            resolved_task_block = get_task_prompt(current_task, side=prompt_side)  # type: ignore[arg-type]
        resolved_response_mode = (response_mode or "strategic").strip().lower()
        if resolved_response_mode not in ("citizen", "strategic", "draft"):
            resolved_response_mode = "strategic"
        
        from moa.dynamic_models import get_default_primary_model, get_default_expert_models
        # Inicjalizacja modeli i status_callback na samym początku
        primary_model = resolve_model_id(selected_model or get_default_primary_model())
        if selected_models:
            expert_models = [resolve_model_id(m) for m in selected_models[:3]]
        elif selected_model:
            resolved = resolve_model_id(selected_model)
            expert_models = [resolve_model_id(m) for m in get_default_expert_models(exclude_model=resolved)]
        else:
            expert_models = [resolve_model_id(m) for m in get_default_expert_models(exclude_model=primary_model)]
        judge_model = resolve_model_id(aggregator_model or selected_model or expert_models[0])
        
        async def status_callback(msg: str):
            logger.debug(f"   [STATUS] {msg}")
            
        client = get_shared_openai_client()
        yield {"type": "metadata", "message": "Inicjalizacja potoku LexMind AI Enterprise v2.5..."}

        inv_state = None
        inv_call_llm = None

        async def inv_llm(
            mid,
            msgs,
            max_tokens: int = 500,
            temperature: float = 0.1,
            timeout: float = 40.0,
            log_ctx: str = "INV",
        ):
            _ = client
            return await call_with_fallback(
                mid,
                msgs,
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=timeout,
                status_callback=status_callback,
                log_context=log_ctx,
            )

        def build_query_for_retrieval(masked_query: str, masked_history: str) -> str:
            if not (masked_history or "").strip():
                return masked_query
            return (
                f"{masked_query}\n\n[Kontekst wcześniejszej rozmowy]\n"
                f"{masked_history[:4000]}"
            )

        # Historia rozmowy — format i natychmiastowa anonimizacja (kolejność: załaduj → maskuj → użyj)
        raw_chat_history = format_chat_history(
            chat_history,
            max_messages=settings.chat_history_max_messages,
            max_chars=settings.chat_history_max_chars,
        )
        zanonimizowana_historia = mask_pii(raw_chat_history)
        if zanonimizowana_historia.strip():
            logger.info(
                "   [KONTEKST ROZMOWY] Załadowano %s znaków historii (po anonimizacji RODO).",
                len(zanonimizowana_historia),
            )
            yield {"type": "metadata", "message": "[Kontekst] Wczytano historię rozmowy."}
        
        # --- ETAP 1: EKSTRAKCJA (Vision / OCR & Documents Parser) ---
        doc_source = "none"
        if attachments:
            yield {"type": "metadata", "message": "[Etap 1] Analiza załączników (PDF / Word / Obrazy)..."}
            from services.pipeline.stage_attachments import run_attachment_stage

            async for chunk in run_attachment_stage(attachments, client, extracted_text):
                if isinstance(chunk, dict):
                    yield chunk
                elif isinstance(chunk, str):
                    extracted_text = chunk
                    
            if (extracted_text or "").strip():
                doc_source = "attachments"
            from services.observability import log_stage_event

            log_stage_event("attachments", session_id=session_id, extra={"chars": len(extracted_text or "")})

        if session_id and not (extracted_text or "").strip():
            from services.session_document_cache import join_session_documents

            extracted_text = join_session_documents(session_id) or ""
            if (extracted_text or "").strip():
                doc_source = "session_cache"
        if attachments and not (extracted_text or "").strip():
            yield {
                "type": "metadata",
                "message": (
                    "⚠️ Załącznik bez tekstu (OCR/upload nieudany) — odpowiedź bez treści akt. "
                    "Sprawdź status pliku (ready) i wyślij ponownie."
                ),
            }
        elif extracted_text and not (document_text or "").strip() and session_id:
            yield {
                "type": "metadata",
                "message": f"[Dokument] Przywrócono tekst z sesji ({len(extracted_text)} znaków).",
            }

        use_rag_legal = use_rag_legal if use_rag_legal is not None else True
        use_rag_user = resolve_use_rag_user(
            config_enabled=settings.use_rag_user_in_chat,
            param_use_rag_user=use_rag_user,
            has_extracted_text=bool((extracted_text or "").strip()),
            has_attachments=bool(attachments),
        )

        # Nie wstrzykujemy „ostatnich 5 dokumentów” z bazy — to mieszało stare sprawy z nowymi pytaniami.
        # Kontekst użytkownika pochodzi wyłącznie z załączników / document_text oraz RAG (hybrid_search_user).

        # --- ETAP 2: WARSTA BEZPIECZEŃSTWA (RODO/COI Guard) ---
        yield {"type": "metadata", "message": "[Etap 2] RODO & Conflict of Interest (COI) Guard: skanowanie PII..."}
        _t_stage2 = time.perf_counter()

        # Dane adresata z pisma (przed maskowaniem — imię/nazwisko nie są maskowane)
        client_addressee = extract_client_addressee(extracted_text)
        if client_addressee.get("formal_address"):
            logger.info(f"   [STAGE 2] Adresat z dokumentu: {client_addressee['formal_address']}")

        # Maskowanie PII (Anonimizacja RODO)
        zanonimizowane_zapytanie = mask_pii(user_query)
        zanonimizowany_tekst = mask_pii(extracted_text)

        query_for_retrieval = build_query_for_retrieval(zanonimizowane_zapytanie, zanonimizowana_historia)
        traffic_stop_query = bool(suggest_act_terms_for_query(query_for_retrieval)) or is_traffic_stop_topic(
            zanonimizowane_zapytanie
        )

        # Conflict of Interest Check — na już zanonimizowanym kontekście
        coi_conflicts = check_coi(
            f"{zanonimizowane_zapytanie} {zanonimizowany_tekst} {zanonimizowana_historia}"
        )
        if coi_conflicts:
            logger.info(f"   [STAGE 2] Conflict of Interest (COI) wykryto: {coi_conflicts}")
            yield {"type": "metadata", "message": f"⚠️ Ostrzeżenie COI: Wykryto potencjalną kolizję interesów dla podmiotów: {', '.join(coi_conflicts)}!"}
        else:
            logger.info(f"   [STAGE 2] COI: Brak konfliktów. Zanonimizowano dane RODO.")
        if pipeline_timer:
            pipeline_timer.record_elapsed("stage_2_rodo", _t_stage2)

        private_context_decision = assess_private_context_relevance(
            user_query=zanonimizowane_zapytanie,
            masked_doc_text=zanonimizowany_tekst,
            masked_chat_history=zanonimizowana_historia,
        )
        _private_doc_chars = len((zanonimizowany_tekst or "").strip())
        private_context_used = private_context_decision.use_private_context
        private_context_reason = private_context_decision.reason
        private_context_markers = list(private_context_decision.matched_markers or [])
        if (not private_context_used) and (
            bool((zanonimizowany_tekst or "").strip())
            or bool(attachments)
            or bool((document_text or "").strip())
        ):
            private_context_used = True
            private_context_reason = "document_present"
            private_context_markers = ["document_present"]
        from services.observability import log_stage_event
        log_stage_event(
            "private_context",
            session_id=session_id,
            extra={
                "use_private_context": private_context_used,
                "reason": private_context_reason,
                "markers": private_context_markers,
                "doc_chars": _private_doc_chars,
                "attachments_count": len(attachments or []),
                "doc_source": doc_source,
                "user_query_chars": len((zanonimizowane_zapytanie or "").strip()),
            },
        )
        if not private_context_used:
            if zanonimizowany_tekst.strip() and use_rag_user:
                yield {
                    "type": "metadata",
                    "message": "[Prywatny kontekst] Pytanie ogólne — pomijam akta i prywatną bazę dokumentów w prompcie.",
                }
            zanonimizowany_tekst = ""
            use_rag_user = False

        if settings.feature_fast_statutory_path:
            use_fast_path = is_fast_statutory_query(
                user_query,
                document_text=zanonimizowany_tekst,
                attachments=attachments,
            )
            if use_fast_path:
                if traffic_stop_query:
                    use_saos = False
                    use_eli = False
                skip_expert_debate = True
                yield {
                    "type": "metadata",
                    "message": (
                        "[Szybka ścieżka] Pytanie ogólne bez akt — pomijam debatę 3 ekspertów MOA, "
                        "bezpośrednia synteza (ok. 15–40 s)."
                    ),
                }
                logger.info("   [FAST PATH] Pytanie ogólne bez akt — debata MOA wyłączona.")

        # --- ETAP 3: Terminy procesowe (alerty) ---
        from services.procedural_runner import build_deadline_alerts
        from services.deadline_engine import format_coherent_deadline_block, build_procedural_brief

        urgency_alerts = build_deadline_alerts(zanonimizowany_tekst)
        urgency_header = ""
        if urgency_alerts:
            brief_dead = build_procedural_brief(zanonimizowany_tekst)
            urgency_header = format_coherent_deadline_block(brief_dead, urgency_alerts)
            yield {"type": "metadata", "message": f"[Etap 3] Wykryto {len(urgency_alerts)} alertów terminowych."}
        else:
            yield {"type": "metadata", "message": "[Etap 3] Brak pilnych terminów do wyliczenia z akt."}

        # --- ETAP 4: TRWAŁA PAMIĘĆ SPRAWY (Supabase + pgvector) ---
        # Wektoryzacja dokumentów odbywa się przy uploadzie ([BACKGROUND]); tutaj tylko potwierdzamy kontekst.
        yield {"type": "metadata", "message": "[Etap 4] Trwała pamięć sprawy: indeks w bazie wiedzy użytkownika..."}
        _t_stage4 = time.perf_counter()
        doc_chars = len(zanonimizowany_tekst.strip())
        if doc_chars:
            logger.info(f"   [STAGE 4] Pamięć sprawy: kontekst z bazy ({doc_chars} znaków, wektoryzacja przy uploadzie).")
            yield {
                "type": "metadata",
                "message": f"[Dokument] Model dostanie {doc_chars} znaków tekstu akt (OCR/sesja).",
            }
        else:
            logger.info("   [STAGE 4] Pamięć sprawy: brak tekstu dokumentu w bieżącym żądaniu (tylko pytanie czatu).")
            yield {
                "type": "metadata",
                "message": "[Dokument] Brak tekstu akt w tym żądaniu — odpowiedź tylko z pytania/historii.",
            }
        if pipeline_timer:
            pipeline_timer.record_elapsed("stage_4_memory", _t_stage4)

        # --- ETAP 5: Oś czasu ---
        timeline_data: Dict[str, Any] = {"timeline": [], "inconsistencies": [], "gaps": []}
        timeline_block = ""
        _timeline_should_run = False
        build_timeline_fn = None
        format_timeline_block_fn = None
        if settings.feature_timeline:
            from services.timeline_builder import (
                build_timeline,
                format_timeline_block,
                should_build_timeline,
            )
            build_timeline_fn = build_timeline
            format_timeline_block_fn = format_timeline_block
            _timeline_should_run = should_build_timeline(
                document_text=zanonimizowany_tekst,
                user_query=zanonimizowane_zapytanie,
                attachments_count=len(attachments or []),
            )
        
        if _timeline_should_run and build_timeline_fn and format_timeline_block_fn:

            timeline_data = build_timeline_fn(zanonimizowany_tekst)
            timeline_block = format_timeline_block_fn(timeline_data)
            from services.observability import log_stage_event
            log_stage_event(
                "timeline",
                session_id=session_id,
                extra={
                    "enabled": True,
                    "events": len(timeline_data.get("timeline") or []),
                    "inconsistencies": len(timeline_data.get("inconsistencies") or []),
                    "gaps": len(timeline_data.get("gaps") or []),
                },
            )
            yield {
                "type": "metadata",
                "message": (
                    f"[Etap 5] Oś czasu: {len(timeline_data.get('timeline') or [])} zdarzeń, "
                    f"{len(timeline_data.get('inconsistencies') or [])} niespójności."
                ),
            }
        else:
            from services.observability import log_stage_event
            log_stage_event(
                "timeline",
                session_id=session_id,
                extra={"enabled": False},
            )
            yield {"type": "metadata", "message": "[Etap 5] Oś czasu pominięta (krótki kontekst)."}

        # Investigation v2 — inicjalizacja po znanym kontekście dokumentu
        if should_enable_investigation(
            text_len=len(zanonimizowany_tekst.strip()),
            response_mode=resolved_response_mode,
            has_attachments=bool(attachments),
        ):
            from services.investigation.types import CaseInvestigationState
            from services.investigation.case_memory import (
                load_case_state_for_session,
                state_to_public_memory_dict,
            )

            inv_state = CaseInvestigationState()
            # Pamięć śledztwa tylko przy kontynuacji tej samej rozmowy (historia w żądaniu).
            if session_id and zanonimizowana_historia.strip():
                prev_inv = load_case_state_for_session(session_id)
                if prev_inv:
                    inv_state.case_memory_overlay = state_to_public_memory_dict(prev_inv)
                    inv_state.open_questions = list(prev_inv.open_questions or [])

            async def inv_call_llm(
                model_id,
                messages,
                max_tokens: int = 500,
                temperature: float = 0.1,
                timeout: float = 40.0,
            ):
                return await inv_llm(
                    model_id,
                    messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    timeout=timeout,
                    log_ctx="INV",
                )

            yield {"type": "metadata", "message": "[INV] Głęboka analiza sprawy (Investigation v2)."}

        # --- ETAP 6 i 7 ZDELEGOWANE DO ContextBuilder ---
        from services.retrieval.context_builder import ContextBuilder
        
        ctx_builder = ContextBuilder()
        ret_ctx = None
        
        async for event in ctx_builder.build_context_stream(
            zanonimizowany_tekst=zanonimizowany_tekst,
            zanonimizowane_zapytanie=zanonimizowane_zapytanie,
            zanonimizowana_historia=zanonimizowana_historia,
            query_for_retrieval=query_for_retrieval,
            use_rag_legal=use_rag_legal,
            use_rag_user=use_rag_user,
            use_saos=use_saos,
            use_eli=use_eli,
            act_terms=act_terms,
            use_fast_path=use_fast_path,
            primary_model=primary_model,
            session_id=session_id,
            attachments=attachments,
            inv_state=inv_state,
            inv_call_llm=inv_call_llm,
            client=client,
            resolved_response_mode=resolved_response_mode,
            pipeline_timer=pipeline_timer,
            status_callback=status_callback,
            urgency_header=locals().get("urgency_header", ""),
            timeline_block=timeline_block,
        ):
            if event.get("type") == "result":
                ret_ctx = event.get("context")
            else:
                yield event
                
        if not ret_ctx:
            raise RuntimeError("ContextBuilder nie zwrócił poprawnego kontekstu (RetrievalContext).")

        legal_res = ret_ctx.legal_res
        user_res = ret_ctx.user_res
        saos_results = ret_ctx.saos_results
        eli_results = ret_ctx.eli_results
        rag_legal_content = ret_ctx.rag_legal_content
        rag_user_content = ret_ctx.rag_user_content
        legal_basis_block = ret_ctx.legal_basis_block
        case_context = ret_ctx.case_context
        combined_context = ret_ctx.combined_context
        doc_excerpt = ret_ctx.doc_excerpt
        full_doc = ret_ctx.full_doc
        hypothesis_context_extra = ret_ctx.hypothesis_context_extra
        skip_expert_debate = ret_ctx.skip_expert_debate
        valid_articles_cache = ret_ctx.valid_articles_cache

        if resolved_response_mode == "strategic" and not use_fast_path and inv_call_llm is not None:
            from services.investigation.strategy_engine import generate_litigation_strategy

            try:
                strat = await generate_litigation_strategy(
                    call_llm=inv_call_llm,
                    model_id=primary_model,
                    case_summary=zanonimizowany_tekst[:8000] or zanonimizowane_zapytanie,
                    procedural_snippet=locals().get("proc_block", "")[:3000],
                )
                strat_block = strat.to_context_block()
                if strat_block:
                    combined_context += f"\n{strat_block}\n"
            except Exception as e:
                logger.error("[StrategyEngine] %s", e)

        # --- ETAP 8 ZDELEGOWANE DO DebateManager ---
        from services.debate.debate_manager import DebateManager

        debate_mgr = DebateManager()
        _t_stage8 = time.perf_counter()
        agent_results = []
        researcher_responses = ""

        # DELETED_1
        # DELETED_2
        # DELETED_3
        # DELETED_4
        async for event in debate_mgr.run_debate_stream(
            skip_expert_debate=skip_expert_debate,
            use_fast_path=use_fast_path,
            zanonimizowane_zapytanie=zanonimizowane_zapytanie,
            combined_context=combined_context,
            expert_roles=expert_roles or {},
            expert_role_prompts=expert_role_prompts or {},
            merged_role_catalog=merged_role_catalog,
            prompt_side=prompt_side,
            case_context=case_context,
            full_doc=full_doc,
            client_addressee=client_addressee,
            query_for_retrieval=query_for_retrieval,
            resolved_task_block=resolved_task_block,
            legal_basis_block=legal_basis_block,
            primary_model=primary_model,
            client=client,
            status_callback=status_callback,
            zanonimizowana_historia=zanonimizowana_historia,
            inv_state=inv_state,
        ):
            if event.get("type") == "result":
                researcher_responses = event["researcher_responses"]
                agent_results = event["agent_results"]
                _t_stage8 = event["t_stage8"]
            else:
                yield event

        analysis_1 = agent_results[0] if len(agent_results) > 0 else {}
        analysis_2 = agent_results[1] if len(agent_results) > 1 else {}
        analysis_3 = agent_results[2] if len(agent_results) > 2 else {}

        yield {"type": "metadata", "message": "[Etap 9] Silnik strategiczny: ocena P(Sukces) tylko gdy eksperci podają % w odpowiedzi..."}

        scores_weights = [
            (_parse_expert_success_percent(analysis_1.get("response")), 1.0),
            (_parse_expert_success_percent(analysis_2.get("response")), 0.8),
            (_parse_expert_success_percent(analysis_3.get("response")), 0.7),
        ]
        pairs = [(w, s) for s, w in scores_weights if s is not None]
        R_procesowe = 0.0
        if urgency_alerts:
            for alert in urgency_alerts:
                if alert.get("type") == "pending_delivery":
                    R_procesowe = max(R_procesowe, 0.25)
                    continue
                days_left = alert.get("days_left")
                if days_left is None:
                    continue
                if days_left < 0:
                    R_procesowe = max(R_procesowe, 0.35)
                elif days_left <= 7:
                    R_procesowe = max(R_procesowe, 0.4)
                else:
                    R_procesowe = max(R_procesowe, 0.2)
        if pairs:
            wsum = sum(w for w, _ in pairs)
            p_sukces_val = max(0.0, min(99.0, (sum(w * s for w, s in pairs) / wsum) * (1.0 - R_procesowe)))
            all_cites = []
            unverified_list = []
            hallucinated_cites = set()
            verified_count = 0
            logger.info(
                "   [STAGE 9] P(Sukces) = %.1f%% (średnia ważona z %s/%s opinii z jawnych %%, ryzyko proc. %.1f)",
                p_sukces_val,
                len(pairs),
                len(scores_weights),
                R_procesowe,
            )
        else:
            p_sukces_val = 0.0
            all_cites = []
            unverified_list = []
            hallucinated_cites = set()
            verified_count = 0
            logger.info(
                "   [STAGE 9] P(Sukces) pominięte — żaden ekspert nie podał jawnego %% szans w odpowiedzi."
            )
        empty_agents = sum(
            1
            for a in agent_results
            if not (a.get("response") or "").strip() or a.get("success") is False
        )
        expert_agreement = p_sukces_val

        # Sidecar Validator: walidacja argumentów ekspertów (jeśli JSON sparsowany)
        sidecar_validated_total = 0
        sidecar_rejected_total = 0
        for ar in agent_results:
            raw_resp = ar.get("response", "")
            try:
                parsed = json.loads(raw_resp) if isinstance(raw_resp, str) and raw_resp.strip().startswith("{") else None
                if parsed and "key_arguments" in parsed:
                    vr = validate_expert_arguments(parsed, valid_articles_cache)
                    sidecar_validated_total += vr.validated_count
                    sidecar_rejected_total += vr.rejected_count
            except (json.JSONDecodeError, Exception):
                pass

        if all_cites:
            logger.info(
                f"   [STAGE 10] Cytaty art.: {len(all_cites)} łącznie, "
                f"zweryfikowane: {verified_count}, niezweryfikowane: {len(unverified_list)}"
            )
        if sidecar_validated_total or sidecar_rejected_total:
            logger.info(
                "   [STAGE 10] Sidecar Validator: %d argumentów OK, %d odrzuconych",
                sidecar_validated_total,
                sidecar_rejected_total,
            )
            yield {
                "type": "metadata",
                "message": (
                    f"[Sidecar] Walidacja legal_basis: "
                    f"{sidecar_validated_total} ✓ / {sidecar_rejected_total} ✗"
                ),
            }

        cite_block_mode = (getattr(settings, "citation_block_mode", "off") or "off").lower()
        from services.observability import log_stage_event
        log_stage_event(
            "citation_audit",
            session_id=session_id,
            extra={
                "all_cites": len(all_cites),
                "verified": verified_count,
                "unverified": len(unverified_list),
                "mode": cite_block_mode,
                "fast_path": use_fast_path,
            },
        )
        if hallucinated_cites and cite_block_mode in ("warn", "strict"):
            cites_str = format_citation_warning(unverified_list)
            yield {
                "type": "metadata",
                "message": (
                    f"⚠️ [Podstawa prawna] Do ręcznej weryfikacji ({len(hallucinated_cites)}): "
                    f"{cites_str}. Szczegóły w przypisach pod odpowiedzią."
                ),
            }

        confidence_score = compute_confidence_score(
            legal_results=legal_res,
            user_results=user_res,
            saos_results=saos_results,
            eli_results=eli_results,
            all_cites_count=len(all_cites),
            unverified_count=len(unverified_list),
            coi_conflicts=coi_conflicts,
            timeline_inconsistencies=timeline_data.get("inconsistencies") or [],
            empty_agents=empty_agents,
            expert_success_agreement=expert_agreement,
        )
        low_confidence = confidence_score < 92.0 and bool(hallucinated_cites)

        cite_block_threshold = hallucination_block_min_for_mode(resolved_response_mode)
        if low_confidence and not hallucinated_cites:
            logger.info(f"   [STAGE 10] Niska pewność: {confidence_score:.1f}%")
            yield {
                "type": "metadata",
                "message": (
                    f"⚠️ Niska pewność odpowiedzi ({confidence_score:.1f}%). "
                    "Zweryfikuj cytaty przepisów w aktach przed podjęciem decyzji."
                ),
            }
        elif not hallucinated_cites:
            logger.info(f"   [STAGE 10] Wszystkie cytaty art. zweryfikowane. Pewność: {confidence_score:.1f}%")

        # --- ETAP 11 & 12 ZDELEGOWANE DO SynthesisEngine ---
        from services.synthesis.synthesis_engine import SynthesisEngine

        eli_block = ""
        saos_block = ""
        fact_sheet_block = ""
        rag_snippet_for_verify = ""
        claim_scores_payload = {}
        llm_audit_fn = None
        _eli_lookup = None

        synth_engine = SynthesisEngine()
        async for event in synth_engine.run_synthesis_stream(
            client=client,
            judge_model=judge_model,
            primary_model=primary_model,
            use_fast_path=use_fast_path,
            resolved_response_mode=resolved_response_mode,
            architect_prompt=architect_prompt or "",
            system_role_prompt=system_role_prompt or "",
            judge_system_prompt=judge_system_prompt or "",
            client_addressee=client_addressee,
            full_doc=full_doc,
            traffic_stop_query=traffic_stop_query,
            zanonimizowana_historia=zanonimizowana_historia,
            inv_state=inv_state,
            skip_expert_debate=skip_expert_debate,
            rag_legal_content=rag_legal_content,
            rag_user_content=rag_user_content,
            eli_block=eli_block or "",
            saos_block=saos_block or "",
            eli_results=eli_results,
            saos_results=saos_results,
            attachments=attachments or [],
            extracted_text=extracted_text,
            p_sukces_val=p_sukces_val,
            urgency_header=urgency_header,
            timeline_block=timeline_block,
            fact_sheet_block=fact_sheet_block if 'fact_sheet_block' in locals() else "",
            zanonimizowane_zapytanie=zanonimizowane_zapytanie,
            hallucinated_cites=hallucinated_cites,
            cite_block_mode=cite_block_mode,
            cite_block_threshold=cite_block_threshold,
            unverified_list=unverified_list,
            researcher_responses=researcher_responses,
            combined_context=combined_context,
            low_confidence=low_confidence,
            reranked_legal=legal_res,
            reranked_user=user_res,
            query_for_retrieval=query_for_retrieval,
            legal_basis_block=legal_basis_block,
            rag_snippet_for_verify=rag_snippet_for_verify,
            timeline_data=timeline_data,
            coi_conflicts=coi_conflicts,
            confidence_score=confidence_score,
            verified_count=verified_count,
            all_cites=all_cites,
            use_rag_user=use_rag_user,
            claim_scores_payload=claim_scores_payload,
            pipeline_timer=pipeline_timer,
            session_id=session_id or "",
            inbound_blocked=inbound_blocked,
            inbound_matches=inbound_matches,
            outbound_pii_masked=outbound_pii_masked,
            private_context_used=private_context_used,
            private_context_reason=private_context_reason,
            private_context_markers=private_context_markers,
            start_pipeline_time=start_pipeline_time,
            llm_audit_fn=llm_audit_fn,
            _eli_lookup=_eli_lookup,
            status_callback=status_callback,
            analysis=agent_results,
            user_res=user_res,
            legal_res=legal_res,
            urgency_alerts=urgency_alerts,
        ):
            yield event
        return







    async def process_user_request(self, *args, **kwargs):
        # Metoda zgodnosci wstecznej
        ans = ""
        analysis = []
        sources = []
        eli = ""
        latency = 0
        urgency_alerts = []
        timeline = []
        gaps = []
        inconsistencies = []
        coi_conflicts = []
        p_sukces = None
        confidence_score = 0.0
        hitl_escalated = False
        claim_scores = {}
        investigation_summary = ""

        async for chunk in self.process_user_request_stream(*args, **kwargs):
            if chunk.get("type") == "answer_chunk":
                ans += str(chunk.get("content", ""))
            elif chunk.get("type") == "metadata":
                m = chunk.get("content")
                if isinstance(m, dict):
                    analysis = m.get("analysis", analysis)
                    sources = m.get("sources", sources)
                    eli = m.get("eli", eli)
                    latency = m.get("latency", latency)
                    urgency_alerts = m.get("urgency_alerts", urgency_alerts)
                    timeline = m.get("timeline", timeline)
                    gaps = m.get("gaps", gaps)
                    inconsistencies = m.get("inconsistencies", inconsistencies)
                    coi_conflicts = m.get("coi_conflicts", coi_conflicts)
                    p_sukces = m.get("p_sukces", p_sukces)
                    confidence_score = m.get("confidence_score", confidence_score)
                    hitl_escalated = m.get("hitl_escalated", hitl_escalated)
                    claim_scores = m.get("claim_scores", claim_scores)
                    investigation_summary = m.get("investigation_summary", investigation_summary)

        return {
            "answer": ans,
            "analysis": analysis,
            "sources": sources,
            "eli": eli,
            "latency": latency,
            "urgency_alerts": urgency_alerts,
            "timeline": timeline,
            "gaps": gaps,

            "inconsistencies": inconsistencies,
            "coi_conflicts": coi_conflicts,
            "p_sukces": p_sukces,
            "confidence_score": confidence_score,
            "hitl_escalated": hitl_escalated,
            "claim_scores": claim_scores,
            "investigation_summary": investigation_summary,
        }

# Singleton
orchestrator = OrchestratorService()
