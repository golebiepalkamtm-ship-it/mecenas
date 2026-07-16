from __future__ import annotations

import re


_ADDRESSEE_STOPWORDS = frozenset(
    {
        "starosta", "starosty", "starostę", "wojewody", "wojewodzie", "minister", "prezes",
        "dyrektor", "prokurator", "prokuratora", "sąd", "sądu", "urząd", "urzędu", "urzedu",
        "powiat", "powiatu", "gmina", "gminy", "rejonowy", "rejonowa", "rejonowego",
        "administracyjny", "administracyjna", "administracyjne", "skierowania", "skierowanie",
        "postępowania", "postępowanie", "wszczęcia", "wszczęcie", "zawiadomienia",
        "zawiadomienie", "decyzji", "decyzja", "wniosku", "wniosek", "sprawie", "sprawa",
        "lubaniu", "lubański", "lubańska", "polska", "polski", "polskiej",
    }
)


def extract_client_addressee(text: str) -> dict:
    if not text or len(text.strip()) < 30:
        return {}

    pl_name = r"[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+"
    candidates: list[tuple[str, str, str, int]] = []

    def _score(first: str, last: str, title: str, priority: int) -> None:
        f, l = first.strip(), last.strip()
        if len(f) < 2 or len(l) < 2:
            return
        if f.lower() in _ADDRESSEE_STOPWORDS or l.lower() in _ADDRESSEE_STOPWORDS:
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
