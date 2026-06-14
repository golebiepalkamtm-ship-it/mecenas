import asyncio
import logging
import re
import time
import json
from dataclasses import asdict
from datetime import date
from typing import List, Dict, Any, Optional

from config import (
    settings,
    DEFAULT_MODELS,
    FALLBACK_MODELS,
    DEPRECATED_MODEL_ALIASES,
)
from prompts.loader import load_prompt, get_master_system_prompt
from services.citation_guard import CitationGuard, citations_to_display, format_citation_warning
from services.legal_basis_validator import ValidArticlesCache, validate_expert_arguments
from services.document_chunking import chunk_document, document_overview
from services.llm_client import LLMClientService, _log_model_response
from services.pipeline.attachments import extract_all_attachments_text
from services.pipeline.fast_path import (
    fast_path_keywords,
    is_fast_statutory_query,
    is_traffic_stop_topic,
)
from services.pipeline.rag_retrieval import parallel_rag_gather
from services.pii_mask import mask_pii
from services.retrieval_service import retrieval_service
from services.rerank_service import (
    rerank_legal_chunks,
    rerank_external_sources,
    rerank_mixed_kb_chunks,
)
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
from moa.prompt_builder import merge_role_catalog, get_task_prompt, get_role_prompt
from domain.prompts.message_builder import ExpertGuards, PromptMessageBuilder
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
    """Pomocniczy generator dla przesyłania statusu i wyników w asynchronicznym potoku."""
    res = await coro
    yield {"type": "result", "value": res}





