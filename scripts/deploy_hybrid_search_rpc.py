#!/usr/bin/env python3
"""
Wdraża hybrid_search_legal / hybrid_search_user w Supabase (Postgres).

Wymaga jednego z:
  - DATABASE_URL (postgresql://...)
  - SUPABASE_DB_PASSWORD (+ opcjonalnie SUPABASE_URL do wyliczenia hosta)

Bez hasła DB: wypisuje ścieżkę migracji do wklejenia w SQL Editor.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from urllib.parse import quote_plus, urlparse

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "supabase" / "migrations" / "20260520_hybrid_search_deploy.sql"


def _project_ref(supabase_url: str) -> str:
    host = urlparse(supabase_url).hostname or ""
    m = re.match(r"^([a-z0-9]+)\.supabase\.co$", host)
    if m:
        return m.group(1)
    return ""


def _database_url_from_env() -> str | None:
    direct = (os.getenv("DATABASE_URL") or "").strip()
    if direct:
        return direct

    password = (os.getenv("SUPABASE_DB_PASSWORD") or os.getenv("POSTGRES_PASSWORD") or "").strip()
    if not password:
        return None

    supabase_url = (os.getenv("SUPABASE_URL") or "").strip()
    ref = _project_ref(supabase_url) or (os.getenv("SUPABASE_PROJECT_REF") or "").strip()
    if not ref:
        return None

    region = (os.getenv("SUPABASE_DB_REGION") or "eu-west-1").strip()
    user = (os.getenv("SUPABASE_DB_USER") or f"postgres.{ref}").strip()
    host = (os.getenv("SUPABASE_DB_HOST") or f"aws-0-{region}.pooler.supabase.com").strip()
    port = (os.getenv("SUPABASE_DB_PORT") or "6543").strip()
    dbname = (os.getenv("SUPABASE_DB_NAME") or "postgres").strip()
    enc = quote_plus(password)
    return f"postgresql://{user}:{enc}@{host}:{port}/{dbname}?sslmode=require"


def _run_sql_psycopg(database_url: str, sql: str) -> None:
    try:
        import psycopg
    except ImportError as e:
        raise SystemExit(
            "Brak pakietu psycopg. Zainstaluj: pip install 'psycopg[binary]>=3.1'"
        ) from e

    with psycopg.connect(database_url) as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(sql)
    print("[OK] Migracja wykonana przez psycopg.")


def _verify_rpc(supabase_url: str, anon_key: str) -> bool:
    url = f"{supabase_url.rstrip('/')}/rest/v1/rpc/hybrid_search_legal"
    headers = {
        "Authorization": f"Bearer {anon_key}",
        "apikey": anon_key,
        "Content-Type": "application/json",
    }
    payload = {
        "query_text": "kodeks postępowania administracyjnego",
        "query_embedding": [0.0] * 1536,
        "match_count": 1,
    }
    r = httpx.post(url, json=payload, headers=headers, timeout=45.0)
    if r.status_code == 200:
        data = r.json()
        print(f"[OK] RPC hybrid_search_legal — HTTP 200, wyników: {len(data) if isinstance(data, list) else '?'}")
        return True
    print(f"[FAIL] RPC hybrid_search_legal — HTTP {r.status_code}: {(r.text or '')[:500]}")
    return False


def main() -> int:
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser(description="Deploy hybrid_search_* RPC to Supabase")
    parser.add_argument("--verify-only", action="store_true", help="Tylko test HTTP RPC")
    parser.add_argument("--dry-run", action="store_true", help="Wypisz SQL bez wykonania")
    args = parser.parse_args()

    supabase_url = (os.getenv("SUPABASE_URL") or "").strip()
    anon_key = (os.getenv("SUPABASE_ANON_KEY") or "").strip()

    if args.verify_only:
        if not supabase_url or not anon_key:
            print("Ustaw SUPABASE_URL i SUPABASE_ANON_KEY w .env")
            return 1
        return 0 if _verify_rpc(supabase_url, anon_key) else 1

    if not MIGRATION.is_file():
        print(f"Brak pliku migracji: {MIGRATION}")
        return 1

    sql = MIGRATION.read_text(encoding="utf-8")

    if args.dry_run:
        print(sql[:2000], "\n... [skrócono]" if len(sql) > 2000 else "")
        return 0

    db_url = _database_url_from_env()
    if db_url:
        print(f"[INFO] Łączenie z bazą ({urlparse(db_url).hostname})...")
        _run_sql_psycopg(db_url, sql)
    else:
        ref = _project_ref(supabase_url) or "<project-ref>"
        dash = f"https://supabase.com/dashboard/project/{ref}/sql/new"
        print(
            "Brak DATABASE_URL / SUPABASE_DB_PASSWORD — nie można wykonać SQL z tej maszyny.\n\n"
            "Opcja A — SQL Editor:\n"
            f"  1. Otwórz: {dash}\n"
            f"  2. Wklej całość pliku:\n     {MIGRATION}\n"
            "  3. Run\n\n"
            "Opcja B — dodaj do .env hasło z Settings → Database:\n"
            "  SUPABASE_DB_PASSWORD=...\n"
            "  (opcjonalnie SUPABASE_DB_REGION=eu-west-1)\n"
            "  potem: python scripts/deploy_hybrid_search_rpc.py\n"
        )
        return 2

    if supabase_url and anon_key:
        return 0 if _verify_rpc(supabase_url, anon_key) else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
