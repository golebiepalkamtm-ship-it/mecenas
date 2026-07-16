from __future__ import annotations

import json
from typing import Any, Optional

from config import settings


def format_chat_history(
    messages: Optional[list[dict[str, Any]]],
    max_messages: int | None = None,
    max_chars: int | None = None,
) -> str:
    """Składa historię czatu do jednego bloku tekstu, bez zależności od legacy OrchestratorService."""
    max_messages = max_messages or settings.chat_history_max_messages
    max_chars = max_chars or settings.chat_history_max_chars
    if not messages:
        return ""

    tail = messages[-max_messages:] if len(messages) > max_messages else list(messages)
    parts: list[str] = []
    total = 0

    for message in reversed(tail):
        if not isinstance(message, dict):
            continue

        role_val = message.get("role") or ""
        role = str(role_val).strip().lower()
        content_val = message.get("content") or message.get("text") or ""

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
        separator_len = 2 if parts else 0
        if total + len(line) + separator_len > max_chars:
            break

        parts.append(line)
        total += len(line) + separator_len

    if not parts:
        return ""

    output = "\n\n".join(reversed(parts))
    if len(messages) > max_messages:
        output = f"[… starsze wiadomości pominięte — pokazano ostatnie {max_messages} …]\n\n{output}"
    return output
