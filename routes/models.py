import time
import httpx
from fastapi import APIRouter, HTTPException
from moa.http_client import get_shared_openai_client
from moa.config import (
    OPENROUTER_API_KEY, OPENROUTER_BASE_URL, MODELS_LIST, PRESETS_LIST, 
    EXCLUDED_MODELS_KEYWORDS, is_vision_model, OPENROUTER_HEADERS
)
import os

router = APIRouter()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_MODELS_CACHE: dict = {"data": [], "timestamp": 0.0}
GOOGLE_MODELS_CACHE_TTL = 1800
GOOGLE_API_BASE = "https://generativelanguage.googleapis.com/v1beta"

@router.get("/ping")
async def check_model_health_endpoint(model_id: str):
    try:
        client = get_shared_openai_client()
        start_time = time.time()
        await client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
            timeout=15.0
        )
        latency = (time.time() - start_time) * 1000
        return {"status": "online", "latency_ms": latency, "id": model_id}
    except Exception as e:
        return {"status": "offline", "error": str(e), "id": model_id}

@router.get("/google")
async def get_google_models():
    if not GOOGLE_API_KEY: return []
    now = time.time()
    if GOOGLE_MODELS_CACHE["data"] and (now - GOOGLE_MODELS_CACHE["timestamp"] < GOOGLE_MODELS_CACHE_TTL):
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
                    models.append({
                        "id": short_id, "name": m.get("displayName", short_id),
                        "vision": any(kw in name.lower() for kw in ["flash", "pro", "vision"]),
                        "free": False, "provider": "google"
                    })
            GOOGLE_MODELS_CACHE["data"] = models
            GOOGLE_MODELS_CACHE["timestamp"] = now
            return models
    except Exception: return []

OPENROUTER_MODELS_CACHE: dict = {"data": [], "timestamp": 0.0}
OPENROUTER_MODELS_CACHE_TTL = 1800 # 30 minutes

@router.get("")
@router.get("/")
@router.get("/all")
async def get_all_models(provider: str = "openrouter"):
    if provider == "google": return await get_google_models()
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=401, detail="OpenRouter API Key is missing")
    now = time.time()
    if OPENROUTER_MODELS_CACHE["data"] and (now - OPENROUTER_MODELS_CACHE["timestamp"] < OPENROUTER_MODELS_CACHE_TTL):
        return OPENROUTER_MODELS_CACHE["data"]

    try:
        headers = {**OPENROUTER_HEADERS, "Authorization": f"Bearer {OPENROUTER_API_KEY}"}
        async with httpx.AsyncClient(follow_redirects=True) as client:
            res = await client.get(f"{OPENROUTER_BASE_URL}/models", headers=headers, timeout=45.0)
            res.raise_for_status()
            raw_models = res.json().get("data", [])
            if not raw_models: return MODELS_LIST
        
        useful = []
        for m in raw_models:
            mid = m.get("id", "")
            if any(kw in mid.lower() for kw in EXCLUDED_MODELS_KEYWORDS): continue
            useful.append({
                "id": mid, "name": m.get("name", mid),
                "vision": is_vision_model(mid),
                "free": ":free" in mid.lower(),
                "provider": mid.split("/")[0] if "/" in mid else "other",
            })
        
        OPENROUTER_MODELS_CACHE["data"] = useful
        OPENROUTER_MODELS_CACHE["timestamp"] = now
        return useful
    except Exception as e: 
        print(f"[ERROR] Failed to fetch models: {e}")
        return MODELS_LIST

@router.get("/presets")
async def get_presets():
    return PRESETS_LIST
