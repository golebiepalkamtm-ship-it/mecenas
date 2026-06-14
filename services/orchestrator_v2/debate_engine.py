import asyncio
import logging
from typing import Dict, Any, List
from dataclasses import dataclass

from services.orchestrator_types import OrchestratorInputParams
from .context_builder import InvestigationContext
from services.llm_client import LLMClientService

logger = logging.getLogger(__name__)

@dataclass
class DebateResult:
    expert_opinions: List[Dict[str, Any]]
    success_probability: float
    urgency_alerts: List[Dict[str, Any]]

class DebateEngine:
    """
    Silnik debaty wykorzystujący asyncio.gather do zrównoleglenia pracy ekspertów.
    Czysta implementacja bez 20-poziomowych zagnieżdżeń.
    """
    def __init__(self):
        import os
        from openai import AsyncOpenAI
        
        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY", ""),
            default_headers={
                "HTTP-Referer": "https://lexmind.pl",
                "X-Title": "LexMind Legal Assistant",
            },
        )
        self.llm_service = LLMClientService(client=self.client)

    async def run_debate(self, params: OrchestratorInputParams, context: InvestigationContext) -> DebateResult:
        logger.info("[DebateEngine] Przygotowanie ról i uruchamianie ekspertów (MOA)...")
        
        # W starej architekturze był to ogromny blok _resolve_expert_role_block
        expert_tasks = []
        
        from moa.prompt_builder import get_role_prompt
        
        active_models = params.selected_models or []
        for model_id, role_id in (params.expert_roles or {}).items():
            if active_models and model_id not in active_models:
                continue
            
            prompt = (params.expert_role_prompts or {}).get(model_id, "")
            
            if not prompt and role_id:
                prompt = (params.role_catalog or {}).get(role_id)
                if not prompt:
                    prompt = get_role_prompt(role_id, side="defense")
                    
            if not prompt:
                prompt = params.system_role_prompt or "Jesteś wybitnym ekspertem prawnym. Przeanalizuj problem."
                
            logger.info(f"   -> Planowanie agenta: {model_id} (rola: {role_id})")
            expert_tasks.append(self._run_single_expert(role_id or "Ekspert", prompt, model_id, params.user_query, context))
            
        # Równoległe wykonanie
        results = await asyncio.gather(*expert_tasks, return_exceptions=True)
        
        opinions = []
        for res in results:
            if isinstance(res, Exception):
                logger.error(f"[DebateEngine] Błąd agenta: {res}")
            else:
                opinions.append(res)
                
        # Tutaj w przyszłości można dodać mechanizm uzgadniania (Reconcile) 
        # i oceny szans procesowych (jak dawny Etap 9).
        p_sukces = 50.0 # Placeholder
        
        return DebateResult(
            expert_opinions=opinions,
            success_probability=p_sukces,
            urgency_alerts=[]
        )

    async def _run_single_expert(self, role_name: str, prompt: str, model: str, query: str, context: InvestigationContext) -> Dict[str, Any]:
        """Izolowane wykonanie jednego agenta z obsługą błędów."""
        import time
        start_time = time.time()
        
        try:
            # Ucinamy nadmierny kontekst żeby nie przekroczyć okna
            truncated_context = context.combined_full_text[:50000] 
            
            messages = [
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"ZAPYTANIE UŻYTKOWNIKA:\n{query}\n\nKONTEKST (Materiały, dokumenty, przepisy):\n{truncated_context}"}
            ]
            
            response, used_model = await self.llm_service.call_with_fallback(
                model, 
                messages, 
                max_tokens=1500, 
                temperature=0.2, 
                timeout=75.0,
                log_context=f"EXPERT_{role_name}"
            )
            
            return {
                "role": role_name,
                "model": used_model,
                "response": response,
                "latency_ms": int((time.time() - start_time) * 1000)
            }
        except Exception as e:
            logger.error(f"[DebateEngine] Błąd wywołania experta {role_name}: {e}")
            return {
                "role": role_name,
                "model": model,
                "response": f"BŁĄD: Nie udało się wygenerować opinii ({str(e)})",
                "latency_ms": int((time.time() - start_time) * 1000),
                "error": True
            }
