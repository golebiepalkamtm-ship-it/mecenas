from __future__ import annotations


def conversation_history_block(masked_history: str, limit: int = 8000) -> str:
    if not (masked_history or "").strip():
        return ""
    return (
        "\n[HISTORIA ROZMOWY — utrzymuj ciągłość; wcześniejsze ustalenia]\n"
        f"{masked_history[:limit]}\n"
    )
