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
from moa.eli import search_isap_acts


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
    Generuje wektor embedding dla zapytania użytkownika.
    Wykorzystuje Ollama API -> rjmalagon/gte-qwen2-1.5b-instruct-embed-f16 (1536-dim).
    Zwraca wynik z cache jeśli dostępny.
    """
    # 0. Check cache
    query_key = query.strip().lower()
    if query_key in _embeddings_cache:
        print(f"   [CACHE] Hit for: '{query[:40]}...'")
        return cast(list[float], _embeddings_cache[query_key])

    # 1. Fetch from Ollama
    payload = {
        "model": EMBEDDING_MODEL,
        "input": [query],
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:  # Dłuższy timeout dla lokalnego modelu
            response = await client.post(
                "http://localhost:11434/api/embed",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            embedding = data["embeddings"][0]

            # 2. Save to cache
            _embeddings_cache[query_key] = embedding
            _save_embeddings_cache()

            return cast(list[float], embedding)

    except Exception as e:
        print(f"   [ERROR] Embedding failed: {e}")
        # Fallback: return zeros
        return [0.0] * EMBEDDING_DIMENSIONS


# ---------------------------------------------------------------------------
# 1.5 Multi-Query / Query Decomposition (Agentic Planowanie)
# ---------------------------------------------------------------------------
async def _extract_search_plans(query: str, document_text: str | None = None, history: list | None = None) -> tuple[list[str], str, str]:
    """
    Ekstrahuje RAG pod-pytania, słowa kluczowe SAOS oraz ELI.
    Używa historii, aby zrozumieć kontekst krótkich zapytań (np. "...", "opisz to").
    """
    # Budowa kontekstu konwersacji
    history_context = ""
    if history:
        last_msgs = history[-3:] # Ostatnie 3 wymiany
        history_context = "HISTORIA KONWERSACJI:\n"
        for m in last_msgs:
            role = "Użytkownik" if m.get("role") == "user" else "Asystent"
            history_context += f"{role}: {m.get('content')[:200]}\n"
    
    base_info = f"{history_context}\n"
    base_info += f"TREŚĆ DOKUMENTU:\n{document_text[:2000]}\n\n" if document_text else ""
    base_info += f"AKTUALNE PYTANIE: {query}"
    
    prompt = f"""Jesteś Ekspertem Planowania Wyszukiwania Prawnego (Legal Search Architect).
Twoje zadanie to wygenerowanie precyzyjnych fraz wyszukiwania dla bazy wyroków sądowych (SAOS), aktów prawnych (ELI/ISAP) i bazy wiedzy (RAG).

[WEJŚCIE]
{base_info}

[ZADANIE]
Jeśli aktualne pytanie jest krótkie (np. '...', 'więcej', 'wyjaśnij'), bazuj na historii, aby doprecyzować co wyszukać.
1. Pod-hasła RAG: Max 3 hasła (np. "przedawnienie roszczeń bankowych").
2. Fraza SAOS: Pojedyncze, krótkie zapytanie tekstowe do bazy wyroków (np. "art 212 kk zniesławienie").
3. Fraza ELI: Nazwa ustawy lub problemu (np. "kodeks cywilny", "ustawa o ochronie lokatorów").

