"""Minimalny test embedding — raw httpx do OpenRouter."""
import asyncio
import httpx
import json
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from moa.config import OPENROUTER_API_KEY, EMBEDDING_URL, EMBEDDING_MODEL, OPENROUTER_HEADERS

async def main():
    print(f"Model: {EMBEDDING_MODEL}")
    print(f"URL:   {EMBEDDING_URL}")
    print(f"Key:   {OPENROUTER_API_KEY[:12]}...{OPENROUTER_API_KEY[-4:]}")
    print()
    
    async with httpx.AsyncClient(timeout=30) as client:
        payload = {"model": EMBEDDING_MODEL, "input": ["test prawny kodeks cywilny"]}
        
        print("Sending POST...")
        resp = await client.post(EMBEDDING_URL, json=payload, headers=OPENROUTER_HEADERS)
        
        print(f"Status: {resp.status_code}")
        print(f"Content-Type: {resp.headers.get('content-type', 'N/A')}")
        print(f"Body length: {len(resp.text)} chars")
        print()
        
        if resp.status_code != 200:
            print(f"ERROR body: {resp.text[:500]}")
            return
        
        # Pokaz surową odpowiedź (pierwsze 500 znaków)
        print(f"Raw response (first 500 chars):")
        print(resp.text[:500])
        print()
        
        data = resp.json()
        print(f"Top-level keys: {list(data.keys())}")
        
        if "data" in data:
            print(f"  data type: {type(data['data']).__name__}")
            if isinstance(data["data"], list) and len(data["data"]) > 0:
                first = data["data"][0]
                print(f"  data[0] type: {type(first).__name__}")
                if isinstance(first, dict):
                    print(f"  data[0] keys: {list(first.keys())}")
                    if "embedding" in first:
                        emb = first["embedding"]
                        print(f"  embedding length: {len(emb)}")
                        print(f"  first 5 values: {emb[:5]}")
                        print("\n✅ EMBEDDING WORKS!")
                        return
        
        if "embedding" in data:
            emb = data["embedding"]
            print(f"  embedding length: {len(emb)}")
            print(f"\n✅ EMBEDDING WORKS (alt format)!")
            return
            
        print("\n❌ Could not find embedding in response")

if __name__ == "__main__":
    asyncio.run(main())
