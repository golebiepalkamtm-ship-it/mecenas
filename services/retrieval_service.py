import logging
import httpx
import os
import re
import asyncio
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

from config import settings
from services.circuit_breaker import CircuitBreaker, snapshots_dict
from services.indexing_service import indexing_service
from services.rag_cache import rag_cache
from services.retrieval.providers.eli_provider import fetch_eli_once
from services.retrieval.providers.saos_provider import fetch_saos_once
from services.retrieval.providers.supabase_provider import (
    build_hybrid_payload,
    build_vector_payload,
    fetch_hybrid_rows_with_relaxation,
    post_rpc_json,
    resolve_hybrid_rpc_names,
)
from services.retrieval.types import RetrievalItem, normalize_retrieval_rows

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL") or ""
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or ""


def _as_plain_str(val: Any, *, empty_for_bool: bool = True) -> str:
    """Wymusza tekst pod re / HTTP — unika bool w re.split (TypeError w PL: „otrzymano bool”)."""
    if val is None:
        return ""
    if isinstance(val, str):
        return val
    if isinstance(val, bool) and empty_for_bool:
        return ""
    if isinstance(val, (int, float)):
        return str(val)
    return str(val)



_CRIMINAL_CONTEXT_RE = re.compile(
    r"(?:k\.?k\.?|kodeks(?:u|em)?\s+karn|karne(?:go|mu)?|recydyw|wyrok\s+(?:karn|więzien)|grzywn|wymiar\s+kar|nadzwyczajn\w*\s+(?:złagodz|obostrzeni)|recydywist|powrót\s+do\s+przestępst)",
    re.IGNORECASE,
)

_CIVIL_CONTEXT_RE = re.compile(
    r"(?:k\.?c\.?|kodeks(?:u|em)?\s+cywiln|cywilne(?:go|mu)?|oświadczeni\w*\s+woli|zobowiązan|umow|pozew|powód|pozwan)",
    re.IGNORECASE,
)


def _enrich_query_with_legal_branch(query: str, keywords: str) -> str:
    """Wzbogaca query SAOS o kontekst gałęzi prawa, żeby art. 64 KK nie zwracał wyników z KC."""
    blob = f"{query} {keywords}"
    # Jeśli wykryto kontekst karny, a query wygląda na sam numer artykułu — dodaj kontekst
    if _CRIMINAL_CONTEXT_RE.search(blob):
        if not re.search(r"\b(?:karn|k\.?k\.?)\b", query, re.IGNORECASE):
            return f"{query} prawo karne"
    if _CIVIL_CONTEXT_RE.search(blob):
        if not re.search(r"\b(?:cywiln|k\.?c\.?)\b", query, re.IGNORECASE):
            return f"{query} prawo cywilne"
    return query


_SAOS_STOPWORDS_RE = re.compile(
    r"\b(?:"
    r"znajd[zź]|znjdz|szukam|podaj|poka[zż]|wygeneruj|napisz|wyszukaj|znale[zź][cć]|chc[eę]|prosz[eę]|"
    r"mi|dla\s+mnie|ka[zż]de|kazde|mo[zż]liwe|mozliwe|wszystkie|jakie[sś]|wszelkie|"
    r"orzeczen[iea]*|wyrok[i]*|postanowien[iea]*|s[aą]du|sadu|kt[oó]re|ktore|m[oó]wi[aą]*|mowi|"
    r"o|w|na|ze|do|z|po|dla|temat|kontekst|kontekscie|w\s+sprawie"
    r")\b",
    re.IGNORECASE,
)


def _clean_saos_query(raw_query: str) -> str:
    """Oczyszcza surowe zapytanie potoczne ze słów-wypełniaczy, literówek i stop-words dla SAOS."""
    if not raw_query:
        return ""
    q = raw_query.strip()
    # Korekta częstych literówek prawniczych
    q = re.sub(r"\brecedyw\w*", "recydywa", q, flags=re.I)
    q = re.sub(r"\bpostepow\w*", "postępowanie", q, flags=re.I)
    
    # Usuń stop-words
    cleaned = _SAOS_STOPWORDS_RE.sub(" ", q)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    
    return cleaned if len(cleaned) >= 3 else q


