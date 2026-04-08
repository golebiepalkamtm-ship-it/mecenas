import httpx
import asyncio
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def search_kpa_for_art61():
    # Use eq for filename and ilike for content
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/knowledge_base"
    params = {
        "select": "content",
        "metadata->>filename": "eq.kodeks postepowania administracyjnego.pdf",
        "content": "ilike.*Art. 61*"
    }
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.get(url, params=params, headers=headers)
        if res.status_code != 200:
            print(f"Error: {res.status_code} {res.text}")
            return
            
        data = res.json()
        print(f"Found {len(data)} chunks mentioning Art. 61.")
        for chunk in data:
            print("-" * 20)
            content = chunk.get("content", "")
            # Find the position of Art. 61 to show context around it
            pos = content.find("Art. 61")
            start = max(0, pos - 100)
            end = min(len(content), pos + 400)
            print(content[start:end])

if __name__ == "__main__":
    asyncio.run(search_kpa_for_art61())
