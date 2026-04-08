import asyncio
import httpx
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def check_full_structure():
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Sprawdź wszystkie kolumny w knowledge_base
        r = await client.get(f'{SUPABASE_URL}/rest/v1/knowledge_base?select=*&limit=1', headers=headers)
        if r.status_code == 200:
            data = r.json()
            if data:
                record = data[0]
                print('Struktura rekordu:')
                for key, value in record.items():
                    if isinstance(value, list):
                        print(f'  {key}: list length={len(value)}')
                    elif isinstance(value, str):
                        print(f'  {key}: string length={len(value)}')
                    else:
                        print(f'  {key}: {type(value).__name__} = {value}')
            else:
                print('Brak danych w tabeli')
        else:
            print(f'Błąd: {r.status_code} - {r.text}')

if __name__ == "__main__":
    asyncio.run(check_full_structure())
