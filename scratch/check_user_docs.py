
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
        print("\nChecking latest records in knowledge_base_user...")
        try:
            url = f"{SUPABASE_URL}/rest/v1/knowledge_base_user?select=id,metadata,created_at&limit=50&order=created_at.desc"
            r = await client.get(url, headers=headers)
            
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                print(f"Found {len(data)} latest records")
                files = {}
                for item in data:
                    meta = item.get('metadata', {})
                    fname = meta.get('filename', 'UNKNOWN')
                    if fname not in files:
                        files[fname] = {'created': item['created_at'], 'chunks': 0}
                    files[fname]['chunks'] += 1
                
                for fname, info in files.items():
                    print(f"- {fname}: {info['chunks']} chunks, Created: {info['created']}")
            else:
                print(f"Error: {r.text}")

        except Exception as e:
            print(f"ERR: {e}")

if __name__ == "__main__":
    asyncio.run(main())
