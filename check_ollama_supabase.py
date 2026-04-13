import httpx

try:
    with httpx.Client(timeout=5) as client:
        r = client.get('http://127.0.0.1:11434/')
        print('ollama', r.status_code, r.text[:200])
except Exception as e:
    print('ollama error', e)

try:
    headers = {
        'apikey': 'sbp_bc736171cdee952a5bad86f3b933a68bd2c39fe7',
        'Authorization': 'Bearer sbp_bc736171cdee952a5bad86f3b933a68bd2c39fe7'
    }
    with httpx.Client(timeout=5) as client:
        r = client.get('https://dhyvxspgsktpbjonejek.supabase.co/rest/v1/', headers=headers)
        print('supabase', r.status_code, r.text[:200])
except Exception as e:
    print('supabase error', e)
