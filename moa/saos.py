import httpx
import asyncio
from typing import List, Dict, Any, Optional
from moa.models import RetrievedChunk

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
    
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(SAOS_API_JUDGMENTS_URL, params=params)
            
            if response.status_code != 200:
                print(f"   [SAOS][ERR] HTTP {response.status_code}: {response.text[:200]}")
                return []
                
            data = response.json()
            items = data.get("items", [])
            
            chunks = []
            for item in items:
                judgment_id = item.get("id")
                date = item.get("judgmentDate", "N/A")
                court_name = item.get("division", {}).get("court", {}).get("name", "N/A")
                case_number = "N/A"
                if item.get("courtCases"):
                    case_number = item["courtCases"][0].get("caseNumber", "N/A")
                
                # Tekst orzeczenia (może być w HTML lub czysty tekst)
                # W przykładach API widać judgment.textContent
                content = item.get("textContent", "")
                if not content:
                    # Czasem tekst jest w innym polu lub trzeba go pobrać osobno, 
                    # ale w wyszukiwarce 'all' zazwyczaj zwraca fragmenty.
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
