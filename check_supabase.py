"""Szybka diagnostyka Supabase - sprawdza polaczenie, RPC i dane."""

import asyncio
import httpx
from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY


async def main():
    print("=" * 60)
    print("DIAGNOSTYKA SUPABASE")
    print("=" * 60)

    print(f"\n[1] URL:   {SUPABASE_URL}")
    print(f"    KEY:   {SUPABASE_ANON_KEY[:20]}...{SUPABASE_ANON_KEY[-6:]}")
    print(f"    EMPTY: {not SUPABASE_ANON_KEY}")

    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        # --- Test 1: czy REST API odpowiada ---
        print("\n[2] Test REST API (GET /rest/v1/)...")
        try:
            r = await client.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)
            print(f"    Status: {r.status_code}")
            print(f"    Body:   {r.text[:300]}")
        except Exception as e:
            print(f"    ERR: {e}")

        # --- Test 2: tabela knowledge ---
        print("\n[3] Test tabela knowledge (GET /rest/v1/knowledge?limit=1)...")
        try:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/knowledge?limit=1&select=id,content",
                headers=headers,
            )
            print(f"    Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                print(f"    Rows:   {len(data)}")
                if data:
                    print(f"    Sample keys: {list(data[0].keys())}")
                    content = data[0].get("content", "")
                    print(f"    Sample content: {content[:150]}...")
                else:
                    print("    UWAGA: Tabela istnieje ale jest PUSTA!")
            else:
                print(f"    Body: {r.text[:400]}")
        except Exception as e:
            print(f"    ERR: {e}")

        # --- Test 3: tabela knowledge_base (alt name) ---
        print("\n[4] Test tabela knowledge_base...")
        try:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/knowledge_base?limit=1&select=id",
                headers=headers,
            )
            print(f"    Status: {r.status_code}")
            print(f"    Body:   {r.text[:300]}")
        except Exception as e:
            print(f"    ERR: {e}")

        # --- Test 4: RPC match_knowledge ---
        print("\n[5] Test RPC match_knowledge (dummy embedding, threshold=0)...")
        dummy_embedding = [0.0] * 3072
        try:
            r = await client.post(
                f"{SUPABASE_URL}/rest/v1/rpc/match_knowledge",
                headers=headers,
                json={
                    "query_embedding": dummy_embedding,
                    "match_threshold": 0.0,
                    "match_count": 5,
                },
            )
            print(f"    Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                print(
                    f"    Results: {len(data) if isinstance(data, list) else type(data)}"
                )
                if isinstance(data, list) and data:
                    print(f"    First: {str(data[0])[:200]}")
                else:
                    print("    UWAGA: RPC dziala ale zwraca pusta liste!")
            else:
                print(f"    Body: {r.text[:500]}")
                if r.status_code == 404:
                    print("    TIP: RPC match_knowledge NIE ISTNIEJE w tej bazie!")
        except Exception as e:
            print(f"    ERR: {e}")

        # --- Test 5: count rekordow ---
        print("\n[6] Test count rekordow w knowledge...")
        try:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/knowledge?select=id",
                headers={**headers, "Prefer": "count=exact"},
            )
            print(f"    Status: {r.status_code}")
            count = r.headers.get("content-range", "unknown")
            print(f"    Count:  {count}")
        except Exception as e:
            print(f"    ERR: {e}")

    print("\n" + "=" * 60)
    print("KONIEC DIAGNOSTYKI")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
