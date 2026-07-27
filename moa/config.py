import os

from dotenv import load_dotenv

load_dotenv(override=True)

# Domyślne modele — canonical source: config.py (LEXMIND_*)
try:
    from config import settings as _app_settings

    CONFIG_DEFAULT_MODELS = list(_app_settings.default_models)
    CONFIG_FALLBACK_MODELS = list(_app_settings.fallback_models)
except ImportError:
    CONFIG_DEFAULT_MODELS = []
    CONFIG_FALLBACK_MODELS = []

# API Keys
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Models
DEFAULT_JUDGE_MODEL = "deepseek/deepseek-r1"

# Modele zawsze widoczne w UI (łączone z listą OpenRouter + cache)
CURATED_MODELS = [
    {"id": "deepseek/deepseek-v4-flash", "name": "DeepSeek V4 Flash", "provider": "deepseek"},
    {"id": "qwen/qwen3.7-plus", "name": "Qwen 3.7 Plus", "provider": "qwen"},
    {"id": "z-ai/glm-5.2", "name": "GLM 5.2", "provider": "z-ai"},
    {"id": "google/gemini-3.1-flash-lite", "name": "Gemini 3.1 Flash Lite", "provider": "google"},
    {"id": "openai/gpt-5-mini", "name": "GPT-5 Mini", "provider": "openai"},
    {"id": "deepseek/deepseek-v4-pro", "name": "DeepSeek V4 Pro", "provider": "deepseek"},
]


def is_vision_model(model_id: str) -> bool:
    if not model_id:
        return False
    vision_keywords = [
        "vision",
        "vl",
        "vl-",
        "llava",
        "gemini",
        "gpt-4-vision",
        "claude-3",
        "owl-alpha",
        "mimo",
        "glm",
    ]
    return any(kw in model_id.lower() for kw in vision_keywords)


def _model_list_entry(raw: dict) -> dict:
    mid = raw["id"]
    return {
        **raw,
        "vision": is_vision_model(mid),
        "free": ":free" in mid.lower(),
    }


MODELS_LIST = [
    *[_model_list_entry(m) for m in CURATED_MODELS]
]


def merge_curated_models(models: list) -> list:
    """Dopina CURATED_MODELS do listy z OpenRouter (bez duplikatów id)."""
    by_id = {m.get("id"): dict(m) for m in (models or []) if m.get("id")}
    for entry in CURATED_MODELS:
        mid = entry["id"]
        base = {
            "id": mid,
            "name": entry.get("name") or mid.split("/")[-1],
            "provider": entry.get("provider")
            or (mid.split("/")[0] if "/" in mid else "other"),
            "vision": is_vision_model(mid),
            "free": ":free" in mid.lower(),
            "api_source": "curated",
        }
        if mid in by_id:
            if entry.get("name"):
                by_id[mid]["name"] = entry["name"]
        else:
            by_id[mid] = base
    return list(by_id.values())


EXCLUDED_MODELS_KEYWORDS = [
    "extended"
]  # Usunięto "vision", aby odblokować zaawansowane modele OCR/Vision z OpenRouter!

PRESETS_LIST = [
    {
        "id": "legal-war-machine",
        "name": "Legal War Machine - Premium",
        "description": "Najwyższa precyzja i głębokie rozumowanie: DeepSeek V4 Pro jako sędzia reasoning, Qwen 3.7 Plus do pism procesowych, GLM 5.2 do wizyjnego OCR.",
        "icon": "shield-check",
        "color": "#9b5de5",
        "judge": "deepseek/deepseek-v4-pro",
        "judge_model": "deepseek/deepseek-v4-pro",
        "vision_model": "z-ai/glm-5.2",
        "draft_model": "qwen/qwen3.7-plus",
        "models": [
            "deepseek/deepseek-v4-pro",
            "qwen/qwen3.7-plus",
            "z-ai/glm-5.2",
        ],
    },
    {
        "id": "lexmind-speed",
        "name": "LexMind - Ekonomiczny",
        "description": "Zoptymalizowany pod kątem szybkości i minimalnych kosztów: GPT-5 Mini oraz Gemini 3.1 Flash Lite.",
        "icon": "zap",
        "color": "#00f5d4",
        "judge": "openai/gpt-5-mini",
        "judge_model": "openai/gpt-5-mini",
        "vision_model": "google/gemini-3.1-flash-lite",
        "draft_model": "openai/gpt-5-mini",
        "models": ["openai/gpt-5-mini", "google/gemini-3.1-flash-lite"],
    },
]


