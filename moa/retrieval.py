# ===========================================================================
# MOA Retrieval -- Pobieranie kontekstu prawnego z Supabase pgvector
# ===========================================================================
"""
Odpowiada za:
  1. Generowanie embeddingu zapytania (OpenRouter / text-embedding-3-small)
  2. Wywolywanie RPC match_knowledge via Supabase PostgREST
  3. Kontrole dlugosci kontekstu (obciecie jesli > MAX_CONTEXT_CHARS)
"""

import httpx
import asyncio
import re
from typing import List, cast

from moa.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_EMBEDDINGS_URL,
    OPENROUTER_HEADERS,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    MAX_CONTEXT_CHARS,
    DEFAULT_MATCH_COUNT,
    DEFAULT_MATCH_THRESHOLD,
    OPENAI_API_KEY,
)
from moa.models import RetrievedChunk
from moa.saos import search_saos_judgments


import json
import os
import hashlib

# --- Cache Configuration ---
CACHE_DIR = "cache"
EMBEDDINGS_CACHE_FILE = os.path.join(CACHE_DIR, "query_embeddings.json")
_embeddings_cache = {}

def _load_embeddings_cache():
    global _embeddings_cache
    if os.path.exists(EMBEDDINGS_CACHE_FILE):
        try:
            with open(EMBEDDINGS_CACHE_FILE, "r", encoding="utf-8") as f:
                _embeddings_cache = json.load(f)
            print(f"   [CACHE] Loaded {len(_embeddings_cache)} embeddings from cache.")
        except Exception as e:
            print(f"   [WARN] Could not load embeddings cache: {e}")
            _embeddings_cache = {}

def _save_embeddings_cache():
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
    try:
        # Keep cache manageable: if > 5000 entries, start fresh or prune (simplified: just log)
        with open(EMBEDDINGS_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_embeddings_cache, f, ensure_ascii=False)
    except Exception as e:
        print(f"   [WARN] Could not save embeddings cache: {e}")

# Initial load
_load_embeddings_cache()

# ---------------------------------------------------------------------------
# 1. Embedding zapytania (OpenAI API)
# ---------------------------------------------------------------------------
async def get_query_embedding(query: str) -> list[float]:
    """
    Generuje wektor embedding dla zapytania uzytkownika.
    Wykorzystuje OpenRouter API -> text-embedding-3-small (1536-dim).
    Zwraca wynik z cache jesli dostepny.
    """
    # 0. Check cache
    query_key = query.strip().lower()
    if query_key in _embeddings_cache:
        print(f"   [CACHE] Hit for: '{query[:40]}...'")
        return cast(list[float], _embeddings_cache[query_key])

    # 1. Fetch from API
    payload = {
        "model": EMBEDDING_MODEL,
        "input": [query],
        "dimensions": EMBEDDING_DIMENSIONS,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                OPENROUTER_EMBEDDINGS_URL,
                json=payload,
                headers=OPENROUTER_HEADERS,
                follow_redirects=True,
            )

            if response.status_code != 200:
                print(
                    f"[ERR] Embedding API HTTP {response.status_code}: {response.text[:500]}"
                )

            response.raise_for_status()
            data = response.json()

            if "data" not in data or not data.get("data"):
                print(f"[ERR] Embedding API unexpected response: {str(data)[:500]}")
                raise KeyError(
                    f"Brak klucza 'data' w odpowiedzi API. "
                    f"Otrzymano klucze: {list(data.keys())}"
                )

            embedding = data["data"][0]["embedding"]

            # Sanity check: wymiar wektora musi pasować do bazy danych
            if len(embedding) != EMBEDDING_DIMENSIONS:
                print(
                    f"   [!] Wymiar wektora: {len(embedding)} vs oczekiwany: {EMBEDDING_DIMENSIONS} — koryguję"
                )
                embedding = embedding[:EMBEDDING_DIMENSIONS]

            # 2. Save to cache
            _embeddings_cache[query_key] = embedding
            _save_embeddings_cache()
            
            return cast(list[float], embedding)
            
    except Exception as e:
        print(f"[ERR] Error getting embedding: {e}")
        raise Exception(f"Nie udalo sie pobrac wektora (embedding) dla zapytania: {e}")


