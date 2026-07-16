import time
import logging
import json
import asyncio
from dataclasses import dataclass, asdict
from typing import Dict, Any, List, Optional, AsyncGenerator

from services.config import settings
from services.retrieval_service import retrieval_service
from services.retrieval.rag_parallel import parallel_rag_gather
from services.query_routing import (
    suggest_act_terms_for_query,
    merge_act_terms,
    allowed_source_types_for_query,
    fast_path_keywords
)
from services.prompts import load_prompt
from services.utils import run_with_status_stream
from services.llm_service import chunk_document
from services.context_packer import pack_combined_context, should_use_long_context_path, long_context_expert_chunk_note
from services.formatters import format_kb_blocks, format_external_blocks
from services.history_blocks import conversation_history_block
from services.legal_basis_blocks import format_expert_legal_basis
from services.llm_gateway import call_with_fallback
from services.pii_mask import mask_pii
from services.query_keywords import extract_fallback_keywords
from services.rerank_facade import rerank_kb_mixed, rerank_saos_eli
from services.retrieval.types import get_retrieval_title
from services.valid_articles_cache import ValidArticlesCache

logger = logging.getLogger(__name__)

@dataclass
class RetrievalContext:
    legal_res: List[Dict[str, Any]]
    user_res: List[Dict[str, Any]]
    saos_results: List[Dict[str, Any]]
    eli_results: List[Dict[str, Any]]
    rag_legal_content: str
    rag_user_content: str
    legal_basis_block: str
    case_context: str
    combined_context: str
    doc_excerpt: str
    full_doc: str
    hypothesis_context_extra: str
    skip_expert_debate: bool
    rag_n: int
    saos_n: int
    eli_n: int
    proc_block: str
    valid_articles_cache: Optional[Any]

