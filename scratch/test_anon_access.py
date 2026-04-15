
import asyncio
import httpx
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def main():
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        print(f"Testing access to knowledge_base_user with ANON key...")
        try:
            url = f"{SUPABASE_URL}/rest/v1/knowledge_base_user?select=id&limit=1"
            r = await client.get(url, headers=headers)
            print(f"Status: {r.status_code}")
            print(f"Body: {r.text}")
        except Exception as e:
            print(f"ERR: {e}")

if __name__ == "__main__":
    asyncio.run(main())
