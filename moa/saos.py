import httpx
import asyncio
import re
from typing import List, Dict, Any, Optional
from moa.models import RetrievedChunk

def _strip_html(text: str) -> str:
    """Usuwa tagi HTML z treści orzeczeń SAOS."""
    clean = re.sub(r'<[^>]+>', ' ', text)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean[:3000]  # Limit długości jednego orzeczenia

SAOS_API_JUDGMENTS_URL = "https://www.saos.org.pl/api/search/judgments"

async def search_saos_judgments(query: str, page_size: int = 5) -> List[RetrievedChunk]:
    """
    Przeszukuje bazę SAOS (System Analizy Orzeczeń Sądowych) pod kątem wyroków.
    Zwraca listę obiektów RetrievedChunk, aby zachować kompatybilność z RAG.
    """
    params = {
        "pageSize": page_size,
        "pageNumber": 0,
        "all": query,
        "sortingField": "JUDGMENT_DATE",
        "sortingDirection": "DESC"
    }
    
    print(f"   [SAOS] Przeszukiwanie dla: '{query[:50]}...'")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            response = await client.get(SAOS_API_JUDGMENTS_URL, params=params, headers=headers)
            
            if response.status_code != 200:
                print(f"   [SAOS][ERR] HTTP {response.status_code}: {response.text[:200]}")
                return []
                
            try:
                data = response.json()
            except Exception as e:
                print(f"   [SAOS][ERR] Błąd formatu (Otrzymano uszkodzony JSON lub HTML): {response.text[:100]}")
                return []
                
            items = data.get("items", [])
            
            chunks = []
            for item in items:
                judgment_id = item.get("id")
                date = item.get("judgmentDate", "N/A")
                court_name = item.get("division", {}).get("court", {}).get("name", "N/A")
                case_number = "N/A"
                if item.get("courtCases"):
                    case_number = item["courtCases"][0].get("caseNumber", "N/A")
                
                # Tekst orzeczenia — czyścimy z HTML
                raw_content = item.get("textContent", "")
                if raw_content:
                    content = _strip_html(raw_content)
                else:
                    content = f"Wyrok z dnia {date}, sygn. {case_number}, sąd: {court_name}."

                full_source = f"ORZECZENIE SAOS ID: {judgment_id} ({court_name}, {case_number})"
                
                chunks.append(RetrievedChunk(
                    content=content,
                    source=full_source,
                    similarity=0.9 # SAOS nie zwraca score, dajemy wysoki bo to direct match
                ))
            
            print(f"   [SAOS][OK] Znaleziono {len(chunks)} orzeczeń")
            return chunks
            
    except Exception as e:
        print(f"   [SAOS][ERR] Błąd połączenia: {e}")
        return []

if __name__ == "__main__":
    # Test
    async def test():
        res = await search_saos_judgments("hulajnoga")
        for chunk in res:
            print(f"Source: {chunk.source}")
            print(f"Content: {chunk.content[:100]}...")
            print("-" * 20)
            
    asyncio.run(test())
