import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
    
    headers = {
        "Authorization": f"Bearer {supabase_anon_key}",
        "apikey": supabase_anon_key
    }
    
    async with httpx.AsyncClient() as client:
        # Check table
        res = await client.get(f"{supabase_url}/rest/v1/isap_vectors?select=id,eli,title&limit=1", headers=headers)
        print(f"Table isap_vectors GET status: {res.status_code}")
        print(f"Response: {res.text[:500]}")

if __name__ == "__main__":
    asyncio.run(main())
