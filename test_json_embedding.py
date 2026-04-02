import asyncio
import httpx
import json
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def test_json_embedding():
    print("Test dekodowania JSON embeddingów...")
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/knowledge_base?select=embedding&limit=1&embedding=not.is.null",
            headers=headers
        )
        
        if r.status_code == 200:
            records = r.json()
            if records:
                embedding_str = records[0].get('embedding', '')
                print(f"String length: {len(embedding_str)}")
                print(f"First 100: {embedding_str[:100]}")
                
                try:
                    embedding_list = json.loads(embedding_str)
                    print(f"JSON decoded: {type(embedding_list)} length={len(embedding_list)}")
                    if isinstance(embedding_list, list):
                        print(f"First 5 values: {embedding_list[:5]}")
                        print(f"Last 5 values: {embedding_list[-5:]}")
                        
                        # Test RPC z tym embeddingiem
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
                        
                        print(f"\nRPC Status: {r_rpc.status_code}")
                        if r_rpc.status_code == 200:
                            results = r_rpc.json()
                            print(f"RPC Results: {len(results) if isinstance(results, list) else type(results)}")
                            if isinstance(results, list) and results:
                                print(f"First result content preview: {str(results[0].get('content', ''))[:200]}...")
                            else:
                                print(f"Unexpected result format: {results}")
                        else:
                            print(f"RPC Error: {r_rpc.text[:300]}")
                    
                except json.JSONDecodeError as e:
                    print(f"JSON decode error: {e}")

if __name__ == "__main__":
    asyncio.run(test_json_embedding())
