import asyncio
import httpx
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def search_speed_content():
    print("Szukanie treści o prędkości we wszystkich dokumentach...")
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Pobierz więcej rekordów
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/knowledge_base?select=content,metadata&limit=100",
            headers=headers
        )
        
        if r.status_code == 200:
            records = r.json()
            print(f"Sprawdzono {len(records)} rekordów...")
            
            speed_content = []
            for record in records:
                content = record.get('content', '')
                metadata = record.get('metadata', {})
                filename = metadata.get('filename', '')
                
                # Szukaj słów związanych z prędkością
                keywords = ['prędkość', 'prędkości', 'przekroczenie', 'limit', 'km/h', 'mandat', 'kara']
                if any(keyword in content.lower() for keyword in keywords):
                    speed_content.append({
                        'filename': filename,
                        'content_preview': content[:300] + '...' if len(content) > 300 else content,
                        'keywords_found': [kw for kw in keywords if kw.lower() in content.lower()]
                    })
            
            print(f"\nZnaleziono {len(speed_content)} fragmentów o prędkości:")
            
            for i, item in enumerate(speed_content[:10]):  # Pokaż pierwsze 10
                print(f"\n{i+1}. Plik: {item['filename']}")
                print(f"   Słowa kluczowe: {', '.join(item['keywords_found'])}")
                print(f"   Fragment: {item['content_preview']}")
        
        else:
            print(f"Błąd: {r.status_code} - {r.text[:200]}")

if __name__ == "__main__":
    asyncio.run(search_speed_content())
