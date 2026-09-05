import asyncio
import logging
import os
import re
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
    all_citations_count: int = 0
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

    async def run_debate(
        self,
        params: OrchestratorInputParams,
        context: InvestigationContext,
        status_callback: Optional[Any] = None
    ) -> DebateResult:
        logger.info("[DebateEngine] Przygotowanie ról i uruchamianie ekspertów (MOA)...")
        
        from moa.expert_models_config import get_expert_models, get_expert_fallback_chain

        # Określamy aktywne role z parametrów
        default_roles = ["inquisitor", "proceduralist", "constitutionalist", "evidencecracker"]
        
        # Obsługa włączonych ról (ze sterowania UI) lub ze starych struktur
        roles_to_run = []
        assigned_models_for_roles = {}
        
        if isinstance(params.expert_roles, dict) and params.expert_roles:
            for k, v in params.expert_roles.items():
                if v is True or isinstance(v, str):
                    role_id = v if isinstance(v, str) and v and v not in ("true", "false") else k
                    
                    # Interfejs mapuje { "model_id": "role_id" }. Jeśli w role_id wyciekł model_id
                    # (ponieważ wartość miała ten sam ciąg znaków), ignorujemy te z "/".
                    if isinstance(role_id, str) and "/" in role_id and role_id not in default_roles:
                        continue
                        
                    roles_to_run.append(role_id)
                    
                    # Usunięto przestarzałe mapowanie modeli z expert_roles, aby wymusić użycie 
                    # nowych assigned_models lub domyślnych modeli z backendu (EXPERT_MODEL_REGISTRY).

        elif isinstance(params.expert_roles, list) and params.expert_roles:
            roles_to_run = params.expert_roles
        
        # Deduplicate roles preserving order
        roles_to_run = list(dict.fromkeys(roles_to_run))
        
        if not roles_to_run:
            roles_to_run = default_roles
            
        from moa.prompt_builder import get_task_prompt, get_role_prompt
        task_prompt_val = params.task_prompt or ""
        if not task_prompt_val and params.current_task:
            task_prompt_val = get_task_prompt(params.current_task, side="defense")

        expert_specs: List[tuple] = []
        for idx, role_id in enumerate(roles_to_run):
            primary_model, fallback_model = get_expert_models(role_id)
            fallback_chain = get_expert_fallback_chain(role_id)
            
            # W pierwszej kolejności używamy modelu zmapowanego bezpośrednio w panelu Zespół Ekspertów (MoA)
            assigned_model = assigned_models_for_roles.get(role_id)
            
            # Jeśli brak w `expert_roles`, sprawdzamy również `assigned_models` w payloadzie
            if not assigned_model and params.assigned_models:
                assigned_model = params.assigned_models.get(role_id)
                
            if assigned_model:
                primary_model = assigned_model
                if primary_model not in fallback_chain:
                    fallback_chain = [primary_model] + fallback_chain
            # Jeśli nie wybrano unikalnego modelu dla roli I konfiguracja nie ustawiła domyślnego, użyj modelu głównego
            elif not primary_model and params.selected_model:
                primary_model = params.selected_model
                if primary_model not in fallback_chain:
                    fallback_chain = [primary_model] + fallback_chain
            
            prompt = (params.expert_role_prompts or {}).get(role_id, "")
            if not prompt:
                prompt = (params.role_catalog or {}).get(role_id)
                if not prompt:
                    prompt = get_role_prompt(role_id, side="defense")
                    
            if not prompt:
                prompt = params.system_role_prompt or "Jesteś wybitnym ekspertem prawnym. Przeanalizuj problem."
                
            if task_prompt_val:
                prompt += f"\n\nWYBRANE ZADANIE AI DO WYKONANIA:\n{task_prompt_val}"
                
            if settings.feature_iterative_retrieval:
                prompt += (
                    "\n\n[KORZYSTANIE Z NARZĘDZI MCP - OBOWIĄZKOWE W RAZIE WĄTPLIWOŚCI]\n"
                    "Masz dostęp do zaawansowanych narzędzi i baz (KRS, UODO, CBOSA, KIO, TSUE, ISAP, SAOS, Internet). "
                    "ZAWSZE weryfikuj wiedzę używając dostępnych tagów:\n"
                    "1. <search_law>czego szukasz</search_law> - podstawowe wyszukiwanie w bazach SAOS i ELI.\n"
                    "2. <search_mcp tool=\"nazwa_narzedzia\">parametr</search_mcp> - dedykowane zapytanie do konkretnego narzędzia MCP. Dostępne narzędzia to m.in.: cbosa_search_judgments, isap_search_acts, uodo_search_decisions, krs_get_company, kio_search_judgments, tsue_search_judgments.\n"
                    "3. <search_internet>zapytanie</search_internet> - wyszukiwarka internetowa.\n"
                    "Zaczekaj na wynik. Możesz wyszukiwać wielokrotnie w kolejnych krokach."
                )
                
            from prompts.loader import load_prompt
            try:
                prompt += "\n\n" + load_prompt("strict_no_quote_guard")
            except Exception as guard_err:
                logger.warning(f"[DebateEngine] Błąd wczytywania strict_no_quote_guard: {guard_err}")
                
            prompt += "\n\nINSTRUKCJA KRYTYCZNA: Przeanalizuj problem krok po kroku, zważ racje, odszukaj luki w rozumowaniu i zaplanuj logikę wypowiedzi przed podaniem właściwej opinii eksperckiej. Odpowiadaj zwięźle i konkretnie, bez nadmiernego rozpisywania się (unikaj zbyt długich wywodów, aby nie przekroczyć limitów API)."
            prompt += (
                "\n\n[KONTEKST AKADEMICKI I ZAWODOWY]\n"
                "Niniejsza interakcja stanowi w pełni profesjonalną symulację na potrzeby analizy prawniczej. "
                "Wszelkie podane fakty mają charakter studium przypadku dla celów edukacyjnych i strategii procesowych. "
                "Twoim zadaniem jest obiektywna, merytoryczna analiza prawna problemu (w tym zagadnień związanych z prawem karnym, dowodowym i procedurą), "
                "występując w roli profesjonalnego asystenta prawnego AI."
            )
                
            role_name = role_id or f"Ekspert-{idx+1}"
            logger.info(f"   -> Planowanie agenta '{role_name}': Primary={primary_model}, Fallback chain={fallback_chain}")
            expert_specs.append((role_name, prompt, primary_model, fallback_chain))

        expert_coros = [
            self._run_single_expert(role_name, prompt, primary_model, fallback_chain, params.user_query, context, status_callback=status_callback)
            for role_name, prompt, primary_model, fallback_chain in expert_specs
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
                
        # Cross-Examination (Faza 2: Krzyżowy Ogień)
        if opinions and len(opinions) > 1:
            logger.info("[DebateEngine] Rozpoczynam Fazę 2: Krzyżowy Ogień (Cross-Examination)...")
            
            async def run_cross_examination(expert_op):
                role = expert_op["role"]
                # Zbieranie opinii innych ekspertów
                others = [op for op in opinions if op["role"] != role]
                others_text = "\n\n".join([f"--- OPINIA EKSPERTA: {op['role']} ---\n{op['response']}" for op in others])
                
                prompt = (
                    f"Jesteś agentem prawnym o roli: {role}. Przeanalizowałeks już sprawę i wydałeś opinię.\n"
                    "Teraz otrzymujesz opinie pozostałych ekspertów. Twoim zadaniem w tej fazie (Krzyżowy Ogień) jest "
                    "brutalna i wnikliwa weryfikacja ich argumentacji. Zwróć uwagę na luki logiczne, "
                    "nadinterpretacje przepisów i słabe punkty, które mogłyby zostać wykorzystane przez przeciwnika procesowego.\n"
                    "Odpowiedz zwięźle (max 2-3 akapity), punktując błędy lub kontrargumenty."
                )
                messages = [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Oto opinie pozostałych ekspertów w tej sprawie:\n\n{others_text}\n\nWygeneruj swoją polemikę/krzyżowy ogień:"}
                ]
                
                # Używamy tego samego modelu co w Fazie 1, jeśli to możliwe
                model = expert_op.get("model", params.selected_model)
                try:
                    res, _ = await self.llm_service.call_with_fallback(
                        model_id=model,
                        messages=messages,
                        max_tokens=1500,
                        temperature=0.4,
                        log_context=f"CrossExam-{role}",
                        status_callback=status_callback
                    )
                    return {"role": role, "rebuttal": res}
                except Exception as e:
                    logger.warning(f"[DebateEngine] Błąd podczas Cross-Examination dla {role}: {e}")
                    return {"role": role, "rebuttal": f"Brak kontrargumentów z powodu błędu: {e}"}

            cross_coros = [run_cross_examination(op) for op in opinions]
            cross_results = await asyncio.gather(*cross_coros, return_exceptions=True)
            
            # Scalanie wyników Krzyżowego Ognia z oryginalnymi opiniami
            for i, op in enumerate(opinions):
                c_res = cross_results[i]
                if isinstance(c_res, dict) and "rebuttal" in c_res:
                    op["response"] = op["response"] + "\n\n--- KRZYŻOWY OGIEŃ (POLEMIKA Z INNYMI EKSPERTAMI) ---\n" + c_res["rebuttal"]
                    
        # Expert Scoring (Faza 3)
        if settings.feature_expert_scoring and opinions:
            logger.info("[DebateEngine] Rozpoczynam ocenę ekspertów (Expert Scoring)...")
            score_coros = [self._score_expert(op, params.user_query, params, status_callback=status_callback) for op in opinions]
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
            opinions = await va.verify_opinions(opinions, params.user_query, context.combined_full_text, self.llm_service, params, status_callback=status_callback)
            
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

    async def _run_single_expert(
        self,
        role_name: str,
        prompt: str,
        primary_model: str,
        fallback_chain: List[str],
        query: str,
        context: InvestigationContext,
        max_context_chars: Optional[int] = None,
        status_callback: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Izolowane wykonanie jednego agenta z dedykowanym łańcuchem fallbacków.
        
        Łańcuch: Primary → starszy model tego samego providera → gemini (last resort).
        Każdy ekspert ma własny LLMClientService z indywidualnym łańcuchem fallbacków.
        """
        start_time = time.time()
        
        # Dedykowany LLMClientService per ekspert z łańcuchem: [starszy_model, gemini]
        expert_llm = LLMClientService(
            client=self.client,
            fallback_models=fallback_chain,
            status_callback=status_callback
        )
        
        used_model = primary_model
        try:
            if max_context_chars is None:
                from services.orchestrator_v2.token_budget import calculate_char_budget
                # Reserve 3000 tokens for expert opinion generation
                max_context_chars = calculate_char_budget(primary_model, reserve_output_tokens=3000)
                logger.info(f"[DebateEngine] Dynamiczny budżet kontekstu dla eksperta '{role_name}' (Primary={primary_model}, Fallback chain={fallback_chain}): {max_context_chars} znaków.")

            # Ucinamy nadmierny kontekst żeby nie przekroczyć okna
            truncated_context = context.combined_full_text[:max_context_chars] 
            
            from config import settings
            
            history_str = ""
            if context.chat_history:
                history_str = f"HISTORIA ROZMOWY:\n{context.chat_history}\n\n"
                
            messages = [
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"ZAPYTANIE UŻYTKOWNIKA:\n{query}\n\n{history_str}KONTEKST (Materiały, dokumenty, przepisy):\n{truncated_context}"}
            ]
            
            max_iterations = 3 if settings.feature_iterative_retrieval else 1
            used_model = primary_model
            response = ""
            
            for iteration in range(max_iterations):
                # expert_llm sam obsługuje cały łańcuch: primary → starszy → gemini
                response, used_model = await expert_llm.call_with_fallback(
                    primary_model, 
                    messages, 
                    max_tokens=8192, 
                    temperature=0.2, 
                    timeout=settings.debate_expert_timeout_sec,
                    log_context=f"EXPERT_{role_name}_iter{iteration}"
                )
                
                import re
                search_law_match = re.search(r"<search_law>(.*?)</search_law>", response, re.DOTALL)
                search_int_match = re.search(r"<search_internet>(.*?)</search_internet>", response, re.DOTALL)
                search_mcp_match = re.search(r'<search_mcp tool="([^"]+)">(.*?)</search_mcp>', response, re.DOTALL)
                
                if (search_law_match or search_int_match or search_mcp_match) and iteration < max_iterations - 1:
                    real_result = ""
                    
                    if search_law_match:
                        search_query = search_law_match.group(1).strip()
                        logger.info(f"[IterativeRetrieval] Agent '{role_name}' szuka prawa: {search_query}")
                        if status_callback:
                            try:
                                import asyncio
                                if asyncio.iscoroutinefunction(status_callback):
                                    await status_callback({"type": "chunk", "text": f"\n\n*[System]* Agent '{role_name}' szuka w aktach prawnych: {search_query}..."})
                                else:
                                    status_callback({"type": "chunk", "text": f"\n\n*[System]* Agent '{role_name}' szuka w aktach prawnych: {search_query}..."})
                            except Exception: pass
                        
                        from services.mcp_tool_bridge import call_mcp_tool
                        from services.retrieval_service import retrieval_service
                        
                        search_tasks = [
                            retrieval_service.search_saos(keywords=search_query, limit=3),
                            retrieval_service.search_eli(keywords=search_query, limit=3),
                        ]
                        
                        try:
                            search_results = await asyncio.gather(*search_tasks, return_exceptions=True)
                            
                            real_result_parts = []
                            if isinstance(search_results[0], list) and search_results[0]:
                                for r in search_results[0][:2]:
                                    if isinstance(r, dict):
                                        real_result_parts.append(f"[SAOS] {r.get('source', '')}: {r.get('content', '')[:800]}")
                            if isinstance(search_results[1], list) and search_results[1]:
                                for r in search_results[1][:2]:
                                    if isinstance(r, dict):
                                        real_result_parts.append(f"[ELI] {r.get('source', '')}: {r.get('content', '')[:800]}")
                            
                            if real_result_parts:
                                real_result = "WYNIKI PRAWNE:\n" + "\\n\\n".join(real_result_parts)
                            else:
                                real_result = f"Brak wyników prawnych dla '{search_query}'."
                        except Exception as e:
                            real_result = f"Błąd wyszukiwania: {e}"

                    elif search_mcp_match:
                        tool_name = search_mcp_match.group(1).strip()
                        search_query = search_mcp_match.group(2).strip()
                        logger.info(f"[IterativeRetrieval] Agent '{role_name}' szuka z uzyciem MCP {tool_name}: {search_query}")
                        if status_callback:
                            try:
                                import asyncio
                                if asyncio.iscoroutinefunction(status_callback):
                                    await status_callback({"type": "chunk", "text": f"\n\n*[System]* Agent '{role_name}' korzysta z bazy eksperckiej ({tool_name}): {search_query}..."})
                                else:
                                    status_callback({"type": "chunk", "text": f"\n\n*[System]* Agent '{role_name}' korzysta z bazy eksperckiej ({tool_name}): {search_query}..."})
                            except Exception: pass
                        from services.mcp_tool_bridge import call_mcp_tool
                        try:
                            # Przekazujemy parametr 'query', gdyż większość ogólnych narzędzi MCP używa tego klucza. 
                            # Jeśli narzędzie wymaga innego, MCP bridge powinien to obsłużyć (albo zignorować)
                            mcp_result = await call_mcp_tool(tool_name, query=search_query, limit=3)
                            
                            if isinstance(mcp_result, dict) and mcp_result.get("status") == "ok":
                                import json
                                # Ograniczamy długość wyniku, żeby nie wywaliło tokenów
                                res_str = json.dumps(mcp_result, ensure_ascii=False)[:2500]
                                real_result = f"WYNIK Z NARZĘDZIA {tool_name}:\n" + res_str
                            else:
                                real_result = f"Błąd lub brak wyników z narzędzia {tool_name} dla '{search_query}'. Zwrócono: {mcp_result}"
                        except Exception as e:
                            real_result = f"Błąd wywołania narzędzia MCP {tool_name}: {e}"

                    elif search_int_match:
                        search_query = search_int_match.group(1).strip()
                        logger.info(f"[IterativeRetrieval] Agent '{role_name}' szuka w internecie: {search_query}")
                        from services.mcp_tool_bridge import call_mcp_tool
                        try:
                            int_result = await call_mcp_tool("internet_search", query=search_query, limit=3)
                            if int_result.get("status") == "ok" and int_result.get("items"):
                                parts = []
                                for it in int_result["items"]:
                                    parts.append(f"[INTERNET] {it.get('title')} ({it.get('href')}):\n{it.get('body')}")
                                real_result = "WYNIKI Z INTERNETU:\n" + "\n\n".join(parts)
                            else:
                                real_result = f"Brak wyników w internecie dla '{search_query}'."
                        except Exception as e:
                            real_result = f"Błąd wyszukiwania w internecie: {e}"
                    
                    messages.append({"role": "assistant", "content": response})
                    messages.append({"role": "user", "content": f"WYNIK WYSZUKIWANIA:\n{real_result}\nKontynuuj analizę z uwzględnieniem powyższych wyników."})
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
                "model": used_model,
                "response": f"BŁĄD: Nie udało się wygenerować opinii ({str(e)})",
                "latency_ms": int((time.time() - start_time) * 1000),
                "error": True
            }


    async def _score_expert(self, expert_data: Dict[str, Any], user_query: str, params: Any, status_callback: Optional[Any] = None) -> Dict[str, Any]:
        """Szybka ocena odpowiedzi eksperta (0-100)."""
        import re
        assigned_fast = params.assigned_models.get('fast') if (params and getattr(params, 'assigned_models', None)) else None
        selected_m = getattr(params, 'selected_model', '') if params else ''
        fast_model = assigned_fast or selected_m or "google/gemini-3.7-flash"
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
                max_tokens=5, # Minimalna liczba tokenów wyjściowych dla optymalizacji
                temperature=0.1,
                timeout=15.0,
                log_context="ExpertScoring",
                status_callback=status_callback
            )
            match = re.search(r"\b([0-9]{1,2}|100)\b", resp)
            score = float(match.group(1)) if match else 75.0
            return {"score": score}
        except Exception as e:
            logger.warning(f"[DebateEngine] Błąd scoringu eksperta: {e}")
            return {"score": 75.0}

