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
    
    # DELETE z in - batchami, bo 1000 może być za dużo
    batch_size = 100
    for i in range(0, len(ids), batch_size):
        batch_ids = ids[i:i+batch_size]
        ids_str = ','.join(f'"{id}"' for id in batch_ids)
        url_delete = f'{SUPABASE_URL}/rest/v1/knowledge_base?id=in.({ids_str})'
        response_del = httpx.delete(url_delete, headers=headers)
        print(f'Batch {i//batch_size + 1}: DELETE status {response_del.status_code}')
else:
    print(f'Błąd pobierania: {response.status_code} - {response.text}')