 # ===========================================================================
# MOA Config — Wszystkie stałe i konfiguracja w jednym miejscu
# ===========================================================================
import os
import json
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    from dotenv import load_dotenv  # type: ignore

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
OPENROUTER_BASE_URL: str = os.getenv(
    "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
)
OCR_SPACE_API_KEY: str = os.getenv("OCR_SPACE_API_KEY", "K88317266188957")
SUPABASE_URL: str = os.getenv(
    "SUPABASE_URL", "https://dhyvxspgsktpbjonejek.supabase.co"
)
SUPABASE_ANON_KEY: str = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoeXZ4c3Bnc2t0cGJqb25lamVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwODA3MzYsImV4cCI6MjA4OTY1NjczNn0.jQOwDd9T1b7xBj88EyKuokme2sEHLKm1A_96ed_BCKA",
)
SUPABASE_IMPORT_URL: str = f"{SUPABASE_URL}/functions/v1/import-knowledge"

# Kategorie dokumentów
CAT_RAG_LEGAL = (
    "rag_legal"  # Centralna baza wiedzy (kodeksy, prawo) - tabela knowledge_base_legal
)
CAT_USER_DOCS = "rag_user"  # Zwykłe dokumenty użytkownika (pisma, skany) - tabela knowledge_base_user

