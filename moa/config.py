# ===========================================================================
# MOA Config — Wszystkie stałe i konfiguracja w jednym miejscu
# ===========================================================================
import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    from dotenv import load_dotenv

    load_dotenv(override=True)
except ImportError:
    pass

PROJECT_DIR = str(Path(__file__).parent.parent.absolute())

# ---------------------------------------------------------------------------
# Klucze API (z .env)
# ---------------------------------------------------------------------------
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OCR_SPACE_API_KEY: str = os.getenv("OCR_SPACE_API_KEY", "K88317266188957")
SUPABASE_URL: str = os.getenv(
    "SUPABASE_URL", "https://dhyvxspgsktpbjonejek.supabase.co"
)
SUPABASE_ANON_KEY: str = os.getenv(
    "SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoeXZ4c3Bnc2t0cGJqb25lamVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwODA3MzYsImV4cCI6MjA4OTY1NjczNn0.jQOwDd9T1b7xBj88EyKuokme2sEHLKm1A_96ed_BCKA"
)
SUPABASE_IMPORT_URL: str = f"{SUPABASE_URL}/functions/v1/import-knowledge"

# Kategorie dokumentów
CAT_RAG_LEGAL = "rag_legal"      # Centralna baza wiedzy (kodeksy, prawo) - tabela knowledge_base_legal
CAT_USER_DOCS = "rag_user"       # Zwykłe dokumenty użytkownika (pisma, skany) - tabela knowledge_base_user

# Ścieżki lokalnego zapisu
STORAGE_ROOT = "local_storage"
STORAGE_PATHS = {
    CAT_RAG_LEGAL: f"{STORAGE_ROOT}/knowledge_base_legal",
    CAT_USER_DOCS: f"{STORAGE_ROOT}/chat_attachments"
}

# ---------------------------------------------------------------------------
# Embedding Settings (OpenRouter Cloud)
# ---------------------------------------------------------------------------
EMBEDDING_MODEL = "openai/text-embedding-3-small"  # Model przez OpenRouter
EMBEDDING_DIMENSIONS = 1536  # Wymiary zgodne z tabelą w Supabase
OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings"

OPENROUTER_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "HTTP-Referer": "http://127.0.0.1:8003",
    "X-Title": "LexMind AI",
    "Content-Type": "application/json",
}

# ---------------------------------------------------------------------------
# API Client Factory (Deduplication #16)
# ---------------------------------------------------------------------------
from openai import AsyncOpenAI


def get_async_client() -> AsyncOpenAI:
    """Unified client factory for OpenRouter LLM calls."""
    return AsyncOpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
        timeout=LLM_TIMEOUT,
        default_headers={
            "HTTP-Referer": "http://127.0.0.1:8003",
            "X-Title": "LexMind AI",
        },
    )


# ---------------------------------------------------------------------------
# Dynamic Model Configurations
# ---------------------------------------------------------------------------

EXCLUDED_MODELS_KEYWORDS = [
    "whisper",
    "tts",
    "speech",
    "audio-only",
    "image-gen",
    "stable-diffusion",
    "midjourney",
    "dall-e",
]

EXTRACTED_VISION_KEYWORDS = [
    "gpt-4o",
    "gpt-4-vision",
    "gpt-4-turbo",
    "claude-3",
    "claude-3.5",
    "claude-3.7",
    "claude-3-opus",
    "claude-3-sonnet",
    "claude-3-haiku",
    "gemini-pro-vision",
    "gemini-1.5",
    "gemini-2.0",
    "gemini-2.5",
    "gemini-exp",
    "llava",
    "vision",
    "moondream",
    "pixtral",
    "molmo",
    "qwen-vl",
    "internvl",
]


def is_vision_model(model_id: str) -> bool:
    lower_id = model_id.lower()
    return any(kw in lower_id for kw in EXTRACTED_VISION_KEYWORDS)


