import time
import asyncio
import httpx
from typing import Optional, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from moa.http_client import get_shared_openai_client
from moa.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    MODELS_LIST,
    PRESETS_LIST,
    EXCLUDED_MODELS_KEYWORDS,
    is_vision_model,
    OPENROUTER_HEADERS,
    get_available_models_for_user,
    get_models_with_latency_check,
    classify_model,
    save_admin_models,
    get_user_profile_models,
    save_user_profile_models,
)
import os

router = APIRouter()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_MODELS_CACHE: dict = {"data": [], "timestamp": 0.0}
GOOGLE_MODELS_CACHE_TTL = 1800
GOOGLE_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


@router.get("/ping")
async def check_model_health_endpoint(model_id: str):
    """Szybki test jednego modelu."""
    # Najpierw sprawdź czy mamy klucz API
    from moa.config import OPENROUTER_API_KEY

    if not OPENROUTER_API_KEY:
        return {
            "status": "no_api_key",
            "error": "OpenRouter API key not configured",
            "id": model_id,
        }

    try:
        client = get_shared_openai_client()
        start_time = time.time()
        # Używamy minimalnych tokenów i krótkiego timeoutu dla pingu
        await client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": "p"}],
            max_tokens=1,
            timeout=8.0,  # Szybszy timeout dla UI
        )
        latency = (time.time() - start_time) * 1000
        return {"status": "online", "latency_ms": round(latency), "id": model_id}
    except Exception as e:
        error_str = str(e).lower()
        if "402" in error_str or "insufficient credits" in error_str:
            return {
                "status": "requires_payment",
                "error": "Model requires payment/credits",
                "id": model_id,
            }
        elif "429" in error_str or "rate limit" in error_str:
            return {"status": "rate_limited", "error": "Rate limited", "id": model_id}
        else:
            return {"status": "offline", "error": str(e), "id": model_id}


class BulkPingRequest(BaseModel):
    model_ids: list[str]


@router.post("/ping-bulk")
async def check_models_health_bulk(req: BulkPingRequest):
    """Testuje grupę modeli równolegle."""
    # Najpierw sprawdź czy mamy klucz API
    from moa.config import OPENROUTER_API_KEY

    if not OPENROUTER_API_KEY:
        return [
            {
                "id": mid,
                "status": "no_api_key",
                "error": "OpenRouter API key not configured",
            }
            for mid in req.model_ids
        ]

    async def ping_one(mid: str):
        try:
            client = get_shared_openai_client()
            start_time = time.time()
            await client.chat.completions.create(
                model=mid,
                messages=[{"role": "user", "content": "p"}],
                max_tokens=1,
                timeout=12.0,
            )
            lat = (time.time() - start_time) * 1000
            return {"id": mid, "status": "online", "latency_ms": round(lat)}
        except Exception as e:
            error_str = str(e).lower()
            if "402" in error_str or "insufficient credits" in error_str:
                return {
                    "id": mid,
                    "status": "requires_payment",
                    "error": "Model requires payment/credits",
                }
            elif "429" in error_str or "rate limit" in error_str:
                return {"id": mid, "status": "rate_limited", "error": "Rate limited"}
            else:
                return {"id": mid, "status": "offline", "error": str(e)}

    # Uruchamiamy wszystkie pingi na raz
    tasks = [ping_one(mid) for mid in req.model_ids]
    results = await asyncio.gather(*tasks)
    return results


@router.get("/google")
async def get_google_models():
    if not GOOGLE_API_KEY:
        return []
    now = time.time()
    if GOOGLE_MODELS_CACHE["data"] and (
        now - GOOGLE_MODELS_CACHE["timestamp"] < GOOGLE_MODELS_CACHE_TTL
    ):
        return GOOGLE_MODELS_CACHE["data"]
    try:
        async with httpx.AsyncClient() as client:
            url = f"{GOOGLE_API_BASE}/models?key={GOOGLE_API_KEY}"
            res = await client.get(url)
            res.raise_for_status()
            data = res.json()
            models = []
            for m in data.get("models", []):
                name = m.get("name", "")
                if "gemini" in name.lower():
                    short_id = name.replace("models/", "")
                    if not short_id:
                        continue  # Zabezpieczenie przed pustym kluczem w React
                    models.append(
                        {
                            "id": short_id,
                            "name": m.get("displayName", short_id),
                            "vision": any(
                                kw in name.lower() for kw in ["flash", "pro", "vision"]
                            ),
                            "free": False,
                            "provider": "google",
                        }
                    )
            GOOGLE_MODELS_CACHE["data"] = models
            GOOGLE_MODELS_CACHE["timestamp"] = now
            return models
    except Exception:
        return []


import json

CACHE_FILE = "models_cache.json"