# Clients
def get_async_client():
    from openai import AsyncOpenAI

    return AsyncOpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE_URL)


# Headers
OPENROUTER_HEADERS = {
    "HTTP-Referer": "http://localhost:8000",
    "X-Title": "LexMind AI V2",
}


# Helper functions connected to DB settings
def get_available_models_for_user(user_id: str = "default"):
    """Pobiera listę modeli zatwierdzonych przez administratora (dostępnych dla użytkownika)."""
    admin_selected = get_admin_models()
    from routes.models import OPENROUTER_MODELS_CACHE, load_persistent_cache

    cache_data = OPENROUTER_MODELS_CACHE.get("data", [])
    if not cache_data:
        cache_data, _ = load_persistent_cache()

    if admin_selected:
        return [m for m in cache_data if m.get("id") in admin_selected]

    # Jeśli admin nie wybrał żadnych modeli, użytkownicy nie widzą żadnych modeli
    return []


def get_models_with_latency_check(models, latencies):
    """Mapuje identyfikatory modeli na pełne słowniki i opcjonalnie sortuje wg opóźnień."""
    from routes.models import OPENROUTER_MODELS_CACHE, load_persistent_cache

    cache_data = OPENROUTER_MODELS_CACHE.get("data", [])
    if not cache_data:
        cache_data, _ = load_persistent_cache()

    resolved = []
    for m in models:
        if isinstance(m, str):
            found = next((x for x in cache_data if x.get("id") == m), None)
            if found:
                resolved.append(found.copy())
            else:
                resolved.append(
                    {
                        "id": m,
                        "name": m.split("/")[-1].replace("-", " ").title(),
                        "provider": m.split("/")[0] if "/" in m else "other",
                        "vision": "vision" in m.lower(),
                        "free": ":free" in m.lower(),
                    }
                )
        else:
            resolved.append(m)

    if latencies:
        resolved.sort(key=lambda x: latencies.get(x.get("id"), 9999.0))
    return resolved


def classify_model(m):
    return {"id": m.get("id"), "name": m.get("name"), "provider": m.get("provider")}


def save_admin_models(models):
    import json

    from database import set_setting

    try:
        model_ids = [m.get("id") if isinstance(m, dict) else m for m in models]
        set_setting("admin_enabled_models", json.dumps(model_ids))
        return True
    except Exception as e:
        print(f"[config] Error saving admin models: {e}")
        return False


def get_user_profile_models(user_id: str = "default"):
    """Pobiera modele wybrane przez użytkownika w jego profilu."""
    import json

    from database import get_setting

    try:
        val = get_setting(f"user_models_{user_id}", "")
        if val:
            user_selected = json.loads(val)
            available = get_available_models_for_user(user_id)
            return [m for m in available if m.get("id") in user_selected]
    except Exception as e:
        print(f"[config] Error reading user models: {e}")

    return get_available_models_for_user(user_id)


def save_user_profile_models(user_id: str, models: list) -> bool:
    """Zapisuje wybrane przez użytkownika modele w bazie."""
    import json

    from database import set_setting

    try:
        model_ids = [m.get("id") if isinstance(m, dict) else m for m in models]
        set_setting(f"user_models_{user_id}", json.dumps(model_ids))
        return True
    except Exception as e:
        print(f"[config] Error saving user models: {e}")
        return False


def get_admin_models():
    """Pobiera listę ID modeli wybranych przez administratora."""
    import json

    from database import get_setting

    try:
        val = get_setting("admin_enabled_models", "")
        if val:
            parsed = json.loads(val)
            return [m.get("id") if isinstance(m, dict) else m for m in parsed]
    except Exception as e:
        print(f"[config] Error reading admin models: {e}")
    return list(CONFIG_DEFAULT_MODELS) if CONFIG_DEFAULT_MODELS else []
