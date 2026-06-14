"""Wspólny kontekst czatu dla modułu sali rozprawy."""

from __future__ import annotations

from config import settings

ELABORATION_SCALES = {
    "skrot": 0.75,
    "standard": 1.0,
    "pelna": 1.25,
}


def chat_context_block(chat_context: str | None) -> str:
    text = (chat_context or "").strip()
    if not text:
        return ""
    cap = settings.trial_max_brief_chars
    if len(text) > cap:
        text = text[:cap] + "\n\n[… kontekst skrócony …]"
    return (
        "\n\n--- MATERIAŁ SPRAWY Z CZATU LEXMIND "
        "(ten sam kontekst otrzymują obrona, oskarżenie i sędzia) ---\n"
        f"{text}\n"
    )


def scaled_tokens(base: int, elaboration_mode: str | None) -> int:
    scale = ELABORATION_SCALES.get((elaboration_mode or "standard").strip().lower(), 1.0)
    return max(400, int(base * scale))