# ---------------------------------------------------------------------------
# 1.5 Multi-Query / Query Decomposition (Agentic Planowanie)
# ---------------------------------------------------------------------------
async def _extract_search_plans(query: str, document_text: str | None = None) -> tuple[list[str], str]:
    """
    Ekstrahuje RAG pod-pytania oraz słowa kluczowe SAOS używając modelu AI.
    Priorytetyzuje dokument, traktując 'query' jako polecenie użytkownika.
    Zwraca formę tuple: (lista_subqueries, saos_query)
    """
    base_info = f"TREŚĆ DOKUMENTU:\n{document_text[:3000]}\n\n" if document_text else ""
    base_info += f"WIADOMOŚĆ/PYTANIE UŻYTKOWNIKA:\n{query[:1500]}"
    
    prompt = f"""Jesteś Agentem Planującym (Search Planner).
Twoje zadanie to wygenerowanie fraz do bazy wyroków sądowych (SAOS) i bazy prawnej (RAG), żeby pomóc użytkownikowi.

[WEJŚCIE]
{base_info}

[ZADANIE]
1. Pod-hasła RAG: Zrób rozkład problemu na max 3 hasła ujęte jako podpytania prawne lub definicje ułatwiające przeszukiwanie kodeksów (np. "przedawnienie roszczeń bankowych", "skarga pauliańska").
2. Fraza SAOS: Pojedyncze, krótkie zapytanie tekstowe złożone z 2-4 czystych słów kluczowych do bazy wyroków na podstawie FAKTÓW W DOKUMENCIE lub problemu (np. "umowa pożyczki lichwa", "art 118 kc przedawnienie"). Nie może zawierać potocyzmów! Brak znaków zapytania.

Zwróć odpowiedź WYŁĄCZNIE W FORMACIE JSON o strukturze:
{{
  "rag_subqueries": ["hasło 1", "hasło 2", "hasło 3"],
  "saos_query": "słowa kluczowe do saos"
}}
"""

    payload = {
        "model": "google/gemini-2.0-flash", 
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 150,
        "response_format": {"type": "json_object"}
    }
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload,
                headers=OPENROUTER_HEADERS,
                timeout=8.0
            )
            if res.status_code == 200:
                txt = res.json().get("choices", [{}])[0].get("message", {}).get("content", "{}")
                # Parse JSON
                try:
                    data = json.loads(txt)
                    subqueries = [s for s in data.get("rag_subqueries", []) if len(s.strip()) > 3][:3]
                    saos_q = data.get("saos_query", "")
                    print(f"   [DECOMPOSITION] RAG: {subqueries} | SAOS: '{saos_q}'")
                    return subqueries, saos_q
                except Exception as je:
                    print(f"   [WARN] Query Plan Decomposition Failed JSON parse: {je} - Text: {txt}")
            else:
                print(f"   [WARN] Query Plan Decomposition HTTP {res.status_code}: {res.text}")
    except Exception as e:
        print(f"   [WARN] Query Plan Decomposition Exception: {e}")
    return [], ""