# Ścieżki lokalnego zapisu
STORAGE_ROOT = "local_storage"
STORAGE_PATHS = {
    CAT_RAG_LEGAL: f"{STORAGE_ROOT}/knowledge_base_legal",
    CAT_USER_DOCS: f"{STORAGE_ROOT}/chat_attachments",
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
try:
    from openai import AsyncOpenAI  # type: ignore
except ImportError:
    AsyncOpenAI = None


def get_async_client() -> Optional["AsyncOpenAI"]:
    """Unified client factory for OpenRouter LLM calls."""
    if AsyncOpenAI is None:
        print("ERROR: openai package not found. AsyncOpenAI client unavailable.")
        return None
        
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

DEFAULT_COMPLETION_MAX_TOKENS = 10000
FREE_MODEL_MAX_TOKENS = 4096


def is_free_model(model_id: Optional[str]) -> bool:
    lower_id = (model_id or "").lower()
    return (
        ":free" in lower_id
        or lower_id == "openrouter/free"
        or lower_id.endswith("/free")
    )


# Alias dla kompatybilności z uproszczonymi skryptami
is_free = is_free_model


def is_vision_model(model_id: str, architecture: Optional[Dict[str, Any]] = None) -> bool:
    if architecture and "input_modalities" in architecture:
        return "image" in architecture.get("input_modalities", [])
    
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
        
    architecture = model_raw.get("architecture")

    return {
        "id": mid,
        "name": model_raw.get("name", mid),
        "vision": is_vision_model(mid, architecture),
        "free": is_free_model(mid),
        "provider": provider,
    }


def get_safe_max_tokens(
    model_id: Optional[str],
    requested_max_tokens: int = DEFAULT_COMPLETION_MAX_TOKENS,
) -> int:
    """Cap free models to a smaller output budget to avoid provider rejections."""
    if is_free_model(model_id):
        return min(requested_max_tokens, FREE_MODEL_MAX_TOKENS)
    return requested_max_tokens


async def fetch_openrouter_models() -> List[Dict[str, Any]]:
    """Pobierz wszystkie dostępne modele z OpenRouter API."""
    try:
        try:
            import aiohttp  # type: ignore
        except ImportError:
            print("ERROR: aiohttp package not found.")
            return []

        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://openrouter.ai/api/v1/models", headers=OPENROUTER_HEADERS
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("data", [])
                else:
                    print(f"ERROR: Blad API OpenRouter: {response.status}")
                    return []
    except Exception as e:
        print(f"ERROR: Blad pobierania modeli: {e}")
        return []


def update_models_config_from_openrouter(
    models_data: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Zaktualizuj models_config.json na podstawie danych z OpenRouter."""
    filtered_models = []

    for model in models_data:
        model_id = model.get("id", "")
        model_name = model.get("name", model_id)

        # Filtruj modele, przekazując cały obiekt raw_model do lepszej klasyfikacji
        classification = classify_model(model)
        if not classification:
            continue  # Model został odfiltrowany

        # Dodaj ustandaryzowane informacje z API modeli OpenRouter
        classification["description"] = model.get("description", f"Model {model_name}")
        classification["context_length"] = model.get("context_length")
        classification["architecture"] = model.get("architecture", {})
        classification["pricing"] = model.get("pricing", {})
        classification["top_provider"] = model.get("top_provider", {})
        classification["supported_parameters"] = model.get("supported_parameters", [])
        
        # Właściwe rozpoznanie obrazków z modelu wejściowego
        if classification["architecture"] and "input_modalities" in classification["architecture"]:
            classification["vision"] = "image" in classification["architecture"]["input_modalities"]

        # Sformatuj nazwę dla lepszej czytelności
        provider_name = classification["provider"].upper()
        if "/" in model_id:
            short_name = model_id.split("/")[-1]
        else:
            short_name = model_name

        classification["name"] = f"{provider_name}: {short_name}"

        filtered_models.append(classification)

    print(f"SUCCESS: Przefiltrowano {len(filtered_models)} modeli z {len(models_data)}")

    # Zachowaj istniejące presety
    config_path = Path(__file__).parent / "models_config.json"
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            existing_config = json.load(f)
            presets = existing_config.get("presets", [])
    except:
        presets = []

    return {
        "models": filtered_models,
        "presets": presets,
        "last_updated": "2026-04-22T12:00:00Z",  # Można dodać timestamp
        "source": "openrouter_api",
    }


def save_models_config(config: Dict[str, Any]) -> bool:
    """Zapisz konfigurację modeli do pliku JSON."""
    config_path = Path(__file__).parent / "models_config.json"
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        print(
            f"SUCCESS: Zapisano {len(config.get('models', []))} modeli do {config_path}"
        )
        return True
    except Exception as e:
        print(f"ERROR: Blad zapisu: {e}")
        return False


def load_models_config() -> Dict[str, Any]:
    """Wczytuje konfigurację modeli z centralnego pliku JSON."""
    config_path = Path(__file__).parent / "models_config.json"
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"ERROR: Error loading models_config.json: {e}")
        # Powrót do twardych fallbacków w razie awarii pliku
        return {
            "models": [
                {
                    "id": "google/gemini-2.0-flash-001",
                    "name": "Google: Gemini 2.0 Flash",
                }
            ],
            "presets": [],
        }


# Cache config load
MODELS_CONFIG = load_models_config()
MODELS_LIST = MODELS_CONFIG.get("models", [])
PRESETS_LIST = MODELS_CONFIG.get("presets", [])

# ---------------------------------------------------------------------------
# User Profile and Admin Settings
# ---------------------------------------------------------------------------

# File paths for user-specific configurations
USER_CONFIG_PATH = Path(__file__).parent / "user_config.json"
ADMIN_CONFIG_PATH = Path(__file__).parent / "admin_config.json"


def get_admin_models() -> List[Dict[str, Any]]:
    """Get models selected by admin for users."""
    try:
        if ADMIN_CONFIG_PATH.exists():
            with open(ADMIN_CONFIG_PATH, "r", encoding="utf-8") as f:
                admin_config = json.load(f)
                return admin_config.get("selected_models", [])
        return []
    except Exception as e:
        print(f"ERROR: Loading admin config: {e}")
        return []


def save_admin_models(selected_models: List[str]) -> bool:
    """Save admin-selected models for users."""
    try:
        admin_config = {
            "selected_models": selected_models,
            "last_updated": "2026-04-22T12:18:50Z",
        }
        with open(ADMIN_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(admin_config, f, indent=2, ensure_ascii=False)
        print(f"SUCCESS: Saved {len(selected_models)} admin-selected models")
        return True
    except Exception as e:
        print(f"ERROR: Saving admin config: {e}")
        return False


def get_user_profile_models(user_id: str = "default") -> List[Dict[str, Any]]:
    """Get models selected by user in their profile."""
    try:
        if USER_CONFIG_PATH.exists():
            with open(USER_CONFIG_PATH, "r", encoding="utf-8") as f:
                user_config = json.load(f)
                user_profiles = user_config.get("profiles", {})
                return user_profiles.get(user_id, {}).get("selected_models", [])
        return []
    except Exception as e:
        print(f"ERROR: Loading user profile config: {e}")
        return []


def save_user_profile_models(user_id: str, selected_models: List[str]) -> bool:
    """Save user-selected models in their profile."""
    try:
        user_config = {}
        if USER_CONFIG_PATH.exists():
            with open(USER_CONFIG_PATH, "r", encoding="utf-8") as f:
                user_config = json.load(f)

        if "profiles" not in user_config:
            user_config["profiles"] = {}

        user_config["profiles"][user_id] = {
            "selected_models": selected_models,
            "last_updated": "2026-04-22T12:18:50Z",
        }

        with open(USER_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(user_config, f, indent=2, ensure_ascii=False)
        print(f"SUCCESS: Saved {len(selected_models)} models for user {user_id}")
        return True
    except Exception as e:
        print(f"ERROR: Saving user profile config: {e}")
        return False


def get_available_models_for_user(user_id: str = "default") -> List[Dict[str, Any]]:
    """Get models available for user (admin-selected + user-selected)."""
    admin_models = get_admin_models()
    user_models = get_user_profile_models(user_id)

    # Combine admin and user selected models
    available_ids = set()
    available_models = []

    # First add admin-selected models
    for model in admin_models:
        if isinstance(model, dict) and model.get("id"):
            model_id = model["id"]
            if model_id not in available_ids:
                available_models.append(model)
                available_ids.add(model_id)

    # Then add user-selected models (if not already included)
    for model in user_models:
        if isinstance(model, dict) and model.get("id"):
            model_id = model["id"]
            if model_id not in available_ids:
                available_models.append(model)
                available_ids.add(model_id)

    return available_models


def get_models_with_latency_check(
    models: List[Dict[str, Any]], model_latencies: Optional[Dict[str, float]] = None
) -> List[Dict[str, Any]]:
    """Sort models by availability and connection speed (fastest first)."""
    if not model_latencies:
        return models

    # Sort by latency (ascending - fastest first)
    sorted_models = sorted(
        models, key=lambda m: model_latencies.get(m.get("id", ""), float("inf"))
    )

    # Filter out models with no latency data (unavailable)
    available_models = [
        m
        for m in sorted_models
        if model_latencies.get(m.get("id", ""), float("inf")) != float("inf")
    ]

    return available_models


# Cache admin and user configs
ADMIN_SELECTED_MODELS = get_admin_models()
USER_PROFILE_MODELS = get_user_profile_models()

# ---------------------------------------------------------------------------
# Dynamic Model Baselines (PRIORYTET DLA WYBORU UŻYTKOWNIKA)
# ---------------------------------------------------------------------------
DEFAULT_JUDGE_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"
DEFAULT_ANALYST_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "google/gemini-2.5-flash",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "meta-llama/llama-3.1-70b-instruct:free",
    "openrouter/free",
]

FREE_FALLBACK_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemini-2.5-flash",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "meta-llama/llama-3.1-70b-instruct:free",
    "openrouter/free",
]

# ---------------------------------------------------------------------------
# Retrieval defaults
# ---------------------------------------------------------------------------
DEFAULT_MATCH_THRESHOLD = 0.05
DEFAULT_MATCH_COUNT = 30  # ZWIĘKSZONO: Bardziej agresywny retrieval
MAX_CONTEXT_CHARS = (
    200_000  # PROFESJONALNY POZIOM: Mega kontekst dla orzeczeń z Supabase
)
MAX_CONTEXT_TOKENS_ESTIMATE = 50_000

# ---------------------------------------------------------------------------
# Retry / Resilience
# ---------------------------------------------------------------------------
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.0  # sekundy (1 → 2 → 4 z jitter)
RETRY_MAX_DELAY = 15.0
RETRYABLE_STATUS_CODES = {402, 429, 500, 502, 503, 504}  # Dodano 402 do retry

# ---------------------------------------------------------------------------
# LLM defaults
# ---------------------------------------------------------------------------
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))
LLM_TIMEOUT = float(
    os.getenv("LLM_TIMEOUT", "120.0")
)  # 2 min - optymalny czas dla modeli produkcyjnych
GLOBAL_MOA_TIMEOUT = float(
    os.getenv("GLOBAL_MOA_TIMEOUT", "300.0")
)  # 5 min - twardy limit na CAŁY proces MOA
MOA_EARLY_EXIT_TIMEOUT = float(
    os.getenv("MOA_EARLY_EXIT_TIMEOUT", "90.0")
)  # Czas po którym idziemy dalej jeśli mamy >50%

# ---------------------------------------------------------------------------
# Sanity Checks (Bug 22)
# ---------------------------------------------------------------------------
if not OPENROUTER_API_KEY:
    print("\n" + "!" * 80)
    print("CRITICAL ERROR: OPENROUTER_API_KEY is not set.")
    print("LexMind requires an OpenRouter API key to function.")
    print("!" * 80 + "\n")

if not SUPABASE_ANON_KEY:
    print("\n" + "!" * 80)
    print("CRITICAL ERROR: SUPABASE_ANON_KEY is not set.")
    print("LexMind requires a Supabase anon key for knowledge retrieval.")
    print("!" * 80 + "\n")
