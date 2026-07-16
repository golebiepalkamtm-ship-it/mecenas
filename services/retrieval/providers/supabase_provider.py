from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


@dataclass(frozen=True)
class HybridRpcNames:
    preferred_rpc: str
    legacy_rpc: str
    vector_fallback_rpc: str


def resolve_hybrid_rpc_names(table_name: str) -> HybridRpcNames:
    if table_name == "knowledge_base_legal":
        return HybridRpcNames(
            preferred_rpc="hybrid_search_legal_v2",
            legacy_rpc="hybrid_search_legal",
            vector_fallback_rpc="match_knowledge_legal",
        )
    return HybridRpcNames(
        preferred_rpc="hybrid_search_user_v2",
        legacy_rpc="hybrid_search_user",
        vector_fallback_rpc="match_knowledge_user",
    )


def build_rpc_url(supabase_url: str, rpc_name: str) -> str:
    return f"{supabase_url.rstrip('/')}/rest/v1/rpc/{rpc_name}"


def build_hybrid_payload(
    *,
    query: str,
    embedding: list[float],
    match_count: int,
    table_name: str,
    act_terms: list[str] | None = None,
    allowed_source_types: list[str] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "query_text": query,
        "query_embedding": embedding,
        "match_count": match_count,
        "vector_weight": 0.45,
        "k_rrf": 60,
    }
    if act_terms:
        payload["act_terms"] = act_terms
    if allowed_source_types and table_name == "knowledge_base_legal":
        payload["allowed_source_types"] = allowed_source_types
    return payload


def build_vector_payload(
    *,
    embedding: list[float],
    match_threshold: float,
    match_count: int,
    table_name: str,
    act_terms: list[str] | None = None,
) -> tuple[str, dict[str, Any]]:
    rpc_names = resolve_hybrid_rpc_names(table_name)
    payload: dict[str, Any] = {
        "query_embedding": embedding,
        "match_threshold": match_threshold,
        "match_count": match_count,
    }
    if act_terms and table_name == "knowledge_base_legal":
        payload["act_terms"] = act_terms
    return rpc_names.vector_fallback_rpc, payload


def relax_hybrid_payload(
    payload: dict[str, Any],
    *,
    drop_allowed_source_types: bool = False,
    drop_act_terms: bool = False,
) -> dict[str, Any]:
    relaxed = dict(payload)
    if drop_allowed_source_types:
        relaxed.pop("allowed_source_types", None)
    if drop_act_terms:
        relaxed.pop("act_terms", None)
        # Retry bez ograniczenia aktu powinien też zdjąć filtr źródeł,
        # żeby wrócić do możliwie szerokiego zapytania.
        relaxed.pop("allowed_source_types", None)
    return relaxed


async def post_rpc_json(
    client: httpx.AsyncClient,
    *,
    supabase_url: str,
    rpc_name: str,
    payload: dict[str, Any],
    headers: dict[str, str],
) -> httpx.Response:
    url = build_rpc_url(supabase_url, rpc_name)
    return await client.post(url, json=payload, headers=headers)


def normalize_hybrid_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    for row in rows:
        if isinstance(row, dict) and row.get("rrf_score") is not None:
            row.setdefault("score", row["rrf_score"])
            row.setdefault("similarity", row["rrf_score"])
    return rows


async def fetch_hybrid_rows_with_relaxation(
    client: httpx.AsyncClient,
    *,
    supabase_url: str,
    rpc_name: str,
    payload: dict[str, Any],
    headers: dict[str, str],
    retry_without_allowed_source_types: bool = False,
    retry_without_act_terms: bool = False,
) -> tuple[int, list[dict[str, Any]]]:
    response = await post_rpc_json(
        client,
        supabase_url=supabase_url,
        rpc_name=rpc_name,
        payload=payload,
        headers=headers,
    )
    if response.status_code != 200:
        return response.status_code, []

    results = normalize_hybrid_rows(response.json())

    if (
        not results
        and retry_without_allowed_source_types
        and payload.get("allowed_source_types")
    ):
        retry_response = await post_rpc_json(
            client,
            supabase_url=supabase_url,
            rpc_name=rpc_name,
            payload=relax_hybrid_payload(payload, drop_allowed_source_types=True),
            headers=headers,
        )
        if retry_response.status_code == 200:
            results = normalize_hybrid_rows(retry_response.json())

    if not results and retry_without_act_terms and payload.get("act_terms"):
        retry_response = await post_rpc_json(
            client,
            supabase_url=supabase_url,
            rpc_name=rpc_name,
            payload=relax_hybrid_payload(payload, drop_act_terms=True),
            headers=headers,
        )
        if retry_response.status_code == 200:
            results = normalize_hybrid_rows(retry_response.json())

    return response.status_code, results
