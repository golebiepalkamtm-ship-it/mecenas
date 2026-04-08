import asyncio
import httpx
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY, OPENROUTER_API_KEY, OPENROUTER_BASE_URL

async def debug_rag():
    print("=" * 60)
    print("SZCZEGÓŁOWA DIAGNOSTYKA RAG")
    print("=" * 60)
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Sprawdź liczbę rekordów z embeddingami
        print("\n[1] Sprawdzanie rekordów z embeddingami...")
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/knowledge_base?select=id,embedding&limit=5",
            headers=headers
        )
        if r.status_code == 200:
            records = r.json()
            print(f"   Liczba rekordów: {len(records)}")
            for i, rec in enumerate(records):
                embedding = rec.get('embedding')
                if embedding:
                    if isinstance(embedding, str):
                        print(f"   Record {i+1}: embedding string length={len(embedding)}")
                    elif isinstance(embedding, list):
                        print(f"   Record {i+1}: embedding list length={len(embedding)}")
                    else:
                        print(f"   Record {i+1}: embedding type={type(embedding)}")
                else:
                    print(f"   Record {i+1}: brak embeddingu")
        else:
            print(f"   Błąd: {r.status_code} - {r.text[:200]}")
        
        # 2. Sprawdź czy jakikolwiek embedding nie jest None
        print("\n[2] Sprawdzanie rekordów z nie-None embeddingami...")
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/knowledge_base?select=id&embedding=not.is.null&limit=5",
            headers=headers
        )
        if r.status_code == 200:
            records = r.json()
            print(f"   Rekordy z embeddingami: {len(records)}")
        else:
            print(f"   Błąd: {r.status_code} - {r.text[:200]}")
        
        # 3. Test RPC z prawdziwym embeddingiem
        print("\n[3] Test RPC z prawdziwym embeddingiem...")
        
        # Najpierw pobierz prawdziwy embedding z bazy
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/knowledge_base?select=embedding&limit=1&embedding=not.is.null",
            headers=headers
        )
        
        if r.status_code == 200:
            records = r.json()
            if records and records[0].get('embedding'):
                sample_embedding = records[0]['embedding']
                if isinstance(sample_embedding, str):
                    # Base64 decode
                    import base64
                    import json
                    try:
                        decoded = base64.b64decode(sample_embedding)
                        embedding_list = json.loads(decoded)
                        print(f"   Pobrano embedding z bazy: {len(embedding_list)} wymiarów")
                    except:
                        print("   Błąd dekodowania embeddingu z bazy")
                        return
                elif isinstance(sample_embedding, list):
                    embedding_list = sample_embedding
                    print(f"   Pobrano embedding listę: {len(embedding_list)} wymiarów")
                else:
                    print("   Nieznany format embeddingu")
                    return
                
                # Test RPC
                rpc_payload = {
                    "query_embedding": embedding_list,
                    "match_threshold": 0.1,
                    "match_count": 5,
                }
                
                r_rpc = await client.post(
                    f"{SUPABASE_URL}/rest/v1/rpc/match_knowledge",
                    json=rpc_payload,
                    headers=headers
                )
                
                print(f"   RPC Status: {r_rpc.status_code}")
                if r_rpc.status_code == 200:
                    results = r_rpc.json()
                    print(f"   RPC Results: {len(results) if isinstance(results, list) else type(results)}")
                    if isinstance(results, list) and results:
                        print(f"   First result content length: {len(str(results[0].get('content', '')))}")
                else:
                    print(f"   RPC Error: {r_rpc.text[:300]}")
            else:
                print("   Brak embeddingów w bazie do testu")
        else:
            print(f"   Błąd pobierania embeddingu: {r.status_code}")

if __name__ == "__main__":
    asyncio.run(debug_rag())
