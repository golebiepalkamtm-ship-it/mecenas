import asyncio
import logging
from typing import AsyncGenerator, Dict, Any

from services.orchestrator_types import OrchestratorInputParams
from .context_builder import LegalContextBuilder
from .debate_engine import DebateEngine
from .synthesis_engine import SeniorAdvocateSynthesis

logger = logging.getLogger(__name__)

class OrchestrationPipeline:
    def __init__(self):
        self.context_builder = LegalContextBuilder()
        self.debate_engine = DebateEngine()
        self.synthesis_engine = SeniorAdvocateSynthesis()

    async def execute(self, params: OrchestratorInputParams) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Zupełnie nowa, czysta implementacja koordynatora.
        Każdy etap to wywołanie dedykowanego obiektu.
        Zabezpieczona try-except na każdym kroku w celu zapewnienia stabilności.
        """
        logger.info(f"[PIPELINE] Rozpoczynam przetwarzanie nową architekturą V3. Task: {params.current_task}")

        # Instancja klienta LLM
        llm_service = self.debate_engine.llm_service

        # 1. Budowanie Kontekstu i Karty Sprawy (Briefing Engine)
        yield {"type": "metadata", "message": "[Etap 1] Generowanie Karty Sprawy i szukanie w bazach..."}
        await asyncio.sleep(0.5)
        
        try:
            context_result = await self.context_builder.build_context(params, llm_service)
        except Exception as e:
            logger.exception("[PIPELINE] Krytyczny błąd budowania kontekstu, stosuję pusty kontekst")
            from .context_builder import InvestigationContext
            context_result = InvestigationContext(
                legal_blocks="",
                user_blocks="",
                saos_blocks="",
                eli_blocks="",
                chat_history="",
                document_text="",
                combined_full_text=f"[Błąd budowania kontekstu: {str(e)}]",
                raw_legal_results=[],
                raw_saos_results=[],
                raw_eli_results=[],
                skip_debate=True,
                route_reason="context_error",
            )
        
        # 2. Debata Ekspertów (MOA) — uruchamiana w tle
        debate_result_or_task = None
        if context_result.skip_debate:
            yield {
                "type": "metadata",
                "message": f"[Etap 2] Ścieżka uproszczona — pomijam debatę MOA ({context_result.route_reason or 'routing'})",
            }
            from .debate_engine import DebateResult
            debate_result_or_task = DebateResult(
                expert_opinions=[],
                success_probability=-1.0,
                urgency_alerts=[],
            )
        else:
            yield {"type": "metadata", "message": "[Etap 2] Rozpoczynam równoległą debatę ekspertów w tle..."}
            debate_result_or_task = asyncio.create_task(self.debate_engine.run_debate(params, context_result))

        # 3. Synteza Końcowa (Główny Adwokat) z Metrykami (Advocate Metrics)
        yield {"type": "metadata", "message": "[Etap 3] Synteza końcowa z weryfikacją halucynacji..."}
        
        # Pobieramy instancję LLMClientService utworzoną w DebateEngine
        llm_service = self.debate_engine.llm_service
        final_answer = ""
        
        try:
            async for chunk in self.synthesis_engine.synthesize_stream(params, context_result, debate_result_or_task, llm_service):
                if chunk.get("type") == "chunk":
                    final_answer += chunk.get("text", "")
                yield chunk
        except Exception as e:
            logger.exception("[PIPELINE] Krytyczny błąd syntezy końcowej")
            err_msg = f"\n[BŁĄD SYSTEMOWY] Wystąpił nieoczekiwany błąd podczas syntezy: {str(e)}"
            yield {"type": "chunk", "text": err_msg}
            final_answer += err_msg
            
        # Pobieramy wynik debaty po zakończeniu syntezy (na pewno jest już gotowy)
        if isinstance(debate_result_or_task, asyncio.Task):
            try:
                debate_result = await debate_result_or_task
            except Exception as debate_err:
                logger.exception("[PIPELINE] Krytyczny błąd asynchronicznej debaty ekspertów")
                from .debate_engine import DebateResult
                from database import get_setting
                fallback_m = get_setting("assigned_model_fast")
                debate_result = DebateResult(
                    expert_opinions=[{
                        "role": "Ekspert Rezerwowy",
                        "model": params.selected_model or fallback_m,
                        "response": f"Nie udało się przeprowadzić pełnej debaty z powodu błędu: {str(debate_err)}",
                        "latency_ms": 0,
                        "error": True
                    }],
                    success_probability=-1.0,
                    urgency_alerts=[]
                )
        else:
            debate_result = debate_result_or_task
            
        # Faza 3: Reflection Loop
        from config import settings
        if settings.feature_reflection_loop and final_answer:
            yield {"type": "metadata", "message": "[Self-Critic] Weryfikacja jakości odpowiedzi..."}
            from services.orchestrator_v2.reflection_loop import ReflectionLoop
            reflector = ReflectionLoop()
            reflection_result = await reflector.evaluate_answer(
                draft_answer=final_answer,
                user_query=params.user_query,
                context_text=context_result.combined_full_text,
                llm_service=llm_service,
                threshold=settings.reflection_score_threshold,
                hallucination_rate=getattr(debate_result, "hallucination_rate", 0.0)
            )
            
            if reflection_result.needs_regeneration:
                yield {"type": "chunk", "text": "\n\n---\n*System (Self-Critic) wygenerował uzupełnienie do powyższej opinii:*\n\n"}
                yield {"type": "metadata", "message": "[Self-Critic] Trwa uzupełnianie braków..."}
                
                correction_prompt = f"Twoja poprzednia odpowiedź otrzymała ocenę {reflection_result.score:.2f} z powodu następujących braków:\n" + "\n".join([f"- {issue}" for issue in reflection_result.issues]) + "\nNapisz zwięzłe uzupełnienie, które adresuje WYŁĄCZNIE te braki. Zacznij od słów np. 'Tytułem uzupełnienia...'."
                from database import get_setting
                advocate_model = params.aggregator_model or params.selected_model or get_setting("assigned_model_judge")
                
                try:
                    correction_text, _ = await llm_service.call_with_fallback(
                        advocate_model,
                        [
                            {"role": "system", "content": "Jesteś Głównym Adwokatem. Musisz uzupełnić swoją analizę na podstawie uwag z weryfikacji jakości."},
                            {"role": "user", "content": f"ZAPYTANIE KLIENTA:\n{params.user_query}\n\nUWAGI AUDYTU:\n{correction_prompt}"}
                        ],
                        max_tokens=1500,
                        temperature=0.3,
                        timeout=60.0,
                        log_context="ReflectionCorrection"
                    )
                    if correction_text:
                        yield {"type": "chunk", "text": correction_text}
                        final_answer += "\n\n---\n*Uzupełnienie po audycie jakości:*\n\n" + correction_text
                except Exception as e:
                    logger.warning(f"[PIPELINE] Błąd generowania uzupełnienia: {e}")
            
        # Zakończenie strumienia - budowanie cited_sources
        try:
            from services.statute_excerpt_service import build_cited_sources_for_answer
            cited_sources_payload = await build_cited_sources_for_answer(
                answer_text=final_answer,
                document_text=context_result.document_text,
                combined_context=context_result.combined_full_text,
                legal_results=context_result.raw_legal_results,
                saos_results=context_result.raw_saos_results,
                eli_results=context_result.raw_eli_results,
                expert_analysis="\n".join([str(op.get("response", "")) for op in debate_result.expert_opinions]),
                hallucinated_keys=set(getattr(debate_result, "hallucinated_citations", [])),
                max_sources=24
            )
        except Exception as e:
            logger.exception("[PIPELINE] Błąd budowania cited_sources")
            cited_sources_payload = []
        
        # Obliczenie dynamicznego wskaźnika pewności (confidence_score)
        # Używamy kalibrowanej heurystyki z services.confidence_scoring
        from services.confidence_scoring import compute_confidence_score
        
        all_cites_count = getattr(debate_result, "all_citations_count", 0)
        unverified_count = len(getattr(debate_result, "hallucinated_citations", []))
        
        confidence_score = compute_confidence_score(
            legal_results=context_result.raw_legal_results,
            user_results=[{"content": context_result.user_blocks}] if context_result.user_blocks else [],
            saos_results=context_result.raw_saos_results,
            eli_results=context_result.raw_eli_results,
            all_cites_count=all_cites_count,
            unverified_count=unverified_count,
            coi_conflicts=[],
            timeline_inconsistencies=[],
            empty_agents=0,
            expert_success_agreement=getattr(debate_result, "counter_argument_quality", 0.75) * 100.0,
        )
        
        from services.observability import log_quality_metrics
        metrics = {
            "confidence_score": round(confidence_score, 1),
            "all_cites_count": all_cites_count,
            "hallucination_rate": getattr(debate_result, "hallucination_rate", 0.0),
            "hallucinated_citations": getattr(debate_result, "hallucinated_citations", []),
            "counter_argument_quality": getattr(debate_result, "counter_argument_quality", 0.0),
            "experts_count": len(getattr(debate_result, "expert_opinions", []))
        }
        log_quality_metrics(params.session_id or "unknown", metrics)
        
        # Zakończenie strumienia z final_metadata
        yield {
            "type": "final_metadata",
            "sources": [],
            "expert_analyses": debate_result.expert_opinions,
            "pipeline_latency_ms": 0,
            "confidence_score": round(confidence_score, 1),
            "cited_sources": cited_sources_payload
        }
            
        logger.info("[PIPELINE] Przetwarzanie zakończone sukcesem.")