def load_persistent_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                cached = json.load(f)
                return cached.get("data", []), cached.get("timestamp", 0.0)
        except:
            return [], 0.0
    return [], 0.0


def save_persistent_cache(data, timestamp):
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump({"data": data, "timestamp": timestamp}, f)
    except:
        pass


# Initial load from disk
_init_data, _init_ts = load_persistent_cache()
OPENROUTER_MODELS_CACHE: dict = {"data": _init_data, "timestamp": _init_ts}
OPENROUTER_MODELS_CACHE_TTL = 3600 * 24  # 24 hours persistent cache for stability


@router.get("")
@router.get("/")
@router.get("/all")
async def get_all_models(provider: str = "openrouter"):
    if provider == "google":
        return await get_google_models()
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=401, detail="OpenRouter API Key is missing")
    now = time.time()

    # Use cache if available and not expired
    if OPENROUTER_MODELS_CACHE["data"] and (
        now - OPENROUTER_MODELS_CACHE["timestamp"] < OPENROUTER_MODELS_CACHE_TTL
    ):
        return OPENROUTER_MODELS_CACHE["data"]

    try:
        headers = {
            **OPENROUTER_HEADERS,
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        }
        async with httpx.AsyncClient(follow_redirects=True) as client:
            res = await client.get(
                f"{OPENROUTER_BASE_URL}/models", headers=headers, timeout=5.0
            )
            res.raise_for_status()
            raw_models = res.json().get("data", [])
            if not raw_models:
                return MODELS_LIST

        useful = []
        for m in raw_models:
            # Używamy centralnej klasyfikacji z config.py
            classification = classify_model(m)
            if not classification:
                continue

            # Dodaj pełne metadane
            classification["description"] = m.get("description", "")
            classification["context_length"] = m.get("context_length")
            classification["architecture"] = m.get("architecture", {})
            classification["pricing"] = m.get("pricing", {})
            classification["supported_parameters"] = m.get("supported_parameters", [])

            # Extract architecture info for filtering
            architecture = m.get("architecture", {})
            classification["input_modalities"] = architecture.get(
                "input_modalities", []
            )
            classification["output_modalities"] = architecture.get(
                "output_modalities", []
            )

            # Flaga źródła (OpenRouter)
            classification["api_source"] = "openrouter"

            useful.append(classification)

        OPENROUTER_MODELS_CACHE["data"] = useful
        OPENROUTER_MODELS_CACHE["timestamp"] = now
        save_persistent_cache(useful, now)  # Persist to disk
        return useful
    except Exception as e:
        print(f"[ERROR] Failed to fetch models: {e}")
        return MODELS_LIST


@router.get("/presets")
async def get_presets():
    return PRESETS_LIST


class CustomModelsRequest(BaseModel):
    api_key: str
    provider: str  # 'openrouter', 'google', 'openai'


@router.post("/fetch-custom")
async def fetch_custom_models(req: CustomModelsRequest):
    """Pobiera listę modeli dostępnych dla konkretnego klucza API użytkownika."""
    now = time.time()
    try:
        if req.provider == "openrouter":
            headers = {
                "Authorization": f"Bearer {req.api_key}",
                "HTTP-Referer": "http://127.0.0.1:8003",
                "X-Title": "LexMind AI",
            }
            async with httpx.AsyncClient(follow_redirects=True) as client:
                res = await client.get(
                    f"{OPENROUTER_BASE_URL}/models", headers=headers, timeout=20.0
                )
                res.raise_for_status()
                raw_models = res.json().get("data", [])

        useful = []
        for m in raw_models:
            mid = m.get("id", "")
            if not mid or any(kw in mid.lower() for kw in EXCLUDED_MODELS_KEYWORDS):
                continue

            # Extract architecture info
            architecture = m.get("architecture", {})
            input_modalities = architecture.get("input_modalities", [])
            output_modalities = architecture.get("output_modalities", [])

            useful.append(
                {
                    "id": mid,
                    "name": m.get("name", mid),
                    "vision": "image" in input_modalities or is_vision_model(mid),
                    "free": ":free" in mid.lower(),
                    "provider": mid.split("/")[0] if "/" in mid else "other",
                    "supported_parameters": m.get("supported_parameters", []),
                    "input_modalities": input_modalities,
                    "output_modalities": output_modalities,
                    "context_length": m.get("context_length"),
                    "description": m.get("description", ""),
                }
            )

        OPENROUTER_MODELS_CACHE["data"] = useful
        OPENROUTER_MODELS_CACHE["timestamp"] = now
        save_persistent_cache(useful, now)  # Persist to disk
        return useful
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Błąd pobierania modeli: {str(e)}")


