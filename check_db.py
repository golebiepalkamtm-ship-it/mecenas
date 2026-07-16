# check_db.py
import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or ""
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or ""

async def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Missing Supabase credentials")
        return
        
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/knowledge_base_legal"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Accept": "application/json",
    }
    
    # Query top 10 rows to see metadata structure
    params = {
        "limit": "10"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers, params=params)
            print(f"Status code: {res.status_code}")
            if res.status_code == 200:
                rows = res.json()
                print(f"Found {len(rows)} rows.")
                for i, r in enumerate(rows):
                    print(f"\nRow {i}:")
                    print(f"Content preview: {r.get('content', '')[:100]}...")
                    print(f"Metadata: {json.dumps(r.get('metadata'))}")
            else:
                print(f"Error: {res.text}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