# ---------------------------------------------------------------------------
# 2. Pobranie fragmentow z Supabase pgvector (Bezposredni RPC)
# ---------------------------------------------------------------------------
async def retrieve_legal_context(
    query: str,
    match_count: int = DEFAULT_MATCH_COUNT,
    match_threshold: float = DEFAULT_MATCH_THRESHOLD,
    include_saos: bool = True,
    document_text: str | None = None
) -> tuple[list[RetrievedChunk], str]:
    """
    Pelen pipeline retrieval (HYBRYDOWY):
      1. Szybkie wyszukiwanie słów kluczowych (Art. XX, Nazwa Kodeksu)
      2. Embedding zapytania + Supabase RPC (match_knowledge)
      3. (Opcjonalnie) Przeszukiwanie orzeczeń SAOS via API
      4. Mapowanie i scalanie wyników (Deduplikacja)
      5. Kontrola dlugosci kontekstu (obciecie do MAX_CONTEXT_CHARS)
    """
    
    # ---- KROK 1: Wyciąganie słów kluczowych (Keyword Extraction dla RAG & SAOS) ----
    keywords = []
    
    # Oczyszczenie logiki ekstrakcji
    sygnatury = re.findall(r'[IVXLC]+\s+[A-Za-zK]+\s+\d+/\d+', document_text or query)
    if sygnatury:
        keywords.extend(sygnatury)
        
    art_matches = re.finditer(r"Art\.\s*(\d+[a-z]*)", document_text or query, re.I)
    for match in art_matches:
        keywords.append(f"Art. {match.group(1)}")
    
    code_maps = {"KPA": "administracyjnego", "KC": "cywilny", "KPC": "postępowania cywilnego", "KK": "karny", "KPK": "karnego", "KSH": "handlowych", "KP": "pracy"}
    for short, full in code_maps.items():
        if re.search(rf"\b{short}\b", (document_text or query).upper()):
            keywords.append(full)

    # ---- KROK 0.5: Multi-Query Decomposition i SAOS (Równolegle, AI) ----
    plan_task = asyncio.create_task(_extract_search_plans(query, document_text))
    
    # Czekamy chwilkę na plan, żeby odpalić SAOS natychmiast z poprawnym query
    sub_keywords, saos_ai_query = await plan_task
    
    saos_query = saos_ai_query
    if not saos_query:
        # Fallback jeśli AI nic nie wygeneruje
        saos_query = " ".join(keywords) or "prawo"

    # ---- KROK 0: SAOS Search ----
    saos_task = None
    if include_saos and saos_query:
        saos_task = asyncio.create_task(search_saos_judgments(saos_query, page_size=4))

    # ---- KROK 2: Supabase Search (Vector + Keyword Fallback) ----
    print(f"   [>] Agentic Hybrydowy retrieval dla: '{query[:80]}...'")
    
    raw_vector_docs = []
    keyword_docs = []
    
    supabase_headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }

    try:
        # A. Vector Search
        embedding = await get_query_embedding(query)
        rpc_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/match_knowledge"
        query_payload = {
            "query_embedding": embedding,
            "match_threshold": match_threshold,
            "match_count": match_count,
        }

        async with httpx.AsyncClient(timeout=60) as client:
            # Równolegle: Vector RPC i Keyword Search (jeśli są słowa kluczowe)
            vector_task = client.post(rpc_url, json=query_payload, headers=supabase_headers)
            
            keyword_tasks = []
            if keywords:
                # Proste wyszukiwanie tekstowe dla każdego słowa kluczowego
                for kw in keywords[:2]: # Limit to 2 keywords to avoid too many requests
                    kw_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/knowledge_base"
                    params = {"select": "content,metadata", "content": f"ilike.*{kw}*", "limit": 4}
                    keyword_tasks.append(client.get(kw_url, params=params, headers=supabase_headers))
            
            # Korzystamy z sub_keywords uzyskanych za darmo przed sekundą
            if sub_keywords:
                for skw in sub_keywords:
                    if len(keyword_tasks) < 4:
                        skw_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/knowledge_base"
                        params_skw = {"select": "content,metadata", "content": f"ilike.*{skw}*", "limit": 2}
                        keyword_tasks.append(client.get(skw_url, params=params_skw, headers=supabase_headers))
            
            # Czekamy na wyniki
            if keyword_tasks:
                responses = await asyncio.gather(vector_task, *keyword_tasks, return_exceptions=True)
                vector_res = responses[0]
                kw_responses = responses[1:]
            else:
                vector_res = await vector_task
                kw_responses = []

            # Parsowanie Vector
            if not isinstance(vector_res, Exception) and vector_res.status_code == 200:
                raw_vector_docs = vector_res.json()
                if isinstance(raw_vector_docs, dict) and "data" in raw_vector_docs:
                    raw_vector_docs = raw_vector_docs["data"]
            
            # Parsowanie Keyword
            for kw_res in kw_responses:
                if not isinstance(kw_res, Exception) and kw_res.status_code == 200:
                    keyword_docs.extend(kw_res.json())

    except Exception as e:
        print(f"   [ERR] Knowledge retrieval failed: {e}")

    # ---- Krok 3: SAOS Results ----
    saos_chunks = []
    if saos_task:
        try:
            saos_chunks = await saos_task
        except Exception as e:
            print(f"   [ERR] SAOS task failed: {e}")

    # ---- Krok 4: Scalanie i Mapowanie (Deduplikacja) ----
    chunks: list[RetrievedChunk] = []
    seen_contents = set()

    def add_chunk(content, source, similarity):
        # Prosta deduplikacja po treści (hashed)
        c_hash = hash(content[:200])
        if c_hash not in seen_contents:
            chunks.append(RetrievedChunk(content=content, source=source, similarity=similarity))
            seen_contents.add(c_hash)

    # Najpierw Keyword (często najbardziej precyzyjne dla konkretnych artykułów)
    for doc in keyword_docs:
        add_chunk(
            str(doc.get("content", "")),
            str(doc.get("metadata", {}).get("filename") or "Baza Wiedzy"),
            0.95 # Wysoki priorytet dla keyword match
        )

    # Potem Vector
    for doc in raw_vector_docs:
        add_chunk(
            str(doc.get("content", "")),
            str(doc.get("metadata", {}).get("filename") or "Baza Wiedzy"),
            float(doc.get("similarity", 0.0))
        )
    
    # Na końcu SAOS
    for sc in saos_chunks:
        add_chunk(sc.content, sc.source, sc.similarity)

    # ---- Krok 5: Kontrola dlugosci kontekstu ----
    context_parts: list[str] = []
    total_chars = 0

    # Sortuj po podobieństwie (Keyword=0.95, Vector=var, SAOS=0.9)
    chunks.sort(key=lambda x: x.similarity, reverse=True)

    for chunk in chunks:
        if total_chars + len(chunk.content) > MAX_CONTEXT_CHARS:
            remaining = MAX_CONTEXT_CHARS - total_chars
            if remaining > 300:
                context_parts.append(f"ŹRÓDŁO: {chunk.source}\nTREŚĆ: {chunk.content[:remaining]}\n[...obcięto]")
                total_chars += remaining
            break
        
        context_parts.append(f"ŹRÓDŁO: {chunk.source}\nTREŚĆ: {chunk.content}")
        total_chars += len(chunk.content) + 50

    context_text = "\n\n---\n\n".join(context_parts)
    print(f"   [i] Hybrid Retrieval: {len(chunks)} total chunks ({len(keyword_docs)} kw, {len(raw_vector_docs)} vec, {len(saos_chunks)} saos)")
    print(f"   [i] Final context: {len(context_text)} chars")

    return chunks, context_text