def _external_search_queries(keywords: Any, user_query: Any = "", max_queries: int = 3) -> List[str]:
    """Hasła dla SAOS / ogólnego routingu na podstawie słów kluczowych."""
    keys = _as_plain_str(keywords, empty_for_bool=True)
    uq_base = _as_plain_str(user_query, empty_for_bool=True)
    raw_parts = [p.strip() for p in re.split(r"[,;]+", keys) if p.strip() and len(p.strip()) > 2]
    queries: List[str] = []

    combined_context = f"{keys} {uq_base}"
    
    # Przygotuj zarowno surowe jak i oczyszczone frazy
    clean_parts: List[str] = []
    for p in raw_parts:
        c = _clean_saos_query(p)
        if c and c not in clean_parts:
            clean_parts.append(c)
        if p not in clean_parts:
            clean_parts.append(p)

    for p in clean_parts:
        enriched = _enrich_query_with_legal_branch(p, combined_context)
        if enriched not in queries:
            queries.append(enriched)
        if len(queries) >= max_queries:
            break

    uq_clean = _clean_saos_query(uq_base)
    if uq_clean and 3 <= len(uq_clean) < 60 and uq_clean not in queries:
        enriched_uq = _enrich_query_with_legal_branch(uq_clean, combined_context)
        if enriched_uq not in queries:
            queries.append(enriched_uq)

    return queries[:max_queries]


_ART_ONLY = re.compile(
    r"^\s*(art\.?\s*|artyku[ałł]\s*)\s*\d+",
    re.IGNORECASE,
)


def _eli_act_titles_from_context(blob: str) -> List[str]:
    """Pełne tytuły ustaw — pod API ELI (wyniki po ustawie, nie po samym „art.")"""
    blob = _as_plain_str(blob, empty_for_bool=True)
    blob_l = (blob or "").lower()
    titles: List[str] = []

    def add(title: str) -> None:
        if title not in titles:
            titles.append(title)

    if re.search(
        r"\bkpa\b|kodeks[^\n,.]{0,40}postępowania administracyjn|postępowani\w* administracyjn",
        blob,
        re.IGNORECASE,
    ):
        add("Kodeks postępowania administracyjnego")
    if re.search(r"\bkpc\b|postępowani\w* cywiln", blob, re.IGNORECASE):
        add("Kodeks postępowania cywilnego")
    if re.search(r"\bkpk\b|postępowani\w* karn", blob, re.IGNORECASE):
        add("Kodeks postępowania karnego")
    if re.search(r"ordynacji podatkowej|ordynacja podatkowa", blob_l):
        add("Ordynacja podatkowa")
    if re.search(
        r"upea|postępowaniu egzekucyjnym w administracji|egzekucyjn\w* w administracji",
        blob_l,
    ):
        add("Ustawa o postępowaniu egzekucyjnym w administracji")
    if re.search(r"\bkodeks pracy\b", blob_l):
        add("Kodeks pracy")
    if re.search(r"\bkodeks\w*\s+karn\w*\b(?!\w*postępowania)", blob_l):
        add("Kodeks karny")
    if re.search(r"\bkodeks\w*\s+cywiln\w*\b(?!\w*postępowania)", blob_l):
        add("Kodeks cywilny")
    if re.search(r"\bk\.?\s*k\.?\b", blob_l) and not re.search(r"\bk\.?\s*p\.?\s*k\.?\b", blob_l):
        add("Kodeks karny")
    if "ustawy z dnia 14 czerwca 1960" in blob_l or "p.p.s.a" in blob_l or "ustawę ppsa" in blob_l:
        add("ustawa Prawo o postępowaniu przed sądami administracyjnymi")
    if re.search(r"\buopn\b|\bupn\b|u\.?p\.?n\.?|przeciwdziałaniu narkomanii|ustawa o przeciwdziałaniu narkomanii", blob_l):
        add("Ustawa o przeciwdziałaniu narkomanii")
    if re.search(r"\bpolicj\w*", blob_l):
        add("Ustawa o Policji")
    return titles


