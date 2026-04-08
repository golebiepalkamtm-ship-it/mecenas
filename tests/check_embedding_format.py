import asyncio
import httpx
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def check_embedding_format():
    print("Sprawdzanie formatu embeddingów...")
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/knowledge_base?select=embedding&limit=2&embedding=not.is.null",
            headers=headers
        )
        
        if r.status_code == 200:
            records = r.json()
            for i, rec in enumerate(records):
                embedding_str = rec.get('embedding', '')
                print(f"\nRecord {i+1}:")
                print(f"  String length: {len(embedding_str)}")
                print(f"  First 100 chars: {embedding_str[:100]}")
                print(f"  Last 100 chars: {embedding_str[-100:]}")
                
                # Spróbuj różne dekodowania
                try:
                    import base64
                    import json
                    
                    # 1. Bezpośrednie base64 decode
                    try:
                        decoded = base64.b64decode(embedding_str)
                        print(f"  Base64 decoded length: {len(decoded)}")
                        print(f"  First 50 decoded: {decoded[:50]}")
                        
                        # 2. JSON decode
                        try:
                            embedding_list = json.loads(decoded)
                            print(f"  JSON decoded: {type(embedding_list)} length={len(embedding_list) if isinstance(embedding_list, list) else 'N/A'}")
                            if isinstance(embedding_list, list) and embedding_list:
                                print(f"  First value: {embedding_list[0]}")
                        except json.JSONDecodeError as e:
                            print(f"  JSON decode error: {e}")
                    except base64.binascii.Error as e:
                        print(f"  Base64 decode error: {e}")
                        
                except Exception as e:
                    print(f"  General error: {e}")

if __name__ == "__main__":
    asyncio.run(check_embedding_format())
