import time
import asyncio
import logging
import re
from typing import AsyncGenerator, Dict, Any, List, Optional, Set

from config import settings
from services.security_guardrails import SecurityGuardrails
from prompts.loader import load_prompt
from services.citation_guard import CitationGuard, citations_to_display
from services.async_utils import run_with_status_stream
from services.llm_client import _log_model_response
from services.observability import log_pipeline_timing
from services.retrieval.types import get_retrieval_source
from services.retrieval_service import retrieval_service
from services.llm_gateway import call_with_fallback, call_with_fallback_stream
from services.synthesis.prompts import (
    ADVISOR_SYNTHESIS_GUARD,
    ANTI_PARAPHRASE_GUARD,
    CITIZEN_ARCHITECT_PROMPT,
    CLIENT_PLAIN_LANGUAGE_GUARD,
    COHERENCE_SYNTHESIS_GUARD,
    CONVERSATION_CONTINUITY_GUARD,
    DEFAULT_ARCHITECT_PROMPT,
    DRAFT_ARCHITECT_PROMPT,
    DRAFT_SYNTHESIS_GUARD,
    HUMANIZED_OUTPUT_GUARD,
    INDIVIDUAL_CONTEXT_GUARD,
    JUDGE_DEBATE_SYNTHESIS,
    LITIGATION_STRATEGIC_GUARD,
    LOW_CONFIDENCE_SYNTHESIS_EXTRA,
    MASTER_SYSTEM_PROMPT,
    PROCEDURE_ADAPTIVE_GUARD,
    STRICT_NO_QUOTE_GUARD,
    STRATEGIC_SYNTHESIS_GUARD,
    STRATEGIST_ENGAGEMENT_GUARD,
)
from services.synthesis.repair import synthesis_repair_pass

logger = logging.getLogger(__name__)

def format_citation_warning(cites: List[str]) -> str:
    """Formatuje listę niezweryfikowanych cytatów do wyświetlenia użytkownikowi."""
    return ", ".join(sorted(cites)) if cites else ""

