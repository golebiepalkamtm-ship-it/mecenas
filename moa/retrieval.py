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
    Generuje wektor embedding dla zapytania użytkownika (OpenRouter via OpenAI Client).
    """
    # 0. Check cache
    query_key = query.strip().lower()
    if query_key in _embeddings_cache:
        print(f"   [CACHE] Hit for: '{query[:40]}...'")
        return cast(list[float], _embeddings_cache[query_key])

    # 1. Fetch using unified AsyncOpenAI client (Handles retries and connection quirks better)
    from moa.config import get_async_client, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS
    
    try:
        client = get_async_client()
        # OpenRouter supports embeddings via the standard OpenAI endpoint
        response = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=query
        )
        
        embedding = response.data[0].embedding
        
        # 2. Save to cache
        _embeddings_cache[query_key] = embedding
        _save_embeddings_cache()
        
        return cast(list[float], embedding)

    except Exception as e:
        print(f"   [ERROR] Embedding failed: {e}")
        # Fallback to zeros (prevents pipeline crash)
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
    base_info += f"TREŚĆ DOKUMENTU (FRAGMENT):\n{document_text[:5000]}\n\n" if document_text else ""
    base_info += "UWAGA: Jeśli użytkownik załączył dokument, przeanalizuj jego treść i wygeneruj plany wyszukiwania bazujące na konkretnych terminach prawnych, nazwach aktów lub sygnaturach tam zawartych.\n\n"
    base_info += f"AKTUALNE PYTANIE: {query}"
    
    prompt = f"""Jesteś Ekspertem Planowania Wyszukiwania Prawnego (Legal Search Architect).
Twoje zadanie to wygenerowanie precyzyjnych fraz wyszukiwania dla bazy wyroków sądowych (SAOS), aktów prawnych (ELI/ISAP) i bazy wiedzy (RAG).

[WEJŚCIE]
{base_info}

[ZADANIE]
Jeśli aktualne pytanie jest krótkie (np. '...', 'więcej', 'wyjaśnij'), bazuj na historii, aby doprecyzować co wyszukać.
Podążaj absolutnie i wyłącznie za treścią dostarczonego dokumentu i pytania. Nie wymyślaj!
Na przykład, jeśli na dokumencie znajduje się pismo urzędowe (KPA), absolutnie nie wpisuj do ELI 'Kodeks postępowania karnego' (KPK), lecz 'Kodeks postępowania administracyjnego'.
Uważnie czytaj sygnatury w dokumencie lub podstawy prawne (art. ...), by precyzyjniej wygenerować plan.

