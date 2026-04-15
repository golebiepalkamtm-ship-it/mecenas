
import asyncio
import httpx
import json
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

async def main():
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        url = f"{SUPABASE_URL}/rest/v1/knowledge_base_user?select=id,metadata,created_at,content&order=created_at.desc"
        r = await client.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            doc_map = {}

            for item in data:
                metadata = item.get('metadata')
                if isinstance(metadata, str):
                    try: metadata = json.loads(metadata)
                    except: metadata = {}
                
                filename = metadata.get('filename') if metadata else None
                dtype = metadata.get('type') if metadata else None
                if not filename:
                    filename = "Dokument bez nazwy"
                
                if filename not in doc_map:
                    doc_map[filename] = {
                        "id": filename,
                        "title": filename,
                        "type": dtype,
                        "chunks": 1
                    }
                else:
                    doc_map[filename]["chunks"] += 1
            
            print(f"Grouped into {len(doc_map)} unique documents:")
            for fname, doc in doc_map.items():
                print(f"- {fname}: {doc['chunks']} chunks, Type: {doc['type']}")
        else:
            print(f"Error: {r.status_code} - {r.text}")

if __name__ == "__main__":
    asyncio.run(main())