async def _check_models_status(models: list[dict]) -> list[dict]:
    """Sprawdź status dostępności i latency dla listy modeli (pierwsze 3 z każdego provider'a)."""
    if not models:
        return models

    # Grupuj po provider'ach i sprawdź tylko pierwsze 3 modele z każdego
    grouped = _group_models_by_provider(models)
    models_to_check = []

    for provider_models in grouped.values():
        # Weź pierwsze 3 modele z każdego provider'a
        models_to_check.extend(provider_models[:3])

    print(
        f"[STATUS] Checking {len(models_to_check)} sample models from {len(grouped)} providers"
    )

    # Sprawdź status w partiach po 10 modeli (mniejszy batch dla lepszej wydajności)
    batch_size = 10
    status_map = {}

    for i in range(0, len(models_to_check), batch_size):
        batch = models_to_check[i : i + batch_size]
        model_ids = [m["id"] for m in batch]

        try:
            ping_results = await check_models_health_bulk(
                BulkPingRequest(model_ids=model_ids)
            )
            for r in ping_results:
                status_map[r["id"]] = {
                    "status": r["status"],
                    "latency_ms": r.get("latency_ms", None),
                }

        except Exception as e:
            print(f"[STATUS CHECK ERR] Batch {i // batch_size + 1}: {e}")

        # Krótsza przerwa między partiami
        if i + batch_size < len(models_to_check):
            await asyncio.sleep(0.05)

    # Ustaw statusy dla wszystkich modeli (na podstawie próbek)
    updated_models = []
    for model in models:
        model_id = model["id"]
        if model_id in status_map:
            model["status"] = status_map[model_id]["status"]
            model["latency_ms"] = status_map[model_id]["latency_ms"]
        else:
            # Dla modeli których nie sprawdziliśmy, ustaw "unchecked"
            model["status"] = "unchecked"
            model["latency_ms"] = None
        updated_models.append(model)

    return updated_models


def _group_models_by_provider(models: list[dict]) -> dict[str, list[dict]]:
    """Grupuje modele po rzeczywistym provider'ze."""
    grouped = {}
    for model in models:
        provider = model.get("provider", "unknown")
        if provider not in grouped:
            grouped[provider] = []
        grouped[provider].append(model)
    return grouped


def _filter_models(
    models: list[dict],
    output_modalities: str = "text",
    supported_parameters: Optional[str] = None,
    provider_filter: Optional[str] = None,
    vision_only: bool = False,
    free_only: bool = False,
) -> list[dict]:
    """Filtruje modele według zadanych kryteriów."""
    filtered = models.copy()

    # Filter by output modalities
    if output_modalities != "all":
        modalities_list = [m.strip() for m in output_modalities.split(",")]
        before_count = len(filtered)
        filtered = [
            m
            for m in filtered
            if any(mod in m.get("output_modalities", []) for mod in modalities_list)
        ]

    # Filter by supported parameters
    if supported_parameters:
        params_list = [p.strip() for p in supported_parameters.split(",")]
        before_count = len(filtered)
        filtered = [
            m
            for m in filtered
            if any(param in m.get("supported_parameters", []) for param in params_list)
        ]

    # Filter by provider
    if provider_filter:
        providers_list = [p.strip() for p in provider_filter.split(",")]
        before_count = len(filtered)
        filtered = [
            m
            for m in filtered
            if m.get("provider", "").lower() in [p.lower() for p in providers_list]
        ]

    # Filter vision-only models
    if vision_only:
        before_count = len(filtered)
        filtered = [m for m in filtered if m.get("vision", False)]

    # Filter free-only models
    if free_only:
        before_count = len(filtered)
        filtered = [m for m in filtered if m.get("free", False)]

    return filtered


@router.get("/admin")
async def get_admin_models_endpoint(
    output_modalities: str = "text",
    supported_parameters: Optional[str] = None,
    provider_filter: Optional[str] = None,
    vision_only: bool = False,
    free_only: bool = False,
):
    """Zwraca płaską listę wszystkich modeli dla admina (zgodną z frontendem)."""
    try:
        # Pobierz wszystkie dostępne modele
        openrouter_models = await get_all_models(provider="openrouter")
        google_models = await get_google_models()

        # Zapewnij api_source dla modeli Google
        for m in google_models:
            m["api_source"] = "google_native"

        all_models = openrouter_models + google_models

        # Zastosuj filtry
        filtered_models = _filter_models(
            all_models,
            output_modalities=output_modalities,
            supported_parameters=supported_parameters,
            provider_filter=provider_filter,
            vision_only=vision_only,
            free_only=free_only,
        )

        # Sprawdź status dla modeli
        print(f"[ADMIN] Pobieranie statusów dla {len(filtered_models)} modeli...")
        models_with_status = await _check_models_status(filtered_models)

        return models_with_status

    except Exception as e:
        print(f"[ADMIN MODELS ERR] {e}")
        return []


