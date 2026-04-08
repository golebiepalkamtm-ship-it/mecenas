import httpx
import asyncio
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def debug_kpa_content():
    rpc_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/knowledge_base?select=content,metadata&metadata->>filename=eq.kodeks%20postepowania%20administracyjnego.pdf"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.get(rpc_url, headers=headers)
        if res.status_code != 200:
            print(f"Error: {res.status_code} {res.text}")
            return
            
        data = res.json()
        print(f"Fetched {len(data)} chunks for KPA.")
        if data:
            print("First chunk content length:", len(data[0].get("content", "")))
            print("First chunk preview:", data[0].get("content", "")[:200])

if __name__ == "__main__":
    asyncio.run(debug_kpa_content())
