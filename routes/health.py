import asyncio
import time

from fastapi import APIRouter
from services.health_check import get_openrouter_balance
from services.hybrid_search_health import check_hybrid_search_rpc
from moa.http_client import get_ping_openai_client
from moa.config import OPENROUTER_API_KEY
from config import settings

router = APIRouter()

@router.get("/balance")
async def get_balance():
    """Zwraca stan środków na koncie OpenRouter."""
    return await get_openrouter_balance()

@router.get("/hybrid-search")
async def get_hybrid_search_health():
    """Sprawdza dostępność RPC hybrid_search_legal / hybrid_search_user w Supabase."""
    return await check_hybrid_search_rpc()

@router.get("/free-models")
async def get_free_models_health():
    if not OPENROUTER_API_KEY:
        return {"success": False, "models": []}

    model_ids = list(settings.fallback_models)
    sem = asyncio.Semaphore(3)

    async def _ping_one(model_id: str) -> dict:
        async with sem:
            try:
                client = get_ping_openai_client(timeout_seconds=8.0)
                start_time = time.perf_counter()
                await client.chat.completions.create(
                    model=model_id,
                    messages=[{"role": "user", "content": "p"}],
                    max_tokens=1,
                    timeout=8.0,
                )
                latency_ms = round((time.perf_counter() - start_time) * 1000)
                return {"id": model_id, "latency_ms": latency_ms}
            except Exception:
                return {"id": model_id, "latency_ms": 9999}

    results = await asyncio.gather(*[_ping_one(mid) for mid in model_ids])
    return {"success": True, "models": results}