def _eli_search_queries(
    keywords: Any, user_query: Any = "", max_queries: int = 5
) -> List[str]:
    """Hasła dla wyszukiwarki ELI — preferuj nazwę ustawy przed pojedynczym artykułem."""
    keys = _as_plain_str(keywords, empty_for_bool=True)
    uq_base = _as_plain_str(user_query, empty_for_bool=True)
    blob = f"{keys} {uq_base}"
    out: List[str] = []

    for t in _eli_act_titles_from_context(blob):
        if len(out) < max_queries:
            out.append(t)

    parts = [p.strip() for p in re.split(r"[,;]+", keys) if p.strip() and len(p.strip()) > 2]
    for p in parts:
        if len(out) >= max_queries:
            break
        if p not in out:
            out.append(p)

    uq = uq_base.strip()
    if (
        uq
        and 10 < len(uq) < 120
        and uq not in out
        and len(out) < max_queries
        and not (_ART_ONLY.match(uq) and out)
    ):
        out.append(uq)

    return out[:max_queries]


class PostgresHybridSearch:
    """
    Klasa realizująca wyszukiwanie hybrydowe dla polskiego systemu LegalTech.
    Łączy pgvector (HNSW) oraz Full-Text Search (język polski) z fuzją RRF.
    """
    def __init__(self, pool: Optional[Any] = None):
        self.pool = pool

    async def execute_hybrid_query(
        self,
        query_text: str,
        query_embedding: List[float],
        target_act: Optional[str] = None,
        limit: int = 15,
        vector_weight: float = 0.5,
        k_rrf: int = 60
    ) -> List[RetrievalItem]:
        """
        Wykonuje wyszukiwanie hybrydowe z fuzją RRF.
        Jeśli pool jest skonfigurowany (asyncpg), wykonuje bezpośrednie zapytanie SQL,
        w przeciwnym wypadku korzysta z interfejsu HTTP Supabase (domyślny i bezpieczny).
        """
        if self.pool:
            try:
                # Zapytanie wykorzystujące CTE (Common Table Expressions) do wyliczenia rang (asyncpg)
                async with self.pool.acquire() as conn:
                    where_clauses = ["1=1"]
                    params = [query_embedding, query_text, limit * 3]
                    
                    if target_act:
                        params.append(target_act)
                        where_clauses.append(f"metadata->'act_terms' ? ${len(params)}")

                    where_stmt = " AND ".join(where_clauses)

                    sql_query = f"""
                        WITH vector_search AS (
                            SELECT
                                id, content, metadata,
                                ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) as vector_rank
                            FROM knowledge_base_legal
                            WHERE {where_stmt}
                            ORDER BY embedding <=> $1::vector
                            LIMIT $3
                        ),
                        keyword_search AS (
                            SELECT
                                id, content, metadata,
                                ROW_NUMBER() OVER (
                                    ORDER BY ts_rank(to_tsvector('polish', content), websearch_to_tsquery('polish', $2)) DESC
                                ) as keyword_rank
                            FROM knowledge_base_legal
                            WHERE to_tsvector('polish', content) @@ websearch_to_tsquery('polish', $2)
                              AND {where_stmt}
                            ORDER BY ts_rank(to_tsvector('polish', content), websearch_to_tsquery('polish', $2)) DESC
                            LIMIT $3
                        )
                        SELECT
                            COALESCE(v.id, k.id) as id,
                            COALESCE(v.content, k.content) as content,
                            COALESCE(v.metadata, k.metadata) as metadata,
                            (COALESCE(1.0 / ({k_rrf} + v.vector_rank), 0.0) * $4::float) +
                            (COALESCE(1.0 / ({k_rrf} + k.keyword_rank), 0.0) * (1.0 - $4::float)) as rrf_score
                        FROM vector_search v
                        FULL OUTER JOIN keyword_search k ON v.id = k.id
                        ORDER BY rrf_score DESC
                        LIMIT $3 / 3;
                    """
                    rows = await conn.fetch(sql_query, *params, vector_weight)
                    return normalize_retrieval_rows([dict(row) for row in rows])
            except Exception as e:
                logger.warning("[HYBRID DB ERR] Fallback HTTP: %s", e)

        # Bezpieczny fallback HTTP (standard dla środowiska bez bezpośredniego dostępu do PG)
        act_terms = [target_act] if target_act else None
        return await retrieval_service.search_supabase(
            query=query_text,
            table_name="knowledge_base_legal",
            match_count=limit,
            act_terms=act_terms,
            hybrid=True
        )

