import asyncio
import httpx
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def check_traffic_law_content():
    print("Sprawdzanie pełnej zawartości Prawa o Ruchu Drogowym...")
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Pobierz wszystkie rekordy z Prawa o Ruchu Drogowym
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/knowledge_base?select=content,metadata&limit=50",
            headers=headers
        )
        
        if r.status_code == 200:
            records = r.json()
            
            traffic_records = []
            for record in records:
                metadata = record.get('metadata', {})
                filename = metadata.get('filename', '')
                
                if 'ruch' in filename.lower() and 'drogow' in filename.lower():
                    traffic_records.append(record)
            
            print(f"Znaleziono {len(traffic_records)} rekordów z Prawa o Ruchu Drogowym:")
            
            for i, record in enumerate(traffic_records):
                content = record.get('content', '')
                print(f"\nRekord {i+1}:")
                print(f"Długość content: {len(content)} znaków")
                print(f"Fragment: {content[:500]}...")
                
                # Sprawdź czy są słowa kluczowe
                keywords = ['prędkość', 'mandat', 'kierowca', 'pojazd', 'wykroczenie', 'znak', 'droga']
                found_keywords = [kw for kw in keywords if kw.lower() in content.lower()]
                if found_keywords:
                    print(f"Słowa kluczowe: {', '.join(found_keywords)}")
                else:
                    print("Brak słów kluczowych ruchu drogowego!")
        
        else:
            print(f"Błąd: {r.status_code} - {r.text[:200]}")

if __name__ == "__main__":
    asyncio.run(check_traffic_law_content())