class ContextBuilder:
    """
    Zajmuje się logiką docinania tekstów ustaw/orzeczeń pod okno LLMa
    oraz formowania kontekstu przed przekazaniem go Głównemu Adwokatowi i Ekspertom.
    """
    def __init__(self, _orchestrator_ref=None):
        self.CHUNK_SIZE_CHARS = settings.chunk_size_chars
        self.CHUNK_OVERLAP_CHARS = settings.chunk_overlap_chars
        self.DOCUMENT_CONTEXT_CHARS = settings.document_context_chars
        self.DOCUMENT_CONTEXT_HEADER = load_prompt("document_context_header")

    async def build_context_stream(
        self,
        zanonimizowany_tekst: str,
        zanonimizowane_zapytanie: str,
        zanonimizowana_historia: str,
        query_for_retrieval: str,
        use_rag_legal: bool,
        use_rag_user: bool,
        use_saos: bool,
        use_eli: bool,
        act_terms: Optional[List[str]],
        use_fast_path: bool,
        primary_model: str,
        session_id: Optional[str],
        attachments: Any,
        inv_state: Any,
        inv_call_llm: Any,
        client: Any,
        resolved_response_mode: str,
        pipeline_timer: Any,
        status_callback: Any,
        urgency_header: str,
        timeline_block: str,
    ) -> AsyncGenerator[Any, None]:
        
        hypothesis_context_extra = ""
        logger.info(
            "   [STAGE 6] RAG: legal=%s, user=%s.",
            "włączone" if use_rag_legal else "wyłączone",
            "włączone" if use_rag_user else "wyłączone",
        )
        saos_on = "SAOS" if use_saos else ""
        eli_on = "ELI" if use_eli else ""
        ext = ", ".join(x for x in (saos_on, eli_on) if x)
        yield {
            "type": "metadata",
            "message": f"[Etap 6] RAG: baza wiedzy{(' + ' + ext) if ext else ''}...",
        }
        
        keywords = extract_fallback_keywords(zanonimizowany_tekst, query_for_retrieval[:4000])
        planner_act_terms: List[str] = []
        mapped: Dict[str, Any] = {}
        skip_expert_debate = False

        if use_fast_path:
            keywords = fast_path_keywords(zanonimizowane_zapytanie) or keywords
            logger.info("   [STAGE 6] Szybka ścieżka — słowa kluczowe bez routera LLM: %s", keywords)
        elif settings.feature_query_planner:
            from services.query_planner import apply_plan_to_retrieval_counts, plan_query

            async def _planner_llm(
                model_id,
                messages,
                max_tokens: int = 220,
                temperature: float = 0.1,
                timeout: float = 20.0,
                **_,
            ):
                return await call_with_fallback(
                    model_id,
                    messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    timeout=timeout,
                    log_context="QueryPlanner",
                )

            plan = await plan_query(
                call_llm=_planner_llm,
                model_id=primary_model,
                user_query=zanonimizowane_zapytanie,
                document_excerpt=zanonimizowany_tekst[:1200],
                history_snippet=zanonimizowana_historia[:800],
                fallback_keywords=keywords,
            )
            mapped = apply_plan_to_retrieval_counts(
                plan,
                use_fast_path=False,
                base_use_saos=use_saos,
                base_use_eli=use_eli,
            )
            keywords = mapped["keywords"] or keywords
            planner_act_terms = list(mapped.get("act_terms_extra") or [])
            if mapped.get("skip_debate"):
                skip_expert_debate = True
            logger.info("   [STAGE 6] QueryPlanner: intent=%s kw=%s", plan.intent, keywords)
        else:
            system_router_prompt = load_prompt("router_keywords_system")
            router_hist = ""
            if zanonimizowana_historia.strip():
                router_hist = (
                    f"Historia rozmowy (skrót): {zanonimizowana_historia[:1500]}\n"
                )
            user_router_prompt = (
                f"Stan faktyczny: {zanonimizowany_tekst[:1200]}\n"
                f"{router_hist}"
                f"Zapytanie: {zanonimizowane_zapytanie[:500]}\n\n"
                f"Zidentyfikuj obszar i wygeneruj dokładnie 3 do 5 kluczowych fraz."
            )

            try:
                kw_text = None
                async for event in run_with_status_stream(
                    call_with_fallback(
                        primary_model,
                        [
                            {"role": "system", "content": system_router_prompt},
                            {"role": "user", "content": user_router_prompt}
                        ],
                        max_tokens=120,
                        temperature=0.1,
                        timeout=15.0,
                        status_callback=status_callback,
                        log_context="ETAP 6 Router słów kluczowych",
                    )
                ):
                    if event["type"] == "status":
                        yield {"type": "metadata", "message": event["message"]}
                    elif event["type"] == "result":
                        kw_text, _ = event["value"]
                if kw_text is not None and not isinstance(kw_text, bool):
                    if isinstance(kw_text, str):
                        kws = kw_text.strip()
                    else:
                        kws = str(kw_text).strip()
                    if kws:
                        keywords = kws
            except Exception as e:
                logger.error(f"   [STAGE 6 ERR] Router: {e}")

            logger.info(f"   [STAGE 6] Słowa kluczowe: {keywords}")

        if inv_state and inv_call_llm:
            from services.investigation.agent_router import detect_problem_tags
            from services.investigation.hypothesis_engine import generate_hypotheses

            inv_state.problem_tags = detect_problem_tags(zanonimizowany_tekst, zanonimizowane_zapytanie)
            mem_hint = ""
            if inv_state.case_memory_overlay:
                mem_hint = json.dumps(inv_state.case_memory_overlay, ensure_ascii=False)[:2500]
            try:
                hyps = await generate_hypotheses(
                    call_llm=inv_call_llm,
                    model_id=primary_model,
                    document_excerpt=(zanonimizowany_tekst or zanonimizowane_zapytanie)[:12000],
                    user_query=zanonimizowane_zapytanie,
                    history_snippet=zanonimizowana_historia,
                    memory_hint=mem_hint,
                    max_count=settings.hypothesis_max_count,
                    state=inv_state,
                )
                if hyps:
                    yield {"type": "metadata", "message": f"[INV] Hipotezy prawne: {len(hyps)}."}
            except Exception as e:
                logger.error("[INV] generate_hypotheses: %s", e)

        # RAG Retrieval (równolegle: Supabase + SAOS + ELI)
        rag_n = 4 if use_fast_path else 5
        saos_n = 2 if use_fast_path else 5
        eli_n = 0 if use_fast_path else 5
        use_eli_eff = use_eli and not use_fast_path
        if mapped and not use_fast_path:
            rag_n = mapped.get("rag_n", rag_n)
            saos_n = mapped.get("saos_n", saos_n)
            eli_n = mapped.get("eli_n", eli_n)
            use_eli_eff = mapped.get("use_eli_eff", use_eli_eff)
            use_saos = mapped.get("use_saos_eff", use_saos)
        suggested_act_terms = suggest_act_terms_for_query(query_for_retrieval)
        effective_act_terms = merge_act_terms(
            merge_act_terms(act_terms, planner_act_terms if planner_act_terms else None),
            suggested_act_terms,
        )
        allowed_types = allowed_source_types_for_query(query_for_retrieval)
        _t_stage6 = time.perf_counter()
        legal_res, user_res, saos_results, eli_results = await parallel_rag_gather(
            keywords=keywords,
            query_for_retrieval=query_for_retrieval,
            use_rag_legal=use_rag_legal,
            use_rag_user=use_rag_user,
            use_saos=use_saos,
            use_eli=use_eli_eff,
            act_terms=effective_act_terms,
            allowed_source_types=allowed_types,
            rag_match_count=rag_n,
            user_match_count=(
                settings.rag_user_top_k_with_document + 1
                if use_rag_user
                and (bool((zanonimizowany_tekst or "").strip()) or bool(attachments))
                else settings.rag_user_top_k + 1
            ),
            saos_limit=saos_n,
            eli_limit=eli_n,
        )
        for warn in retrieval_service.consume_integration_warnings():
            yield {"type": "metadata", "message": warn}
        from services.observability import log_stage_event
        log_stage_event(
            "retrieval",
            session_id=session_id,
            duration_ms=round((time.perf_counter() - _t_stage6) * 1000, 1),
            extra={
                "legal_count": len(legal_res),
                "user_count": len(user_res),
                "saos_count": len(saos_results),
                "eli_count": len(eli_results),
                "use_rag_legal": bool(use_rag_legal),
                "use_rag_user": bool(use_rag_user),
                "use_saos": bool(use_saos),
                "use_eli": bool(use_eli_eff),
                "rag_n": int(rag_n),
                "saos_n": int(saos_n),
                "eli_n": int(eli_n),
                "allowed_source_types_count": len(allowed_types or []),
                "act_terms_count": len(effective_act_terms or []),
            },
        )

        if inv_state and inv_call_llm and inv_state.hypotheses:
            from services.investigation.hypothesis_rag import (
                gather_evidence_for_hypotheses,
                merge_evidence_into_legal_list,
                format_hypothesis_sections_for_context,
            )
            from services.investigation.recursive_research import RecursiveResearchLoop

            try:
                by_legal_h, by_saos_h, by_eli_h = await gather_evidence_for_hypotheses(
                    inv_state.hypotheses,
                    query_for_retrieval=query_for_retrieval,
                    use_rag_legal=use_rag_legal,
                    use_saos=use_saos,
                    use_eli=use_eli,
                    state=inv_state,
                    round_index=0,
                    cache_namespace="inv_hyp_main",
                )
                legal_res = merge_evidence_into_legal_list(legal_res, by_legal_h)
                hypothesis_context_extra = format_hypothesis_sections_for_context(
                    by_legal_h, by_saos_h, by_eli_h, inv_state.hypotheses
                )
                loop = RecursiveResearchLoop(inv_state, call_llm=inv_call_llm, model_id=primary_model)
                legal_res, inv_rounds = await loop.run(
                    hypotheses=inv_state.hypotheses,
                    query_for_retrieval=query_for_retrieval,
                    use_rag_legal=use_rag_legal,
                    use_saos=use_saos,
                    use_eli=use_eli,
                    base_legal=legal_res,
                )
                for rnd in inv_rounds:
                    yield {
                        "type": "metadata",
                        "message": f"[INV] Rekurencja RAG — runda {rnd.round_index}: {rnd.summary}",
                        "investigation_round": asdict(rnd),
                    }
            except Exception as e:
                logger.error("[INV] hypothesis RAG / recursive: %s", e)
        if pipeline_timer:
            pipeline_timer.record_elapsed("stage_6_rag", _t_stage6)

        logger.info(
            f"   [STAGE 6] RAG: legal={len(legal_res)}, user={len(user_res)}, "
            f"SAOS={len(saos_results)}{'' if use_saos else ' (wył.)'}, "
            f"ELI={len(eli_results)}{'' if use_eli_eff else ' (wył.)'}"
        )
        rag_status_parts = []
        if use_rag_user:
            rag_status_parts.append(
                f"Baza akt klienta: {len(user_res)} fragmentów"
                if user_res
                else "Baza akt klienta: brak trafień"
            )
        if use_rag_legal:
            rag_status_parts.append(
                f"Baza wiedzy prawnej: {len(legal_res)} fragmentów"
                if legal_res
                else "Baza wiedzy prawnej: brak trafień"
            )
        if use_saos:
            rag_status_parts.append(
                f"SAOS: {len(saos_results)} orzeczeń" if saos_results else "SAOS: brak trafień"
            )
        if use_eli:
            rag_status_parts.append(
                f"ELI: {len(eli_results)} aktów" if eli_results else "ELI: brak trafień"
            )
        if rag_status_parts:
            yield {"type": "metadata", "message": f"[Etap 6] Źródła zewnętrzne: {'; '.join(rag_status_parts)}"}

        traffic_act_terms = suggest_act_terms_for_query(query_for_retrieval)
        if traffic_act_terms and legal_res:
            def _is_disallowed_traffic_row(row: Dict[str, Any]) -> bool:
                meta = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
                filename = str((meta or {}).get("filename") or "").lower()
                title = get_retrieval_title(row).lower()
                blob = f"{filename} {title}"
                return (
                    "kodeks_postepowania_karnego" in blob
                    or "kodeks postępowania karnego" in blob
                    or "kodeks postepowania karnego" in blob
                    or "kpk" in blob
                    or "kodeks_karny" in blob
                    or "kodeks karny" in blob
                    or "kk.pdf" in blob
                )

            legal_res = [r for r in legal_res if not _is_disallowed_traffic_row(r)]

        # --- ETAP 7: RERANKER ---
        yield {"type": "metadata", "message": "[Etap 7] Reranker: sortowanie fragmentów RAG po trafności..."}
        _t_stage7 = time.perf_counter()

        reranked_legal, reranked_user = await rerank_kb_mixed(
            legal_res, user_res, query_for_retrieval[:4000]
        )
        saos_results, eli_results = await rerank_saos_eli(
            saos_results, eli_results, query_for_retrieval[:4000]
        )
        rerank_method = (
            reranked_legal[0].get("rerank_method", settings.rerank_provider)
            if reranked_legal
            else settings.rerank_provider
        )
        yield {
            "type": "metadata",
            "message": (
                f"[Etap 7] Reranker ({rerank_method}): legal={len(reranked_legal)}, "
                f"user={len(reranked_user)}, SAOS={len(saos_results)}, ELI={len(eli_results)}."
            ),
        }
        log_stage_event(
            "rerank",
            session_id=session_id,
            duration_ms=round((time.perf_counter() - _t_stage7) * 1000, 1),
            extra={
                "method": str(rerank_method),
                "legal_count": len(reranked_legal),
                "user_count": len(reranked_user),
                "saos_count": len(saos_results),
                "eli_count": len(eli_results),
            },
        )
        if pipeline_timer:
            pipeline_timer.record_elapsed("stage_7_rerank", _t_stage7)

        # --- ETAP 6.5: LEGAL BASIS VALIDATOR ---
        _t_sidecar_cache = time.perf_counter()
        valid_articles_cache = ValidArticlesCache.build_from_rag_results(
            legal_results=reranked_legal or legal_res,
            user_results=reranked_user or user_res,
            saos_results=saos_results,
            eli_results=eli_results,
            document_text=zanonimizowany_tekst or "",
        )
        _sidecar_cache_ms = round((time.perf_counter() - _t_sidecar_cache) * 1000, 1)
        logger.info(
            "   [STAGE 6.5] ValidArticlesCache: %d artykułów w %s ms",
            valid_articles_cache.size,
            _sidecar_cache_ms,
        )
        yield {
            "type": "metadata",
            "message": f"[Etap 6.5] Sidecar Validator: {valid_articles_cache.size} artykułów w cache ({_sidecar_cache_ms} ms)",
        }
        if pipeline_timer:
            pipeline_timer.record_elapsed("stage_6_5_sidecar_cache", _t_sidecar_cache)

        if inv_state and session_id:
            from services.investigation.graph_store import extract_and_persist_edges
            try:
                n_ins = extract_and_persist_edges(reranked_legal, session_label=session_id)
                if n_ins:
                    yield {"type": "metadata", "message": f"[INV] Graf przepisów (MVP): {n_ins} wpisów."}
            except Exception as e:
                logger.debug("[INV] graph persist: %s", e)

        rag_legal_content = format_kb_blocks(reranked_legal, prefix="RAG")
        rag_user_content = mask_pii("\n".join([r.get("content", "") for r in reranked_user]))

        full_doc = (zanonimizowany_tekst or "").strip()
        use_long_ctx = should_use_long_context_path(full_doc)
        max_chunk_slots = 1 if use_long_ctx else settings.chunk_max_count
        doc_chunks = chunk_document(
            full_doc,
            chunk_size=self.CHUNK_SIZE_CHARS,
            overlap=self.CHUNK_OVERLAP_CHARS,
            max_chunks=max_chunk_slots,
        )
        doc_cap = (
            settings.long_context_max_chars
            if use_long_ctx
            else self.DOCUMENT_CONTEXT_CHARS
        )
        if use_long_ctx:
            doc_excerpt = full_doc[: min(len(full_doc), doc_cap)]
            chunk_note = long_context_expert_chunk_note()
        else:
            doc_excerpt = full_doc[:doc_cap]
            if len(full_doc) > doc_cap:
                doc_excerpt += (
                    "\n[… środek aktu — uzupełniają fragmenty RAG i analizy ekspertów …]"
                )
            if len(doc_chunks) > 1:
                chunk_note = (
                    f"\n[DOKUMENT: {len(doc_chunks)} fragmentów po ~{self.CHUNK_SIZE_CHARS} znaków; "
                    "eksperci dostają pełne odcinki tekstu, nie skrót początek/koniec]\n"
                )
            else:
                chunk_note = ""
        log_stage_event(
            "context_material",
            session_id=session_id,
            extra={
                "full_doc_chars": len(full_doc),
                "doc_excerpt_chars": len(doc_excerpt),
                "doc_chunks": len(doc_chunks or []),
                "use_long_context": bool(use_long_ctx),
                "rag_legal_chars": len(rag_legal_content or ""),
                "rag_user_chars": len(rag_user_content or ""),
            },
        )
        history_prefix = conversation_history_block(zanonimizowana_historia)

        from services.procedural_runner import build_procedural_context_block

        async def _proc_llm(mid, messages, max_tokens=900, temperature=0.1, timeout=50.0):
            return await call_with_fallback(
                mid,
                messages,
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=timeout,
                log_context="ProceduralRunner",
            )

        proc_block = ""
        if settings.feature_procedural_always_on:
            proc_block = await build_procedural_context_block(
                text=(zanonimizowany_tekst or zanonimizowane_zapytanie),
                call_llm=inv_call_llm or _proc_llm,
                model_id=primary_model,
                response_mode=resolved_response_mode,
                use_llm=not use_fast_path,
            )

        saos_block = format_external_blocks(saos_results, prefix="SAOS")
        eli_block = format_external_blocks(eli_results, prefix="ELI")
        legal_basis_block = format_expert_legal_basis(rag_legal_content, saos_block, eli_block)
        if legal_basis_block.strip():
            yield {
                "type": "metadata",
                "message": (
                    f"[Etap 7→8] Podstawa prawna gotowa ({len(legal_basis_block)} znaków RAG/ELI/SAOS) — "
                    "eksperci MOA debatują na tym materiale przed syntezą."
                ),
            }

        fact_sheet_block = ""
        if settings.feature_compact_fact_sheet and full_doc:
            from services.document_fact_sheet import (
                build_fact_sheet,
                format_fact_sheet_for_prompt,
            )
            from services.session_document_cache import get_session_fact_sheet

            sheet = get_session_fact_sheet(session_id) if session_id else None
            if not sheet:
                sheet = build_fact_sheet(full_doc)
            fact_sheet_block = format_fact_sheet_for_prompt(sheet)

        has_client_doc = bool((full_doc or "").strip())
        has_private_material = has_client_doc or bool((rag_user_content or "").strip())
        if has_private_material:
            doc_header_block = (
                f"\n{fact_sheet_block}{self.DOCUMENT_CONTEXT_HEADER}\n{history_prefix}"
            )
        else:
            doc_header_block = f"\n{fact_sheet_block}{history_prefix}"
        doc_frac = (
            settings.context_packer_doc_fraction if has_client_doc else 0.32
        )
        doc_budget = int(settings.context_summary_max_chars * doc_frac)
        preserve_doc = has_client_doc and len(
            f"{doc_header_block}{doc_excerpt}{chunk_note}"
        ) <= doc_budget

        use_packer = settings.feature_context_packer and not has_client_doc
        if use_packer:
            case_context = pack_combined_context(
                max_chars=settings.context_summary_max_chars,
                doc_header=doc_header_block,
                doc_excerpt=doc_excerpt,
                chunk_note=chunk_note,
                user_rag=rag_user_content,
                legal_rag="",
                saos_block="",
                eli_block="",
                procedural_block=proc_block,
                timeline_block=timeline_block,
                hypothesis_block=hypothesis_context_extra[:12000],
                deadline_block=urgency_header[:2000] if urgency_header else "",
                doc_fraction=doc_frac,
                preserve_full_doc=preserve_doc,
            )
            yield {
                "type": "metadata",
                "message": f"[Kontekst] Context packer (~{len(case_context)} znaków); podstawa prawna RAG osobno przed debatą.",
            }
        else:
            case_context = (
                f"\n{doc_header_block}{doc_excerpt}{chunk_note}\n"
            )
            if has_client_doc:
                yield {
                    "type": "metadata",
                    "message": (
                        f"[Kontekst] Pełny akt w prompcie (~{len(doc_excerpt)} znaków z "
                        f"{len(full_doc)} OCR; podstawa prawna RAG przed debatą ekspertów)."
                    ),
                }
            if rag_user_content.strip():
                case_context += f"\n[AKTA KLIENTA — RAG]:\n{rag_user_content}\n"
            if proc_block:
                case_context += f"\n{proc_block}\n"
            if timeline_block:
                case_context += f"\n{timeline_block}\n"
            if hypothesis_context_extra.strip():
                case_context += (
                    f"\n[HIPOTEZY]\n{hypothesis_context_extra[:12000]}\n"
                )

        combined_context = case_context
        if legal_basis_block.strip():
            combined_context += f"\n\n{legal_basis_block}\n"
        elif rag_legal_content.strip():
            combined_context += f"\n[PRZEPISY BAZY PRAWNEJ]:\n{rag_legal_content}\n"
            if saos_block:
                combined_context += f"\n[SAOS]:\n{saos_block}\n"
            if eli_block:
                combined_context += f"\n[ELI]:\n{eli_block}\n"

        log_stage_event(
            "combined_context",
            session_id=session_id,
            extra={
                "case_context_chars": len(case_context or ""),
                "combined_context_chars": len(combined_context or ""),
                "legal_basis_chars": len(legal_basis_block or ""),
                "use_context_packer": bool(use_packer),
                "preserve_doc": bool(preserve_doc),
                "doc_budget": int(doc_budget),
                "doc_fraction": float(doc_frac),
                "has_client_doc": bool(has_client_doc),
                "has_private_material": bool(has_private_material),
            },
        )
        
        ctx_obj = RetrievalContext(
            legal_res=legal_res,
            user_res=user_res,
            saos_results=saos_results,
            eli_results=eli_results,
            rag_legal_content=rag_legal_content,
            rag_user_content=rag_user_content,
            legal_basis_block=legal_basis_block,
            case_context=case_context,
            combined_context=combined_context,
            doc_excerpt=doc_excerpt,
            full_doc=full_doc,
            hypothesis_context_extra=hypothesis_context_extra,
            skip_expert_debate=skip_expert_debate,
            rag_n=rag_n,
            saos_n=saos_n,
            eli_n=eli_n,
            proc_block=proc_block,
            valid_articles_cache=valid_articles_cache,
        )
        
        yield {"type": "result", "context": ctx_obj}
