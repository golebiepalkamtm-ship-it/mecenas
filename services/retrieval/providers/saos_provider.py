from __future__ import annotations

import re
from typing import Any

import httpx

from services.retrieval.types import RetrievalItem, normalize_retrieval_rows


def _strip_html(text: Any) -> str:
    if text is None:
        return ""
    if isinstance(text, bool):
        return ""
    source = str(text)
    if not source:
        return ""
    clean = re.sub(r"<[^>]+>", " ", source)
    return re.sub(r"\s+", " ", clean).strip()


async def fetch_saos_once(
    client: httpx.AsyncClient,
    query: str,
    limit: int,
) -> list[RetrievalItem]:
    url = "https://www.saos.org.pl/api/search/judgments"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.saos.org.pl/"
    }
    page_size = max(10, limit)
    response = await client.get(
        url,
        params={"all": query, "pageSize": page_size},
        headers=headers,
    )
    if response.status_code != 200:
        raise RuntimeError(f"saos_http_{response.status_code}")

    items = response.json().get("items", []) or []
    results: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue

        text_content = item.get("textContent") or ""
        snippet = _strip_html(text_content) if text_content else ""
        case_number = "N/A"
        court_cases = item.get("courtCases")
        if isinstance(court_cases, list) and court_cases:
            first = court_cases[0]
            if isinstance(first, dict) and first.get("caseNumber"):
                case_number = str(first["caseNumber"])

        court_name = item.get("courtName") or item.get("division") or "sąd"
        judgment_date = item.get("judgmentDate", "N/A")
        if not snippet:
            snippet = f"Orzeczenie z dnia {judgment_date}, sygn. {case_number}, {court_name}."

        header = f"[{judgment_date} | sygn. {case_number} | {court_name}]"
        results.append(
            {
                "id": item.get("id"),
                "source": f"SAOS — {case_number}",
                "sygnatura": case_number,
                "title": f"Orzeczenie {judgment_date}",
                "content": f"{header}\n{snippet[:2500]}",
                "full_text": f"{header}\n{snippet[:12000]}",
                "similarity": 0.6,
            }
        )

    return normalize_retrieval_rows(results)
