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


def _eli_field_str(val: Any) -> str:
    """Pola JSON z API ELI bywają true/false zamiast stringów — nie przekazuj ich do re ani nagłówków."""
    if val is None or isinstance(val, bool):
        return ""
    if isinstance(val, str):
        return val
    if isinstance(val, (int, float)):
        return str(val)
    return str(val)


def _strip_html(text: Any) -> str:
    s = _as_plain_str(text, empty_for_bool=True)
    if not s:
        return ""
    clean = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", clean).strip()


def _external_search_queries(keywords: Any, user_query: Any = "", max_queries: int = 3) -> List[str]:
    """Hasła dla SAOS / ogólnego routingu na podstawie słów kluczowych."""
    keys = _as_plain_str(keywords, empty_for_bool=True)
    uq_base = _as_plain_str(user_query, empty_for_bool=True)
    parts = [p.strip() for p in re.split(r"[,;]+", keys) if p.strip() and len(p.strip()) > 2]
    queries: List[str] = []

    for p in parts[:max_queries]:
        if p not in queries:
            queries.append(p)

    uq = uq_base.strip()
    if uq and 8 < len(uq) < 60 and uq not in queries:
        queries.append(uq)

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
    if re.search(r"\bkodeks karn\b(?!\w*postępowania)", blob_l):
        add("Kodeks karny")
    if re.search(r"\bkodeks cywiln\b(?!\w*postępowania)", blob_l):
        add("Kodeks cywilny")
    if "ustawy z dnia 14 czerwca 1960" in blob_l or "p.p.s.a" in blob_l or "ustawę ppsa" in blob_l:
        add("ustawa Prawo o postępowaniu przed sądami administracyjnymi")
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
        if _ART_ONLY.match(p) and out:
            continue
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
    ) -> List[Dict[str, Any]]:
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
                    return [dict(row) for row in rows]
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
    ) -> List[Dict[str, Any]]:
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
                rpc_name_v2 = (
                    "hybrid_search_legal_v2"
                    if table_name == "knowledge_base_legal"
                    else "hybrid_search_user_v2"
                )
                rpc_name = (
                    "hybrid_search_legal"
                    if table_name == "knowledge_base_legal"
                    else "hybrid_search_user"
                )
                payload: Dict[str, Any] = {
                    "query_text": query,
                    "query_embedding": embedding,
                    "match_count": match_count,
                    "vector_weight": 0.45,  # Lekka preferencja FTS dla sprawdzania konkretnych artykułów
                    "k_rrf": 60
                }
                if act_terms:
                    payload["act_terms"] = act_terms
                if allowed_source_types and table_name == "knowledge_base_legal":
                    payload["allowed_source_types"] = allowed_source_types
                
                fallback_rpc = (
                    "match_knowledge_legal"
                    if table_name == "knowledge_base_legal"
                    else "match_knowledge_user"
                )
                url_v2 = f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/{rpc_name_v2}"
                url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/{rpc_name}"
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        res_v2 = await client.post(url_v2, json=payload, headers=self.headers)
                        if res_v2.status_code == 200:
                            results = res_v2.json()
                            if (
                                not results
                                and allowed_source_types
                                and table_name == "knowledge_base_legal"
                            ):
                                payload_retry_types = {
                                    k: v for k, v in payload.items() if k != "allowed_source_types"
                                }
                                res_retry_types = await client.post(
                                    url_v2, json=payload_retry_types, headers=self.headers
                                )
                                if res_retry_types.status_code == 200:
                                    results = res_retry_types.json()
                            if (
                                not results
                                and act_terms
                                and table_name == "knowledge_base_legal"
                            ):
                                payload_retry_acts = {
                                    k: v for k, v in payload.items() if k != "act_terms"
                                }
                                payload_retry_acts.pop("allowed_source_types", None)
                                res_retry_acts = await client.post(
                                    url_v2, json=payload_retry_acts, headers=self.headers
                                )
                                if res_retry_acts.status_code == 200:
                                    results = res_retry_acts.json()
                            for row in results:
                                if isinstance(row, dict) and row.get("rrf_score") is not None:
                                    row.setdefault("score", row["rrf_score"])
                                    row.setdefault("similarity", row["rrf_score"])
                            rag_cache.set(cache_key, results)
                            return results
                        if res_v2.status_code != 404:
                            self.emit_integration_warning(
                                f"⚠️ **RAG**: `{rpc_name_v2}` odpowiedział kodem {res_v2.status_code}. "
                                f"Fallback do `{rpc_name}`."
                            )
                        res = await client.post(url, json=payload, headers=self.headers)
                        if res.status_code == 200:
                            results = res.json()
                            for row in results:
                                if isinstance(row, dict) and row.get("rrf_score") is not None:
                                    row.setdefault("score", row["rrf_score"])
                                    row.setdefault("similarity", row["rrf_score"])
                            if (
                                not results
                                and act_terms
                                and table_name == "knowledge_base_legal"
                            ):
                                payload_retry = {
                                    k: v for k, v in payload.items() if k != "act_terms"
                                }
                                payload_retry.pop("allowed_source_types", None)
                                res_retry = await client.post(
                                    url, json=payload_retry, headers=self.headers
                                )
                                if res_retry.status_code == 200:
                                    results = res_retry.json()
                                    for row in results:
                                        if isinstance(row, dict) and row.get("rrf_score") is not None:
                                            row.setdefault("score", row["rrf_score"])
                                            row.setdefault("similarity", row["rrf_score"])
                            rag_cache.set(cache_key, results)
                            return results
                        if res.status_code == 404:
                            self.emit_integration_warning(
                                f"⚠️ **RAG**: funkcja `{rpc_name}` nie jest wdrożona w Supabase (404). "
                                f"Stosuję `{fallback_rpc}` — tylko podobieństwo wektorowe."
                            )
                        else:
                            self.emit_integration_warning(
                                f"⚠️ **RAG**: `{rpc_name}` odpowiedział kodem {res.status_code}. "
                                f"Fallback do `{fallback_rpc}`."
                            )
                except Exception as e:
                    logger.warning(
                        "[RETRIEVAL] Hybrid RPC %s/%s wyjątek: %s — fallback do %s",
                        rpc_name_v2,
                        rpc_name,
                        e,
                        fallback_rpc,
                    )
                    self.emit_integration_warning(
                        f"⚠️ **RAG**: błąd wywołania `{rpc_name_v2}` ({str(e)[:200]}). Użyto `{fallback_rpc}`."
                    )
            
            # --- TRYB PURE-VECTOR (FALLBACK / TRADYCYJNY) ---
            payload_pure: Dict[str, Any]
            if table_name == "knowledge_base_legal":
                rpc_name = "match_knowledge_legal"
                payload_pure = {
                    "query_embedding": embedding,
                    "match_threshold": match_threshold,
                    "match_count": match_count,
                }
                if act_terms:
                    payload_pure["act_terms"] = act_terms
            else:
                rpc_name = "match_knowledge_user"
                payload_pure = {
                    "query_embedding": embedding,
                    "match_threshold": match_threshold,
                    "match_count": match_count,
                }

            url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/{rpc_name}"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload_pure, headers=self.headers)
                if res.status_code == 200:
                    results = res.json()
                    rag_cache.set(cache_key, results)
                    return results
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

    async def _fetch_saos_once(self, client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
        url = "https://www.saos.org.pl/api/search/judgments"
        res = await client.get(
            url,
            params={"all": query, "pageSize": limit},
            headers={"Accept": "application/json"},
        )
        if res.status_code != 200:
            raise RuntimeError(f"saos_http_{res.status_code}")
        items = res.json().get("items", []) or []
        results = []
        for item in items:
            if not isinstance(item, dict):
                continue
            text_content = item.get("textContent") or ""
            snippet = _strip_html(text_content) if text_content else ""
            case_number = "N/A"
            court_cases = item.get("courtCases")
            if isinstance(court_cases, list) and court_cases:
                first = court_cases[0]
                if isinstance(first, dict) and first.get("caseNumber"):
                    case_number = str(first["caseNumber"])
            court_name = item.get("courtName") or item.get("division") or "sąd"
            judgment_date = item.get("judgmentDate", "N/A")
            if not snippet:
                snippet = f"Orzeczenie z dnia {judgment_date}, sygn. {case_number}, {court_name}."
            header = f"[{judgment_date} | sygn. {case_number} | {court_name}]"
            results.append({
                "id": item.get("id"),
                "source": f"SAOS — {case_number}",
                "sygnatura": case_number,
                "title": f"Orzeczenie {judgment_date}",
                "content": f"{header}\n{snippet[:2500]}",
                "full_text": f"{header}\n{snippet[:12000]}",
            })
        return results

    async def search_saos(
        self, keywords: Any, limit: int = 3, user_query: Any = "", cache_namespace: str = ""
    ) -> List[Dict[str, Any]]:
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
        merged: List[Dict[str, Any]] = []
        timeout = max(0.2, float(settings.saos_timeout_sec))
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                for q in queries:
                    batch = await asyncio.wait_for(
                        self._fetch_saos_once(client, q, limit),
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

    async def _fetch_eli_once(self, client: httpx.AsyncClient, query: Any, limit: int) -> List[Dict[str, Any]]:
        url = "https://api.sejm.gov.pl/eli/acts/search"
        q = _as_plain_str(query, empty_for_bool=True).strip()
        if not q:
            return []
        res = await client.get(url, params={"limit": limit, "keyword": q})
        if res.status_code != 200:
            raise RuntimeError(f"eli_http_{res.status_code}")
        items = res.json().get("items", []) or []
        results = []
        for item in items:
            if not isinstance(item, dict):
                continue
            title = _eli_field_str(item.get("title")).strip()
            display = _eli_field_str(
                item.get("displayAddress") or item.get("address") or ""
            )
            text_raw = item.get("textHTML")
            body = _strip_html(text_raw)
            if not body and isinstance(item.get("texts"), list) and item["texts"]:
                body = _strip_html(item["texts"][0])
            if not body:
                st_s = _eli_field_str(item.get("status"))
                eli_s = _eli_field_str(item.get("ELI"))
                body = f"Status: {st_s or '—'}. ELI: {eli_s or '—'}"
            header = f"{title}\n({display})"
            results.append({
                "source": f"ELI — {display}",
                "tytul": title or display,
                "title": title,
                "content": f"{header}\n{body[:3000]}",
            })
        return results

    async def search_eli(
        self, keywords: Any, limit: int = 3, user_query: Any = "", cache_namespace: str = ""
    ) -> List[Dict[str, Any]]:
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
            
        merged: List[Dict[str, Any]] = []
        seen: set = set()
        
        try:
            for q in queries:
                embedding = await indexing_service.get_embedding(q)
                rpc_name = "match_isap_documents"
                payload = {
                    "query_embedding": embedding,
                    "match_threshold": 0.5,
                    "match_count": limit
                }
                
                url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/{rpc_name}"
                async with httpx.AsyncClient(timeout=15.0) as client:
                    res = await client.post(url, json=payload, headers=self.headers)
                    if res.status_code == 200:
                        results = res.json()
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
                if len(merged) >= limit:
                    break
                    
            logger.info("[ELI PgVector] queries=%s -> %s aktów", queries, len(merged))
            out = merged[:limit]
            rag_cache.set(cache_key, out)
            return out
        except Exception as e:
            logger.error("[ELI PgVector ERR] %s", e)
            self.emit_integration_warning(f"⚠️ **ELI (ISAP)**: błąd zapytania do lokalnej bazy pgvector ({str(e)[:200]}).")
            return []

# Singleton
retrieval_service = RetrievalService()
