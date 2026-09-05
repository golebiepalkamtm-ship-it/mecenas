import time
import logging
import asyncio
from typing import Dict, Any, List, Optional, AsyncGenerator

from services.config import settings
from services.debate.cross_exam import run_debate_cross_exam
from services.debate.reconciliation import reconcile_expert_debate
from services.expert_context import expert_context_with_chunk
from services.expert_roles import resolve_expert_role_block
from services.llm_gateway import call_with_fallback
from services.model_resolution import resolve_model_id
from services.pii_mask import mask_pii
from services.schemas import ExpertAnalysis
from services import msg_builder

logger = logging.getLogger(__name__)

class DebateManager:
    """
    Zarządza równoległą debatą ekspertów MOA (Mixture of Agents).
    Uruchamia agentów wykładni, procedury, strategii i kontrargumentacji.
    Następnie inicjuje przesłuchania krzyżowe i protokół pojednania.
    """
    def __init__(self, _orchestrator_ref=None):
        self.orchestrator = _orchestrator_ref

    async def run_debate_stream(
        self,
        skip_expert_debate: bool,
        use_fast_path: bool,
        zanonimizowane_zapytanie: str,
        combined_context: str,
        expert_roles: Dict[str, Any],
        expert_role_prompts: Dict[str, Any],
        merged_role_catalog: Dict[str, Any],
        prompt_side: str,
        case_context: str,
        full_doc: str,
        client_addressee: Dict[str, Any],
        query_for_retrieval: str,
        resolved_task_block: str,
        legal_basis_block: str,
        primary_model: str,
        client: Any,
        status_callback: Any,
        zanonimizowana_historia: str,
        inv_state: Any,
    ) -> AsyncGenerator[Any, None]:
        
        _t_stage8 = time.perf_counter()
        agent_results = []
        researcher_responses = ""

        if skip_expert_debate:
            if use_fast_path:
                yield {
                    "type": "metadata",
                    "message": "[Etap 8] Szybka ścieżka: synteza bez debaty ekspertów.",
                }
                logger.info("   [STAGE 8] Fast path — pominięto debatę MOA")
            else:
                yield {
                    "type": "metadata",
                    "message": "[Etap 8] Tryb pojedynczy (debate wyłączona): pomijam debatę ekspertów.",
                }
                logger.info("   [STAGE 8] Tryb single — debata ekspertów pominięta")
            if use_fast_path:
                researcher_responses = (
                    "=== ANALIZA BEZ DEBATY EKSPERTÓW ===\n"
                    f"Pytanie: {zanonimizowane_zapytanie[:800]}\n\n"
                    "Odpowiedz wyłącznie na podstawie cytowanych fragmentów w [BAZA WIEDZY PRAWNEJ] / RAG (oraz ewentualnie SAOS/ELI, jeśli są podane). "
                    "Jeśli w dostarczonych fragmentach nie ma podstawy do omówienia całej procedury, powiedz to wprost i wyjaśnij tylko to, co wynika z cytatu.\n"
                )
            else:
                safe_context_excerpt = mask_pii(combined_context[:1200])
                researcher_responses = (
                    "=== ANALIZA BEZ DEBATY EKSPERTÓW ===\n"
                    f"Pytanie: {zanonimizowane_zapytanie[:800]}\n\n"
                    "Oprzyj odpowiedź na fragmentach RAG i SAOS poniżej. "
                    "Wyjaśnij treść wskazanego przepisu, elementy ustawowe i praktykę — bez wymyślania faktów ze sprawy.\n\n"
                    "[KONTEKST ZREDAGOWANY (bez danych wrażliwych) — fragment]\n"
                    f"{safe_context_excerpt}"
                )
        else:
            async def run_agent(model_id: str, role_name: str, messages: list):
                try:
                    start_agent_time = time.time()
                    try:
                        response, used_model = await call_with_fallback(
                            model_id,
                            messages,
                            max_tokens=2600,
                            temperature=0.22,
                            timeout=75.0,
                            status_callback=status_callback,
                            log_context=f"ETAP 8 {role_name}",
                            response_format=ExpertAnalysis,
                        )
                    except Exception as e:
                        logger.warning(f"   [STAGE 8 ERR] {role_name} primary try failed: {e}")
                        response, used_model = await call_with_fallback(
                            model_id,
                            messages,
                            max_tokens=2400,
                            temperature=0.2,
                            timeout=90.0,
                            status_callback=status_callback,
                            log_context=f"ETAP 8 {role_name} FALLBACK",
                            response_format=ExpertAnalysis,
                        )
                    logger.info(f"   [STAGE 8 END] {role_name} done in {time.time() - start_agent_time:.1f}s")
                    return {
                        "model_id": model_id,
                        "role_name": role_name,
                        "response": response,
                        "used_model": used_model,
                        "success": True
                    }
                except Exception as e:
                    logger.error(f"   [STAGE 8 CRITICAL] {role_name} failed: {e}")
                    return {
                        "model_id": model_id,
                        "role_name": role_name,
                        "response": None,
                        "used_model": None,
                        "success": False,
                        "error": str(e)
                    }

            expert_specs = [
                (
                    resolve_model_id((expert_roles.get("doctrinal") or {}).get("model")),
                    "Agent Wykładu Przepisów",
                    "rag_researcher",
                    "Wykładnia przepisów"
                ),
                (
                    resolve_model_id((expert_roles.get("procedure") or {}).get("model")),
                    "Agent Procedury",
                    "rag_researcher",
                    "Kwestie proceduralne"
                ),
                (
                    resolve_model_id((expert_roles.get("strategic") or {}).get("model")),
                    "Agent Strategii i Furtek",
                    "master_strategist",
                    "Strategia procesowa i furtki"
                ),
                (
                    resolve_model_id((expert_roles.get("counter") or {}).get("model")),
                    "Agent Kontrargumentacji",
                    "master_strategist",
                    "Słabości i kontrargumenty"
                )
            ]
            if not inv_state:
                expert_specs = expert_specs[:3]

            yield {
                "type": "metadata",
                "message": f"[Etap 8] Równoległa debata {len(expert_specs)} ekspertów (RAG przed debatą: {len(legal_basis_block)} znaków)...",
            }
            logger.info(
                "   [STAGE 8] Równoległa debata ekspertów: %s slotów",
                len(expert_specs),
            )

            parallel_tasks = []
            for idx, (model_id, role_name, default_role, chunk_focus) in enumerate(expert_specs):
                role_block = resolve_expert_role_block(
                    model_id=model_id,
                    default_role=default_role,
                    expert_roles=expert_roles,
                    expert_role_prompts=expert_role_prompts,
                    role_catalog=merged_role_catalog,
                    side=prompt_side,
                )
                chunk_slot = idx % 3
                expert_ctx = expert_context_with_chunk(
                    base_context=case_context,
                    full_document=full_doc,
                    expert_index=chunk_slot,
                    chunk_focus=chunk_focus,
                )
                addressee_hint = ""
                if client_addressee.get("formal_address"):
                    addressee_hint = (
                        f"\n[STRONA — interes klienta]\n"
                        f"Reprezentujesz interesy: {client_addressee['formal_address']}.\n"
                    )
                expert_user_q = query_for_retrieval[: settings.document_context_chars]
                task_block = (addressee_hint + resolved_task_block).strip()
                expert_messages = msg_builder.build_expert_messages(
                    role_block,
                    task_block,
                    expert_ctx,
                    expert_user_q,
                    legal_basis_block=legal_basis_block,
                )
                parallel_tasks.append(run_agent(model_id, role_name, expert_messages))

            yield {
                "type": "metadata",
                "message": f"   [STATUS] {len(parallel_tasks)} ekspertów analizuje sprawę równolegle (MOA)...",
            }
            agent_results = await asyncio.gather(*parallel_tasks)
            analysis_1, analysis_2, analysis_3 = agent_results[0], agent_results[1], agent_results[2]

            cross_exam = ""
            if len(agent_results) >= 3 and not use_fast_path:
                cross_exam = await run_debate_cross_exam(
                    agent_results=agent_results,
                    combined_context=combined_context,
                    user_query=zanonimizowane_zapytanie,
                    primary_model=primary_model,
                    status_callback=status_callback,
                )
                if cross_exam:
                    yield {"type": "metadata", "message": "[Etap 8 R2] Cross-examination debaty."}

            logger.info(
                "   [STAGE 8] Debata zakończona — %s/%s agentów OK.",
                sum(1 for a in agent_results if a.get("success")),
                len(agent_results),
            )

            yield {"type": "metadata", "message": "[Etap 8b] Pojednanie debaty: synteza zgodności i sprzeczności między ekspertami..."}
            debate_protocol = await reconcile_expert_debate(
                model_id=primary_model,
                analysis_1=analysis_1,
                analysis_2=analysis_2,
                analysis_3=analysis_3,
                user_query=query_for_retrieval[:2000],
                conversation_snippet=zanonimizowana_historia,
                legal_basis_block=legal_basis_block,
                status_callback=status_callback,
            )

            researcher_responses = (
                f"=== DEBATA RÓWNOLEGŁA EKSPERTÓW ({len(agent_results)} niezależnych analiz) ===\n\n"
            )
            if cross_exam:
                researcher_responses += (
                    f"--- CROSS-EXAMINATION (R2) ---\n{cross_exam}\n\n"
                )
            if debate_protocol:
                researcher_responses += (
                    f"--- PROTOKÓŁ POJEDNANIA DEBATY (dla Głównego Adwokata) ---\n{debate_protocol}\n\n"
                )
            researcher_responses += (
                f"--- 1. STANOWISKO DOKTRYNALNE ---\nEkspert: {analysis_1.get('model', analysis_1.get('used_model', analysis_1.get('model_id', 'Brak')))}\n{analysis_1.get('response', 'Brak odpowiedzi')}\n\n"
                f"--- 2. OCENA RYZYK PROCESOWYCH ---\nEkspert: {analysis_2.get('model', analysis_2.get('used_model', analysis_2.get('model_id', 'Brak')))}\n{analysis_2.get('response', 'Brak odpowiedzi')}\n\n"
                f"--- 3. KONTRARGUMENTACJA (ADWOKAT DIABŁA) ---\nEkspert: {analysis_3.get('model', analysis_3.get('used_model', analysis_3.get('model_id', 'Brak')))}\n{analysis_3.get('response', 'Brak odpowiedzi')}"
            )
            for j, ar in enumerate(agent_results[3:], start=4):
                researcher_responses += (
                    f"\n\n--- {j}. DODATKOWY EKSPERT ---\nEkspert: {ar.get('model', ar.get('used_model', ar.get('model_id', 'Brak')))}\n{ar.get('response', 'Brak odpowiedzi')}"
                )

            yield {"type": "metadata", "expert_analyses": agent_results}

        yield {
            "type": "result",
            "researcher_responses": researcher_responses,
            "agent_results": agent_results,
            "t_stage8": _t_stage8
        }
