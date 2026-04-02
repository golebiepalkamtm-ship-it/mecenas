import asyncio
import httpx
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def check_traffic_law():
    print("Sprawdzanie przepisów o ruchu drogowym w bazie...")
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Szukanie dokumentów z "ruch" lub "drogow" w tytule/nazwie
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/knowledge_base?select=metadata,content&limit=10",
            headers=headers
        )
        
        if r.status_code == 200:
            records = r.json()
            print(f"Liczba wszystkich rekordów: {len(records)}")
            
            traffic_docs = []
            for record in records:
                metadata = record.get('metadata', {})
                filename = metadata.get('filename', '')
                content = record.get('content', '')
                
                if any(keyword in filename.lower() or keyword in content.lower() 
                       for keyword in ['ruch', 'drogow', 'prędkość', 'kierowc', 'pojazd', 'kodeks drogowy']):
                    traffic_docs.append({
                        'filename': filename,
                        'content_preview': content[:200] + '...' if len(content) > 200 else content
                    })
            
            print(f"\nZnaleziono {len(traffic_docs)} dokumentów związanych z ruchiem drogowym:")
            for i, doc in enumerate(traffic_docs):
                print(f"\n{i+1}. Plik: {doc['filename']}")
                print(f"   Fragment: {doc['content_preview']}")
        
        else:
            print(f"Błąd: {r.status_code} - {r.text[:200]}")

if __name__ == "__main__":
    asyncio.run(check_traffic_law())