class RetrievalService:
    def __init__(self):
        self.headers: Dict[str, str] = {
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        }
        self._integration_warnings: List[str] = []
        self._breakers: Dict[str, CircuitBreaker] = {
            "SAOS": CircuitBreaker(
                name="SAOS",
                failure_threshold=settings.circuit_breaker_failure_threshold,
                open_seconds=settings.circuit_breaker_open_seconds,
                half_open_max_calls=settings.circuit_breaker_half_open_max_calls,
            ),
            "ELI": CircuitBreaker(
                name="ELI",
                failure_threshold=settings.circuit_breaker_failure_threshold,
                open_seconds=settings.circuit_breaker_open_seconds,
                half_open_max_calls=settings.circuit_breaker_half_open_max_calls,
            ),
        }

    def emit_integration_warning(self, msg: str) -> None:
        if msg and msg not in self._integration_warnings:
            self._integration_warnings.append(msg)

    def consume_integration_warnings(self) -> List[str]:
        out, self._integration_warnings = self._integration_warnings[:], []
        return out

    def circuit_breakers_snapshot(self) -> Dict[str, dict]:
        return snapshots_dict(self._breakers)

    async def fetch_user_knowledge_by_session(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Pobiera wszystkie fragmenty dokumentów przypisane do danej sesji, pomijając wektoryzację."""
        if not SUPABASE_URL:
            return []
        url = f"{SUPABASE_URL}/rest/v1/knowledge_base_user"
        params = {
            "metadata->>session_id": f"eq.{session_id}",
            "select": "*",
            "limit": str(limit)
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url, params=params, headers=self.headers)
                if res.status_code == 200:
                    data = res.json()
                    # Ręcznie formatujemy na słowniki z content i metadata
                    return data
                else:
                    logger.error(f"[RETRIEVAL ERR] Fetch by session failed ({res.status_code}): {res.text[:200]}")
                    return []
        except Exception as e:
            logger.exception("[RETRIEVAL ERR] Błąd pobierania sesji z Supabase")
            return []


    async def search_supabase(
        self, 
        query: Any, 
        table_name: str = "knowledge_base_legal", 
        match_threshold: float = 0.5, 
        match_count: int = 5, 
        act_terms: Optional[List[str]] = None,
        allowed_source_types: Optional[List[str]] = None,
        hybrid: bool = True,
        cache_namespace: str = "",
    ) -> List[RetrievalItem]:
        """
        Przeszukuje bazę Supabase przy użyciu wyszukiwania wektorowego 
        lub hybrydowego (FTS + Vector + RRF) dostosowanego pod język polski.
        """
        query = _as_plain_str(query, empty_for_bool=True).strip()
        if not query:
            return []

        cache_key = rag_cache.make_key(
            "supabase",
            q=query,
            table=table_name,
            threshold=match_threshold,
            count=match_count,
            acts=act_terms or [],
            types=allowed_source_types or [],
            hybrid=hybrid,
            ns=cache_namespace or "",
        )
        cached = rag_cache.get(cache_key)
        if cached is not None:
            return cached

        if not SUPABASE_URL:
            logger.error("[RETRIEVAL ERR] SUPABASE_URL nie jest skonfigurowany.")
            return []
            
        try:
            embedding = await indexing_service.get_embedding(query)
            
            # --- TRYB HYBRYDOWY (FTS + pgvector + RRF) ---
            if hybrid:
                rpc_names = resolve_hybrid_rpc_names(table_name)
                payload = build_hybrid_payload(
                    query=query,
                    embedding=embedding,
                    match_count=match_count,
                    table_name=table_name,
                    act_terms=act_terms,
                    allowed_source_types=allowed_source_types,
                )
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        status_v2, results = await fetch_hybrid_rows_with_relaxation(
                            client,
                            supabase_url=SUPABASE_URL,
                            rpc_name=rpc_names.preferred_rpc,
                            payload=payload,
                            headers=self.headers,
                            retry_without_allowed_source_types=(
                                bool(allowed_source_types)
                                and table_name == "knowledge_base_legal"
                            ),
                            retry_without_act_terms=(
                                bool(act_terms) and table_name == "knowledge_base_legal"
                            ),
                        )
                        if status_v2 == 200:
                            normalized = normalize_retrieval_rows(results)
                            rag_cache.set(cache_key, normalized)
                            return normalized
                        if status_v2 != 404:
                            self.emit_integration_warning(
                                f"⚠️ **RAG**: `{rpc_names.preferred_rpc}` odpowiedział kodem {status_v2}. "
                                f"Fallback do `{rpc_names.legacy_rpc}`."
                            )
                        status_legacy, results = await fetch_hybrid_rows_with_relaxation(
                            client,
                            supabase_url=SUPABASE_URL,
                            rpc_name=rpc_names.legacy_rpc,
                            payload=payload,
                            headers=self.headers,
                            retry_without_act_terms=(
                                bool(act_terms) and table_name == "knowledge_base_legal"
                            ),
                        )
                        if status_legacy == 200:
                            normalized = normalize_retrieval_rows(results)
                            rag_cache.set(cache_key, normalized)
                            return normalized
                        if status_legacy == 404:
                            self.emit_integration_warning(
                                f"⚠️ **RAG**: funkcja `{rpc_names.legacy_rpc}` nie jest wdrożona w Supabase (404). "
                                f"Stosuję `{rpc_names.vector_fallback_rpc}` — tylko podobieństwo wektorowe."
                            )
                        else:
                            self.emit_integration_warning(
                                f"⚠️ **RAG**: `{rpc_names.legacy_rpc}` odpowiedział kodem {status_legacy}. "
                                f"Fallback do `{rpc_names.vector_fallback_rpc}`."
                            )
                except Exception as e:
                    logger.warning(
                        "[RETRIEVAL] Hybrid RPC %s/%s wyjątek: %s — fallback do %s",
                        rpc_names.preferred_rpc,
                        rpc_names.legacy_rpc,
                        e,
                        rpc_names.vector_fallback_rpc,
                    )
                    self.emit_integration_warning(
                        f"⚠️ **RAG**: błąd wywołania `{rpc_names.preferred_rpc}` ({str(e)[:200]}). Użyto `{rpc_names.vector_fallback_rpc}`."
                    )
            
            # --- TRYB PURE-VECTOR (FALLBACK / TRADYCYJNY) ---
            rpc_name, payload_pure = build_vector_payload(
                embedding=embedding,
                match_threshold=match_threshold,
                match_count=match_count,
                table_name=table_name,
                act_terms=act_terms,
            )

            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await post_rpc_json(
                    client,
                    supabase_url=SUPABASE_URL,
                    rpc_name=rpc_name,
                    payload=payload_pure,
                    headers=self.headers,
                )
                if res.status_code == 200:
                    normalized = normalize_retrieval_rows(res.json())
                    rag_cache.set(cache_key, normalized)
                    return normalized
                else:
                    logger.error(
                        "[RETRIEVAL ERR] Supabase RPC failed (%s): %s",
                        res.status_code,
                        res.text[:300],
                    )
                    return []
        except Exception:
            logger.exception("[RETRIEVAL ERR] Błąd Supabase")
            return []

    async def search_saos(
        self, keywords: Any, limit: int = 3, user_query: Any = "", cache_namespace: str = ""
    ) -> List[RetrievalItem]:
        """Wyszukiwanie orzeczeń w SAOS (api.saos.org.pl)."""
        breaker = self._breakers.get("SAOS")
        if breaker and not breaker.allow_request():
            snap = breaker.snapshot()
            self.emit_integration_warning(
                f"⚠️ **SAOS**: odcięte (circuit={snap.state}, failures={snap.failures})."
            )
            return []
        kw = _as_plain_str(keywords, empty_for_bool=True)
        uq = _as_plain_str(user_query, empty_for_bool=True)
        cache_key = rag_cache.make_key("saos", kw=kw, limit=limit, uq=uq, ns=cache_namespace or "")
        cached = rag_cache.get(cache_key)
        if cached is not None:
            return cached

        queries = _external_search_queries(kw, uq)
        if not queries:
            return []
        seen_ids: set = set()
        merged: List[RetrievalItem] = []
        timeout = max(45.0, float(getattr(settings, "saos_timeout_sec", 45.0)))
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                for q in queries:
                    batch = await asyncio.wait_for(
                        fetch_saos_once(client, q, limit),
                        timeout=timeout,
                    )
                    for row in batch:
                        rid = row.get("id") or hash(row.get("content", ""))
                        if rid in seen_ids:
                            continue
                        seen_ids.add(rid)
                        merged.append(row)
                        if len(merged) >= limit:
                            break
                    if len(merged) >= limit:
                        break
                logger.info("[SAOS] queries=%s -> %s orzeczeń", queries, len(merged))
                out = merged[:limit]
                rag_cache.set(cache_key, out)
                if breaker:
                    breaker.on_success()
                return out
            except Exception as e:
                logger.warning("[SAOS ERR] %s", e)
                if breaker:
                    breaker.on_failure(str(e))
                return []

    async def search_eli(
        self, keywords: Any, limit: int = 3, user_query: Any = "", cache_namespace: str = ""
    ) -> List[RetrievalItem]:
        """Wyszukiwanie aktów w lokalnej replice ISAP/ELI (Supabase pgvector)."""
        kw = _as_plain_str(keywords, empty_for_bool=True)
        uq = _as_plain_str(user_query, empty_for_bool=True)
        queries_preview = _eli_search_queries(kw, uq, max_queries=max(5, limit))
        cache_key = rag_cache.make_key(
            "eli_pgvector", ql=queries_preview, limit=limit, uq=uq[:600], ns=cache_namespace or ""
        )
        cached = rag_cache.get(cache_key)
        if cached is not None:
            return cached

        queries = queries_preview
        if not queries:
            return []
            
        merged: List[RetrievalItem] = []
        seen: set = set()
        
        try:
            for q in queries:
                embedding = await indexing_service.get_embedding(q)
                rpc_name = "match_isap_documents"
                payload = {
                    "query_embedding": embedding,
                    "match_threshold": 0.1,
                    "match_count": limit
                }
                
                results = []
                local_failed = False
                async with httpx.AsyncClient(timeout=15.0) as client:
                    try:
                        res = await post_rpc_json(
                            client,
                            supabase_url=SUPABASE_URL,
                            rpc_name=rpc_name,
                            payload=payload,
                            headers=self.headers,
                        )
                        if res.status_code == 200:
                            results = res.json()
                        else:
                            local_failed = True
                            logger.warning(f"[ELI PgVector] RPC match_isap_documents failed with status {res.status_code}")
                    except Exception as db_err:
                        local_failed = True
                        logger.warning(f"[ELI PgVector] RPC match_isap_documents exception: {db_err}")
                        
                    # Fallback to direct ELI search API when Supabase fails or returns nothing
                    if local_failed or not results:
                        breaker = self._breakers.get("ELI")
                        if breaker and not breaker.allow_request():
                            snap = breaker.snapshot()
                            self.emit_integration_warning(
                                f"⚠️ **ELI Sejm API**: odcięte (circuit={snap.state}, failures={snap.failures})."
                            )
                            continue
                            
                        logger.info(f"[ELI Fallback] Calling fetch_eli_once directly for query: '{q}'")
                        try:
                            fallback_results = await fetch_eli_once(client, q, limit)
                            if breaker:
                                breaker.on_success()
                            if fallback_results:
                                logger.info(f"[ELI Fallback] Direct Sejm API returned {len(fallback_results)} acts.")
                                for row in fallback_results:
                                    key = row.get("source") or row.get("id") or hash(row.get("content", ""))
                                    if key in seen:
                                        continue
                                    seen.add(key)
                                    merged.append(row)
                        except Exception as fb_err:
                            logger.error(f"[ELI Fallback ERR] Direct Sejm API failed: {fb_err}")
                            if breaker:
                                breaker.on_failure(str(fb_err))
                    else:
                        for row in results:
                            key = row.get("eli") or row.get("id")
                            if key in seen:
                                continue
                            seen.add(key)
                            
                            title = row.get("title") or ""
                            eli_str = row.get("eli") or ""
                            content = row.get("content") or ""
                            header = f"{title}\n({eli_str})"
                            
                            merged.append({
                                "source": f"ELI (ISAP) — {eli_str}",
                                "tytul": title,
                                "title": title,
                                "content": f"{header}\n{content[:3000]}",
                            })
                            
                if len(merged) >= limit:
                    break
                    
            logger.info("[ELI PgVector/Fallback] queries=%s -> %s aktów", queries, len(merged))
            out = normalize_retrieval_rows(merged[:limit])
            rag_cache.set(cache_key, out)
            return out
        except Exception as e:
            logger.error("[ELI PgVector ERR] %s", e)
            self.emit_integration_warning(f"⚠️ **ELI (ISAP)**: błąd zapytania do lokalnej bazy pgvector / API ({str(e)[:200]}).")
            return []

# Singleton
retrieval_service = RetrievalService()
