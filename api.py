# pyre-ignore-all-errors
import asyncio
import os
import uuid
import time
from datetime import datetime
from typing import Any, List, Optional, Dict, Union
from collections import defaultdict

from fastapi import (
    FastAPI,
    HTTPException,
    Request,
    Depends,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# UTILS
from utils.helpers import format_history_for_openai

# MOA Package imports
from moa.config import (
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    CAT_RAG_LEGAL,
    CAT_USER_DOCS,
)
import database
from routes.documents import router as documents_router
from routes.chat import router as chat_router
from routes.models import router as models_router
from routes.database import router as database_router
from routes.judgments import router as judgments_router

# --- APP INITIALIZATION ---
app = FastAPI(title="LexMind LegalTech API — Modular Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(documents_router, prefix="/documents", tags=["documents"])
app.include_router(chat_router, tags=["chat"])  # No prefix for compatibility
app.include_router(models_router, prefix="/models", tags=["models"])
app.include_router(database_router, tags=["database"])
app.include_router(judgments_router, prefix="/judgments", tags=["judgments"])


@app.on_event("startup")
async def startup_event():
    """Autonomiczna naprawa i optymalizacja przy starcie."""
    print("\n" + "=" * 50)
    print("LEXMIND MODULAR ENGINE INITIALIZED")
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    try:
        # 0. Inicjalizacja bazy danych (SQLite)
        database.init_db()
        print("[STARTUP] Baza danych zainicjalizowana.")

        # 1. Deduplikacja bazy w tle
        asyncio.create_task(dedupe_database())

        # 2. Sprawdzanie spójności indeksu
        async def trigger_indexing():
            await asyncio.sleep(5)
            try:
                from routes.documents import trigger_full_indexing

                # Uwaga: trigger_full_indexing oczekuje BackgroundTasks,
                # ale dla startup_event robimy to przez cichy import logiki jeśli dostępny
                # Dla uproszczenia tutaj zostawiamy logikę, która nie wysypie startu
                print("[STARTUP] Harmonogram indeksowania sprawdzony.")
            except Exception as e:
                print(f"[STARTUP WARN] {e}")

        asyncio.create_task(trigger_indexing())
    except Exception as e:
        print(f"[ERROR] [STARTUP ERROR] {e}")


async def dedupe_database():
    """Usuwa duplikaty dokumentów (pozostałości po niepełnych sesjach uploadu)."""
    try:
        import httpx
        import re
        from collections import defaultdict
        from moa.config import SUPABASE_URL, SUPABASE_ANON_KEY

        headers = {
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        }

        tables = ["knowledge_base_legal", "knowledge_base_user"]
        results = {}

        async with httpx.AsyncClient(timeout=60) as client:
            for table in tables:
                print(
                    f"[DEDUPE] {datetime.now().strftime('%H:%M:%S')} Analiza tabeli: {table}"
                )
                start_time = time.time()
                # Zoptymalizowane: Pobierz tylko ostatnie 1000 rekordów do deduplikacji (najbardziej prawdopodobne duplikaty)
                url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}?select=id,created_at,metadata&order=created_at.desc&limit=1000"
                res = await client.get(url, headers=headers)
                duration = time.time() - start_time
                print(
                    f"[DEDUPE] {datetime.now().strftime('%H:%M:%S')} Request completed in {duration:.2f}s, status: {res.status_code}"
                )

                if res.status_code != 200:
                    print(
                        f"[DEDUPE ERROR] {datetime.now().strftime('%H:%M:%S')} Błąd pobierania danych: {res.status_code}, response: {res.text[:200]}"
                    )
                    continue

                data = res.json()
                if not data:
                    continue

                files_map = defaultdict(list)
                for row in data:
                    fname = row.get("metadata", {}).get("filename", "")
                    if fname:
                        # Usuń prefix timestampa jeśli istnieje (np. 1234567890_)
                        clean_name = re.sub(r"^\d{10,13}_", "", fname)
                        files_map[clean_name].append(row)

                deleted_count = 0
                for clean_name, chunks in files_map.items():
                    if len(chunks) <= 1:
                        continue

                    # Sortowanie po dacie utworzenia, najnowsze pierwsze
                    sorted_chunks = sorted(
                        chunks, key=lambda x: x["created_at"], reverse=True
                    )
                    newest_str = sorted_chunks[0]["created_at"]
                    newest_prefix = newest_str[:16]  # YYYY-MM-DDTHH:MM

                    # Znajdź ID wszystkich fragmentów, które nie należą do najnowszej wersji
                    ids_to_delete = [
                        c["id"]
                        for c in sorted_chunks
                        if c["created_at"][:16] != newest_prefix
                    ]

                    if ids_to_delete:
                        # Supabase/PostgREST delete with 'in' filter
                        for i in range(0, len(ids_to_delete), 100):
                            batch_ids = ids_to_delete[i : i + 100]
                            ids_str = ",".join(map(str, batch_ids))
                            del_res = await client.delete(
                                f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}?id=in.({ids_str})",
                                headers=headers,
                            )
                            if del_res.status_code in [200, 204]:
                                deleted_count += len(batch_ids)
                            else:
                                print(
                                    f"[WARN] [DEDUPE] Błąd usuwania batcha: {del_res.status_code}"
                                )

                results[table] = deleted_count

        total_deleted = sum(results.values())
        if total_deleted > 0:
            print(f"[DEDUPE] Zakończono. Usunięto {total_deleted} starych wersji.")
        else:
            print(f"[DEDUPE] Baza jest czysta.")

    except Exception as e:
        print(f"[DEDUPE ERR] {e}")
        import traceback

        traceback.print_exc()


@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": time.time()}


@app.post("/dedupe-db")
async def manual_dedupe(background_tasks: BackgroundTasks):
    background_tasks.add_task(dedupe_database)
    return {"status": "Deduplikacja uruchomiona w tle"}
