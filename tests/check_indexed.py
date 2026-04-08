import httpx
import asyncio
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def check_indexed_files():
    rpc_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/knowledge_base?select=metadata"
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
        filenames = set()
        for item in data:
            metadata = item.get("metadata")
            if metadata and "filename" in metadata:
                filenames.add(metadata["filename"])
        
        print(f"Indexed files ({len(filenames)}):")
        for f in sorted(list(filenames)):
            print(f"- {f}")

if __name__ == "__main__":
    asyncio.run(check_indexed_files())
