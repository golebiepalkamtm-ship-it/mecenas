"""
Migracja embeddingow 3072 -> 1024 wymiarow.
Generuje embeddingi i zapisuje do JSON do importu przez SQL.
"""

import asyncio
import os
import sys
import json
import httpx
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

load_dotenv(override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://dhyvxspgsktpbjonejek.supabase.co")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY", "sb_publishable_8HlO3_J1CxhWN27Vmoq2FA_HzZE0Jac"
)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

HEADERS_SB = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
}

HEADERS_LLM = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "X-OpenRouter-Title": "LexMind AI",
}

BATCH_SIZE = 50


async def get_embeddings_batch(texts, client):
    payload = {
        "model": "openai/text-embedding-3-small",
        "input": texts,
        "dimensions": 1024,
    }
    for attempt in range(5):
        try:
            res = await client.post(
                "https://openrouter.ai/api/v1/embeddings",
                json=payload,
                headers=HEADERS_LLM,
                timeout=60,
            )
            data = res.json()
            if "data" in data:
                return [
                    item["embedding"]
                    for item in sorted(data["data"], key=lambda x: x["index"])
                ]
            error_code = data.get("error", {}).get("code")
            if error_code in [429, 503]:
                wait = (attempt + 1) * 3
                print(f"   [WAIT] Rate limit, czekam {wait}s...")
                await asyncio.sleep(wait)
                continue
            print(f"   [ERR] Blad: {data}")
            return []
        except Exception as e:
            print(f"   [WARN] Proba {attempt + 1}: {e}")
            await asyncio.sleep(2)
    return []


async def fetch_all_records(client):
    all_records = []
    offset = 0
    page_size = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/knowledge_base?select=id,content&limit={page_size}&offset={offset}"
        res = await client.get(url, headers=HEADERS_SB)
        if res.status_code != 200:
            print(f"   [ERR] Blad: {res.status_code}")
            break
        batch = res.json()
        if not batch:
            break
        all_records.extend(batch)
        offset += page_size
        print(f"   [INFO] Pobrano {len(all_records)} rekordow...")
        if len(batch) < page_size:
            break
    return all_records


async def main():
    print("=" * 60)
    print("Generowanie embeddingow 1024D (zapis do JSON)")
    print("=" * 60)

    async with httpx.AsyncClient(timeout=120) as client:
        print("\n[0] Walidacja klucza API...")
        test_res = await client.post(
            "https://openrouter.ai/api/v1/embeddings",
            json={
                "model": "openai/text-embedding-3-small",
                "input": ["test"],
                "dimensions": 1024,
            },
            headers=HEADERS_LLM,
            timeout=30,
        )
        if test_res.status_code != 200:
            print(f"   [ERR] Blad API: {test_res.status_code} {test_res.text[:200]}")
            return
        print("   [OK] Klucz API prawidlowy")

        print("\n[1] Pobieranie rekordow...")
        records = await fetch_all_records(client)
        print(f"   [OK] Pobrano {len(records)} rekordow")

        if not records:
            return

        print(f"\n[2] Generowanie embeddingow 1024D...")
        results = []
        updated = 0
        failed = 0

        for i in range(0, len(records), BATCH_SIZE):
            batch = records[i : i + BATCH_SIZE]
            texts = [r["content"] for r in batch]
            ids = [r["id"] for r in batch]

            embeddings = await get_embeddings_batch(texts, client)
            if not embeddings:
                failed += len(batch)
                continue

            for rec_id, emb in zip(ids, embeddings):
                results.append({"id": rec_id, "embedding": emb})
                updated += 1

            progress = min(i + BATCH_SIZE, len(records))
            print(
                f"   [PROGRESS] {progress}/{len(records)} (OK: {updated}, FAIL: {failed})"
            )
            await asyncio.sleep(0.3)

        output_file = "embeddings_1024d.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(results, f)

        print(f"\n[ZAPISANO] {len(results)} embeddingow do {output_file}")
        print(f"   OK: {updated}, FAIL: {failed}")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