def classify_model(model_raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Unified classification for OpenRouter and Direct models.
    Central Source of Truth for model filtering and vision detection (Deduplication #13).
    """
    mid = model_raw.get("id", "")
    lower_id = mid.lower()

    # Check if excluded
    if any(kw in lower_id for kw in EXCLUDED_MODELS_KEYWORDS):
        return {}

    provider = "other"
    if "/" in mid:
        provider = mid.split("/")[0]
    elif "gpt" in lower_id:
        provider = "openai"
    elif "claude" in lower_id:
        provider = "anthropic"
    elif "gemini" in lower_id:
        provider = "google"

    return {
        "id": mid,
        "name": model_raw.get("name", mid),
        "vision": is_vision_model(mid),
        "free": ":free" in lower_id,
        "provider": provider,
    }


def load_models_config() -> Dict[str, Any]:
    """Wczytuje konfigurację modeli z centralnego pliku JSON."""
    config_path = Path(__file__).parent / "models_config.json"
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Error loading models_config.json: {e}")
        # Powrót do twardych fallbacków w razie awarii pliku
        return {
            "models": [
                {"id": "google/gemini-2.0-flash-001", "name": "Google: Gemini 2.0 Flash"}
            ],
            "presets": [],
        }


# Cache config load
MODELS_CONFIG = load_models_config()
MODELS_LIST = MODELS_CONFIG.get("models", [])
PRESETS_LIST = MODELS_CONFIG.get("presets", [])

# ---------------------------------------------------------------------------
# Dynamic Model Baselines (Zmień w locie w UI lub models_config.json)
# ---------------------------------------------------------------------------
DEFAULT_JUDGE_MODEL = "anthropic/claude-4.5-sonnet-20250929"  # Top-tier Judge
DEFAULT_ANALYST_MODELS = [
    "anthropic/claude-4.5-sonnet-20250929",  # NextGen Vision & Law
    "openai/gpt-5-2025-08-07",               # NextGen Reasoning
    "google/gemini-3.1-pro-preview-20260219", # Massive Context
    "x-ai/grok-4.1-fast",                    # Hyperfast Logic
]

# ---------------------------------------------------------------------------
# Retrieval defaults
# ---------------------------------------------------------------------------
DEFAULT_MATCH_THRESHOLD = 0.05
DEFAULT_MATCH_COUNT = 30  # ZWIĘKSZONO: Bardziej agresywny retrieval
MAX_CONTEXT_CHARS = 60_000 # PROFESJONALNY POZIOM: Zoptymalizowany pod RAG i sędziego
MAX_CONTEXT_TOKENS_ESTIMATE = 15_000

# ---------------------------------------------------------------------------
# Retry / Resilience
# ---------------------------------------------------------------------------
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.0  # sekundy (1 → 2 → 4 z jitter)
RETRY_MAX_DELAY = 15.0
RETRYABLE_STATUS_CODES = {402, 429, 500, 502, 503, 504} # Dodano 402 do retry

# ---------------------------------------------------------------------------
# LLM defaults
# ---------------------------------------------------------------------------
LLM_TEMPERATURE = 0.1
LLM_TIMEOUT = 120.0  # 2 min - optymalny czas dla modeli produkcyjnych
GLOBAL_MOA_TIMEOUT = 300.0 # 5 min - twardy limit na CAŁY proces MOA

# ---------------------------------------------------------------------------
# Sanity Checks (Bug 22)
# ---------------------------------------------------------------------------
if not OPENROUTER_API_KEY:
    print("\n" + "!" * 80)
    print("❌ CRITICAL ERROR: OPENROUTER_API_KEY is not set.")
    print("LexMind requires an OpenRouter API key to function.")
    print("!" * 80 + "\n")

if not SUPABASE_ANON_KEY:
    print("\n" + "!" * 80)
    print("❌ CRITICAL ERROR: SUPABASE_ANON_KEY is not set.")
    print("LexMind requires a Supabase anon key for knowledge retrieval.")
    print("!" * 80 + "\n")
