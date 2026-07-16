import asyncio

from services.retrieval.providers.supabase_provider import (
    build_hybrid_payload,
    build_vector_payload,
    build_rpc_url,
    fetch_hybrid_rows_with_relaxation,
    normalize_hybrid_rows,
    resolve_hybrid_rpc_names,
)


class _FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class _RecordingClient:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    async def post(self, url, json=None, headers=None):
        self.calls.append({"url": url, "json": json, "headers": headers})
        return self.responses.pop(0)


def test_build_rpc_url_normalizes_trailing_slash() -> None:
    assert (
        build_rpc_url("https://example.supabase.co/", "hybrid_search_legal_v2")
        == "https://example.supabase.co/rest/v1/rpc/hybrid_search_legal_v2"
    )


def test_normalize_hybrid_rows_maps_rrf_score_to_score_and_similarity() -> None:
    rows = [{"id": "row-1", "rrf_score": 0.87}, {"id": "row-2"}]

    normalized = normalize_hybrid_rows(rows)

    assert normalized[0]["score"] == 0.87
    assert normalized[0]["similarity"] == 0.87
    assert "score" not in normalized[1]


def test_build_hybrid_payload_applies_legal_filters_only_for_legal_table() -> None:
    payload = build_hybrid_payload(
        query="test KPA",
        embedding=[0.1, 0.2],
        match_count=4,
        table_name="knowledge_base_legal",
        act_terms=["KPA"],
        allowed_source_types=["code"],
    )
    user_payload = build_hybrid_payload(
        query="test KPA",
        embedding=[0.1, 0.2],
        match_count=4,
        table_name="knowledge_base_user",
        act_terms=["KPA"],
        allowed_source_types=["code"],
    )

    assert payload["allowed_source_types"] == ["code"]
    assert payload["act_terms"] == ["KPA"]
    assert "allowed_source_types" not in user_payload
    assert user_payload["act_terms"] == ["KPA"]


def test_resolve_hybrid_rpc_names_returns_expected_names() -> None:
    legal = resolve_hybrid_rpc_names("knowledge_base_legal")
    user = resolve_hybrid_rpc_names("knowledge_base_user")

    assert legal.preferred_rpc == "hybrid_search_legal_v2"
    assert legal.legacy_rpc == "hybrid_search_legal"
    assert legal.vector_fallback_rpc == "match_knowledge_legal"
    assert user.preferred_rpc == "hybrid_search_user_v2"
    assert user.vector_fallback_rpc == "match_knowledge_user"


def test_build_vector_payload_uses_legal_act_terms_only_for_legal_table() -> None:
    rpc_name, payload = build_vector_payload(
        embedding=[0.1, 0.2],
        match_threshold=0.5,
        match_count=3,
        table_name="knowledge_base_legal",
        act_terms=["KPA"],
    )
    user_rpc_name, user_payload = build_vector_payload(
        embedding=[0.1, 0.2],
        match_threshold=0.5,
        match_count=3,
        table_name="knowledge_base_user",
        act_terms=["KPA"],
    )

    assert rpc_name == "match_knowledge_legal"
    assert payload["act_terms"] == ["KPA"]
    assert user_rpc_name == "match_knowledge_user"
    assert "act_terms" not in user_payload


def test_fetch_hybrid_rows_with_relaxation_retries_in_expected_order() -> None:
    client = _RecordingClient(
        [
            _FakeResponse(200, []),
            _FakeResponse(200, []),
            _FakeResponse(200, [{"id": "row-1", "rrf_score": 0.87}]),
        ]
    )

    status_code, rows = asyncio.run(
        fetch_hybrid_rows_with_relaxation(
            client,
            supabase_url="https://example.supabase.co",
            rpc_name="hybrid_search_legal_v2",
            payload={
                "query_text": "test KPA",
                "query_embedding": [0.1, 0.2],
                "match_count": 5,
                "act_terms": ["KPA"],
                "allowed_source_types": ["code"],
            },
            headers={"apikey": "token"},
            retry_without_allowed_source_types=True,
            retry_without_act_terms=True,
        )
    )

    assert status_code == 200
    assert rows[0]["score"] == 0.87
    assert client.calls[0]["json"]["allowed_source_types"] == ["code"]
    assert "allowed_source_types" not in client.calls[1]["json"]
    assert "act_terms" not in client.calls[2]["json"]
    assert "allowed_source_types" not in client.calls[2]["json"]
