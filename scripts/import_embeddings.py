"""
Importuje embeddingi 1536D z JSON do Supabase przez RPC update_embedding_batch.
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

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

RPC_URL = f"{SUPABASE_URL}/rest/v1/rpc/update_embedding_batch"
BATCH_SIZE = 100


async def main():
    print("=" * 60)
    print("Import embeddingow 1536D do Supabase")
    print("=" * 60)

    with open("embeddings_1536d.json", "r", encoding="utf-8") as f:
        all_data = json.load(f)

    print(f"[INFO] Zaladowano {len(all_data)} embeddingow z JSON")

    async with httpx.AsyncClient(timeout=120) as client:
        updated = 0
        failed = 0

        for i in range(0, len(all_data), BATCH_SIZE):
            batch = all_data[i : i + BATCH_SIZE]

            res = await client.post(
                RPC_URL,
                headers=HEADERS,
                json={"updates": batch},
            )

            if res.status_code == 200:
                updated += len(batch)
            else:
                print(
                    f"   [ERR] Batch {i // BATCH_SIZE + 1}: {res.status_code} {res.text[:200]}"
                )
                failed += len(batch)

            progress = min(i + BATCH_SIZE, len(all_data))
            print(
                f"   [PROGRESS] {progress}/{len(all_data)} (OK: {updated}, FAIL: {failed})"
            )
            await asyncio.sleep(0.2)

    print(f"\n[ZAKONCZONO] OK: {updated}, FAIL: {failed}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