1. Pod-hasła RAG: Max 3 hasła (np. "przedawnienie roszczeń", "wszczęcie postępowania administracyjnego").
2. Fraza SAOS: Krótkie zapytanie do bazy wyroków. Uwzględnij sygnatury akt lub dokładne artykuły z ustawy, jeśli są w tekście (np. "II AKa 12/23", "art 61 § 4 kpa").
3. Fraza ELI: TYLKO NAZWA AKTU PRAWNEGO, w którym osadzono sprawę (np. "Kodeks postępowania administracyjnego", "ustawa o dostępie do informacji publicznej"). 
   BARDZO WAŻNE: Nie dodawaj 'art. XX' do frazy ELI, bo baza ISAP tego nie obsłuży. Jeśli nie wiesz jaki to akt prawny, zostaw puste.

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
    Pelen pipeline retrieval (HYBRYDOWY): Szuka w bazie prawnej (Legal) i bazie użytkownika (User).
    """
    # ---- KROK 1: Wyciąganie słów kluczowych (Keyword Extraction) ----
    keywords = []
    search_text = f"{query} {document_text if document_text else ''}"
    
    sygnatury = re.findall(r'[IVXLC]+\s+[A-Za-zK]+\s+\d+/\d+', search_text)
    if sygnatury: keywords.extend(sygnatury)
        
    art_matches = re.finditer(r"Art\.\s*(\d+[a-z]*)", search_text, re.I)
    for match in art_matches: keywords.append(f"Art. {match.group(1)}")
    
    code_maps = {"KPA": "administracyjnego", "KC": "cywilny", "KPC": "postępowania cywilnego", "KK": "karny", "KPK": "karnego", "KSH": "handlowych", "KP": "pracy"}
    for short, full in code_maps.items():
        if re.search(rf"\b{short}\b", search_text.upper()): keywords.append(full)

    # ---- KROK 2: Planowanie Wyszukiwania (AI) ----
    sub_keywords, saos_query, eli_query = await _extract_search_plans(query, document_text, history=history)
    
    if not saos_query: saos_query = " ".join(keywords) or "prawo"
    if not eli_query: eli_query = " ".join(keywords) or "ustawa"

    # ---- KROK 3: Równoległe wyszukiwanie we wszystkich źródłach ----
    print(f"   [>] Agentic Hybrydowy retrieval dla: '{query[:80]}...'")
    
    supabase_headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }

    raw_vector_docs = []
    keyword_docs = []
    saos_chunks = []
    eli_chunks = []

    async with httpx.AsyncClient(timeout=60) as client:
        # A. Vector Search Tasks
        embedding = await get_query_embedding(query)
        v_tasks = []
        
        # Zawsze szukaj w legal jeśli nie wymuszono user
        if not table or table == "knowledge_base_legal":
            v_tasks.append(client.post(
                f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/match_knowledge_legal",
                json={"query_embedding": embedding, "match_threshold": match_threshold, "match_count": match_count},
                headers=supabase_headers
            ))
        
        # Zawsze szukaj w user jeśli nie wymuszono legal
        if not table or table == "knowledge_base_user":
            v_tasks.append(client.post(
                f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/match_knowledge_user",
                json={"query_embedding": embedding, "match_threshold": match_threshold, "match_count": match_count},
                headers=supabase_headers
            ))

        # B. Keyword Search Tasks
        kw_tasks = []
        all_kws = (keywords[:2] + sub_keywords)[:4]
        for kw in all_kws:
            if not table or table == "knowledge_base_legal":
                kw_tasks.append(client.get(
                    f"{SUPABASE_URL.rstrip('/')}/rest/v1/knowledge_base_legal",
                    params={"select": "content,metadata", "content": f"ilike.*{kw}*", "limit": 3},
                    headers=supabase_headers
                ))
            if not table or table == "knowledge_base_user":
                kw_tasks.append(client.get(
                    f"{SUPABASE_URL.rstrip('/')}/rest/v1/knowledge_base_user",
                    params={"select": "content,metadata", "content": f"ilike.*{kw}*", "limit": 3},
                    headers=supabase_headers
                ))

        # C. External API Tasks
        ext_tasks = []
        if include_saos:
            ext_tasks.append(search_saos_judgments(saos_query, page_size=4))
            ext_tasks.append(search_isap_acts(eli_query, limit=4))

        # Execute everything in parallel!
        results = await asyncio.gather(*v_tasks, *kw_tasks, *ext_tasks, return_exceptions=True)

        # Distribute results
        v_idx = len(v_tasks)
        kw_idx = v_idx + len(kw_tasks)
        
        for r in results[:v_idx]:
            if not isinstance(r, Exception) and hasattr(r, 'status_code') and r.status_code == 200:
                raw_vector_docs.extend(r.json())
        
        for r in results[v_idx:kw_idx]:
            if not isinstance(r, Exception) and hasattr(r, 'status_code') and r.status_code == 200:
                keyword_docs.extend(r.json())

        if include_saos:
            saos_res = results[kw_idx] if len(results) > kw_idx else []
            eli_res = results[kw_idx+1] if len(results) > kw_idx+1 else []
            if not isinstance(saos_res, Exception): saos_chunks = saos_res
            if not isinstance(eli_res, Exception): eli_chunks = eli_res

    # ---- KROK 4: Scalanie i Mapowanie (Deduplikacja) ----
    chunks: list[RetrievedChunk] = []
    seen_contents = set()

    def add_chunk(content, source, similarity):
        if not content: return
        c_hash = hashlib.md5(content[:300].encode()).hexdigest()
        if c_hash not in seen_contents:
            chunks.append(RetrievedChunk(content=content, source=source, similarity=similarity))
            seen_contents.add(c_hash)

    # Priority 1: ELI (Law)
    for c in eli_chunks: add_chunk(c.content, c.source, c.similarity)
    
    # Priority 2: Keyword (Exact matches in User/Legal)
    for doc in keyword_docs:
        add_chunk(doc.get("content"), doc.get("metadata", {}).get("filename") or "Baza Wiedzy", 0.95)
    
    # Priority 3: Vector
    for doc in raw_vector_docs:
        add_chunk(doc.get("content"), doc.get("metadata", {}).get("filename") or "Baza Wiedzy", float(doc.get("similarity", 0.0)))
    
    # Priority 4: SAOS (Judgments)
    for c in saos_chunks: add_chunk(c.content, c.source, c.similarity)

    # ---- KROK 5: Kontrola dlugosci kontekstu ----
    chunks.sort(key=lambda x: x.similarity, reverse=True)
    
    context_parts: list[str] = []
    total_chars = 0
    for chunk in chunks:
        if total_chars + len(chunk.content) > MAX_CONTEXT_CHARS:
            break
        context_parts.append(f"ŹRÓDŁO: {chunk.source}\nTREŚĆ: {chunk.content}")
        total_chars += len(chunk.content) + 50

    context_text = "\n\n---\n\n".join(context_parts)
    print(f"   [i] Hybrid Retrieval: {len(chunks)} chunks ({len(keyword_docs)} kw, {len(raw_vector_docs)} vec, {len(saos_chunks)} saos, {len(eli_chunks)} eli)")
    print(f"   [i] Final context: {len(context_text)} chars")

    return chunks, context_text


