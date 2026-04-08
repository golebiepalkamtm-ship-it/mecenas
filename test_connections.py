import asyncio
import httpx
import os
import sys
from pathlib import Path

# Add current directory to path so we can import moa
sys.path.append(str(Path(__file__).parent))

from moa.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    EMBEDDING_MODEL
)
from moa.http_client import get_shared_openai_client, get_shared_httpx_client

async def test_openrouter():
    print("Testing OpenRouter (Chat + Embeddings)...")
    try:
        client = get_shared_openai_client()
        
        # Test Chat
        start = asyncio.get_event_loop().time()
        chat_resp = await client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5
        )
        chat_time = (asyncio.get_event_loop().time() - start) * 1000
        print(f"  [OK] Chat (gpt-4o-mini): {chat_time:.0f}ms")
        
        # Test Embeddings
        start = asyncio.get_event_loop().time()
        emb_resp = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=["test ping"]
        )
        emb_time = (asyncio.get_event_loop().time() - start) * 1000
        print(f"  [OK] Embeddings ({EMBEDDING_MODEL}): {emb_time:.0f}ms")
        
    except Exception as e:
        print(f"  [ERR] OpenRouter Error: {e}")

async def test_supabase():
    print("Testing Supabase (PostgREST)...")
    try:
        client = get_shared_httpx_client()
        # Ping the root of rest/v1 is sometimes restricted, let's try just the health/status if available or simple GET
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/"
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        }
        start = asyncio.get_event_loop().time()
        # Using a safer approach - many PostgREST instances allow GET on the root for documentation
        res = await client.get(url, headers=headers)
        res_time = (asyncio.get_event_loop().time() - start) * 1000
        # 200 or 404 (if root not found but reachable) or even 401 (if server exists but expects more)
        # Point is connectivity.
        if res.status_code in (200, 204):
            print(f"  [OK] Supabase: {res_time:.0f}ms")
        else:
            print(f"  [WARN] Supabase reachable but status {res.status_code}")
    except Exception as e:
        print(f"  [ERR] Supabase Error: {e}")

async def test_saos():
    print("Testing SAOS API...")
    try:
        client = get_shared_httpx_client()
        url = "https://www.saos.org.pl/api/search/judgments"
        params = {"pageSize": 1, "pageNumber": 0, "all": "test"}
        # SAOS blocks simple agents
        headers = {
            "User-Agent": "Mozilla/5.0 LexMindUI/1.0",
            "Accept": "application/json"
        }
        start = asyncio.get_event_loop().time()
        res = await client.get(url, params=params, headers=headers, timeout=15)
        res_time = (asyncio.get_event_loop().time() - start) * 1000
        if res.status_code == 200:
            print(f"  [OK] SAOS: {res_time:.0f}ms")
        else:
            print(f"  [WARN] SAOS reachable but status {res.status_code}")
    except Exception as e:
        print(f"  [ERR] SAOS Error: {str(e)[:100]}")

async def test_eli():
    print("Testing ELI (Sejm API)...")
    try:
        client = get_shared_httpx_client()
        url = "https://api.sejm.gov.pl/eli/acts/search"
        params = {"limit": 1, "title": "kodeks"}
        start = asyncio.get_event_loop().time()
        res = await client.get(url, params=params, timeout=10)
        res_time = (asyncio.get_event_loop().time() - start) * 1000
        if res.status_code == 200:
            print(f"  [OK] ELI: {res_time:.0f}ms")
        else:
            print(f"  [WARN] ELI returned status {res.status_code}")
    except Exception as e:
        print(f"  [ERR] ELI Error: {e}")

async def main():
    print("\n--- LexMind Connection Check ---")
    await test_openrouter()
    await test_supabase()
    await test_saos()
    await test_eli()
    print("--- Check Complete ---\n")

if __name__ == "__main__":
    asyncio.run(main())
