import logging
import re
from typing import AsyncGenerator, Dict, Any, Optional

from services.orchestrator_types import OrchestratorInputParams
from services.retrieval.types import get_retrieval_title
from .context_builder import InvestigationContext
from .debate_engine import DebateResult

logger = logging.getLogger(__name__)

class SeniorAdvocateSynthesis:
    """
    Synteza końcowa pełniąca rolę Głównego Adwokata.
    To tutaj zostaną wpięte interfejsy weryfikacji halucynacji (Advocate Metrics).
    """
    def __init__(self):
        pass

    async def synthesize_stream(
        self,
        params: OrchestratorInputParams,
        context: InvestigationContext,
        debate: Any,
        llm_service: Any,
        status_callback: Any = None
    ):
        """
        Główny proces syntezy końcowej.
        - Wczesne strumieniowanie wstępu (Early Synthesis Streaming), podczas gdy debata trwa w tle.
        - Generowanie Macierzy Konfliktów (Conflict Resolution Matrix).
        - Weryfikacja halucynacji przed wygenerowaniem odpowiedzi (Advocate Metrics).
        - Wygenerowanie finalnej odpowiedzi.
        """
        logger.info("[SynthesisEngine] Rozpoczynam syntezę końcową i weryfikację metryk...")
        
        has_introed = False
        import asyncio
        # Jeśli debata to asynchroniczny Task i nie została jeszcze ukończona, zaczynamy strumieniować wstęp
        if isinstance(debate, asyncio.Task) and not debate.done():
            logger.info("[SynthesisEngine] Rozpoczynam wczesne strumieniowanie wstępu (Early Synthesis)...")
            try:
                from database import get_setting
                from config import settings
                fast_model = settings.resolve_model_id(get_setting("assigned_model_fast"))
                
                intro_prompt = (
                    "Jesteś wybitnym Głównym Adwokatem, mistrzem strategii procesowej. "
                    "Klient przyszedł do Ciebie z zapytaniem prawnym. "
                    "Twoim zadaniem jest rozpocząć analizę sprawy i przedstawić klientowi wstęp "
                    "oraz ramy prawne i faktyczne na podstawie Karty Sprawy.\n\n"
                    "WYMOGI KRYTYCZNE:\n"
                    "1. Napisz wyłącznie krótki, naturalny, profesjonalny wstęp do opinii prawnej (max 2 akapity). "
                    "Przedstaw krótko stan faktyczny sprawy i główne zagadnienia prawne, które będziemy badać. "
                    "2. Pisz bezpośrednio do klienta. "
                    "3. Zakończ słowami: 'Rozpoczynamy szczegółową analizę prawną...' i nie pisz nic więcej.\n"
                    "4. Zakaz używania jakichkolwiek tagów XML i punktatorów."
                )
                
                stan_f = getattr(context.case_brief, "stan_faktyczny", "") if context.case_brief else ""
                cele_a = getattr(context.case_brief, "cele_analizy", "") if context.case_brief else ""
                
                intro_messages = [
                    {"role": "system", "content": intro_prompt},
                    {"role": "user", "content": f"ZAPYTANIE UŻYTKOWNIKA:\n{params.user_query}\n\nKARTA SPRAWY:\nStan faktyczny: {stan_f}\nCele analizy: {cele_a}"}
                ]
                
                stream_gen, _ = await llm_service.call_with_fallback_stream(
                    fast_model,
                    intro_messages,
                    temperature=0.3,
                    max_tokens=400,
                    status_callback=status_callback
                )
                async for chunk in stream_gen:
                    if chunk:
                        try:
                            content = chunk.choices[0].delta.content or ""
                            if content:
                                yield {"type": "chunk", "text": content}
                        except Exception:
                            pass
                yield {"type": "chunk", "text": "\n\n"}
                has_introed = True
            except Exception as intro_err:
                logger.warning(f"[SynthesisEngine] Błąd generowania wczesnego wstępu: {intro_err}")

        # Oczekiwanie na pełną opinię ekspertów
        debate_result = debate
        if isinstance(debate, asyncio.Task):
            logger.info("[SynthesisEngine] Oczekiwanie na ukończenie debaty ekspertów w tle...")
            debate_result = await debate
            # Przekażmy częściowe wyniki debaty na frontend
            yield {
                "type": "metadata", 
                "expert_opinions": debate_result.expert_opinions
            }
            
        # 1. Weryfikacja metryk debaty (informacyjna — NIE blokuje pipeline'u)
        try:
            await self._verify_hallucinations(context, debate_result, llm_service, status_callback=status_callback)
            hall_rate = getattr(debate_result, 'hallucination_rate', 0.0)
            if hall_rate > 0:
                logger.info(f"[SynthesisEngine] Wskaźnik niezweryfikowanych cytowań: {hall_rate:.1f}% (informacyjnie, nie blokuje pipeline).")
        except Exception as e:
            logger.warning(f"[SynthesisEngine] Błąd weryfikacji halucynacji (nie blokuje pipeline): {e}.")
        
        # 2. Składanie wniosków ekspertów
        all_expert_opinions = ""
        for expert in debate_result.expert_opinions:
            role = expert.get("role", "Ekspert")
            resp = expert.get("response", "")
            ver_flag = expert.get("verification_flag", "")
            flag_str = f" [UWAGA: {ver_flag}]" if ver_flag and ver_flag.upper().startswith("BŁĄD") else ""
            all_expert_opinions += f"--- OPINIA: {role}{flag_str} ---\n{resp}\n\n"
            
        # Generowanie Consensus Report lub Conflict Resolution Matrix
        conflict_matrix = ""
        if debate_result.expert_opinions:
            from config import settings
            try:
                if settings.feature_consensus_engine:
                    from services.orchestrator_v2.consensus_engine import ConsensusEngine
                    ce = ConsensusEngine()
                    conflict_matrix = await ce.generate_consensus(debate_result.expert_opinions, params.user_query, llm_service, params, status_callback=status_callback)
                else:
                    conflict_matrix = await self._generate_conflict_resolution_matrix(all_expert_opinions, llm_service, status_callback=status_callback)
            except Exception as e:
                logger.error(f"[SynthesisEngine] Błąd generowania macierzy konfliktów/konsensusu: {e}. Zwracam pustą macierz.")
                conflict_matrix = ""
            
        default_advocate_prompt = (
            "Jesteś wybitnym Głównym Adwokatem, mistrzem strategii procesowej i osobistym obrońcą klienta. "
            "Twoim zadaniem jest dostarczenie perfekcyjnej, bogatej merytorycznie, wyczerpującej i głębokiej "
            "analizy i odpowiedzi na zapytanie użytkownika, opierając się na zebranych materiałach i debacie ekspertów.\n\n"
            "WYMOGI KRYTYCZNE:\n"
            "1. Myśl krok po kroku: Rozpocznij od bloku <thinking>...</thinking>, gdzie zrobisz cichą ewaluację opinii ekspertów "
            "i dopasujesz je do zapytania użytkownika.\n"
            "2. BOGATA I SZCZEGÓŁOWA ANALIZA: Zdecydowanie unikaj szablonowości, schematów (typu stały podział na rekomendację, etapy itp.) "
            "i pisania krótkich, ogólnych odpowiedzi. Twoje odpowiedzi muszą być obszerne, dogłębne i naturalne. "
            "Wykorzystaj w pełni bogaty kontekst prawny i ustalenia ekspertów, aby szczegółowo opisać przepisy, mechanizmy prawne, "
            "kontekst proceduralny, orzecznictwo, możliwe scenariusze i szczegóły sprawy. Każda wypowiedź musi mieć zindywidualizowany, płynny charakter "
            "dostosowany ściśle do specyfiki pytania i dokumentów.\n"
            "3. BEZWZGLĘDNY PRIORYTET: MUSISZ CYTOWAĆ KONKRETNE PRZEPISY (artykuły, paragrafy, ustawy z bazy wiedzy). Prawnicza odpowiedź bez powołania się na dokładne przepisy (np. z KK, KPK, Ustawy o przeciwdziałaniu narkomanii) jest bezwartościowa! Każdą tezę, każdy krok proceduralny (np. zażalenie) poprzyj twardym artykułem.\n"
            "4. ODPOWIEDZ DOKŁADNIE NA PYTANIE UŻYTKOWNIKA. Odpowiedź musi być bezpośrednio powiązana z ostatnią wiadomością użytkownika. Nie uciekaj w ogólniki.\n"
            "5. Styl i Ton: Piszesz bezpośrednio do klienta. Bądź profesjonalny, dający ogromne wsparcie, wysoce merytoryczny, ale zrozumiały. Dbaj o perfekcyjne formatowanie (akapity, pogrubienia), żeby nie tworzyć ściany tekstu.\n"
            "6. Zakończ odpowiedź jasną, spersonalizowaną konkluzją lub planem działania dostosowanym do pytania, opartą o konkretne paragrafy.\n"
            "7. Bezwzględny zakaz halucynacji. Masz walczyć o interes klienta do granic możliwości prawnych, opierając się na faktach."
        )
        if has_introed:
            default_advocate_prompt += (
                "\n7. UWAGA: Klientowi wyświetlono już wstęp ze stanem faktycznym oraz zdaniem 'Rozpoczynamy szczegółową analizę prawną...'. "
                "Rozpocznij swoją wypowiedź bezpośrednio od analizy zebranych argumentów prawnych i opinii ekspertów (bez ponownego przywitania czy streszczenia stanu faktycznego)."
            )
            
        if context.mcp_tools_used:
            default_advocate_prompt += (
                "\n8. W swojej obszernej odpowiedzi koniecznie zaznacz, że podczas przygotowywania opinii przeprowadzono "
                "zaawansowany wywiad w rejestrach specjalistycznych (" + ", ".join(context.mcp_tools_used) + ") "
                "co gwarantuje najwyższą dokładność i aktualność ustaleń faktycznych."
            )
            
        from moa.prompt_builder import get_task_prompt
        task_prompt = ""
        if params.current_task and params.current_task != "general":
            try:
                task_prompt = f"\n\nWYBRANE ZADANIE AI (Kluczowy kontekst zadania eksperckiego):\n{get_task_prompt(params.current_task, 'defense')}\n\n---\n"
            except Exception:
                pass
            
        base_prompt = params.judge_system_prompt or default_advocate_prompt
        
        # Wczytanie strażników wsparcia klienta i pełnych tekstów prawnych (Client-centric & Full Legal Text Guards)
        client_guards = ""
        from prompts.loader import load_prompt
        try:
            client_guards += "\n\n" + load_prompt("strict_no_quote_guard")
            if params.response_mode != "draft":
                client_guards += "\n\n" + load_prompt("user_priority_guard")
                client_guards += "\n\n" + load_prompt("concrete_client_actions_guard")
                client_guards += "\n\n" + load_prompt("helpful_synthesis_guard")
                client_guards += "\n\n" + load_prompt("humanized_output_guard")
                client_guards += "\n\n" + load_prompt("client_plain_language_guard")
        except Exception as e:
            logger.warning("[SynthesisEngine] Błąd wczytywania strażników klienta: %s", e)
 
        anti_xml_leak = (
            "\n\nUWAGA KRYTYCZNA DOTYCZĄCA TWOJEJ ODPOWIEDZI (NAJWYŻSZY PRIORYTET):\n"
            "Masz bezwzględny zakaz stosowania formatów XML (takich jak <internal_analysis>, <final_response>, itp.) pochodzących z wytycznych zadania "
            "lub z wypowiedzi ekspertów. Pisz do klienta pięknym, logicznym, ciągłym tekstem. Unikaj list punktowanych zamiast płynnych zdań. "
            "Odpowiedź musi wyglądać jak profesjonalna, ludzka opinia adwokacka, bez znaczników i schematów wygenerowanych maszynowo."
        )
        
        system_prompt = task_prompt + base_prompt + client_guards + anti_xml_leak
        # Informacja o cytowaniach — NIE każe ignorować artykułów (mogą być prawidłowe, ale spoza RAG)
        hallucination_warning = ""
        
        from database import get_setting
        from config import settings
        assigned_judge = get_setting("assigned_model_judge")
        raw_model = params.aggregator_model or params.selected_model or assigned_judge
        model_to_use = settings.resolve_model_id(raw_model)
        
        from services.orchestrator_v2.token_budget import allocate_synthesis_context
        expert_context_str = all_expert_opinions + conflict_matrix + hallucination_warning
        
        from config import settings
        if settings.feature_citation_weight_in_judge and hasattr(context, "legal_res") and context.legal_res:
            legal_rank_str = "\n\nHIERARCHIA ŹRÓDEŁ (Do uwzględnienia przy rozstrzyganiu sprzeczności):\n"
            for row in context.legal_res[:5]:
                rank = row.get("legal_rank_label", "Ustawa")
                title = get_retrieval_title(row)
                legal_rank_str += f"- {title}: {rank}\n"
            expert_context_str += legal_rank_str

        truncated_context = allocate_synthesis_context(
            model_id=model_to_use,
            reserve_output_tokens=8192,
            system_prompt=system_prompt,
            user_query=params.user_query,
            expert_opinions=expert_context_str,
            combined_context=context.combined_full_text
        )
        
        history_str = ""
        if context.chat_history:
            history_str = f"HISTORIA ROZMOWY:\n{context.chat_history}\n\n"
            
        user_msg = (
            f"ZAPYTANIE UŻYTKOWNIKA (NAJWYŻSZY PRIORYTET):\n{params.user_query}\n\n"
            f"{history_str}"
            f"KONTEKST PRAWNY:\n{truncated_context}\n\n"
            f"ANALIZY EKSPERTÓW (dla Ciebie do wglądu):\n{expert_context_str}\n\n"
            f"Zadanie: Przeanalizuj debaty i kontekst, ale TWOJĄ ODPOWIEDZIĄ MA BYĆ KONKRETNA REAKCJA NA ZAPYTANIE UŻYTKOWNIKA."
        )
 
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg}
        ]
        
        try:
            stream_gen, used_model = await llm_service.call_with_fallback_stream(
                model_to_use,
                messages,
                temperature=0.3,
                max_tokens=8192,
                status_callback=status_callback
            )
            
            logger.info(f"[SynthesisEngine] [OK] Wygenerowano odpowiedź Głównego Adwokata.")
            
            # Przekazujemy strumień do frontu z zabezpieczeniem przed błędami w trakcie streamowania
            try:
                async for chunk in stream_gen:
                    if chunk:
                        try:
                            content = chunk.choices[0].delta.content or ""
                            if content:
                                yield {"type": "chunk", "text": content}
                        except Exception:
                            pass
            except Exception as stream_exc:
                logger.error(f"[SynthesisEngine] Strumień został przerwany przez API w trakcie generowania: {stream_exc}")
                yield {"type": "chunk", "text": f"\n\n*[Uwaga: Strumień odpowiedzi został przerwany w trakcie generowania przez API: {stream_exc}. Wyświetlamy dotychczas wygenerowaną część analizy.]*"}
                    
        except Exception as e:
            logger.error(f"[SynthesisEngine] Błąd inicjalizacji strumienia Głównego Adwokata: {e}")
            err_msg = f"\n[BŁĄD SYNTEZY] Nie udało się zainicjalizować odpowiedzi. Spróbuj ponownie. ({e})"
            yield {"type": "chunk", "text": err_msg}

    async def _generate_conflict_resolution_matrix(self, all_expert_opinions: str, llm_service: Any, status_callback: Optional[Any] = None) -> str:
        """
        Generuje Conflict Resolution Matrix na podstawie debaty ekspertów.
        """
        if not all_expert_opinions.strip():
            return ""
            
        from database import get_setting
        fast_model = get_setting("assigned_model_fast")
        
        matrix_prompt = (
            "Przeanalizuj poniższe opinie ekspertów z debaty prawnej i stwórz zwięzły Conflict Resolution Matrix.\n"
            "Zidentyfikuj:\n"
            "1. PUNKTY ZGODNOŚCI (Consensus): Gdzie eksperci są jednomyślni i jakie przepisy zgodnie popierają.\n"
            "2. PUNKTY SPORNE (Conflicts): Gdzie eksperci się różnią, jakie są kontrargumenty i rozbieżności interpretacyjne.\n"
            "3. LUKI (Gaps): Jakie krytyczne aspekty lub ryzyka zostały pominięte przez część ekspertów.\n"
            "Pisz zwięźle i konkretnie w języku polskim. Matrix posłuży jako skompresowany wsad dla Głównego Adwokata."
        )
        
        try:
            res, _ = await llm_service.call_with_fallback(
                fast_model,
                [
                    {"role": "system", "content": matrix_prompt},
                    {"role": "user", "content": f"DEBATA EKSPERTÓW:\n{all_expert_opinions}"}
                ],
                max_tokens=1500,
                temperature=0.2,
                timeout=20.0,
                log_context="ConflictMatrix",
                status_callback=status_callback
            )
            return f"\n=== Skompresowana Macierz Debaty (Conflict Resolution Matrix) ===\n{res}\n"
        except Exception as e:
            logger.warning(f"[SynthesisEngine] Błąd generowania Conflict Resolution Matrix: {e}")
            return ""

    async def _verify_hallucinations(self, context: InvestigationContext, debate: DebateResult, llm_service: Any, status_callback: Optional[Any] = None):
        """
        Prawdziwa implementacja systemu oceny halucynacji cytowań (Advocate Metrics).
        W V2 ten mechanizm upewnia się, że Główny Adwokat nie weźmie pod uwagę fałszywych przepisów od ekspertów.
        """
        logger.info("[SynthesisEngine] Weryfikacja halucynacji (Citation Hallucination Rate) przy pomocy CitationGuard...")
        
        if not debate.expert_opinions:
            debate.hallucination_rate = 0.0
            debate.hallucinated_citations = []
            debate.counter_argument_quality = 0.0
            return
            
        all_expert_text = "\n".join([str(op.get("response", "")) for op in debate.expert_opinions])
        
        from services.citation_guard import CitationGuard
        
        guard = CitationGuard()
        
        async def mock_call_llm(prompt: str) -> str:
            try:
                from database import get_setting
                fast_model = get_setting("assigned_model_fast")
                res, _ = await llm_service.call_with_fallback(
                    fast_model,
                    [{"role": "user", "content": prompt}],
                    status_callback=status_callback
                )
                return res
            except Exception:
                return ""

        all_cites, unverified = await guard.audit(
            texts=[all_expert_text],
            document_text=context.document_text,
            combined_context=context.combined_full_text,
            expert_analysis=all_expert_text,
            call_llm=mock_call_llm,
            trust_expert_debate=True,  # Eksperci MOA to źródło wiedzy — ufamy ich cytowaniom
        )
        
        # Filtrowanie: zachowaj WSZYSTKIE artykuły z kodeksów powiązanych ze sprawą.
        # Oznacz jako niezweryfikowane TYLKO te z zupełnie obcych dziedzin prawa.
        if unverified:
            case_relevant_acts = self._build_case_relevant_acts(context)
            if case_relevant_acts:
                truly_unrelated = []
                for cite in unverified:
                    if cite.act_code and cite.act_code not in case_relevant_acts:
                        truly_unrelated.append(cite)
                        logger.info(f"[SynthesisEngine] Odrzucono cytat z obcego kodeksu: {cite.raw} (act={cite.act_code}, sprawa dotyczy: {case_relevant_acts})")
                    # else: artykuł z kodeksu powiązanego ze sprawą — zachowujemy
                unverified = truly_unrelated
        
        debate.all_citations_count = len(all_cites)
        
        if all_cites:
            debate.hallucination_rate = len(unverified) / len(all_cites) * 100.0
        else:
            debate.hallucination_rate = 0.0
            
        if unverified:
            from services.citation_guard import citations_to_display
            debate.hallucinated_citations = citations_to_display(unverified)
            logger.info(f"[SynthesisEngine] Cytowania z obcych kodeksów (potencjalnie błędne): {debate.hallucinated_citations} (Wskaźnik: {debate.hallucination_rate:.1f}%)")
        else:
            debate.hallucinated_citations = []
            logger.info(f"[SynthesisEngine] Wszystkie cytowania z powiązanych kodeksów. Wskaźnik: {debate.hallucination_rate:.1f}%")
        
        # Dynamiczna ocena 'Counter-Argument Quality' przy pomocy LLM
        if debate.expert_opinions:
            import re
            eval_prompt = (
                "Przeanalizuj poniższe opinie prawne wydane przez różnych ekspertów w ramach debaty.\n"
                "Oceń poziom merytoryczny i głębię wzajemnych kontrargumentów oraz szukania słabych punktów w argumentacji.\n"
                "Zwróć ocenę jako jedną liczbę zmiennoprzecinkową od 0.0 (bardzo słaba lub brak kontrargumentów) do 1.0 (wybitna, głęboka polemika).\n"
                "Nie wypisuj żadnego dodatkowego tekstu ani wyjaśnień — napisz tylko i wyłącznie tę liczbę, np. 0.85.\n\n"
                f"--- DEBATA EKSPERTÓW ---\n{all_expert_text[:10000]}"
            )
            try:
                eval_res = await mock_call_llm(eval_prompt)
                val = re.search(r"\b0\.\d+|\b1\.0\b|\b1\b|\b0\b", eval_res)
                if val:
                    debate.counter_argument_quality = float(val.group(0))
                else:
                    debate.counter_argument_quality = 0.75
            except Exception:
                debate.counter_argument_quality = 0.75
        else:
            debate.counter_argument_quality = 0.0
            
        logger.info(f"[SynthesisEngine] Dynamiczna ocena jakości debaty (Counter-Argument Quality): {debate.counter_argument_quality:.2f}")

    def _build_case_relevant_acts(self, context) -> set:
        """Buduje zbiór kodów ustaw (np. 'kpk', 'kk', 'upn'), które są bezpośrednio związane ze sprawą."""
        acts = set()
        
        # 1. Z tagów problemowych (Routing)
        tags = getattr(context, 'problem_tags', []) or []
        tag_to_act = {
            'criminal': ['kk', 'kpk', 'kw', 'kks'],
            'civil': ['kc', 'kpc', 'kro'],
            'administrative': ['kpa', 'ppsa', 'upea'],
            'tax': ['op', 'upea', 'kks'],
            'labor': ['kp', 'kpc'],
            'corporate': ['ks', 'kc', 'kpc'],
            'narcotics': ['upn', 'kk', 'kpk']
        }
        for tag in tags:
            acts.update(tag_to_act.get(tag, []))
            
        # 2. Z QueryPlanner act_terms (np. 'Kodeks karny', 'K.p.k.')
        if hasattr(context, 'query_plan') and context.query_plan:
            terms = getattr(context.query_plan, 'act_terms', []) or []
            from services.citation_guard import _normalize_act
            for term in terms:
                norm = _normalize_act(term)
                if norm:
                    acts.add(norm)
                    
        # 3. Z karty sprawy (przepisy znalezione przez śledczego)
        if hasattr(context, 'case_brief') and context.case_brief:
            c_acts = getattr(context.case_brief, 'wykryte_przepisy_prawne', []) or []
            from services.citation_guard import _normalize_act
            for act_str in c_acts:
                norm = _normalize_act(act_str)
                if norm:
                    acts.add(norm)
                    
        # Konstytucja jest nadrzędnym aktem prawnym mającym zastosowanie we wszystkich sprawach
        acts.add('konstytucja')
        
        return acts