class SynthesisEngine:
    def __init__(self, _orchestrator_ref=None, *, citation_guard: Optional[CitationGuard] = None):
        self._citation_guard = citation_guard or CitationGuard()

    async def run_synthesis_stream(
        self,
        client,
        judge_model: str,
        primary_model: str,
        use_fast_path: bool,
        resolved_response_mode: str,
        architect_prompt: str,
        system_role_prompt: str,
        judge_system_prompt: str,
        client_addressee: dict,
        full_doc: str,
        traffic_stop_query: bool,
        zanonimizowana_historia: str,
        inv_state: Any,
        skip_expert_debate: bool,
        rag_legal_content: str,
        rag_user_content: str,
        eli_block: str,
        saos_block: str,
        eli_results: list,
        saos_results: list,
        attachments: list,
        extracted_text: str,
        p_sukces_val: Optional[float],
        urgency_header: str,
        timeline_block: str,
        fact_sheet_block: str,
        zanonimizowane_zapytanie: str,
        hallucinated_cites: set,
        cite_block_mode: str,
        cite_block_threshold: int,
        unverified_list: list,
        researcher_responses: str,
        combined_context: str,
        low_confidence: bool,
        reranked_legal: list,
        reranked_user: list,
        query_for_retrieval: str,
        legal_basis_block: str,
        rag_snippet_for_verify: str,
        timeline_data: dict,
        coi_conflicts: list,
        confidence_score: float,
        verified_count: int,
        all_cites: list,
        use_rag_user: bool,
        claim_scores_payload: dict,
        pipeline_timer: Any,
        session_id: str,
        inbound_blocked: bool,
        inbound_matches: list,
        outbound_pii_masked: bool,
        private_context_used: bool,
        private_context_reason: str,
        private_context_markers: list,
        start_pipeline_time: float,
        llm_audit_fn: Any,
        _eli_lookup: Any,
        status_callback: Any,
        analysis: list,
        user_res: list,
        legal_res: list,
        urgency_alerts: list,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        
        synthesis_blocked = (
            cite_block_mode == "strict"
            and len(hallucinated_cites) >= cite_block_threshold
        )
        citation_warn_only = (
            cite_block_mode == "warn"
            and bool(hallucinated_cites)
            and not synthesis_blocked
        )

        yield {"type": "metadata", "message": "[Etap 11] Synteza Kliencka: łączenie opinii końcowej..."}

        if resolved_response_mode == "citizen":
            system_content = architect_prompt or CITIZEN_ARCHITECT_PROMPT
        elif resolved_response_mode == "draft":
            system_content = architect_prompt or DRAFT_ARCHITECT_PROMPT
        else:
            system_content = architect_prompt or DEFAULT_ARCHITECT_PROMPT

        master_prompt = MASTER_SYSTEM_PROMPT
        if use_fast_path:
            master_prompt = master_prompt.replace(
                "- Zacznij od najpilniejszej czynności klienta, potem plan krok po kroku.",
                "- Odpowiedz bezpośrednio na merytoryczne zapytanie klienta, bez sztucznych planów działania."
            )
            master_prompt = re.sub(
                r".*Jeśli dziś zrobisz tylko jedną rzecz.*", 
                "", 
                master_prompt, 
                flags=re.IGNORECASE
            )

        if resolved_response_mode != "draft":
            system_content = f"{master_prompt}\n\n{system_content}"

        if system_role_prompt and (not inv_state or not inv_state.research_rounds): # approximation for is_single_mode
            system_content += f"\n\n{system_role_prompt}"
        if (judge_system_prompt or "").strip() and inv_state and inv_state.research_rounds:
            system_content += f"\n\n{(judge_system_prompt or '').strip()}"
        
        if client_addressee.get("formal_address"):
            system_content += (
                f"\n\n[ADRESAT Z PISMA — obowiązkowy zwrot w wstępie]\n"
                f"Zwracaj się: „{client_addressee['formal_address']}” "
                f"(w wołaczu naturalnie, np. „Panie Marcinie” jeśli to Pan Marcin …).\n"
            )
        if full_doc.strip():
            try:
                system_content += "\n\n" + load_prompt("document_presence_guard")
                system_content += "\n\n" + load_prompt("architect_with_document_addendum")
            except FileNotFoundError:
                system_content += (
                    "\n\nMasz tekst aktu klienta w prompcie — nie twierdź, że go nie otrzymałeś.\n"
                )
        if resolved_response_mode in ("citizen", "strategic"):
            system_content += CLIENT_PLAIN_LANGUAGE_GUARD
        if resolved_response_mode != "draft":
            system_content += STRICT_NO_QUOTE_GUARD
            system_content += INDIVIDUAL_CONTEXT_GUARD
            system_content += STRATEGIST_ENGAGEMENT_GUARD
            system_content += PROCEDURE_ADAPTIVE_GUARD
            system_content += ANTI_PARAPHRASE_GUARD
            if traffic_stop_query:
                try:
                    system_content += "\n\n" + load_prompt("traffic_stop_guard")
                except FileNotFoundError:
                    pass
        if resolved_response_mode == "strategic":
            system_content += LITIGATION_STRATEGIC_GUARD
        if resolved_response_mode != "draft":
            system_content += HUMANIZED_OUTPUT_GUARD
        if zanonimizowana_historia.strip():
            system_content += f"\n\n{CONVERSATION_CONTINUITY_GUARD}"
        system_content += COHERENCE_SYNTHESIS_GUARD
        if settings.feature_multistage_synthesis and not use_fast_path:
            try:
                system_content += "\n\n" + load_prompt("multi_stage_synthesis")
                if inv_state:
                    inv_state.multistage_headers_used = True
            except FileNotFoundError:
                logger.warning("Brak prompts/multi_stage_synthesis.txt — pomijam warstwy syntezy.")
        if use_fast_path:
            if traffic_stop_query:
                try:
                    system_content += "\n\n" + load_prompt("traffic_stop_fast_answer_guard")
                except FileNotFoundError:
                    pass
            else:
                system_content += (
                    "\n\n[PYTANIE O PRZEPIS]\n"
                    "Krótka rozmowa z klientem (max ~600 słów): wytłumacz artykuł/kodeks zdania złożone, "
                    "bez szablonu sekcji i bez listy 1-2-3 pod każdym art.\n"
                )
        if architect_prompt and ("ISSUE" in architect_prompt or "MODEL_IRAC" in architect_prompt):
            system_content += (
                "\n[Pomiń szablon ISSUE/RULE/APPLICATION — stosuj strukturę z instrukcji użytkownika.]"
            )

        synthesis_guard = (
            DRAFT_SYNTHESIS_GUARD
            if resolved_response_mode == "draft"
            else (
                STRATEGIC_SYNTHESIS_GUARD
                if resolved_response_mode == "strategic"
                else ADVISOR_SYNTHESIS_GUARD
            )
        )
        debate_block = (
            "" if skip_expert_debate else JUDGE_DEBATE_SYNTHESIS
        )
        _rag_legal_lim = settings.synthesis_rag_legal_chars
        _rag_ext_lim = settings.synthesis_rag_external_chars
        rag_for_synthesis = (
            ""
            if (traffic_stop_query and use_fast_path)
            else (
                f"[PRZEPISY Z BAZY PRAWNEJ — wpleć w rozmowę]\n"
                f"{(rag_legal_content or '')[:_rag_legal_lim]}\n\n"
                f"[ELI/ISAP]\n"
                f"{(eli_block if eli_results else '')[:_rag_ext_lim]}\n\n"
                f"[SAOS — orzecznictwo do wplecenia]\n"
                f"{(saos_block if saos_results else '')[:_rag_ext_lim]}\n"
            )
        )

        chronology_needed = (
            len(attachments or []) > 1
            or (extracted_text.count("--- TEKST Z") > 1)
            or bool(zanonimizowana_historia.strip())
        )
        doc_sequence_hint = ""
        if chronology_needed:
            doc_sequence_hint = (
                "\n[KOLEJNOŚĆ DOKUMENTÓW I ETAPÓW SPRAWY — obowiązkowe]\n"
                "Dokumenty i wypowiedzi mogą dotyczyć różnych dat i etapów (np. pismo od organu ≠ późniejszy Twój wniosek). "
                "Ustal chronologię ze skanu treści oraz historii rozmowy. "
                "Nie nakazuj ponownej czynności, którą klient lub treść dokumentu wyraźnie potwierdza jako już wykonaną "
                "(np. „jeśli jeszcze nie złożyłeś…” gdy dokument jest już doręczonym wnioskiem).\n"
            )

        hist_for_advisor = ""
        if zanonimizowana_historia.strip():
            hist_for_advisor = (
                f"\n[HISTORIA ROZMOWY — uwzględnij ciągłość]\n{zanonimizowana_historia[:6000]}\n"
            )
        if chronology_needed:
            system_content += doc_sequence_hint
        p_success_line = (
            f"P(Sukces) orientacyjnie: {p_sukces_val:.1f}%.\n"
            if p_sukces_val is not None
            else ""
        )
        procedural_action_hints = ""
        if urgency_header.strip():
            procedural_action_hints += (
                f"\n[TERMINY Z AKT — obowiązkowo wpleć w plan kroków]\n{urgency_header[:2500]}\n"
            )
        if timeline_block.strip():
            procedural_action_hints += (
                f"\n[OŚ CZASU — kolejność czynności]\n{timeline_block[:3500]}\n"
            )
        doc_for_synthesis = ""
        if full_doc.strip():
            synth_lim = settings.synthesis_document_chars
            synth_body = full_doc if len(full_doc) <= synth_lim else (
                full_doc[:synth_lim]
                + "\n\n[… dalsza część akt w bazie użytkownika / RAG — cytuj z fragmentów RAG …]"
            )
            doc_for_synthesis = (
                f"\n[AKTA KLIENTA — tekst z OCR (do weryfikacji faktów)]\n{synth_body}\n\n"
            )

        advisor_prompt = (
            f"PYTANIE KLIENTA:\n'{zanonimizowane_zapytanie}'\n"
            f"{doc_sequence_hint}"
            f"{hist_for_advisor}"
            f"{fact_sheet_block}"
            f"{doc_for_synthesis}"
            f"{procedural_action_hints}\n"
            f"[CEL — OBOWIĄZKOWY — POMOC KLIENTA]\n"
            f"Odpowiedź ma być PEŁNA, ZROZUMIAŁA i PROFESJONALNA — normalnym językiem, "
            f"z wytłumaczeniem wszystkiego, co może być niejasne.\n"
        )
        if use_fast_path:
            if traffic_stop_query:
                advisor_prompt += (
                    "Odpowiedz na pytanie klienta: jak praktycznie wyglada zatrzymanie do kontroli drogowej.\n"
                    "Odpowiedz ma byc PELNA i SZCZEGOLOWA: opisz kroki po kolei, prawa kierowcy, obowiazki policjanta.\n"
                    "Wyjasn KAZDY termin prostym jezykiem. Nie uzywaj zargonu bez wyjasnienia.\n"
                    "Podaj co zrobic jesli kontrola przebiega nieprawidlowo (gdzie sie skarzyc, w jakim terminie).\n"
                )
            else:
                advisor_prompt += (
                    "Odpowiedz bezpośrednio i precyzyjnie na pytanie merytoryczne klienta.\n"
                    "Cytuj i omawiaj wyłącznie te przepisy, które są podane wprost w materiałach w tej rozmowie (RAG/SAOS/ELI). Jeśli do pełnej odpowiedzi brakuje przepisów — powiedz czego brakuje zamiast zgadywać.\n"
                    "Nie mieszaj kontroli drogowej z zatrzymaniem osoby w trybie karnym (KPK), jeśli klient o to nie pyta.\n"
                )
        else:
            advisor_prompt += (
                "Nie używaj szablonów, checklist ani z góry narzuconych układów odpowiedzi.\n"
                "Pisz jak rozmowę z klientem: płynnie, naturalnie, bez obowiązkowych fraz typu „najpilniejszy krok”, „plan działania”, „jeśli zrobisz tylko jedną rzecz dziś…”, „2–4 ścieżki”.\n"
                "Jeśli to pomaga czytelności, możesz wpleść kolejność działań (np. „najpierw… potem… na koniec…”), ale bez sztywnego schematu.\n"
                "Przepisy podawaj tylko, jeśli wynikają z materiałów (RAG/ELI/SAOS/akta). Zakaz: wymyślanie numerów.\n"
            )
        if hallucinated_cites and cite_block_mode in ("warn", "strict"):
            advisor_prompt += (
                f"\n[PRZEPISY NIEZWERYFIKOWANE — ostrożnie]\n"
                f"{format_citation_warning(unverified_list)}\n"
                f"Nie buduj strategii wyłącznie na tych przepisach.\n\n"
            )
        if traffic_stop_query and use_fast_path:
            advisor_prompt += (
                f"{debate_block}"
                f"{synthesis_guard}"
            )
        else:
            advisor_prompt += (
                f"RAPORTY EKSPERTÓW (materiał do wplecenia w wypowiedź, nie do kopiowania struktury):\n"
                f"{researcher_responses}\n\n"
                f"[BAZA WIEDZY PRAWNEJ]\n"
                f"{(rag_legal_content or '')[:_rag_legal_lim]}\n\n"
                f"{rag_for_synthesis}\n"
                f"{p_success_line}"
                f"{debate_block}"
                f"{synthesis_guard}"
            )
        if low_confidence:
            advisor_prompt += LOW_CONFIDENCE_SYNTHESIS_EXTRA

        final_answer = ""
        if urgency_header:
            final_answer += urgency_header
            yield {"type": "chunk", "text": urgency_header}

        cite_warn_header = ""
        if citation_warn_only:
            cites_list = format_citation_warning(unverified_list)
            cite_warn_header = (
                f"⚠️ **Uwaga — sprawdź podstawę prawną przed działaniem**\n\n"
                f"Niektóre przepisy wymagają potwierdzenia w aktach lub ISAP "
                f"({cites_list}). Poniżej synteza — przypisy z pełnym brzmieniem pod odpowiedzią.\n\n---\n\n"
            )
        if synthesis_blocked:
            cites_list = ", ".join(sorted(hallucinated_cites))
            block_msg = (
                f"\n\n⚠️ **Synteza wstrzymana — niezweryfikowana podstawa prawna**\n\n"
                f"Wykryto {len(hallucinated_cites)} przepisów bez pokrycia w dokumencie, RAG, SAOS ani ELI "
                f"({cites_list}).\n\n"
                f"Podstawa prawna jest kluczem do sukcesu sprawy — automatyczna synteza została zablokowana, "
                f"aby nie wprowadzić w błąd. Zweryfikuj każdy art. w aktach lub ISAP przed decyzją.\n\n"
                f"Raporty ekspertów są dostępne w panelu MOA (debata) — nie wklejamy ich tutaj, "
                f"aby uniknąć ściany surowego tekstu.\n"
            )
            final_answer += block_msg
            yield {"type": "chunk", "text": block_msg}
            yield {
                "type": "metadata",
                "message": f"[Etap 11] Synteza zablokowana — niezweryfikowane cytaty: {cites_list}",
            }
            logger.info(f"   [STAGE 11] Synteza zablokowana: {hallucinated_cites}")
        else:
            if cite_warn_header:
                final_answer += cite_warn_header
                yield {"type": "chunk", "text": cite_warn_header}
            _t_stage11 = time.perf_counter()
            start_judge_time = time.time()
            try:
                stream = None
                used_model = judge_model
                synth_max_tokens = (
                    settings.synthesis_fast_max_tokens
                    if use_fast_path
                    else settings.synthesis_max_tokens
                )
                synth_timeout = (
                    55.0 if use_fast_path else settings.synthesis_timeout_sec
                )
                
                # Używamy instancji orkiestratora do wywołania _call_with_fallback_stream
                async for event in run_with_status_stream(
                    call_with_fallback_stream(
                        judge_model,
                        [
                            {"role": "system", "content": system_content},
                            {"role": "user", "content": advisor_prompt}
                        ],
                        max_tokens=synth_max_tokens,
                        temperature=0.15,
                        timeout=synth_timeout,
                        status_callback=status_callback
                    )
                ):
                    if event["type"] == "status":
                        yield {"type": "metadata", "message": event["message"]}
                    elif event["type"] == "result":
                        stream, used_model = event["value"]

                if stream is not None:
                    try:
                        while True:
                            chunk = await asyncio.wait_for(
                                stream.__anext__(),
                                timeout=90.0 if not use_fast_path else 60.0,
                            )
                            content = chunk.choices[0].delta.content or ""
                            if content:
                                out_content = content
                                if settings.feature_outbound_pii_mask:
                                    out_content, did_mask = SecurityGuardrails.sanitize_outbound_text(content)
                                    outbound_pii_masked = outbound_pii_masked or did_mask
                                final_answer += out_content
                                yield {"type": "chunk", "text": out_content}
                    except StopAsyncIteration:
                        pass
                    except asyncio.TimeoutError:
                        logger.info("   [STAGE 11 TIMEOUT] Przekroczono limit czasu oczekiwania na fragment strumienia.")
                        err_msg = "\n\n⚠️ Przekroczono limit czasu oczekiwania na odpowiedź z serwera modeli. Wyświetlamy dotychczas wygenerowaną treść."
                        final_answer += err_msg
                        yield {"type": "chunk", "text": err_msg}

                if final_answer.strip():
                    _log_model_response(used_model, final_answer, "ETAP 11 Finalna opinia", max_preview=1200)
                else:
                    logger.info(f"   [MODEL ETAP 11 Finalna opinia] {used_model}: (brak treści w strumieniu)")

                if final_answer.strip():
                    synth_source_corpus = (
                        f"{full_doc}\n{researcher_responses[:8000]}\n{combined_context[:4000]}"
                    )
                    _, synth_unverified = await self._citation_guard.audit(
                        texts=[final_answer],
                        document_text=synth_source_corpus,
                        combined_context=combined_context,
                        legal_results=reranked_legal or legal_res,
                        user_results=reranked_user or user_res,
                        saos_results=saos_results,
                        eli_results=eli_results,
                        user_query=query_for_retrieval[:6000],
                        search_eli=_eli_lookup if not use_fast_path else None,
                        call_llm=llm_audit_fn,
                        analysis_for_llm=researcher_responses + "\n" + final_answer,
                        rag_snippet=rag_snippet_for_verify,
                        expert_analysis=researcher_responses,
                        legal_basis_text=legal_basis_block,
                        trust_expert_debate=settings.citation_trust_expert_debate,
                        trust_legal_kb=settings.citation_trust_legal_kb_act,
                        require_legal_rag=False,
                    )
                    synth_bad = set(citations_to_display(synth_unverified))
                    new_in_synthesis = synth_bad - hallucinated_cites
                    if new_in_synthesis:
                        hallucinated_cites |= new_in_synthesis
                        logger.info(f"   [STAGE 11] Cytaty do weryfikacji w syntezie: {new_in_synthesis}")
                        if (
                            cite_block_mode == "strict"
                            and len(new_in_synthesis) >= cite_block_threshold
                        ):
                            synthesis_blocked = True
                        if len(new_in_synthesis) < 8 and final_answer.strip():
                            allowed_corpus = (
                                f"{full_doc}\n{rag_legal_content}\n{rag_user_content}\n"
                                f"{researcher_responses[:6000]}"
                            )
                            repaired = await synthesis_repair_pass(
                                client=client,
                                model_id=judge_model,
                                final_answer=final_answer,
                                bad_cites=set(new_in_synthesis),
                                allowed_corpus=allowed_corpus,
                                status_callback=status_callback,
                            )
                            if repaired != final_answer:
                                final_answer = repaired
                                yield {"type": "metadata", "message": "[Etap 11] Repair pass syntezy."}
                        elif len(new_in_synthesis) >= 8 and cite_block_mode == "strict":
                            warn = (
                                f"\n\n⚠️ **Uwaga — podstawa prawna**\n\n"
                                f"Niektóre przepisy wymagają weryfikacji w ISAP "
                                f"({format_citation_warning(synth_unverified)}).\n"
                            )
                            final_answer += warn
                            yield {"type": "chunk", "text": warn}

                latency_judge = int((time.time() - start_judge_time) * 1000)
                analysis.append({
                    "model": f"{used_model} (Senior Legal Advisor)",
                    "requested_model": judge_model,
                    "response": "Pomyślnie zintegrowano wnioski analityków i sformułowano ostateczną opinię prawną.",
                    "success": True,
                    "latency_ms": latency_judge
                })
            except Exception as e:
                logger.error(f"   [STAGE 11 ERR] Błąd Agenta Doradczego: {e}")
                err_ans = f"\n\n⚠️ Model główny był niedostępny. Poniżej zredagowane raporty ekspertów:\n\n{researcher_responses}"
                if settings.feature_outbound_pii_mask:
                    err_ans, did_mask = SecurityGuardrails.sanitize_outbound_text(err_ans)
                    outbound_pii_masked = outbound_pii_masked or did_mask
                final_answer += err_ans
                yield {"type": "chunk", "text": err_ans}
            
            if pipeline_timer:
                pipeline_timer.record_elapsed("stage_11_final", _t_stage11)

        # Generowanie uproszczonego wyjaśnienia (ELI5)
        eli_explanation = ""
        # w oryginalnym kodzie use_eli było używane, musimy tu sprawdzić skąd wziąć. 
        # Najprościej: niech zanonimizowane_zapytanie określa
        generate_plain_summary = (not use_fast_path) and (resolved_response_mode == "citizen")
        if generate_plain_summary and final_answer:
            yield {"type": "metadata", "message": "Generowanie uproszczonego podsumowania dla klienta..."}
            try:
                eli_prompt = (
                    "Na podstawie poniższego doradztwa prawnego napisz BARDZO krótkie podsumowanie "
                    "(max 4 zdania) dla zajętego klienta: sytuacja, pierwsza czynność do zrobienia dziś, "
                    "główne ryzyko jeśli nic nie zrobi.\n"
                    "Prosty polski, bez żargonu. Nie używaj frazy „Pan Kowalski”.\n\n"
                    f"Doradztwo:\n{final_answer[:4000]}"
                )
                eli_text = None
                async for event in run_with_status_stream(
                    call_with_fallback(
                        primary_model,
                        [{"role": "user", "content": eli_prompt}],
                        max_tokens=300,
                        temperature=0.5,
                        timeout=30.0,
                        status_callback=status_callback,
                        log_context="ETAP 11 ELI5",
                    )
                ):
                    if event["type"] == "status":
                        yield {"type": "metadata", "message": event["message"]}
                    elif event["type"] == "result":
                        eli_text, _ = event["value"]
                eli_explanation = eli_text
            except Exception as e:
                logger.error(f"   [STAGE 11 ERR] ELI5: {e}")

        # Budowanie listy źródeł
        sources_list = []
        for r in reranked_legal:
            sources_list.append(f"Baza Prawna: {r.get('metadata', {}).get('filename', 'Dokument')}")
        for r in reranked_user:
            sources_list.append(
                f"Akta klienta: {r.get('metadata', {}).get('filename', 'Dokument użytkownika')}"
            )
        for r in saos_results:
            sources_list.append(f"SAOS: {r.get('source') or r.get('sygnatura', 'orzeczenie')}")
        for r in eli_results:
            sources_list.append(f"ELI: {get_retrieval_source(r) or 'akt prawny'}")
            
        if not sources_list:
            sources_list = ["Własna baza wiedzy LexMind"]
            
        pipeline_latency_ms = int((time.time() - start_pipeline_time) * 1000)
        if pipeline_timer:
            log_pipeline_timing(pipeline_timer, session_id)

        if inv_state and session_id:
            from services.investigation.case_memory import save_case_state_for_session
            save_case_state_for_session(session_id, inv_state)

        investigation_summary: Optional[Dict[str, Any]] = None
        if inv_state:
            investigation_summary = {
                "hypothesis_count": len(inv_state.hypotheses),
                "research_rounds": len(inv_state.research_rounds),
                "problem_tags": list(inv_state.problem_tags or []),
                "evidence_count": len(inv_state.evidence),
                "budget_llm_calls": inv_state.budget_llm_calls,
                "budget_retrieval_calls": inv_state.budget_retrieval_calls,
            }

        from services.statute_excerpt_service import build_cited_sources_for_answer
        cited_sources_payload = await build_cited_sources_for_answer(
            final_answer,
            document_text=full_doc,
            combined_context=combined_context,
            legal_basis_text=legal_basis_block,
            legal_results=reranked_legal,
            saos_results=saos_results,
            eli_results=eli_results,
            expert_analysis=researcher_responses if not skip_expert_debate else "",
            hallucinated_keys=set(hallucinated_cites),
        )

        final_metadata: Dict[str, Any] = {
            "type": "final_metadata",
            "sources": list(set(sources_list)),
            "expert_analyses": analysis,
            "eli_explanation": eli_explanation,
            "pipeline_latency_ms": pipeline_latency_ms,
            "final_answer": final_answer,
            "urgency_alerts": urgency_alerts,
            "timeline": timeline_data.get("timeline"),
            "gaps": timeline_data.get("gaps"),
            "inconsistencies": timeline_data.get("inconsistencies"),
            "coi_conflicts": coi_conflicts,
            "confidence_score": round(confidence_score, 1),
            "hitl_escalated": low_confidence,
            "low_confidence": low_confidence,
            "synthesis_blocked": synthesis_blocked,
            "hallucinated_cites": sorted(hallucinated_cites),
            "verified_cites_count": verified_count,
            "total_cites_count": len(all_cites),
            "saos_count": len(saos_results),
            "eli_count": len(eli_results),
            "user_rag_count": len(reranked_user),
            "legal_rag_count": len(reranked_legal),
            "use_rag_user": use_rag_user,
            "claim_scores": claim_scores_payload,
            "investigation_summary": investigation_summary,
            "pipeline_timing": pipeline_timer.as_dict() if pipeline_timer else None,
            "cited_sources": cited_sources_payload,
            "circuit_breakers": retrieval_service.circuit_breakers_snapshot(),
            "security": {
                "inbound_blocked": inbound_blocked,
                "inbound_injection_matches": inbound_matches,
                "outbound_pii_masked": outbound_pii_masked,
                "private_context_used": private_context_used,
                "private_context_reason": private_context_reason,
                "private_context_markers": private_context_markers,
            },
        }
        if p_sukces_val is not None:
            final_metadata["p_sukces"] = round(p_sukces_val, 1)
        yield final_metadata
