"""Sala rozprawy — osobny pipeline (pozycje stron, symulacja, werdykt)."""

from __future__ import annotations

import logging
from typing import Any, AsyncIterator, Dict, List, Optional

from moa.prompt_builder import DEFENSE_UNIVERSE, PROSECUTION_UNIVERSE
from services.orchestrator import orchestrator
from services.trial_position_pipeline import stream_trial_position
from services.trial_context import chat_context_block, scaled_tokens

logger = logging.getLogger(__name__)

TRIAL_VERDICT_SYSTEM = """[JUDGE_ROLE: NEUTRAL_TRIAL_BENCH — SALA ROZPRAWY]
Jesteś neutralnym sędziem symulacji procesowej LexMind. Nie jesteś stroną.
Masz: pytanie sprawy, pozycję obrony, pozycję oskarżenia oraz protokół sali (jeśli jest).

ZASADY:
- Werdykt opieraj WYŁĄCZNIE na dostarczonych materiałach.
- Wskaż sprzeczności między stronami.
- Nie powtarzaj całych pism — synteza decyzyjna.

FORMAT ODPOWIEDZI (markdown):
## Werdykt
(krótko: kto ma przewagę argumentacyjną w tej symulacji i dlaczego)

## Uzasadnienie
(kluczowe tezy obu stron i ocena ich siły)

## Obrona — mocne / słabe
## Oskarżenie — mocne / słabe
## Braki materiałowe
(co należałoby uzupełnić w realnej sprawie)
## Rekomendacja
(następne kroki procesowe — bez autopromocji usług)
"""

HEARING_PROSECUTION_PROMPT = """[SALA ROZPRAWY — TURA OSKARŻENIA]
Sprawa: {question}

--- POZYCJA OBRONY (materiał przeciwny) ---
{defense_brief}

--- POZYCJA OSKARŻENIA (Twoja strona) ---
{prosecution_brief}

--- PROTOKÓŁ WCZEŚNIEJSZYCH TUR ---
{prior}

Zadanie: Przeprowadź atak argumentacyjny na słabe punkty obrony. Maks. ~600 słów.
Nie cytuj fikcyjnych przepisów — oznacz [wymaga weryfikacji] gdy brak pewności."""

HEARING_DEFENSE_PROMPT = """[SALA ROZPRAWY — TURA OBRONY]
Sprawa: {question}

--- POZYCJA OBRONY (Twoja strona) ---
{defense_brief}

--- POZYCJA OSKARŻENIA ---
{prosecution_brief}

--- PROTOKÓŁ WCZEŚNIEJSZYCH TUR ---
{prior}

Zadanie: Odpieraj zarzuty z ostatniej tury oskarżenia. Maks. ~600 słów.
Nie cytuj fikcyjnych przepisów — oznacz [wymaga weryfikacji] gdy brak pewności."""


def _universe_for_side(side: str) -> dict:
    return PROSECUTION_UNIVERSE if side == "prosecution" else DEFENSE_UNIVERSE


def _position_user_message(side: str, question: str) -> str:
    label = "OSKARŻENIE" if side == "prosecution" else "OBRONA"
    return (
        f"[SALA ROZPRAWY — ETAP POZYCJI: {label}]\n\n"
        f"Sprawa / zagadnienie użytkownika:\n{question.strip()}\n\n"
        f"Przygotuj kompletną pozycję procesową strony {label} "
        f"(tezy, podstawa, zarzuty/obrona, procedura, ryzyka). "
        f"To materiał wejściowy do późniejszej symulacji sali — bądź konkretny."
    )