class OrchestratorService:
    # Wspólny limit kontekstu dokumentu (eksperci + sędzia)
    DOCUMENT_CONTEXT_CHARS = settings.document_context_chars

    _citation_guard = CitationGuard()

    def __init__(self) -> None:
        self._llm = LLMClientService(
            get_shared_openai_client(),
            fallback_models=settings.fallback_models,
            resolve_model_id=self._resolve_model_id,
        )

    async def process_user_request_stream_v2(self, **kwargs):
        """
        Zupełnie nowa bramka do czystego potoku V2.
        Zastępuje stary, 1500-linijkowy monolit Fazy 8 i 9.
        """
        from services.orchestrator_v2.pipeline import OrchestrationPipeline
        from services.orchestrator_types import OrchestratorInputParams
        
        # Konwersja starych kwargs na mocno typowane argumenty
        params = OrchestratorInputParams(
            user_query=kwargs.get("user_query", ""),
            attachments=kwargs.get("attachments"),
            selected_model=kwargs.get("selected_model"),
            selected_models=kwargs.get("selected_models"),
            aggregator_model=kwargs.get("aggregator_model"),
            use_saos=kwargs.get("use_saos", True),
            use_eli=kwargs.get("use_eli", True),
            use_rag_legal=kwargs.get("use_rag_legal", True),
            use_rag_user=kwargs.get("use_rag_user"),
            act_terms=kwargs.get("act_terms"),
            architect_prompt=kwargs.get("architect_prompt"),
            system_role_prompt=kwargs.get("system_role_prompt"),
            expert_roles=kwargs.get("expert_roles"),
            expert_role_prompts=kwargs.get("expert_role_prompts"),
            role_catalog=kwargs.get("role_catalog"),
            current_task=kwargs.get("current_task"),
            task_prompt=kwargs.get("task_prompt"),
            chat_mode=kwargs.get("chat_mode"),
            response_mode=kwargs.get("response_mode"),
            process_side=kwargs.get("process_side"),
            judge_system_prompt=kwargs.get("judge_system_prompt")
        )
        
        print(f"[V2] Rozpoczynam process_user_request_stream_v2. Query: {params.user_query[:50]}")
        pipeline = OrchestrationPipeline()
        try:
            async for chunk in pipeline.execute(params):
                yield chunk
            print("[V2] Zakończono pipeline.execute pomyślnie.")
        except Exception as e:
            print(f"[V2] BŁĄD KRYTYCZNY W PIPELINE: {e}")
            raise

    @staticmethod
    def _resolve_model_id(model_id: Optional[str]) -> str:
        if not model_id:
            return DEFAULT_MODELS[0]
        return DEPRECATED_MODEL_ALIASES.get(model_id.strip(), model_id.strip())

    def _cap_context_for_model(self, text: str) -> str:
        """Górny limit kontekstu merytorycznego — bez dodatkowego cięcia do 10k."""
        cap = max(self.DOCUMENT_CONTEXT_CHARS, settings.long_context_max_chars)
        t = text or ""
        if len(t) <= cap:
            return t
        return (
            t[:cap]
            + f"\n\n[… kontekst obcięty do {cap} znaków — reszta w RAG użytkownika …]\n"
        )

    def _format_expert_legal_basis(
        self,
        rag_legal_content: str,
        saos_block: str,
        eli_block: str,
    ) -> str:
        """Chroniony blok RAG/ELI/SAOS — przed debatą ekspertów, nie obcinany przez długie akta."""
        parts: List[str] = []
        if (rag_legal_content or "").strip():
            parts.append(
                "[PRZEPISY BAZY PRAWNEJ — cytuj art. TYLKO stąd, z ELI lub z akt klienta]\n"
                f"{rag_legal_content.strip()}"
            )
        if (eli_block or "").strip():
            parts.append(f"[AKTY PRAWNE ELI/ISAP]\n{eli_block.strip()}")
        if (saos_block or "").strip():
            parts.append(f"[ORZECZNICTWO SAOS]\n{saos_block.strip()}")
        if not parts:
            return ""
        blob = "\n\n".join(parts)
        legal_cap = max(18_000, min(len(blob), 48_000))
        if len(blob) <= legal_cap:
            return blob
        return (
            blob[: legal_cap - 48]
            + "\n\n[… skrócono blok prawny — reszta w syntezie końcowej …]\n"
        )

    def _format_expert_legal_basis_asymmetric(
        self,
        expert_index: int,
        rag_legal_content: str,
        saos_block: str,
        eli_block: str,
        timeline_block: str = "",
        proc_block: str = "",
        hypothesis_block: str = "",
    ) -> str:
        """Asymetryczny blok prawny per ekspert — różne źródła dla różnych ról.

        expert_index 0 (Doktrynalny): pełny RAG + ELI — przepisy i ustawy
        expert_index 1 (Proceduralny): ELI + timeline + procedural — oś czasu i procedura
        expert_index 2 (Strategiczny): SAOS + hipotezy — orzecznictwo i furtki
        expert_index 3+: pełny kontekst (jak główny blok)
        """
        parts: List[str] = []
        slot = expert_index % 3 if expert_index < 3 else -1

        if slot == 0:
            # Ekspert Doktrynalny — RAG + ELI (przepisy materialne)
            if (rag_legal_content or "").strip():
                parts.append(
                    "[PRZEPISY BAZY PRAWNEJ — cytuj art. TYLKO stąd lub z akt klienta]\n"
                    f"{rag_legal_content.strip()}"
                )
            if (eli_block or "").strip():
                parts.append(f"[AKTY PRAWNE ELI/ISAP]\n{eli_block.strip()}")
            if (saos_block or "").strip():
                parts.append(f"[ORZECZNICTWO SAOS — streszczenie]\n{saos_block[:3000].strip()}")

        elif slot == 1:
            # Ekspert Proceduralny — ELI + timeline + procedural
            if (eli_block or "").strip():
                parts.append(f"[AKTY PRAWNE ELI/ISAP]\n{eli_block.strip()}")
            if (proc_block or "").strip():
                parts.append(f"[KONTEKST PROCEDURALNY]\n{proc_block.strip()}")
            if (timeline_block or "").strip():
                parts.append(f"[OŚ CZASU SPRAWY]\n{timeline_block.strip()}")
            if (rag_legal_content or "").strip():
                parts.append(f"[PRZEPISY — skrót]\n{rag_legal_content[:4000].strip()}")

        elif slot == 2:
            # Ekspert Strategiczny — SAOS + hipotezy + RAG (furtki)
            if (saos_block or "").strip():
                parts.append(f"[ORZECZNICTWO SAOS — pełne]\n{saos_block.strip()}")
            if (hypothesis_block or "").strip():
                parts.append(f"[HIPOTEZY PRAWNE]\n{hypothesis_block[:6000].strip()}")
            if (rag_legal_content or "").strip():
                parts.append(f"[PRZEPISY BAZY PRAWNEJ]\n{rag_legal_content.strip()}")
            if (eli_block or "").strip():
                parts.append(f"[ELI — skrót]\n{eli_block[:3000].strip()}")

        else:
            return self._format_expert_legal_basis(rag_legal_content, saos_block, eli_block)

        if not parts:
            return ""
        blob = "\n\n".join(parts)
        legal_cap = max(18_000, min(len(blob), 48_000))
        if len(blob) <= legal_cap:
            return blob
        return (
            blob[: legal_cap - 48]
            + "\n\n[… skrócono blok prawny — reszta w syntezie końcowej …]\n"
        )

    CONVERSATION_CONTINUITY_GUARD = load_prompt("conversation_continuity_guard")

    DEFAULT_ARCHITECT_PROMPT = load_prompt("architect_default")

    CITIZEN_ARCHITECT_PROMPT = load_prompt("architect_citizen")

    DRAFT_ARCHITECT_PROMPT = load_prompt("architect_draft")

    DRAFT_SYNTHESIS_GUARD = load_prompt("draft_synthesis_guard")
    EXPERT_TASK_PREAMBLE = load_prompt("expert_task_preamble")
    EXPERT_OUTPUT_FORMAT = load_prompt("expert_output_format")
    PROCEDURE_ADAPTIVE_GUARD = load_prompt("procedure_adaptive_guard")
    ANTI_PARAPHRASE_GUARD = load_prompt("anti_paraphrase_guard")
    STRICT_NO_QUOTE_GUARD = load_prompt("strict_no_quote_guard")
    STRATEGIST_ENGAGEMENT_GUARD = load_prompt("strategist_engagement_guard")
    INDIVIDUAL_CONTEXT_GUARD = load_prompt("individual_context_guard")
    COHERENCE_SYNTHESIS_GUARD = load_prompt("coherence_synthesis_guard")
    ADVISOR_SYNTHESIS_GUARD = load_prompt("advisor_synthesis_guard")
    STRATEGIC_SYNTHESIS_GUARD = load_prompt("strategic_synthesis_guard")
    JUDGE_DEBATE_SYNTHESIS = load_prompt("judge_debate_synthesis")
    HELPFUL_SYNTHESIS_GUARD = load_prompt("helpful_synthesis_guard")
    MASTER_SYSTEM_PROMPT = get_master_system_prompt()
    CONCRETE_CLIENT_ACTIONS_GUARD = load_prompt("concrete_client_actions_guard")
    LOW_CONFIDENCE_SYNTHESIS_EXTRA = load_prompt("low_confidence_synthesis_extra")
    CLIENT_PLAIN_LANGUAGE_GUARD = load_prompt("client_plain_language_guard")
    POLISH_LEGAL_LANGUAGE_GUARD = load_prompt("polish_legal_language_guard")
    LITIGATION_STRATEGIC_GUARD = load_prompt("litigation_strategic_guard")
    HUMANIZED_OUTPUT_GUARD = load_prompt("humanized_output_guard")
    PROMPT_AGENT_DOCTRINAL = load_prompt("prompt_agent_doctrinal")
    PROMPT_AGENT_STRATEGIC = load_prompt("prompt_agent_strategic")
    PROMPT_AGENT_COUNTER = load_prompt("prompt_agent_counter")

    PROMPT_AGENT_MASTER_STRATEGIST = load_prompt("prompt_agent_master_strategist")
    PROMPT_AGENT_CRIMINAL_DEFENSE = load_prompt("prompt_agent_criminal_defense")
    PROMPT_AGENT_CONSTITUTIONAL = load_prompt("prompt_agent_constitutional")
    PROMPT_AGENT_DOCUMENT_DESTRUCTOR = load_prompt("prompt_agent_document_destructor")
    PROMPT_AGENT_EMERGENCY = load_prompt("prompt_agent_emergency")
    PROMPT_AGENT_LEGAL_DRAFTSMAN = load_prompt("prompt_agent_legal_draftsman")
    PROMPT_AGENT_RAG_RESEARCHER = load_prompt("prompt_agent_rag_researcher")

    DOCUMENT_CONTEXT_HEADER = load_prompt("document_context_header")

    HALLUCINATION_BLOCK_MIN_CITES = settings.hallucination_block_min_cites
    CHUNK_SIZE_CHARS = settings.chunk_size_chars
    CHUNK_OVERLAP_CHARS = settings.chunk_overlap_chars

    def _build_expert_prompt(
        self,
        role_block: str,
        combined_context: str,
        user_query: str,
        task_block: str = "",
        legal_basis_block: str = "",
    ) -> str:
        task_section = f"{task_block}\n\n" if task_block else ""
        legal_section = ""
        if (legal_basis_block or "").strip():
            legal_section = (
                f"--- PODSTAWA PRAWNA (RAG przed debatą — Etap 6/7, obowiązkowa) ---\n"
                f"{legal_basis_block.strip()}\n\n"
            )
        return (
            f"{self.MASTER_SYSTEM_PROMPT}\n\n"
            f"{self.EXPERT_TASK_PREAMBLE}\n"
            f"{self.STRICT_NO_QUOTE_GUARD}\n"
            f"{self.INDIVIDUAL_CONTEXT_GUARD}\n"
            f"{task_section}{role_block}\n\n"
            f"{legal_section}"
            f"--- KONTEKST SPRAWY (akta, chronologia, RAG użytkownika) ---\n"
            f"{self._cap_context_for_model(combined_context)}\n\n"
            f"--- PYTANIE KLIENTA ---\n{user_query}\n"
            f"{self.EXPERT_OUTPUT_FORMAT}"
            f"{self.POLISH_LEGAL_LANGUAGE_GUARD}"
        )

    def _resolve_expert_role_block(
        self,
        model_id: str,
        default_role: str,
        expert_roles: Optional[dict] = None,
        expert_role_prompts: Optional[dict] = None,
        role_catalog: Optional[dict] = None,
        side: str = "defense",
    ) -> str:
        """Mapuje model → rolę (expert_roles) lub custom prompt (expert_role_prompts)."""
        if expert_role_prompts and model_id in expert_role_prompts:
            custom = (expert_role_prompts[model_id] or "").strip()
            if custom:
                return custom
        catalog = role_catalog or {}
        prompt_side: str = side if side in ("defense", "prosecution") else "defense"
        if expert_roles and model_id in expert_roles:
            role_id = expert_roles[model_id]
            if role_id in catalog:
                return catalog[role_id]
            preset = get_role_prompt(role_id, side=prompt_side)  # type: ignore[arg-type]
            if preset:
                return preset
        return default_role

    def _expert_context_with_chunk(
        self,
        base_context: str,
        full_document: str,
        expert_index: int,
        chunk_focus: str,
    ) -> str:
        """Przypisuje ekspertowi fragment dokumentu + skrót globalny."""
        chunks = chunk_document(
            full_document,
            chunk_size=self.CHUNK_SIZE_CHARS,
            overlap=self.CHUNK_OVERLAP_CHARS,
            max_chunks=settings.chunk_max_count,
        )
        if not chunks:
            return base_context
        if len(chunks) == 1 or len(full_document) <= self.DOCUMENT_CONTEXT_CHARS:
            if len(full_document) <= self.DOCUMENT_CONTEXT_CHARS and full_document.strip():
                return (
                    f"{base_context}\n\n"
                    f"[PEŁNY TEKST AKT / PISMA — źródło faktów]\n{full_document}\n"
                )
            return base_context

        assigned = chunks[min(expert_index, len(chunks) - 1)]
        overview = document_overview(full_document)
        return (
            f"{base_context}\n\n"
            f"[DOKUMENT — fragment {assigned['index']}/{assigned['total']} | {chunk_focus}]\n"
            f"{assigned['text']}\n\n"
            f"[SKRÓT CAŁEGO PISMA — kontekst globalny]\n{overview[:3500]}"
        )

    async def _reconcile_expert_debate(
        self,
        client,
        model_id: str,
        analysis_1: dict,
        analysis_2: dict,
        analysis_3: dict,
        user_query: str,
        *,
        conversation_snippet: str = "",
        status_callback=None,
    ) -> str:
        """Etap 8b: pojednanie 3 niezależnych opinii przed syntezą sędziego."""
        hist_block = ""
        if (conversation_snippet or "").strip():
            hist_block = (
                f"\n\n[HISTORIA ROZMOWY — kontekst dla pojednania]\n"
                f"{conversation_snippet[:2500]}\n"
            )
        reconcile_prompt = (
            f"Data analizy (bieżąca): {date.today().strftime('%d.%m.%Y')}.\n"
            "Masz trzy NIEZALEŻNE opinie ekspertów prawnych w tej samej sprawie.\n"
            "Stwórz PROTOKÓŁ Pojednania Debaty (bez nowych przepisów ani faktów spoza opinii):\n"
            "1) Przepisy w TEJ sprawie (max 6 — art. | w sprawie klienta | zastosowanie | czynność)\n"
            "2) Furtki z RAG/ELI (max 5 — indywidualne zastosowanie, nie definicje)\n"
            "3) Właściwa dziedzina, etap i czynności TERAZ\n"
            "4) Sprzeczności — rozstrzygnięcie na korzyść klienta\n"
            "5) Koła ratunkowe — wszystkie ścieżki wyjścia + najbezpieczniejsza opcja\n\n"
            f"PYTANIE KLIENTA: {user_query}"
            f"{hist_block}\n\n"
            f"--- EKSPERT 1 ---\n{analysis_1.get('response', '')[:3500]}\n\n"
            f"--- EKSPERT 2 ---\n{analysis_2.get('response', '')[:3500]}\n\n"
            f"--- EKSPERT 3 ---\n{analysis_3.get('response', '')[:3500]}"
        )
        try:
            text, _ = await self._call_with_fallback(
                client,
                model_id,
                [{"role": "user", "content": reconcile_prompt}],
                max_tokens=1600,
                temperature=0.15,
                timeout=45.0,
                status_callback=status_callback,
                log_context="ETAP 8b Pojednanie debaty",
            )
            return (text or "").strip()
        except Exception as e:
            logger.error(f"   [STAGE 8b ERR] Pojednanie debaty: {e}")
            return ""

    async def _citation_guard_llm_call(
        self,
        client,
        model_id: str,
        prompt: str,
        status_callback=None,
    ) -> str:
        text, _ = await self._call_with_fallback(
            client,
            model_id,
            [{"role": "user", "content": prompt}],
            max_tokens=250,
            temperature=0.0,
            timeout=40.0,
            status_callback=status_callback,
            log_context="ETAP 10 Audyt cytowań art.",
        )
        return (text or "").strip()

    def _mask_pii(self, text: str) -> str:
        """Etap 2: Anonimizacja RODO dla PESEL, dowodów osobistych, maili i podstawowych danych."""
        return mask_pii(text)


    def _build_query_for_retrieval(self, masked_query: str, masked_history: str) -> str:
        if not (masked_history or "").strip():
            return masked_query
        return (
            f"{masked_query}\n\n[Kontekst wcześniejszej rozmowy]\n"
            f"{masked_history[:4000]}"
        )

    def _conversation_history_block(self, masked_history: str, limit: int = 8000) -> str:
        if not (masked_history or "").strip():
            return ""
        return (
            f"\n[HISTORIA ROZMOWY — utrzymuj ciągłość; wcześniejsze ustalenia]\n"
            f"{masked_history[:limit]}\n"
        )

    def _format_chat_history(
        self,
        messages: Optional[List[Dict[str, Any]]],
        max_messages: int | None = None,
        max_chars: int | None = None,
    ) -> str:
        """Składa historię czatu do jednego bloku tekstu (najnowsze wypowiedzi na końcu)."""
        max_messages = max_messages or settings.chat_history_max_messages
        max_chars = max_chars or settings.chat_history_max_chars
        if not messages:
            return ""
        tail = messages[-max_messages:] if len(messages) > max_messages else list(messages)
        parts: List[str] = []
        total = 0
        for m in reversed(tail):
            if not isinstance(m, dict):
                continue
            role_val = m.get("role") or ""
            role = str(role_val).strip().lower()
            
            content_val = m.get("content") or m.get("text") or ""
            content = ""
            
            # Obsługa struktur (załączniki / formaty listowe z frontendu)
            if isinstance(content_val, list):
                text_parts = []
                for item in content_val:
                    if isinstance(item, dict) and item.get("type") == "text":
                        text_parts.append(str(item.get("text") or ""))
                    elif isinstance(item, str):
                        text_parts.append(item)
                content = "\n".join(text_parts).strip()
            elif isinstance(content_val, dict):
                content = str(content_val.get("text") or "").strip()
            else:
                content = str(content_val).strip()

            # Obsługa ukrytego JSONa w bazie danych (gdy content to np. "[{\"type\": \"text\"...}]")
            if content.startswith("["):
                try:
                    parsed = json.loads(content)
                    if isinstance(parsed, list):
                        text_parts = []
                        for item in parsed:
                            if isinstance(item, dict) and item.get("type") == "text":
                                text_parts.append(str(item.get("text") or ""))
                            elif isinstance(item, str):
                                text_parts.append(item)
                        content = "\n".join(text_parts).strip()
                except Exception:
                    pass

            if not content:
                continue
            if role in ("assistant", "model", "system"):
                label = "Asystent"
            elif role == "user":
                label = "Użytkownik"
            else:
                label = (role or "Wiadomość").capitalize()
            line = f"{label}: {content}"
            sep = 2 if parts else 0
            if total + len(line) + sep > max_chars:
                break
            parts.append(line)
            total += len(line) + sep
        if not parts:
            return ""
        out = "\n\n".join(reversed(parts))
        if len(messages) > max_messages:
            out = f"[… starsze wiadomości pominięte — pokazano ostatnie {max_messages} …]\n\n{out}"
        return out

    def _check_coi(self, text: str) -> list:
        """Etap 2: Weryfikacja konfliktu interesów (Conflict of Interest check)."""
        if not text:
            return []
        conflicted_entities = [
            "Kowalski Sp. z o.o.",
            "Pol-Hurt S.A.",
            "Acme Corp",
            "Janusz Kowalski",
            "Marek Nowak",
            "Bank Millennium",
            "PKO BP"
        ]
        found_conflicts = []
        for entity in conflicted_entities:
            if entity.lower() in text.lower():
                found_conflicts.append(entity)
        return found_conflicts

    _ADDRESSEE_STOPWORDS = frozenset({
        "starosta", "starosty", "starostę", "wojewody", "wojewodzie", "minister", "prezes",
        "dyrektor", "prokurator", "prokuratora", "sąd", "sądu", "urząd", "urzędu", "urzedu",
        "powiat", "powiatu", "gmina", "gminy", "rejonowy", "rejonowa", "rejonowego",
        "administracyjny", "administracyjna", "administracyjne", "skierowania", "skierowanie",
        "postępowania", "postępowanie", "wszczęcia", "wszczęcie", "zawiadomienia",
        "zawiadomienie", "decyzji", "decyzja", "wniosku", "wniosek", "sprawie", "sprawa",
        "lubaniu", "lubański", "lubańska", "polska", "polski", "polskiej",
    })

    def _extract_client_addressee(self, text: str) -> dict:
        """Wykrywa dane adresata z pisma (Pan/Pani + imię i nazwisko) do personalizacji zwrotu."""
        if not text or len(text.strip()) < 30:
            return {}

        pl_name = r"[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+"
        candidates: list[tuple[str, str, str, int]] = []

        def _score(first: str, last: str, title: str, priority: int) -> None:
            f, l = first.strip(), last.strip()
            if len(f) < 2 or len(l) < 2:
                return
            if f.lower() in self._ADDRESSEE_STOPWORDS or l.lower() in self._ADDRESSEE_STOPWORDS:
                return
            if not re.fullmatch(rf"{pl_name}", f) or not re.fullmatch(rf"{pl_name}", l):
                return
            candidates.append((title, f, l, priority))

        patterns: list[tuple[str, str, int]] = [
            (rf"\bPan\s+({pl_name})\s+({pl_name})\b", "pan", 10),
            (rf"\bPani\s+({pl_name})\s+({pl_name})\b", "pani", 10),
            (rf"Szanowny\s+Panie\s+({pl_name})\b", "pan", 8),
            (rf"Szanowna\s+Pani\s+({pl_name})\b", "pani", 8),
            (rf"w\s+sprawie\s+(?:skierowania\s+)?({pl_name})a?\s+({pl_name})\b", "", 6),
            (rf"wobec\s+({pl_name})a?\s+({pl_name})\b", "", 7),
            (rf"\bw\s+stosunku\s+do\s+({pl_name})a?\s+({pl_name})\b", "", 7),
            (rf"dotyczy:\s*({pl_name})\s+({pl_name})\b", "", 6),
            (rf"zam\.?\s*({pl_name})\s+({pl_name})\b", "", 7),
            (rf"ur\.?\s*({pl_name})\s+({pl_name})\b", "", 4),
        ]

        for pattern, default_title, priority in patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                groups = match.groups()
                if len(groups) == 1:
                    _score(groups[0], "", default_title or "pan", priority)
                elif len(groups) >= 2:
                    title = default_title
                    if not title:
                        start = max(0, match.start() - 80)
                        window = text[start:match.start()].lower()
                        title = "pani" if "pani" in window else "pan"
                    _score(groups[0], groups[1], title, priority)

        if not candidates:
            return {}

        candidates.sort(key=lambda x: x[3], reverse=True)
        title, first, last, _ = candidates[0]
        title_label = "Pani" if title == "pani" else "Pan"
        if first and last:
            formal = f"{title_label} {first} {last}"
            short = f"{title_label} {last}"
        elif first:
            formal = f"{title_label} {first}"
            short = formal
        else:
            return {}

        return {
            "title": title_label,
            "first_name": first or None,
            "last_name": last or None,
            "formal_address": formal,
            "short_address": short,
        }

    def _get_easter_date(self, year: int):
        """Algorytm Meeusa/Jonesa/Butchera dla wyznaczenia Niedzieli Wielkanocnej."""
        from datetime import datetime
        a = year % 19
        b = year // 100
        c = year % 100
        d = b // 4
        e = b % 4
        f = (b + 8) // 25
        g = (b - f + 1) // 3
        h = (19 * a + b - d - g + 15) % 30
        i = c // 4
        k = c % 4
        L = (32 + 2 * e + 2 * i - h - k) % 7
        m = (a + 11 * h + 22 * L) // 451
        month = (h + L - 7 * m + 114) // 31
        day = ((h + L - 7 * m + 114) % 31) + 1
        return datetime(year, month, day)

    def _get_polish_holidays(self, year: int) -> set:
        """Zwraca zbiór dat (datetime.date) będących dniami ustawowo wolnymi od pracy w Polsce."""
        from datetime import datetime, timedelta
        holidays = {
            (1, 1),   # Nowy Rok
            (1, 6),   # Trzech Króli
            (5, 1),   # Święto Pracy
            (5, 3),   # Święto Konstytucji 3 Maja
            (8, 15),  # Wniebowzięcie NMP / Wojska Polskiego
            (11, 1),  # Wszystkich Świętych
            (11, 11), # Narodowe Święto Niepodległości
            (12, 25), # Pierwszy dzień Bożego Narodzenia
            (12, 26), # Drugi dzień Bożego Narodzenia
        }
        
        easter = self._get_easter_date(year)
        easter_monday = easter + timedelta(days=1)
        corpus_christi = easter + timedelta(days=60)
        
        holidays_dates = {
            datetime(year, m, d).date() for m, d in holidays
        }
        holidays_dates.add(easter.date())
        holidays_dates.add(easter_monday.date())
        holidays_dates.add(corpus_christi.date())
        
        return holidays_dates

    def _extract_fallback_keywords(self, text: str, query: str) -> str:
        """Ekstrakcja dynamicznych słów kluczowych w przypadku awarii LLM (Local NLP Fallback)."""
        # 1. Wykrywanie wyrazów pisanych wielką literą (imiona, nazwiska, nazwy własne)
        raw_combined = (query or "") + " " + (text or "")
        capitalized_words = set(re.findall(r'\b[A-ZĄĆĘŁŃÓŚŹŻ][a-pr-uwyząćęłńóśźż]{3,}\b', raw_combined))
        capitalized_lower = {w.lower() for w in capitalized_words}
        
        # Lista dozwolonych pojęć instytucjonalnych / geograficznych (nie odrzucamy ich)
        allowed_entities = {
            "polska", "polski", "polsce", "ustawa", "kodeks", "kpc", "kpa", "saos", 
            "eli", "urząd", "urzedu", "skarbowy", "skarbowego", "trybunał", "sejm", "senat",
            "minister", "prezydent", "rząd", "wsa", "nsa", "sn", "lubaniu", "luban", "lubań"
        }
        
        # Nazwy własne do odrzucenia (imiona, nazwiska itp.)
        rejected_names = capitalized_lower - allowed_entities
        
        # 2. Budowanie głównej listy Stop-words (w tym RODO i popularnych imion)
        stopwords = {
            "oraz", "tylko", "jego", "mnie", "który", "która", "które", "przez", 
            "jest", "będzie", "było", "być", "sobie", "tego", "jeśli", "jeżeli", 
            "zatem", "więc", "także", "czyli", "jako", "taki", "taka", "takie", 
            "może", "mogą", "musi", "muszą", "stan", "rzecz", "dane", "inna", 
            "inne", "zgodnie", "artykul", "punkt", "pisma", "sprawy", "klienta",
            "zawiera", "opis", "orzecznictwo", "prawo", "ustawa", "przepisów",
            "wskazuje", "podstawie", "tekst", "analizy", "prawnej", "dnia", "roku",
            # Imiona i nazwiska (RODO stop-words)
            "marcin", "palka", "pałka", "kowalski", "kowalska", "nowak", "wiśniewski",
            "wisniewski", "wiśniewska", "wisniewska", "wójcik", "wojcik", "kowalczyk",
            "kamiński", "kaminski", "lewandowski", "lewandowska", "zieliński", "zielinski",
            "szymański", "szymanski", "woźniak", "wozniak", "dąbrowski", "dabrowski",
            "kozłowski", "kozlowski", "mazur", "jankowski", "kwiatkowski", "kaczmarek",
            "jan", "andrzej", "piotr", "krzysztof", "stanisław", "stanislaw", "tomasz",
            "paweł", "pawel", "józef", "jozef", "marek", "grzegorz", "tadeusz", "jerzy",
            "zbigniew", "ryszard", "dariusz", "henryk", "mariusz", "kazimierz", "wiesław",
            "wieslaw", "marian", "janusz", "wojciech", "adam", "łukasz", "lukasz",
            "sebastian", "mateusz", "damian", "przemysław", "przemyslaw", "radosław",
            "radoslaw", "kamil", "patryk", "mirosław", "miroslaw", "jacek", "arek",
            "arkadiusz", "maciej", "rafal", "rafał", "michal", "michał", "anna", "maria",
            "katarzyna", "małgorzata", "malgorzata", "agnieszka", "barbara", "krystyna",
            "ewa", "elżbieta", "elzbieta", "zofia", "janina", "teresa", "joanna", "magdalena",
            "monika", "danuta", "halina", "irena", "helena", "beata", "aleksandra", "marta",
            "dorota", "marianna", "grażyna", "grazyna", "jolanta", "stanisława", "stanislawa"
        }
        
        # Połączenie statycznych i dynamicznych stop-words
        all_ignored = stopwords.union(rejected_names)
        
        # 3. Ekstrakcja słów kluczowych
        combined_lower = raw_combined.lower()
        words = re.findall(r'\b[a-pr-uwyząćęłńóśźż]{4,}\b', combined_lower)
        
        candidates = [w for w in words if w not in all_ignored]
        
        # Obliczamy częstość występowania wyrazów
        from collections import Counter
        freq = Counter(candidates)
        
        # Pobieramy najczęstsze wyrazy
        common = [item[0] for item in freq.most_common(5)]
        
        # Słownik specyficznych pojęć podatkowych/prawnych do priorytetyzacji
        legal_fallbacks = ["wezwanie", "nadpłata", "urząd", "skarbowy", "podatek", "decyzja"]
        for fallback in legal_fallbacks:
            if len(common) >= 5:
                break
            if fallback in combined_lower and fallback not in common and fallback not in all_ignored:
                common.append(fallback)
                
        if len(common) >= 3:
            return ", ".join(common)
            
        return "wezwanie, urząd skarbowy, nadpłata, postępowanie"

    async def _rerank_context(self, results: list, query: str) -> list:
        """Reranking po hybrid/vector retrieval (RRF + opcjonalnie Cohere)."""
        return await rerank_legal_chunks(
            results,
            query,
            provider=settings.rerank_provider,
            top_k=settings.rerank_top_k,
        )

    async def _rerank_kb_mixed(
        self,
        legal_res: list,
        user_res: list,
        query: str,
    ) -> tuple[list, list]:
        return await rerank_mixed_kb_chunks(
            legal_res,
            user_res,
            query,
            provider=settings.rerank_provider,
            legal_top_k=settings.rerank_top_k,
            user_top_k=settings.rag_user_top_k,
        )

    async def _rerank_saos_eli(
        self,
        saos_results: list,
        eli_results: list,
        query: str,
    ) -> tuple[list, list]:
        return await rerank_external_sources(
            saos_results,
            eli_results,
            query,
            provider=settings.rerank_provider,
            top_k=settings.external_rerank_top_k,
        )

    @staticmethod
    def _hallucination_block_threshold(response_mode: str) -> int:
        return hallucination_block_min_for_mode(response_mode)

    async def _run_debate_cross_exam(
        self,
        client,
        agent_results: list,
        combined_context: str,
        user_query: str,
        primary_model: str,
        status_callback=None,
    ) -> str:
        """Structured Debate R2 — krzyżowe zapytania między ekspertami."""
        try:
            cross_prompt = load_prompt("debate_cross_exam")
        except FileNotFoundError:
            return ""
        claims_blob = "\n".join(
            f"--- {ar.get('model', 'ekspert')} ---\n{(ar.get('response') or '')[:2000]}"
            for ar in agent_results[:5]
        )
        prompt = (
            f"{cross_prompt}\n\n"
            f"PYTANIE: {user_query[:600]}\n\n"
            f"OPINIE:\n{claims_blob}\n\n"
            f"KONTEKST (skrót):\n{combined_context[:4000]}"
        )
        try:
            text, _ = await self._call_with_fallback(
                client,
                primary_model,
                [{"role": "user", "content": prompt}],
                max_tokens=1200,
                temperature=0.2,
                timeout=45.0,
                status_callback=status_callback,
                log_context="ETAP 8 R2 cross-exam",
            )
            return (text or "").strip()
        except Exception as e:
            logger.error("[STAGE 8 R2] cross-exam: %s", e)
            return ""

    async def _synthesis_repair_pass(
        self,
        client,
        model_id: str,
        final_answer: str,
        bad_cites: set,
        allowed_corpus: str,
        status_callback=None,
    ) -> str:
        """Jedna poprawka akapitów z niezweryfikowanymi cytatami."""
        if not bad_cites or not (final_answer or "").strip():
            return final_answer
        cite_list = ", ".join(sorted(bad_cites)[:8])
        prompt = (
            "Popraw WYŁĄCZNIE fragmenty odnoszące się do niezweryfikowanych przepisów. "
            "Usuń lub zastąp je przepisami z ALLOWED_CORPUS. Nie zmieniaj reszty.\n"
            f"NIEZWERYFIKOWANE: {cite_list}\n\n"
            f"ALLOWED_CORPUS:\n{allowed_corpus[:6000]}\n\n"
            f"TEKST:\n{final_answer[:8000]}"
        )
        try:
            repaired, _ = await self._call_with_fallback(
                client,
                model_id,
                [{"role": "user", "content": prompt}],
                max_tokens=2000,
                temperature=0.1,
                timeout=55.0,
                status_callback=status_callback,
                log_context="ETAP 11 repair",
            )
            if (repaired or "").strip():
                return repaired.strip()
        except Exception as e:
            logger.error("[STAGE 11 repair] %s", e)
        return final_answer


    async def _call_with_fallback(
        self,
        _client,
        model_id: str,
        messages: list,
        max_tokens: int = 1000,
        temperature: float = 0.2,
        timeout: float = 60.0,
        status_callback=None,
        log_context: str = "",
        response_format=None,
    ):
        return await self._llm.call_with_fallback(
            model_id,
            messages,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=timeout,
            status_callback=status_callback,
            log_context=log_context,
            response_format=response_format,
        )

    async def _call_with_fallback_stream(
        self, _client, model_id: str, messages: list, max_tokens: int = 2000,
        temperature: float = 0.3, timeout: float = 30.0, status_callback=None,
    ):
        return await self._llm.call_with_fallback_stream(
            model_id,
            messages,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=timeout,
            status_callback=status_callback,
        )

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
            guards=ExpertGuards(
                master_system=self.MASTER_SYSTEM_PROMPT,
                expert_task_preamble=self.EXPERT_TASK_PREAMBLE,
                expert_output_format=self.EXPERT_OUTPUT_FORMAT,
                strict_no_quote=self.STRICT_NO_QUOTE_GUARD,
                individual_context=self.INDIVIDUAL_CONTEXT_GUARD,
                polish_legal=self.POLISH_LEGAL_LANGUAGE_GUARD,
            ),
        )
        resolved_task_block = (task_prompt or "").strip()
        if not resolved_task_block and current_task:
            resolved_task_block = get_task_prompt(current_task, side=prompt_side)  # type: ignore[arg-type]
        resolved_response_mode = (response_mode or "strategic").strip().lower()
        if resolved_response_mode not in ("citizen", "strategic", "draft"):
            resolved_response_mode = "strategic"
        
        from moa.dynamic_models import get_default_primary_model, get_default_expert_models
        # Inicjalizacja modeli i status_callback na samym początku
        primary_model = self._resolve_model_id(selected_model or get_default_primary_model())
        if selected_models:
            expert_models = [self._resolve_model_id(m) for m in selected_models[:3]]
        elif selected_model:
            resolved = self._resolve_model_id(selected_model)
            expert_models = [self._resolve_model_id(m) for m in get_default_expert_models(exclude_model=resolved)]
        else:
            expert_models = [self._resolve_model_id(m) for m in get_default_expert_models(exclude_model=primary_model)]
        judge_model = self._resolve_model_id(aggregator_model or selected_model or expert_models[0])
        
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
            return await self._call_with_fallback(
                client,
                mid,
                msgs,
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=timeout,
                status_callback=status_callback,
                log_context=log_ctx,
            )

        # Historia rozmowy — format i natychmiastowa anonimizacja (kolejność: załaduj → maskuj → użyj)
        raw_chat_history = self._format_chat_history(chat_history)
        zanonimizowana_historia = self._mask_pii(raw_chat_history)
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
        client_addressee = self._extract_client_addressee(extracted_text)
        if client_addressee.get("formal_address"):
            logger.info(f"   [STAGE 2] Adresat z dokumentu: {client_addressee['formal_address']}")

        # Maskowanie PII (Anonimizacja RODO)
        zanonimizowane_zapytanie = self._mask_pii(user_query)
        zanonimizowany_tekst = self._mask_pii(extracted_text)

        query_for_retrieval = self._build_query_for_retrieval(zanonimizowane_zapytanie, zanonimizowana_historia)
        traffic_stop_query = bool(suggest_act_terms_for_query(query_for_retrieval)) or is_traffic_stop_topic(
            zanonimizowane_zapytanie
        )

        # Conflict of Interest Check — na już zanonimizowanym kontekście
        coi_conflicts = self._check_coi(
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
        
        ctx_builder = ContextBuilder(self)
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

        if resolved_response_mode == "strategic" and not use_fast_path:
            from services.investigation.strategy_engine import generate_litigation_strategy

            try:
                strat = await generate_litigation_strategy(
                    call_llm=inv_call_llm or _proc_llm,
                    model_id=primary_model,
                    case_summary=zanonimizowany_tekst[:8000] or zanonimizowane_zapytanie,
                    procedural_snippet=proc_block[:3000],
                )
                strat_block = strat.to_context_block()
                if strat_block:
                    combined_context += f"\n{strat_block}\n"
            except Exception as e:
                logger.error("[StrategyEngine] %s", e)

        # --- ETAP 8 ZDELEGOWANE DO DebateManager ---
        from services.debate.debate_manager import DebateManager

        debate_mgr = DebateManager(self)
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
            expert_roles=expert_roles,
            expert_role_prompts=expert_role_prompts,
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
            logger.info(
                "   [STAGE 9] P(Sukces) = %.1f%% (średnia ważona z %s/%s opinii z jawnych %%, ryzyko proc. %.1f)",
                p_sukces_val,
                len(pairs),
                len(scores_weights),
                R_procesowe,
            )
        else:
            logger.info(
                "   [STAGE 9] P(Sukces) pominięte — żaden ekspert nie podał jawnego %% szans w odpowiedzi."
            )

        claim_scores_payload: List[Dict[str, Any]] = []
        if inv_state and inv_call_llm and researcher_responses.strip() and not skip_expert_debate:
            from services.investigation.adversarial_loop import run_iterative_adversarial

            try:
                adv_hdr = (
                    f"Sprawa (skrót): {zanonimizowane_zapytanie[:500]}\n"
                    f"Tagi problemu: {', '.join(inv_state.problem_tags or [])}"
                )
                addendum = await run_iterative_adversarial(
                    defense_text=researcher_responses,
                    call_llm=inv_call_llm,
                    model_id=primary_model,
                    state=inv_state,
                    context_header=adv_hdr,
                )
                if addendum.strip():
                    researcher_responses += (
                        "\n\n=== SPARING ADVERSARIAL (analiza kontr) ===\n" + addendum
                    )
            except Exception as e:
                logger.error("[INV] adversarial: %s", e)

        if inv_state and inv_call_llm and inv_state.hypotheses:
            from services.investigation.claim_scoring import score_hypotheses

            try:
                ev_snip = (
                    (rag_legal_content or "")[:7000]
                    + "\n"
                    + (hypothesis_context_extra or "")[:4000]
                )
                scored = await score_hypotheses(
                    hypotheses=inv_state.hypotheses,
                    evidence_snippet=ev_snip,
                    call_llm=inv_call_llm,
                    model_id=primary_model,
                    state=inv_state,
                )
                claim_scores_payload = [c.to_dict() for c in scored]
            except Exception as e:
                logger.error("[INV] claim scoring: %s", e)

        # --- ETAP 10: WERYFIKACJA CYTOWAŃ (każdy art. musi być poparty) ---
        yield {
            "type": "metadata",
            "message": "[Etap 10] Audyt podstawy prawnej: weryfikacja KAŻDEGO cytatu art. (dokument → RAG → ELI → LLM)...",
        }

        rag_snippet_for_verify = (rag_legal_content or "")[:4000]

        async def _eli_lookup(keywords: str, limit: int = 2, user_query: str = ""):
            return await retrieval_service.search_eli(keywords, limit=limit, user_query=user_query)

        llm_audit_fn = None
        if not use_fast_path:
            async def _llm_audit(prompt: str) -> str:
                return await self._citation_guard_llm_call(
                    client, primary_model, prompt, status_callback=status_callback,
                )
            llm_audit_fn = _llm_audit

        if use_fast_path:
            yield {
                "type": "metadata",
                "message": "[Etap 10] Szybka ścieżka: audyt cytowań tylko w korpusie RAG (bez LLM).",
            }

        all_cites, unverified_list = await self._citation_guard.audit(
            [researcher_responses],
            document_text=full_doc,
            combined_context=combined_context,
            legal_results=reranked_legal or legal_res,
            user_results=reranked_user or user_res,
            saos_results=saos_results,
            eli_results=eli_results,
            user_query=query_for_retrieval[:6000],
            search_eli=_eli_lookup if not use_fast_path else None,
            call_llm=llm_audit_fn,
            analysis_for_llm=researcher_responses,
            rag_snippet=rag_snippet_for_verify,
            expert_analysis=researcher_responses,
            legal_basis_text=legal_basis_block,
            trust_expert_debate=settings.citation_trust_expert_debate,
            trust_legal_kb=settings.citation_trust_legal_kb_act,
            require_legal_rag=False,
        )
        hallucinated_cites = set(citations_to_display(unverified_list))
        verified_count = len(all_cites) - len(unverified_list)

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
                "fast_path": bool(use_fast_path),
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

        cite_block_threshold = self._hallucination_block_threshold(resolved_response_mode)
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

        synth_engine = SynthesisEngine(self)
        async for event in synth_engine.run_synthesis_stream(
            client=client,
            judge_model=judge_model,
            primary_model=primary_model,
            use_fast_path=use_fast_path,
            resolved_response_mode=resolved_response_mode,
            architect_prompt=architect_prompt,
            system_role_prompt=system_role_prompt,
            judge_system_prompt=judge_system_prompt,
            client_addressee=client_addressee,
            full_doc=full_doc,
            traffic_stop_query=traffic_stop_query,
            zanonimizowana_historia=zanonimizowana_historia,
            inv_state=inv_state,
            skip_expert_debate=skip_expert_debate,
            rag_legal_content=rag_legal_content,
            rag_user_content=rag_user_content,
            eli_block=eli_block,
            saos_block=saos_block,
            eli_results=eli_results,
            saos_results=saos_results,
            attachments=attachments,
            extracted_text=extracted_text,
            p_sukces_val=p_sukces_val,
            urgency_header=urgency_header,
            timeline_block=timeline_block,
            fact_sheet_block=fact_sheet_block,
            zanonimizowane_zapytanie=zanonimizowane_zapytanie,
            hallucinated_cites=hallucinated_cites,
            cite_block_mode=cite_block_mode,
            cite_block_threshold=cite_block_threshold,
            unverified_list=unverified_list,
            researcher_responses=researcher_responses,
            combined_context=combined_context,
            low_confidence=low_confidence,
            reranked_legal=reranked_legal,
            reranked_user=reranked_user,
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
            session_id=session_id,
            inbound_blocked=inbound_blocked,
            inbound_matches=inbound_matches,
            outbound_pii_masked=outbound_pii_masked,
            private_context_used=private_context_used,
            private_context_reason=private_context_reason,
            private_context_markers=private_context_markers,
            start_pipeline_time=start_pipeline_time,
            llm_audit_fn=llm_audit_fn,
            _eli_lookup=_eli_lookup,
            run_with_status_stream=run_with_status_stream,
            status_callback=status_callback,
            analysis=analysis,
            user_res=user_res,
            legal_res=legal_res,
        ):
            yield event
        return

        """
        synthesis_blocked = (
            cite_block_mode == "strict"
            and len(hallucinated_cites) >= cite_block_threshold
        )
        citation_warn_only = (
            cite_block_mode == "warn"
            and bool(hallucinated_cites)
            and not synthesis_blocked
        )

        # --- ETAP 11: WARSTA SYNTEZY KLIENCKIEJ & FINALNY RAPORT ---
        yield {"type": "metadata", "message": "[Etap 11] Synteza Kliencka: łączenie opinii końcowej..."}

        if resolved_response_mode == "citizen":
            system_content = architect_prompt or self.CITIZEN_ARCHITECT_PROMPT
        elif resolved_response_mode == "draft":
            system_content = architect_prompt or self.DRAFT_ARCHITECT_PROMPT
        else:
            system_content = architect_prompt or self.DEFAULT_ARCHITECT_PROMPT

        master_prompt = self.MASTER_SYSTEM_PROMPT
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

        if system_role_prompt and is_single_mode:
            system_content += f"\n\n{system_role_prompt}"
        if (judge_system_prompt or "").strip() and not is_single_mode:
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
            system_content += self.CLIENT_PLAIN_LANGUAGE_GUARD
        if resolved_response_mode != "draft":
            system_content += self.STRICT_NO_QUOTE_GUARD
            system_content += self.INDIVIDUAL_CONTEXT_GUARD
            system_content += self.STRATEGIST_ENGAGEMENT_GUARD
            system_content += self.PROCEDURE_ADAPTIVE_GUARD
            system_content += self.ANTI_PARAPHRASE_GUARD
            if traffic_stop_query:
                try:
                    system_content += "\n\n" + load_prompt("traffic_stop_guard")
                except FileNotFoundError:
                    pass
        if resolved_response_mode == "strategic":
            system_content += self.LITIGATION_STRATEGIC_GUARD
        if resolved_response_mode != "draft":
            system_content += self.HUMANIZED_OUTPUT_GUARD
        if zanonimizowana_historia.strip():
            system_content += f"\n\n{self.CONVERSATION_CONTINUITY_GUARD}"
        system_content += self.COHERENCE_SYNTHESIS_GUARD
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
            self.DRAFT_SYNTHESIS_GUARD
            if resolved_response_mode == "draft"
            else (
                self.STRATEGIC_SYNTHESIS_GUARD
                if resolved_response_mode == "strategic"
                else self.ADVISOR_SYNTHESIS_GUARD
            )
        )
        debate_block = (
            "" if skip_expert_debate else self.JUDGE_DEBATE_SYNTHESIS
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
            advisor_prompt += self.LOW_CONFIDENCE_SYNTHESIS_EXTRA

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
                async for event in run_with_status_stream(
                    self._call_with_fallback_stream(
                        client,
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

                # Audyt cytowań w syntezie sędziego — każdy nowy art. musi być poparty
                if final_answer.strip():
                    synth_source_corpus = (
                        f"{full_doc}\n{researcher_responses[:8000]}\n{combined_context[:4000]}"
                    )
                    _, synth_unverified = await self._citation_guard.audit(
                        [final_answer],
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
                            repaired = await self._synthesis_repair_pass(
                                client,
                                judge_model,
                                final_answer,
                                new_in_synthesis,
                                allowed_corpus,
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
        generate_plain_summary = (not use_fast_path) and (resolved_response_mode == "citizen" or use_eli)
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
                    self._call_with_fallback(
                        client,
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

        cited_sources_payload = build_cited_sources_for_answer(
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

        # Ostateczne metadane Enterprise v2.5
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
        """

    async def process_user_request(self, *args, **kwargs):
        """Metoda zgodności wstecznej — agreguje asynchroniczny generator i zwraca słownik."""
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
        p_sukces: Optional[float] = None
        confidence_score = 95.0
        hitl_escalated = False
        claim_scores: List[Dict[str, Any]] = []
        investigation_summary: Optional[Dict[str, Any]] = None

        async for chunk in self.process_user_request_stream(*args, **kwargs):
            if chunk.get("type") == "chunk":
                val = chunk.get("text", "")
                if isinstance(val, str):
                    ans += val
            elif chunk.get("type") == "metadata" and "expert_analyses" in chunk:
                val = chunk["expert_analyses"]
                if isinstance(val, list):
                    analysis = val
            elif chunk.get("type") == "final_metadata":
                val_sources = chunk.get("sources")
                if isinstance(val_sources, list):
                    sources = val_sources
                
                val_analysis = chunk.get("expert_analyses")
                if isinstance(val_analysis, list):
                    analysis = val_analysis
                
                val_eli = chunk.get("eli_explanation")
                if isinstance(val_eli, str):
                    eli = val_eli
                
                val_latency = chunk.get("pipeline_latency_ms")
                if isinstance(val_latency, (int, float)):
                    latency = int(val_latency)
                
                val_ans = chunk.get("final_answer")
                if isinstance(val_ans, str):
                    ans = val_ans
                
                val_urgency = chunk.get("urgency_alerts")
                if isinstance(val_urgency, list):
                    urgency_alerts = val_urgency
                
                val_timeline = chunk.get("timeline")
                if isinstance(val_timeline, list):
                    timeline = val_timeline
                
                val_gaps = chunk.get("gaps")
                if isinstance(val_gaps, list):
                    gaps = val_gaps
                
                val_inconsistencies = chunk.get("inconsistencies")
                if isinstance(val_inconsistencies, list):
                    inconsistencies = val_inconsistencies
                
                val_coi = chunk.get("coi_conflicts")
                if isinstance(val_coi, list):
                    coi_conflicts = val_coi
                
                val_p = chunk.get("p_sukces")
                if val_p is None:
                    pass
                elif isinstance(val_p, (int, float)):
                    p_sukces = float(val_p)
                
                val_conf = chunk.get("confidence_score")
                if isinstance(val_conf, (int, float)):
                    confidence_score = float(val_conf)
                
                val_hitl = chunk.get("hitl_escalated")
                if isinstance(val_hitl, bool):
                    hitl_escalated = val_hitl

                val_cs = chunk.get("claim_scores")
                if isinstance(val_cs, list):
                    claim_scores = val_cs

                val_inv = chunk.get("investigation_summary")
                if isinstance(val_inv, dict):
                    investigation_summary = val_inv

        return {
            "answer": ans,
            "analysis": analysis,
            "context_sources": sources,
            "eli_explanation": eli,
            "pipeline_latency_ms": latency,
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
