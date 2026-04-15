import httpx
import asyncio
from typing import List, Dict, Any, Optional
from moa.models import RetrievedChunk

# Zgodnie z OpenAPI dostarczonym przez użytkownika
ELI_API_BASE_URL = "https://api.sejm.gov.pl/eli"

async def search_isap_acts(query: str, limit: int = 5) -> List[RetrievedChunk]:
    """
    Przeszukuje bazę ELI (European Legislation Identifier) Sejmu RP.
    Zwraca akty prawne pasujące do zapytania.
    """
    url = f"{ELI_API_BASE_URL}/acts/search"
    params = {
        "limit": limit,
        "keyword": query, 
        # "inForce": "1" # Można odkomentować, by szukać tylko obowiązujących
    }
    
    print(f"   [ELI/ISAP] Szukam aktów dla: '{query[:50]}...'")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            response = await client.get(url, params=params, headers=headers)
            
            if response.status_code != 200:
                print(f"   [ELI][ERR] HTTP {response.status_code}")
                return []
                
            data = response.json()
            items = data.get("items", [])
            
            chunks = []
            for item in items:
                title = item.get("title", "Brak tytułu")
                status = item.get("status", "nieznany")
                address = item.get("displayAddress", "n/a")
                eli_ref = item.get("ELI", "n/a")
                pub_date = item.get("announcementDate", "n/a")
                
                # Budujemy czytelną treść dla modelu AI
                content = (
                    f"TYTUŁ AKTU: {title}\n"
                    f"ADRES: {address}\n"
                    f"STATUS: {status}\n"
                    f"DATA OGŁOSZENIA: {pub_date}\n"
                    f"IDENTYFIKATOR ELI: {eli_ref}"
                )
                
                source = f"SEJM/ISAP: {address}"
                
                chunks.append(RetrievedChunk(
                    content=content,
                    source=source,
                    similarity=0.88 # Wysoki priorytet dla oficjalnych aktów prawnych
                ))
            
            print(f"   [ELI][OK] Znaleziono {len(chunks)} dokumentów")
            return chunks
            
    except Exception as e:
        print(f"   [ELI][ERR] Connection error: {e}")
        return []

async def generate_eli_explanation(
    final_answer: str, 
    retrieved_chunks: List[RetrievedChunk],
    query: str
) -> str:
    """
    Faza Walidacji i Optymalizacji (ELI - Explainable AI).
    Analizuje logikę odpowiedzi w stosunku do pobranych dokumentów SAOS/ISAP.
    """
    from moa.config import get_async_client, DEFAULT_JUDGE_MODEL
    
    # Przygotowanie mapy źródeł
    sources_text = ""
    for i, chunk in enumerate(retrieved_chunks):
        sources_text += f"[{i+1}] ŹRÓDŁO: {chunk.source}\nTREŚĆ: {chunk.content[:1000]}\nSIMILARITY: {chunk.similarity:.2f}\n\n"

    prompt = f"""Jesteś Ekspertem Wyjaśnialności AI (ELI - Explainable Legal Intelligence).
Twoim zadaniem jest sprawdzenie poprawności odpowiedzi wygenerowanej przez system RAG i dostarczenie transparentnego uzasadnienia.

[ZAPYTANIE UŻYTKOWNIKA]
{query}

[WYGENEROWANA ODPOWIEDŹ]
{final_answer}

[DOSTĘPNE ŹRÓDŁA (SAOS/ISAP/RAG)]
{sources_text}

[ZADANIE]
1. Sprawdź, czy odpowiedź jest w 100% uziemiona w dostarczonych źródłach.
2. Wskaż precyzyjnie, które fragmenty (numery źródeł) posłużyły do wygenerowania konkretnych wniosków.
3. Oceń 'pewność' odpowiedzi na podstawie podobieństwa semantycznego źródeł.
4. Wygeneruj uzasadnienie KROK PO KROKU (Step-by-Step Reasoning).

Zwróć odpowiedź w formacie Markdown, zaczynając od nagłówka: ### 💡 Uzasadnienie i Wyjaśnienie (System ELI)
"""

    try:
        client = get_async_client()
        response = await client.chat.completions.create(
            model="google/gemini-2.0-flash-001", # Szybki i precyzyjny do weryfikacji
            messages=[
                {"role": "system", "content": "Jesteś ELI - Explainable Legal Intelligence. Walidujesz i wyjaśniasz decyzje AI."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=1500
        )
        return response.choices[0].message.content or "Nie udało się wygenerować wyjaśnienia ELI."
    except Exception as e:
        return f"[ELI Error] Błąd podczas generowania wyjaśnienia: {str(e)}"

# Alias dla testów i kompatybilności
search_eli_acts = search_isap_acts

if __name__ == "__main__":
    async def test():
        res = await search_isap_acts("prawo o ruchu drogowym")
        for c in res: print(f"-> {c.source}: {c.content[:100]}...")
    asyncio.run(test())