@router.get("/filtered")
async def get_filtered_models(
    output_modalities: str = "text",
    supported_parameters: Optional[str] = None,
    provider_filter: Optional[str] = None,
    vision_only: bool = False,
    free_only: bool = False,
    limit: int = 100,
):
    """Zwraca filtrowaną listę modeli bez segregacji po provider'ach."""
    try:
        # Pobierz wszystkie dostępne modele
        openrouter_models = await get_all_models(provider="openrouter")
        google_models = await get_google_models()

        all_models = openrouter_models + google_models

        # Zastosuj filtry
        filtered_models = _filter_models(
            all_models,
            output_modalities=output_modalities,
            supported_parameters=supported_parameters,
            provider_filter=provider_filter,
            vision_only=vision_only,
            free_only=free_only,
        )

        # Ogranicz liczbę wyników
        filtered_models = filtered_models[:limit]

        # Sprawdź status dla modeli
        models_with_status = await _check_models_status(filtered_models)

        return {
            "count": len(models_with_status),
            "models": models_with_status,
            "filters_applied": {
                "output_modalities": output_modalities,
                "supported_parameters": supported_parameters,
                "provider_filter": provider_filter,
                "vision_only": vision_only,
                "free_only": free_only,
                "limit": limit,
            },
        }

    except Exception as e:
        print(f"[FILTERED MODELS ERR] {e}")
        return {"count": 0, "models": [], "filters_applied": {}}


# ---------------------------------------------------------------------------
# Admin Model Management
# ---------------------------------------------------------------------------


class AdminModelSelection(BaseModel):
    selected_model_ids: list[str]


@router.get("/admin/selected")
async def get_admin_selected_models():
    """Get models currently selected by admin for users."""
    from moa.config import get_admin_models as get_admin_models_config

    admin_models = get_admin_models_config()  # Use config function, not router function
    return {"selected_models": admin_models}


async def _validate_admin_models(model_ids: list[str]) -> list[dict]:
    """Validate selected models against available models from all providers."""
    # Get all available models from the admin endpoint
    all_available_models = await get_admin_models_endpoint()

    valid_models = []

    valid_models = []
    for model_id in model_ids:
        model = next((m for m in all_available_models if m.get("id") == model_id), None)
        if model:
            valid_models.append(model)

    return valid_models


@router.post("/admin/select")
async def set_admin_selected_models(req: AdminModelSelection):
    """Admin selects models available for users."""
    # Validate that selected models exist in available models
    valid_models = await _validate_admin_models(req.selected_model_ids)

    success = save_admin_models(valid_models)
    if success:
        return {"success": True, "selected_count": len(valid_models)}
    else:
        raise HTTPException(status_code=500, detail="Failed to save admin selection")


# ---------------------------------------------------------------------------
# User Profile Model Management
# ---------------------------------------------------------------------------


class UserModelSelection(BaseModel):
    selected_model_ids: list[str]
    user_id: str = "default"


@router.get("/profile/available")
async def get_available_models_for_profile(user_id: str = "default"):
    """Get models available for user (admin-selected)."""
    available_models = get_available_models_for_user(user_id)
    return {"available_models": available_models}


@router.get("/profile/selected")
async def get_user_selected_models(user_id: str = "default"):
    """Get models selected by user in their profile."""
    user_models = get_user_profile_models(user_id)
    return {"selected_models": user_models}


@router.post("/profile/select")
async def set_user_selected_models(req: UserModelSelection):
    """User selects models from available ones."""
    # Validate that selected models are in admin-approved list
    available_models = get_available_models_for_user(req.user_id)
    available_ids = {m.get("id") for m in available_models}

    valid_selected = []
    for model_id in req.selected_model_ids:
        if model_id in available_ids:
            model = next((m for m in available_models if m.get("id") == model_id), None)
            if model:
                valid_selected.append(model)

    success = save_user_profile_models(req.user_id, valid_selected)
    if success:
        return {"success": True, "selected_count": len(valid_selected)}
    else:
        raise HTTPException(status_code=500, detail="Failed to save user selection")


# ---------------------------------------------------------------------------
# Chat Model Selection (with latency check)
# ---------------------------------------------------------------------------


class ChatModelRequest(BaseModel):
    user_id: str = "default"
    model_latencies: Optional[Dict[str, float]] = None


@router.post("/chat/available")
async def get_chat_available_models(req: ChatModelRequest):
    """Get user-selected models sorted by speed and availability for chat."""
    user_models = get_user_profile_models(req.user_id)

    if not user_models:
        # Fallback to admin models if user hasn't selected any
        from moa.config import get_admin_models as get_admin_models_config

        user_models = get_admin_models_config()

    # Apply latency check and sorting
    sorted_models = get_models_with_latency_check(user_models, req.model_latencies)

    return {"available_models": sorted_models}
