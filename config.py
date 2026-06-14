"""Centralna konfiguracja LexMind — nadpisywanie przez zmienne LEXMIND_* w .env."""
from __future__ import annotations

from typing import Dict, List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="LEXMIND_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    default_models: List[str] = Field(
        default=[
            "google/gemini-2.5-flash",
            "google/gemini-2.5-flash-lite",
            "openai/gpt-4o-mini",
            "openrouter/owl-alpha",
            "z-ai/glm-5.1",
            "xiaomi/mimo-v2-flash",
            "deepseek/deepseek-r1",
        ]
    )
    fallback_models: List[str] = Field(
        default=[
            "google/gemini-2.5-flash",
            "google/gemini-2.5-flash-lite",
            "openai/gpt-4o-mini",
        ]
    )
    deprecated_model_aliases: Dict[str, str] = Field(
        default={
            "anthropic/claude-3.5-sonnet": "google/gemini-2.5-flash",
            "anthropic/claude-3-sonnet": "google/gemini-2.5-flash",
        }
    )

    document_context_chars: int = 200_000
    chunk_size_chars: int = 8_000
    chunk_overlap_chars: int = 400
    chunk_max_count: int = 24
    hallucination_block_min_cites: int = 3
    hallucination_block_min_cites_draft: int = 1
    # strategic: blokuj syntezę przy >= N niezweryfikowanych cytatach
    hallucination_block_min_cites_strategic: int = 3
    hallucination_block_min_cites_advisor: int = 3
    hallucination_block_min_cites_citizen: int = 2
    # off = brak banera w odpowiedzi | warn = tylko metadata potoku | strict = blokada syntezy
    citation_block_mode: str = Field(default="strict")
    citation_trust_expert_debate: bool = Field(default=False)
    citation_trust_legal_kb_act: bool = Field(default=True)

    use_rag_user_in_chat: bool = Field(default=True)
    rag_user_top_k: int = Field(default=4)
    rag_user_top_k_with_document: int = Field(default=16)

    llm_timeout_primary: float = 60.0
    llm_timeout_fallback: float = 90.0
    llm_stream_timeout_primary: float = 45.0
    llm_stream_timeout_fallback: float = 60.0
    llm_retry_attempts: int = 3

    chat_history_max_messages: int = 50
    chat_history_max_chars: int = 100_000

    # Wyniki RAG / SAOS / ELI — cache w pamięci (TTL sekundy; 0 = wyłącz cache)
    rag_cache_ttl_seconds: int = 300
    rag_cache_max_entries: int = 128

    # Vision / OCR (Etap 1 — obrazy dokumentów przez OpenRouter)
    vision_ocr_models: List[str] = Field(
        default=[
            "google/gemini-2.5-flash",
            "google/gemini-2.5-flash-lite",
            "openai/gpt-4o-mini",
            "openrouter/owl-alpha",
        ]
    )
    vision_ocr_max_tokens: int = 16_384
    vision_ocr_max_continuations: int = 5
    vision_ocr_temperature: float = 0.0

    # Legal Investigation v2 — rekurencja, hipotezy, agenci (LEXMIND_FEATURE_INVESTIGATION_V2=true)
    feature_investigation_v2: bool = Field(default=False)
    investigation_max_rounds: int = Field(default=3)
    investigation_max_llm_calls: int = Field(default=24)
    investigation_max_retrieval_calls: int = Field(default=20)
    hypothesis_max_count: int = Field(default=7)
    adversarial_max_rounds: int = Field(default=2)
    dynamic_agent_max: int = Field(default=5)
    feature_multistage_synthesis: bool = Field(default=True)
    synthesis_max_tokens: int = Field(default=12000)
    synthesis_timeout_sec: float = Field(default=180.0)
    synthesis_fast_max_tokens: int = Field(default=6000)
    synthesis_rag_legal_chars: int = Field(default=100_000)
    synthesis_rag_external_chars: int = Field(default=50_000)

    # Debata ekspertów przy trybie single (domyślnie wyłączona — szybsze odpowiedzi)
    debate_on_single: bool = Field(default=False)

    # Automatyczna szybka ścieżka dla krótkich pytań o art./kodeks bez załączników
    feature_fast_statutory_path: bool = Field(default=True)

    # Reranking po retrieval: heuristic | cohere (wymaga COHERE_API_KEY)
    rerank_provider: str = Field(default="heuristic")
    rerank_top_k: int = Field(default=8)
    external_rerank_top_k: int = Field(default=6)

    # Kompresja kontekstu dokumentu dla długich akt
    context_summary_max_chars: int = Field(default=100_000)
    context_packer_doc_fraction: float = Field(default=0.72)
    feature_context_packer: bool = Field(default=True)
    synthesis_document_chars: int = Field(default=200_000)
    # Zwarty arkusz faktów (JSON) z pełnego OCR — mniej tokenów; pełny tekst w sesji/RAG
    feature_compact_fact_sheet: bool = Field(default=True)

    # Investigation — auto dla długich spraw / strategic
    feature_investigation_v2_auto: bool = Field(default=True)
    investigation_auto_min_chars: int = Field(default=15_000)

    # Procedural / timeline / terminy
    feature_procedural_always_on: bool = Field(default=True)
    feature_timeline: bool = Field(default=True)
    feature_deadline_alerts: bool = Field(default=True)

    # Query planner (JSON) zamiast routera 40 tok
    feature_query_planner: bool = Field(default=True)

    # Long-context single pass
    feature_long_context_path: bool = Field(default=True)
    long_context_max_chars: int = Field(default=300_000)
    long_context_model: str = Field(default="google/gemini-2.5-pro")

    # Citation ELI L1 cache TTL (sekundy)
    eli_citation_cache_ttl: int = Field(default=3600)

    feature_inbound_guardrails: bool = Field(default=True)
    feature_outbound_pii_mask: bool = Field(default=True)
    guardrails_block_on_injection: bool = Field(default=True)

    saos_timeout_sec: float = Field(default=0.8)
    eli_timeout_sec: float = Field(default=0.8)
    circuit_breaker_failure_threshold: int = Field(default=3)
    circuit_breaker_open_seconds: float = Field(default=60.0)
    circuit_breaker_half_open_max_calls: int = Field(default=1)

    # Observability — logowanie czasów etapów
    feature_pipeline_timing: bool = Field(default=True)

    # Sala rozprawy (moduł extra)
    trial_enabled: bool = Field(default=True)
    trial_position_max_experts: int = Field(default=7)
    trial_position_expert_max_tokens: int = Field(default=1200)
    trial_position_synthesis_max_tokens: int = Field(default=2500)
    trial_position_parallel: int = Field(default=4)
    trial_max_brief_chars: int = Field(default=50_000)


settings = Settings()

# Jawne typy dla Pylint / mypy (unika E1101: FieldInfo.has no member 'get')
DEFAULT_MODELS: List[str] = list(settings.default_models)
FALLBACK_MODELS: List[str] = list(settings.fallback_models)
DEPRECATED_MODEL_ALIASES: Dict[str, str] = dict(settings.deprecated_model_aliases)