class TrialRoomService:
    async def stream_position(
        self,
        *,
        side: str,
        question: str,
        selected_models: Optional[List[str]],
        aggregator_model: Optional[str],
        architect_prompt: Optional[str],
        expert_roles: Optional[Dict[str, str]],
        role_catalog: Optional[Dict[str, str]],
        chat_mode: str,
        use_saos: bool,
        use_eli: bool,
        use_rag_legal: bool,
        chat_context: str = "",
        elaboration_mode: str = "standard",
    ) -> AsyncIterator[Dict[str, Any]]:
        _ = chat_mode, use_saos, use_eli, use_rag_legal  # lite pipeline bez pełnego MOA/RAG
        universe = _universe_for_side(side)
        async for chunk in stream_trial_position(
            side=side,
            question=question,
            selected_models=selected_models,
            aggregator_model=aggregator_model,
            architect_prompt=(architect_prompt or "").strip() or universe["identity"],
            expert_roles=expert_roles,
            role_catalog=role_catalog or universe.get("roles"),
            chat_context=chat_context,
            elaboration_mode=elaboration_mode,
        ):
            yield chunk

    async def stream_hearing(
        self,
        *,
        question: str,
        defense_brief: str,
        prosecution_brief: str,
        rounds: int,
        prosecution_model: str,
        defense_model: str,
        chat_context: str = "",
        elaboration_mode: str = "standard",
    ) -> AsyncIterator[Dict[str, Any]]:
        rounds = max(1, min(rounds, 6))
        protocol_parts: List[str] = []

        for i in range(rounds):
            is_prosecution = i % 2 == 0
            side = "prosecution" if is_prosecution else "defense"
            model = prosecution_model if is_prosecution else defense_model
            prior = "\n\n".join(protocol_parts) if protocol_parts else "(brak — pierwsza tura)"

            ctx = chat_context_block(chat_context)
            hearing_tokens = scaled_tokens(1800, elaboration_mode)
            if is_prosecution:
                user_content = HEARING_PROSECUTION_PROMPT.format(
                    question=question,
                    defense_brief=defense_brief[:12000],
                    prosecution_brief=prosecution_brief[:12000],
                    prior=prior[:8000],
                ) + ctx
            else:
                user_content = HEARING_DEFENSE_PROMPT.format(
                    question=question,
                    defense_brief=defense_brief[:12000],
                    prosecution_brief=prosecution_brief[:12000],
                    prior=prior[:8000],
                ) + ctx

            yield {
                "type": "metadata",
                "message": f"[Sala] Tura {i + 1}/{rounds}: {'oskarżenie' if is_prosecution else 'obrona'}",
                "trial_round": i + 1,
                "trial_side": side,
            }

            text, used = await orchestrator._call_with_fallback(
                None,
                orchestrator._resolve_model_id(model),
                [
                    {"role": "system", "content": _universe_for_side(side)["identity"]},
                    {"role": "user", "content": user_content},
                ],
                max_tokens=hearing_tokens,
                temperature=0.35,
                timeout=90.0,
            )

            round_text = (text or "").strip()
            protocol_parts.append(
                f"### Tura {i + 1} — {'OSKARŻENIE' if is_prosecution else 'OBRONA'} ({used})\n{round_text}"
            )

            yield {
                "type": "trial_round",
                "round": i + 1,
                "side": side,
                "model": used,
                "text": round_text,
            }
            yield {"type": "chunk", "text": round_text}

    async def stream_verdict(
        self,
        *,
        question: str,
        defense_brief: str,
        prosecution_brief: str,
        hearing_protocol: str,
        judge_model: str,
        chat_context: str = "",
    ) -> AsyncIterator[Dict[str, Any]]:
        ctx = chat_context_block(chat_context)
        user_content = (
            f"## Sprawa (skrót)\n{question.strip()}\n"
            f"{ctx}\n\n"
            f"## Pozycja obrony\n{defense_brief[:14000]}\n\n"
            f"## Pozycja oskarżenia\n{prosecution_brief[:14000]}\n\n"
            f"## Protokół sali rozprawy\n"
            f"{(hearing_protocol or '(symulacja pominięta)').strip()[:16000]}"
        )

        yield {"type": "metadata", "message": "[Sala] Werdykt sędziego…"}

        stream = None
        used_model = orchestrator._resolve_model_id(judge_model)
        try:
            stream, used_model = await orchestrator._call_with_fallback_stream(
                None,
                used_model,
                [
                    {"role": "system", "content": TRIAL_VERDICT_SYSTEM},
                    {"role": "user", "content": user_content},
                ],
                max_tokens=3500,
                temperature=0.2,
                timeout=120.0,
            )
        except Exception:
            logger.warning(
                "[Sala] Strumień werdyktu nieudany — fallback bez streamu",
                exc_info=True,
            )
            stream = None

        if stream is None:
            text, used_model = await orchestrator._call_with_fallback(
                None,
                used_model,
                [
                    {"role": "system", "content": TRIAL_VERDICT_SYSTEM},
                    {"role": "user", "content": user_content},
                ],
                max_tokens=3500,
                temperature=0.2,
                timeout=120.0,
            )
            if text:
                yield {"type": "chunk", "text": text}
            return

        try:
            while True:
                chunk = await stream.__anext__()
                content = chunk.choices[0].delta.content or ""
                if content:
                    yield {"type": "chunk", "text": content}
        except StopAsyncIteration:
            pass


trial_room_service = TrialRoomService()
