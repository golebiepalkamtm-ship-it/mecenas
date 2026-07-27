"""Provider KRS — odpisy spółek z Krajowego Rejestru Sądowego.

Źródło: api-krs.ms.gov.pl (Ministerstwo Sprawiedliwości, publiczne API).
Odpowiednik TypeScript: lexminde mcp/src/services/krsClient.ts
"""
from __future__ import annotations

import re
from typing import Any

import httpx

from services.retrieval.types import RetrievalItem, normalize_retrieval_rows

KRS_API_BASE = "https://api-krs.ms.gov.pl/api/krs"


async def fetch_krs_company(
    client: httpx.AsyncClient,
    krs_number: str,
) -> list[RetrievalItem]:
    """Pobiera odpis aktualny spółki z KRS API."""
    clean_krs = krs_number.strip().zfill(10)
    url = f"{KRS_API_BASE}/OdpisAktualny/{clean_krs}?rejestr=P&format=json"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }

    try:
        response = await client.get(url, headers=headers)
        if response.status_code == 404:
            return normalize_retrieval_rows([{
                "source": f"KRS — {clean_krs}",
                "title": f"KRS {clean_krs} — nie znaleziono",
                "content": f"Nie odnaleziono podmiotu o numerze KRS {clean_krs} w rejestrze przedsiębiorców.",
            }])
        if response.status_code != 200:
            raise RuntimeError(f"krs_http_{response.status_code}")

        data = response.json()
        odp = (data.get("odpis") or {}).get("dane") or {}
        dzial1 = odp.get("dzial1") or {}
        dzial2 = odp.get("dzial2") or {}

        nazwa = (dzial1.get("danePodmiotu") or {}).get("nazwa", "Nieokreślona nazwa")
        forma = (dzial1.get("danePodmiotu") or {}).get("formaPrawna", "")
        siedziba_data = (dzial1.get("siedzibaIAdres") or {}).get("siedziba") or {}
        miejscowosc = siedziba_data.get("miejscowosc", "")
        kraj = siedziba_data.get("kraj", "Polska")

        repr_data = dzial2.get("reprezentacja") or {}
        sposob = repr_data.get("sposobReprezentacji", "")
        sklad = repr_data.get("sklad") or []

        kapital = (dzial1.get("kapitalPodmiotu") or {}).get("kapitalZakladowy", {})
        kapital_str = kapital.get("wartosc", "brak danych") if isinstance(kapital, dict) else str(kapital)

        sklad_lines = []
        for member in sklad[:10]:
            imiona = member.get("imiona", "")
            nazwisko = member.get("nazwisko", "")
            funkcja = member.get("funkcjaWOrganie") or member.get("funkcja", "Członek")
            sklad_lines.append(f"  - {imiona} {nazwisko} — {funkcja}")

        content = (
            f"# Odpis KRS — {nazwa}\n"
            f"KRS: {clean_krs}\n"
            f"Forma prawna: {forma}\n"
            f"Siedziba: {miejscowosc}, {kraj}\n"
            f"Kapitał zakładowy: {kapital_str}\n\n"
            f"Sposób reprezentacji:\n> {sposob}\n\n"
            f"Skład organu reprezentacji:\n" + "\n".join(sklad_lines)
        )

        return normalize_retrieval_rows([{
            "id": f"krs-{clean_krs}",
            "source": f"KRS — {clean_krs}",
            "title": f"KRS {clean_krs}: {nazwa}",
            "content": content,
            "similarity": 0.8,
        }])

    except httpx.TimeoutException:
        raise RuntimeError("krs_timeout")
    except httpx.ConnectError:
        raise RuntimeError("krs_connect_error")


def extract_krs_numbers(text: str) -> list[str]:
    """Wyciąga numery KRS z tekstu użytkownika."""
    matches = re.findall(r'\bKRS\s*[:\-]?\s*(\d{7,10})\b', text, re.IGNORECASE)
    return [m.zfill(10) for m in matches]
