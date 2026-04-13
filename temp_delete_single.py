import httpx
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

headers = {'Authorization': f'Bearer {SUPABASE_ANON_KEY}', 'apikey': SUPABASE_ANON_KEY}

# Pobierz wszystkie id
url_get = f'{SUPABASE_URL}/rest/v1/knowledge_base?select=id'
response = httpx.get(url_get, headers=headers)
if response.status_code == 200:
    data = response.json()
    ids = [item['id'] for item in data]
    print(f'Znaleziono {len(ids)} rekordów do usunięcia.')
    
    # DELETE pojedynczo
    deleted = 0
    for id in ids:
        url_delete = f'{SUPABASE_URL}/rest/v1/knowledge_base?id=eq.{id}'
        response_del = httpx.delete(url_delete, headers=headers)
        if response_del.status_code == 204:
            deleted += 1
        else:
            print(f'Błąd dla {id}: {response_del.status_code} - {response_del.text}')
    
    print(f'Usunięto {deleted} rekordów.')
else:
    print(f'Błąd pobierania: {response.status_code} - {response.text}')