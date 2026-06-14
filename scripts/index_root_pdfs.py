#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("PYDANTIC_DISABLE_PLUGINS", "1")
sys.path.insert(0, str(ROOT))
try:
    sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass


async def _run(
    category: str, source_type: str | None, limit: int | None, dry_run: bool, force_reindex: bool
) -> int:
    from services.document_service import index_document_to_supabase

    pdfs = [p for p in ROOT.iterdir() if p.is_file() and p.suffix.lower() == ".pdf"]
    pdfs.sort(key=lambda p: p.name.lower())
    if limit is not None:
        pdfs = pdfs[: max(0, limit)]

    if not pdfs:
        print("Brak PDF w katalogu głównym projektu.")
        return 0

    print(f"[START] PDF-ów do indeksowania: {len(pdfs)} (katalog: {ROOT})")

    ok = 0
    skipped = 0
    failed = 0
    total = len(pdfs)
    for idx, path in enumerate(pdfs, start=1):
        started = time.time()
        try:
            if dry_run:
                print(f"[DRY] {path.name}")
                continue

            print(f"[FILE] [{idx}/{total}] Start: {path.name} ({path.stat().st_size} bytes)")
            file_content = path.read_bytes()
            res = await index_document_to_supabase(
                file_content=file_content,
                filename=path.name,
                content_type="application/pdf",
                category=category,
                source_type=source_type,
                force_reindex=force_reindex,
            )
            if res.get("success"):
                msg = (res.get("message") or "").lower()
                if "pomin" in msg or "skip" in msg:
                    skipped += 1
                else:
                    ok += 1
                elapsed = time.time() - started
                print(f"[OK] [{idx}/{total}] {path.name}: {res.get('message') or 'OK'} ({elapsed:.1f}s)")
            else:
                failed += 1
                elapsed = time.time() - started
                print(f"[ERR] [{idx}/{total}] {path.name}: {res.get('error')} ({elapsed:.1f}s)")
        except Exception as e:
            failed += 1
            elapsed = time.time() - started
            print(f"[ERR] [{idx}/{total}] {path.name}: {e} ({elapsed:.1f}s)")

    print(f"[DONE] OK={ok}, POMINIĘTE={skipped}, BŁĘDY={failed}")
    return 0 if failed == 0 else 2


def main() -> int:
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser(
        description="Indeksuje PDF-y z katalogu głównego repo do Supabase RAG (vector(1536))."
    )
    parser.add_argument("--category", default="rag_legal", help="rag_legal albo rag_user")
    parser.add_argument("--source-type", default=None, help="np. statute (dla rag_legal)")
    parser.add_argument("--limit", type=int, default=None, help="Maksymalnie N plików")
    parser.add_argument("--dry-run", action="store_true", help="Tylko wypisz listę PDF-ów")
    parser.add_argument(
        "--force-reindex",
        action="store_true",
        help="Usuń poprzednie rekordy (po source_file_hash) i zaindeksuj od nowa",
    )
    args = parser.parse_args()

    try:
        return asyncio.run(_run(args.category, args.source_type, args.limit, args.dry_run, args.force_reindex))
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())
