import asyncio
import logging
import os
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from openai import AsyncOpenAI

from services.orchestrator_types import OrchestratorInputParams
from .context_builder import InvestigationContext
from services.llm_client import LLMClientService
from services.orchestrator_v2.debate_gather import gather_experts_adaptive
from moa.prompt_builder import get_role_prompt
from config import settings

logger = logging.getLogger(__name__)

@dataclass
class DebateResult:
    expert_opinions: List[Dict[str, Any]]
    success_probability: float
    urgency_alerts: List[Dict[str, Any]]
    hallucination_rate: float = 0.0
    hallucinated_citations: List[str] = field(default_factory=list)
    counter_argument_quality: float = 0.0

class DebateEngine:
    """
    Silnik debaty MOA — równoległe ekspertyzy z adaptacyjnym cutoff (gather_experts_adaptive).
    """
    def __init__(self):
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
        
        # Fallback if expert_roles is empty
        default_roles = ["inquisitor", "proceduralist", "constitutionalist", "evidencecracker"]
        
        active_models = params.selected_models or []
        expert_roles = params.expert_roles or {}
        
        # If expert_roles is empty, but we have active_models, fallback to assigning default roles to active_models
        if not expert_roles and active_models:
            expert_roles = {model_id: default_roles[i % len(default_roles)] for i, model_id in enumerate(active_models)}
            
        # If still empty, use default fallback models from params.selected_model or a standard model
        if not expert_roles:
            from database import get_setting
            fallback_model = params.selected_model or get_setting("assigned_model_fast", "google/gemini-2.5-flash-lite")
            expert_roles = {fallback_model: "inquisitor"}
            
        from moa.prompt_builder import get_task_prompt
        task_prompt_val = params.task_prompt or ""
        if not task_prompt_val and params.current_task:
            task_prompt_val = get_task_prompt(params.current_task, side="defense")

        expert_specs: List[tuple] = []
        for idx, (model_id, role_id) in enumerate(expert_roles.items()):
            if active_models and model_id not in active_models:
                continue
            
            prompt = (params.expert_role_prompts or {}).get(model_id, "")
            
            if not role_id:
                role_id = default_roles[idx % len(default_roles)]
            
            if not prompt and role_id:
                prompt = (params.role_catalog or {}).get(role_id)
                if not prompt:
                    prompt = get_role_prompt(role_id, side="defense")
                    
            if not prompt:
                prompt = params.system_role_prompt or "Jesteś wybitnym ekspertem prawnym. Przeanalizuj problem."
                
            if task_prompt_val:
                prompt += f"\n\nWYBRANE ZADANIE AI DO WYKONANIA:\n{task_prompt_val}"
                
            from config import settings
            if settings.feature_iterative_retrieval:
                prompt += "\n\n[ITERATIVE RETRIEVAL]\nJeśli potrzebujesz wyszukać konkretny przepis lub orzeczenie, którego NIE MA w kontekście, wpisz TYLKO: <search_law>czego szukasz</search_law> i zaczekaj na wynik. Możesz tego użyć maksymalnie 2 razy. Jeśli masz wystarczająco danych, przejdź do odpowiedzi."
                
            prompt += "\n\nINSTRUKCJA KRYTYCZNA: Zanim sformułujesz ostateczną opinię, ZAWSZE użyj tagów <thinking>...</thinking>, aby krok po kroku przeanalizować problem, zważyć racje, odszukać luki w rozumowaniu własnym i przeciwników oraz zaplanować żelazną logikę wypowiedzi. Dopiero po zamknięciu tagu </thinking> podaj właściwą opinię ekspercką."
                
            role_name = role_id or "Ekspert"
            logger.info(f"   -> Planowanie agenta: {model_id} (rola: {role_name})")
            expert_specs.append((role_name, prompt, model_id))

        expert_coros = [
            self._run_single_expert(role_name, prompt, model_id, params.user_query, context)
            for role_name, prompt, model_id in expert_specs
        ]
        labels = [s[0] for s in expert_specs]

        results = await gather_experts_adaptive(expert_coros, labels=labels)
        logger.info("[DebateEngine] [OK] Debata zakończona (adaptive gather)")
        
        opinions = []
        for res in results:
            if res.get("error"):
                logger.warning(f"[DebateEngine] Agent '{res.get('role')}' zwrócił błąd: {res.get('response')}")
            else:
                opinions.append(res)
                
        # Expert Scoring (Faza 3)
        if settings.feature_expert_scoring and opinions:
            logger.info("[DebateEngine] Rozpoczynam ocenę ekspertów (Expert Scoring)...")
            score_coros = [self._score_expert(op, params.user_query) for op in opinions]
            scored_opinions = await asyncio.gather(*score_coros, return_exceptions=True)
            for i, op in enumerate(opinions):
                score_res = scored_opinions[i]
                if isinstance(score_res, dict) and "score" in score_res:
                    op["expert_score"] = score_res["score"]
                else:
                    op["expert_score"] = 75.0  # Default fallback score
                    
        # Verification Agent (Faza 5)
        if getattr(settings, "feature_verification_agent", True) and opinions:
            logger.info("[DebateEngine] Weryfikacja opinii przez VerificationAgent...")
            from services.orchestrator_v2.verification_agent import VerificationAgent
            va = VerificationAgent()
            opinions = await va.verify_opinions(opinions, params.user_query, context.combined_full_text, self.llm_service)
            
            # Doklejamy flagi weryfikacji do 'response', żeby ConsensusEngine je widział
            for op in opinions:
                if "verification_flag" in op and op["verification_flag"] != "ZATWIERDZONO":
                    op["response"] = f"[WERYFIKACJA SYSTEMOWA: {op['verification_flag']}]\n\n{op['response']}"
                
        # Tutaj w przyszłości można dodać mechanizm uzgadniania (Reconcile) 
        # i oceny szans procesowych (jak dawny Etap 9).
        p_sukces = -1.0 # Brak obliczeń na tym etapie
        
        return DebateResult(
            expert_opinions=opinions,
            success_probability=p_sukces,
            urgency_alerts=[]
        )

    async def _run_single_expert(self, role_name: str, prompt: str, model: str, query: str, context: InvestigationContext, max_context_chars: Optional[int] = None) -> Dict[str, Any]:
        """Izolowane wykonanie jednego agenta z obsługą błędów."""
        start_time = time.time()
        
        try:
            if max_context_chars is None:
                from services.orchestrator_v2.token_budget import calculate_char_budget
                # Reserve 3000 tokens for expert opinion generation
                max_context_chars = calculate_char_budget(model, reserve_output_tokens=3000)
                logger.info(f"[DebateEngine] Dynamiczny budżet kontekstu dla eksperta '{role_name}' ({model}): {max_context_chars} znaków.")

            # Ucinamy nadmierny kontekst żeby nie przekroczyć okna
            truncated_context = context.combined_full_text[:max_context_chars] 
            
            from config import settings
            messages = [
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"ZAPYTANIE UŻYTKOWNIKA:\n{query}\n\nKONTEKST (Materiały, dokumenty, przepisy):\n{truncated_context}"}
            ]
            
            max_iterations = 3 if settings.feature_iterative_retrieval else 1
            used_model = model
            response = ""
            
            for iteration in range(max_iterations):
                response, used_model = await self.llm_service.call_with_fallback(
                    model, 
                    messages, 
                    max_tokens=3000, 
                    temperature=0.2, 
                    timeout=settings.debate_expert_timeout_sec,
                    log_context=f"EXPERT_{role_name}_iter{iteration}"
                )
                
                import re
                search_match = re.search(r"<search_law>(.*?)</search_law>", response, re.DOTALL)
                if search_match and iteration < max_iterations - 1:
                    search_query = search_match.group(1).strip()
                    logger.info(f"[IterativeRetrieval] Agent '{role_name}' szuka: {search_query}")
                    
                    # W pełnej wersji tutaj podłączamy prawdziwe wyszukiwanie (np. w bazie Qdrant/SAOS)
                    mock_result = f"Wynik wyszukiwania dla '{search_query}': [Brak dodatkowych dopasowań w bazie testowej, bazuj na wiedzy ogólnej i wywnioskuj samodzielnie.]"
                    
                    messages.append({"role": "assistant", "content": response})
                    messages.append({"role": "user", "content": f"WYNIK WYSZUKIWANIA:\n{mock_result}\nKontynuuj analizę."})
                else:
                    break
            
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

    async def _score_expert(self, expert_data: Dict[str, Any], user_query: str) -> Dict[str, Any]:
        """Szybka ocena odpowiedzi eksperta (0-100)."""
        from database import get_setting
        import re
        fast_model = get_setting("assigned_model_fast", "openai/gpt-4o-mini")
        prompt = (
            "Oceń jakość poniższej analizy eksperckiej pod kątem trafności, precyzji prawniczej i logiki.\n"
            "Zwróć TYLKO wynik punktowy od 0 do 100 (jako liczba całkowita). Nie pisz żadnych innych słów."
        )
        try:
            resp, _ = await self.llm_service.call_with_fallback(
                fast_model,
                [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"PYTANIE: {user_query}\n\nANALIZA EKSPERTA: {expert_data.get('response', '')[:4000]}"}
                ],
                max_tokens=10,
                temperature=0.1,
                timeout=15.0,
                log_context="ExpertScoring"
            )
            match = re.search(r"\b([0-9]{1,2}|100)\b", resp)
            score = float(match.group(1)) if match else 75.0
            return {"score": score}
        except Exception as e:
            logger.warning(f"[DebateEngine] Błąd scoringu eksperta: {e}")
            return {"score": 75.0}
