import asyncio
import httpx
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def check_embedding_dimensions():
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Sprawdź strukturę tabeli knowledge_base
        r = await client.get(f'{SUPABASE_URL}/rest/v1/knowledge_base?select=embedding&limit=1', headers=headers)
        if r.status_code == 200:
            data = r.json()
            if data:
                embedding = data[0].get('embedding', [])
                if isinstance(embedding, list):
                    print(f'Wymiar embeddingu w bazie: {len(embedding)}')
                else:
                    print(f'Embedding nie jest listą: {type(embedding)}')
            else:
                print('Brak danych w tabeli')
        else:
            print(f'Błąd: {r.status_code} - {r.text}')

if __name__ == "__main__":
    asyncio.run(check_embedding_dimensions())
