import asyncio
import httpx
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def check_data():
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Sprawdź dane w knowledge_base
        r = await client.get(f'{SUPABASE_URL}/rest/v1/knowledge_base?select=id,content,metadata&limit=3', headers=headers)
        if r.status_code == 200:
            data = r.json()
            print(f'Liczba rekordów: {len(data)}')
            for i, record in enumerate(data):
                print(f'Record {i+1}:')
                print(f'  ID: {record.get("id", "N/A")}')
                content = record.get('content', '')
                print(f'  Content length: {len(content)}')
                print(f'  Content preview: {content[:100]}...')
                print()
        else:
            print(f'Błąd: {r.status_code} - {r.text}')

if __name__ == "__main__":
    asyncio.run(check_data())
