from __future__ import annotations

import json
from typing import Any, Dict, List, Optional


def format_chat_history(
    messages: Optional[List[Dict[str, Any]]],
    *,
    max_messages: int,
    max_chars: int,
) -> str:
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