Zwróć odpowiedź WYŁĄCZNIE W FORMACIE JSON:
{{
  "rag_subqueries": ["..."],
  "saos_query": "...",
  "eli_query": "..."
}}
"""

    payload = {
        "model": "google/gemini-2.0-flash-001", 
        "messages": [{"role": "system", "content": "Return only JSON."}, {"role": "user", "content": prompt}],
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
                try:
                    data = json.loads(txt)
                    subqueries = [s for s in data.get("rag_subqueries", []) if len(s.strip()) > 3][:3]
                    saos_q = data.get("saos_query", "")
                    eli_q = data.get("eli_query", "")
                    print(f"   [PLAN] RAG: {len(subqueries)} | SAOS: '{saos_q}' | ELI: '{eli_q}'")
                    return subqueries, saos_q, eli_q
                except Exception: pass
    except Exception as e:
        print(f"   [PLAN][WARN] AI planner failed: {e} — using regex fallback")

    # --- REGEX FALLBACK: Lokalna ekstrakcja gdy AI nie odpowiedział ---
    combined = f"{query} {document_text[:1000] if document_text else ''}"
    
    # Ekstrakcja artykułów i kodeksów
    art_refs = re.findall(r'[Aa]rt\.?\s*(\d+[a-z]*)', combined)
    code_map = {"KPA": "kodeks postępowania administracyjnego", "KC": "kodeks cywilny", 
                "KPC": "kodeks postępowania cywilnego", "KK": "kodeks karny",
                "KPK": "kodeks postępowania karnego", "KSH": "kodeks spółek handlowych",
                "KP": "kodeks pracy", "KRO": "kodeks rodzinny"}
    
    found_codes = []
    for short, full in code_map.items():
        if re.search(rf'\b{short}\b', combined, re.I):
            found_codes.append(full)
    
    # Budowanie fallback queries
    fallback_saos = " ".join([f"art {a}" for a in art_refs[:3]] + found_codes[:2]) or ""
    fallback_eli = " ".join(found_codes[:2]) or ""
    fallback_rag = [f"art. {a}" for a in art_refs[:2]] + found_codes[:1]
    
    if fallback_saos or fallback_eli:
        print(f"   [PLAN][FALLBACK] RAG: {len(fallback_rag)} | SAOS: '{fallback_saos}' | ELI: '{fallback_eli}'")
    
    return fallback_rag, fallback_saos, fallback_eli

# ---------------------------------------------------------------------------
# 2. Pobranie fragmentow z Supabase pgvector (Bezposredni RPC)
# ---------------------------------------------------------------------------
async def retrieve_legal_context(
    query: str,
    match_count: int = DEFAULT_MATCH_COUNT,
    match_threshold: float = DEFAULT_MATCH_THRESHOLD,
    include_saos: bool = True,
    document_text: str | None = None,
    category: str | None = None,
    table: str | None = None,
    model_override: str | None = None,
    history: list | None = None,
) -> tuple[list[RetrievedChunk], str]:
    """
    Pelen pipeline retrieval (HYBRYDOWY):
      1. Szybkie wyszukiwanie słów kluczowych (Art. XX, Nazwa Kodeksu)
      2. Embedding zapytania + Supabase RPC (match_knowledge)
      3. (Opcjonalnie) Przeszukiwanie orzeczeń SAOS via API
      4. Mapowanie i scalanie wyników (Deduplikacja)
      5. Kontrola dlugosci kontekstu (obciecie do MAX_CONTEXT_CHARS)
    """
    # Determinacja tabeli jeśli nie podano jawnie
    from moa.config import CAT_USER_DOCS
    if not table:
        table = "knowledge_base_user" if category == CAT_USER_DOCS else "knowledge_base_legal"
    
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

    # ---- KROK 0.5: Multi-Query Decomposition i SAOS/ELI (Równolegle, AI) ----
    plan_task = asyncio.create_task(_extract_search_plans(query, document_text, history=history))
    
    # Czekamy chwilkę na plan, żeby odpalić SAOS/ELI natychmiast z poprawnym query
    sub_keywords, saos_ai_query, eli_ai_query = await plan_task
    
    saos_query = saos_ai_query
    if not saos_query:
        saos_query = " ".join(keywords) or "prawo"

    eli_query = eli_ai_query
    if not eli_query:
        eli_query = " ".join(keywords) or "ustawa"

    # ---- KROK 0: SAOS & ELI Search ----
    saos_task = None
    eli_task = None
    if include_saos:
        if saos_query:
            saos_task = asyncio.create_task(search_saos_judgments(saos_query, page_size=4))
        if eli_query:
            eli_task = asyncio.create_task(search_isap_acts(eli_query, limit=4))

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
        rpc_function = "match_knowledge_legal" if table == "knowledge_base_legal" else "match_knowledge_user"
        rpc_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/{rpc_function}"
        query_payload = {
            "query_embedding": embedding,
            "match_threshold": match_threshold,
            "match_count": match_count,
        }
        
        rpc_params = {}
        if category:
             rpc_params["metadata->>category"] = f"eq.{category}"

        async with httpx.AsyncClient(timeout=60) as client:
            # Równolegle: Vector RPC i Keyword Search (jeśli są słowa kluczowe)
            vector_task = client.post(rpc_url, json=query_payload, headers=supabase_headers, params=rpc_params)
            
            keyword_tasks = []
            if keywords:
                # Proste wyszukiwanie tekstowe dla każdego słowa kluczowego
                for kw in keywords[:2]: # Limit to 2 keywords to avoid too many requests
                    kw_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}"
                    params = {"select": "content,metadata", "content": f"ilike.*{kw}*", "limit": 4}
                    if category:
                        params["metadata->>category"] = f"eq.{category}"
                    keyword_tasks.append(client.get(kw_url, params=params, headers=supabase_headers))
            
            # Korzystamy z sub_keywords uzyskanych za darmo przed sekundą
            if sub_keywords:
                for skw in sub_keywords:
                    if len(keyword_tasks) < 4:
                        skw_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}"
                        params_skw = {"select": "content,metadata", "content": f"ilike.*{skw}*", "limit": 2}
                        if category:
                            params_skw["metadata->>category"] = f"eq.{category}"
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

    # ---- Krok 3: SAOS & ELI Results ----
    saos_chunks = []
    eli_chunks = []
    
    if saos_task:
        try:
            saos_chunks = await saos_task
        except Exception as e:
            print(f"   [ERR] SAOS task failed: {e}")
            
    if eli_task:
        try:
            eli_chunks = await eli_task
        except Exception as e:
            print(f"   [ERR] ELI task failed: {e}")

    # ---- Krok 4: Scalanie i Mapowanie (Deduplikacja) ----
    chunks: list[RetrievedChunk] = []
    seen_contents = set()

    def add_chunk(content, source, similarity):
        # Prosta deduplikacja po treści (hashed)
        c_hash = hash(content[:200])
        if c_hash not in seen_contents:
            chunks.append(RetrievedChunk(content=content, source=source, similarity=similarity))
            seen_contents.add(c_hash)

    # 1. ELI (Najwyższy priorytet - oficjalne akty prawne i ich status)
    for ec in eli_chunks:
        add_chunk(ec.content, ec.source, ec.similarity)

    # 2. Keyword (Bardzo precyzyjne dla konkretnych artykułów)
    for doc in keyword_docs:
        add_chunk(
            str(doc.get("content", "")),
            str(doc.get("metadata", {}).get("filename") or "Baza Wiedzy"),
            0.95 
        )

    # 3. Vector
    for doc in raw_vector_docs:
        add_chunk(
            str(doc.get("content", "")),
            str(doc.get("metadata", {}).get("filename") or "Baza Wiedzy"),
            float(doc.get("similarity", 0.0))
        )
    
    # 4. SAOS (Orzecznictwo - wsparcie interpretacyjne)
    for sc in saos_chunks:
        add_chunk(sc.content, sc.source, sc.similarity)

    # ---- Krok 5: Kontrola dlugosci kontekstu ----
    context_parts: list[str] = []
    total_chars = 0

    # Sortuj po podobieństwie
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
    print(f"   [i] Hybrid Retrieval: {len(chunks)} chunks ({len(keyword_docs)} kw, {len(raw_vector_docs)} vec, {len(saos_chunks)} saos, {len(eli_chunks)} eli)")
    print(f"   [i] Final context: {len(context_text)} chars")

    return chunks, context_text


