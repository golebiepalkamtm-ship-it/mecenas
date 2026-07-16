import asyncio
import json
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.chat_v2 import router as chat_router
from routes.documents import router as documents_router
from routes.health import router as health_router
from schemas.chat_legacy_adapter import LegacyPayloadAdapter
from schemas.chat_request import ChatRequest
from services import document_service as document_service_module
from services import hybrid_search_health as hybrid_search_health_module
from services import retrieval_service as retrieval_service_module
from utils import helpers as helpers_module


def _make_test_app(router, *, prefix: str = "") -> FastAPI:
    app = FastAPI()
    app.include_router(router, prefix=prefix)
    return app


def _parse_sse_payloads(raw_text: str) -> list[object]:
    payloads: list[object] = []
    for line in raw_text.splitlines():
        if not line.startswith("data: "):
            continue
        data = line[6:]
        if data == "[DONE]":
            payloads.append(data)
        else:
            payloads.append(json.loads(data))
    return payloads


def test_chat_endpoint_streams_sse_events(monkeypatch: pytest.MonkeyPatch) -> None:
    app = _make_test_app(chat_router)
    client = TestClient(app)

    async def fake_stream(**kwargs):
        assert kwargs["user_query"] == "Pytanie testowe"
        assert kwargs["session_id"] == "sess-123"
        yield {"type": "metadata", "expert_analyses": [{"role": "analyst"}]}
        yield {"type": "chunk", "text": "Pierwszy fragment. "}
        yield {"type": "chunk", "text": "Drugi fragment."}
        yield {
            "type": "final_metadata",
            "sources": [{"source": "KB"}],
            "expert_analyses": [{"role": "analyst"}],
            "pipeline_latency_ms": 321,
            "confidence_score": 88,
            "claim_scores": [{"claim": "x", "score": 0.7}],
        }

    monkeypatch.setattr(
        "routes.chat_v2.chat_stream_use_case.execute",
        lambda params: fake_stream(
            **{"user_query": params.user_query, "session_id": params.session_id}
        ),
    )
    monkeypatch.setattr(
        "services.observability.log_stage_event",
        lambda *args, **kwargs: None,
    )
    monkeypatch.setattr(
        helpers_module,
        "save_chat_messages",
        lambda **kwargs: True,
    )

    response = client.post(
        "/chat",
        json={
            "message": "Pytanie testowe",
            "sessionId": "sess-123",
            "history": [],
            "use_saos": True,
            "use_eli": True,
            "use_rag_legal": True,
            "use_rag_user": False,
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    payloads = _parse_sse_payloads(response.text)
    event_types = [
        payload["type"] for payload in payloads if isinstance(payload, dict) and "type" in payload
    ]

    assert event_types == ["metadata", "metadata", "chunk", "chunk", "final_metadata"]
    assert payloads[-1] == "[DONE]"

    final_metadata = next(
        payload for payload in payloads if isinstance(payload, dict) and payload.get("type") == "final_metadata"
    )
    assert final_metadata["pipeline_latency_ms"] == 321
    assert final_metadata["confidence_score"] == 88
    assert final_metadata["sources"] == [{"source": "KB"}]


def test_chat_request_accepts_canonical_nested_payload_and_aliases() -> None:
    request = ChatRequest.model_validate(
        {
            "message": "Przeanalizuj sprawę",
            "sessionId": "sess-456",
            "chat_mode": "moa",
            "response_mode": "strategic",
            "side": "defense",
            "current_task": "analysis",
            "prompt_overrides": {
                "architect_prompt": "Architekt",
                "system_role_prompt": "Rola główna",
                "task_prompt": "Zadanie",
                "role_catalog": {"analyst": "Analiza"},
                "expert_role_prompts": {"model-a": "Bądź analitykiem"},
            },
            "moa_options": {
                "selected_models": ["model-a", "model-b"],
                "aggregator_model": "judge-model",
                "expert_roles_map": {"model-a": "analyst"},
            },
        }
    )

    payload = LegacyPayloadAdapter.from_pydantic_model(request)
    resolved = LegacyPayloadAdapter.to_orchestrator_kwargs(payload)

    assert payload.session_id == "sess-456"
    assert payload.chat_mode.value == "moa"
    assert payload.prompt_overrides is not None
    assert payload.prompt_overrides.architect_prompt == "Architekt"
    assert payload.moa_options is not None
    assert payload.moa_options.selected_models == ["model-a", "model-b"]
    assert resolved.aggregator_model == "judge-model"
    assert resolved.expert_roles == {"model-a": "analyst"}
    assert resolved.task_prompt == "Zadanie"


def test_upload_document_extracts_text_and_schedules_indexing(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    app = _make_test_app(documents_router, prefix="/documents")
    client = TestClient(app)
    monkeypatch.chdir(tmp_path)

    indexed_calls: list[dict] = []

    async def fake_index_document_to_supabase(**kwargs):
        indexed_calls.append(kwargs)
        return {"success": True}

    monkeypatch.setattr(
        document_service_module,
        "index_document_to_supabase",
        fake_index_document_to_supabase,
    )

    response = client.post(
        "/documents/upload-document",
        files={"file": ("wezwanie.txt", b"To jest tresc wezwania.", "text/plain")},
        data={"category": "rag_user"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["filename"] == "wezwanie.txt"
    assert body["text_length"] == len("To jest tresc wezwania.")
    assert body["extracted_text"] == "To jest tresc wezwania."

    saved_file = tmp_path / "pdfs" / "wezwanie.txt"
    assert saved_file.exists()
    assert saved_file.read_text(encoding="utf-8") == "To jest tresc wezwania."

    assert len(indexed_calls) == 1
    assert indexed_calls[0]["filename"] == "wezwanie.txt"
    assert indexed_calls[0]["category"] == "rag_user"
    assert indexed_calls[0]["pre_extracted_text"] == "To jest tresc wezwania."


def test_upload_document_endpoint_uses_application_use_case_seam(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = _make_test_app(documents_router, prefix="/documents")
    client = TestClient(app)

    async def fake_execute(*, background_tasks, file, category, source_type, session_id=None):
        assert background_tasks is not None
        assert file.filename == "wezwanie.txt"
        assert category == "rag_user"
        assert source_type is None
        return {
            "success": True,
            "filename": "wezwanie.txt",
            "extracted_text": "Delegacja uploadu działa.",
            "text_length": len("Delegacja uploadu działa."),
            "error": None,
        }

    monkeypatch.setattr(
        "routes.documents.upload_document_use_case.execute",
        fake_execute,
    )

    response = client.post(
        "/documents/upload-document",
        files={"file": ("wezwanie.txt", b"abc", "text/plain")},
        data={"category": "rag_user"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "filename": "wezwanie.txt",
        "extracted_text": "Delegacja uploadu działa.",
        "text_length": len("Delegacja uploadu działa."),
        "error": None,
    }


def test_analyze_document_uses_retrieval_use_case_seam(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = _make_test_app(documents_router, prefix="/documents")
    client = TestClient(app)

    async def fake_search_legal(*, query: str, match_count: int = 5):
        assert query == "Jak ocenić to pismo?"
        assert match_count == 5
        return [
            {
                "content": "Art. 10 k.p.a. - zasada czynnego udziału strony.",
                "metadata": {"filename": "kpa.txt"},
            }
        ]

    class _FakeCompletions:
        async def create(self, **kwargs):
            assert kwargs["messages"][1]["content"].find("Art. 10 k.p.a.") != -1

            class _Message:
                content = "Analiza gotowa."

            class _Choice:
                message = _Message()

            class _Response:
                choices = [_Choice()]

            return _Response()

    class _FakeChat:
        completions = _FakeCompletions()

    class _FakeClient:
        chat = _FakeChat()

    monkeypatch.setattr(
        "application.documents.use_case.legal_retrieval_use_case.search_legal",
        fake_search_legal,
    )
    monkeypatch.setattr(
        "application.documents.use_case.get_async_client",
        lambda: _FakeClient(),
    )

    response = client.post(
        "/documents/analyze-document",
        json={
            "document_text": "Treść analizowanego pisma.",
            "question": "Jak ocenić to pismo?",
            "use_rag": True,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "answer": "Analiza gotowa.",
        "sources": ["kpa.txt"],
        "document_length": len("Treść analizowanego pisma."),
        "context_length": len(
            "\n--- Źródło: kpa.txt ---\nArt. 10 k.p.a. - zasada czynnego udziału strony.\n"
        ),
        "rag_used": True,
    }


def test_analyze_document_endpoint_uses_application_use_case_seam(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = _make_test_app(documents_router, prefix="/documents")
    client = TestClient(app)

    async def fake_execute(request):
        assert request.document_text == "Treść analizowanego pisma."
        assert request.question == "Jak ocenić to pismo?"
        assert request.use_rag is True
        return {
            "success": True,
            "answer": "Delegacja use-case działa.",
            "sources": ["kpa.txt"],
            "document_length": len("Treść analizowanego pisma."),
            "context_length": 77,
            "rag_used": True,
        }

    monkeypatch.setattr(
        "routes.documents.analyze_document_use_case.execute",
        fake_execute,
    )

    response = client.post(
        "/documents/analyze-document",
        json={
            "document_text": "Treść analizowanego pisma.",
            "question": "Jak ocenić to pismo?",
            "use_rag": True,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "answer": "Delegacja use-case działa.",
        "sources": ["kpa.txt"],
        "document_length": len("Treść analizowanego pisma."),
        "context_length": 77,
        "rag_used": True,
    }


def test_draft_document_endpoint_uses_application_use_case_seam(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = _make_test_app(documents_router, prefix="/documents")
    client = TestClient(app)

    async def fake_execute(request):
        assert request.user_instructions == "Przygotuj odpowiedź na pozew."
        assert request.document_type == "pozew"
        assert request.model == "test-model"
        return {"content": "# Gotowy dokument"}

    monkeypatch.setattr(
        "routes.documents.draft_document_use_case.execute",
        fake_execute,
    )

    response = client.post(
        "/documents/draft-document",
        json={
            "user_instructions": "Przygotuj odpowiedź na pozew.",
            "document_type": "pozew",
            "model": "test-model",
            "history": [],
        },
    )

    assert response.status_code == 200
    assert response.json() == {"content": "# Gotowy dokument"}


def test_save_draft_endpoint_uses_application_use_case_seam(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = _make_test_app(documents_router, prefix="/documents")
    client = TestClient(app)

    async def fake_execute(request):
        assert request.document_text == "# Treść pisma"
        assert request.question == "Odpowiedź na pozew"
        return {
            "success": True,
            "filename": "odpowiedz-na-pozew.md",
            "fragments": 1,
        }

    monkeypatch.setattr(
        "routes.documents.save_draft_use_case.execute",
        fake_execute,
    )

    response = client.post(
        "/documents/save-draft",
        json={
            "document_text": "# Treść pisma",
            "question": "Odpowiedź na pozew",
            "use_rag": False,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "filename": "odpowiedz-na-pozew.md",
        "fragments": 1,
    }


def test_index_saved_file_endpoint_uses_application_use_case_seam(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = _make_test_app(documents_router, prefix="/documents")
    client = TestClient(app)

    async def fake_execute(filename: str):
        assert filename == "wezwanie.pdf"
        return {"success": True, "filename": "wezwanie.pdf", "fragments": 4}

    monkeypatch.setattr(
        "routes.documents.index_saved_file_use_case.execute",
        fake_execute,
    )

    response = client.post("/documents/index-saved-file/wezwanie.pdf")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "filename": "wezwanie.pdf",
        "fragments": 4,
    }


def test_hybrid_search_health_returns_stubbed_rpc_state(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = _make_test_app(health_router, prefix="/health")
    client = TestClient(app)

    async def fake_check_hybrid_search_rpc():
        return {
            "ok": True,
            "functions": [{"name": "hybrid_search_legal_v2", "ok": True, "http_status": 200}],
        }

    monkeypatch.setattr(
        hybrid_search_health_module,
        "check_hybrid_search_rpc",
        fake_check_hybrid_search_rpc,
    )
    monkeypatch.setattr(
        "routes.health.check_hybrid_search_rpc",
        fake_check_hybrid_search_rpc,
    )

    response = client.get("/health/hybrid-search")

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "functions": [{"name": "hybrid_search_legal_v2", "ok": True, "http_status": 200}],
    }


def test_search_supabase_falls_back_to_vector_rpc(monkeypatch: pytest.MonkeyPatch) -> None:
    service = retrieval_service_module.RetrievalService()
    retrieval_service_module.rag_cache._store.clear()

    async def fake_embedding(_: str) -> list[float]:
        return [0.1, 0.2, 0.3]

    calls: list[str] = []

    class FakeResponse:
        def __init__(self, status_code: int, payload):
            self.status_code = status_code
            self._payload = payload
            self.text = json.dumps(payload)

        def json(self):
            return self._payload

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, json=None, headers=None):
            calls.append(url)
            if url.endswith("/hybrid_search_legal_v2"):
                return FakeResponse(404, {"error": "missing"})
            if url.endswith("/hybrid_search_legal"):
                return FakeResponse(404, {"error": "missing"})
            if url.endswith("/match_knowledge_legal"):
                return FakeResponse(
                    200,
                    [
                        {
                            "id": "chunk-1",
                            "content": "Wynik fallbacku",
                            "metadata": {"source": "fallback"},
                            "similarity": 0.91,
                        }
                    ],
                )
            raise AssertionError(f"Nieoczekiwany URL: {url}")

    monkeypatch.setattr(
        retrieval_service_module.indexing_service,
        "get_embedding",
        fake_embedding,
    )
    monkeypatch.setattr(
        retrieval_service_module.httpx,
        "AsyncClient",
        FakeAsyncClient,
    )

    results = asyncio.run(
        service.search_supabase(
            query="test KPA",
            table_name="knowledge_base_legal",
            hybrid=True,
            cache_namespace="pytest-fallback",
        )
    )

    assert len(results) == 1
    assert results[0]["id"] == "chunk-1"
    assert results[0]["content"] == "Wynik fallbacku"
    assert results[0]["metadata"] == {"source": "fallback"}
    assert results[0]["similarity"] == 0.91
    assert results[0]["score"] == 0.91
    assert results[0]["source"] == "fallback"
    assert calls[-1].endswith("/match_knowledge_legal")
    warnings = service.consume_integration_warnings()
    assert any("match_knowledge_legal" in warning for warning in warnings)
