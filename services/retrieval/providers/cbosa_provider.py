"""Provider CBOSA — orzeczenia sądów administracyjnych (NSA/WSA).

Źródło: orzeczenia.nsa.gov.pl (centralna baza orzeczeń sądów administracyjnych).
Odpowiednik TypeScript: lexminde mcp/src/services/cbosaClient.ts
"""
from __future__ import annotations

import re
from typing import Any

import httpx

from services.retrieval.types import RetrievalItem, normalize_retrieval_rows


def _strip_html(text: Any) -> str:
    if text is None or isinstance(text, bool):
        return ""
    source = str(text)
    if not source:
        return ""
    clean = re.sub(r"<[^>]+>", " ", source)
    return re.sub(r"\s+", " ", clean).strip()


async def fetch_cbosa_once(
    client: httpx.AsyncClient,
    query: str,
    limit: int,
) -> list[RetrievalItem]:
    """Przeszukuje orzeczenia NSA/WSA poprzez CBOSA scrape endpoint."""
    url = "https://orzeczenia.nsa.gov.pl/cbo/find"
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://orzeczenia.nsa.gov.pl/",
    }

    try:
        response = await client.get(
            url,
            params={"q": query, "pn": 1, "ps": limit},
            headers=headers,
            follow_redirects=True,
        )
        if response.status_code != 200:
            import logging
            logging.getLogger(__name__).warning(f"[CBOSA Provider] Błąd zewnętrznego serwera NSA ({response.status_code}). Zwracam pustą listę wyników.")
            return []

        html = response.text
        results: list[dict[str, Any]] = []

        # Parsowanie prostych bloków z wyników HTML CBOSA
        # Szukamy wzorców: sygnatura, data, fragment sentencji
        blocks = re.findall(
            r'<tr[^>]*class="[^"]*lista[^"]*"[^>]*>.*?</tr>',
            html,
            re.DOTALL | re.IGNORECASE,
        )

        if not blocks:
            # Fallback: szukaj linków do orzeczeń z treścią
            links = re.findall(
                r'href="(/doc/[^"]+)"[^>]*>([^<]+)</a>',
                html,
            )
            for href, link_text in links[:limit]:
                sygnatura = link_text.strip()
                results.append(
                    {
                        "id": href,
                        "source": f"CBOSA — {sygnatura}",
                        "sygnatura": sygnatura,
                        "title": f"Orzeczenie NSA/WSA: {sygnatura}",
                        "content": f"[CBOSA] Orzeczenie {sygnatura} — sąd administracyjny.\nLink: https://orzeczenia.nsa.gov.pl{href}",
                        "similarity": 0.55,
                    }
                )
        else:
            for block in blocks[:limit]:
                sygnatura_match = re.search(
                    r'(?:sygn\.|sygnatura)[:\s]*([A-Z]+[\s/]+[A-Za-z0-9/\s-]+)', block
                )
                sygnatura = sygnatura_match.group(1).strip() if sygnatura_match else "brak sygn."

                date_match = re.search(r'(\d{4}-\d{2}-\d{2})', block)
                date_str = date_match.group(1) if date_match else "brak daty"

                snippet = _strip_html(block)[:1500]

                results.append(
                    {
                        "id": f"cbosa-{sygnatura}",
                        "source": f"CBOSA — {sygnatura}",
                        "sygnatura": sygnatura,
                        "title": f"Orzeczenie NSA/WSA: {sygnatura} ({date_str})",
                        "content": f"[{date_str} | sygn. {sygnatura} | Sąd administracyjny]\n{snippet}",
                        "similarity": 0.55,
                    }
                )

        return normalize_retrieval_rows(results)

    except httpx.TimeoutException:
        raise RuntimeError("cbosa_timeout")
    except httpx.ConnectError:
        raise RuntimeError("cbosa_connect_error")
