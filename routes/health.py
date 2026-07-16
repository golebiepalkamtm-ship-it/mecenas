import asyncio
import time

from fastapi import APIRouter

from config import settings
from moa.config import OPENROUTER_API_KEY
from moa.http_client import get_ping_openai_client
from services.health_check import get_openrouter_balance
from services.hybrid_search_health import check_hybrid_search_rpc

router = APIRouter()


@router.get("/balance")
async def get_balance():
    """Zwraca stan środków na koncie OpenRouter."""
    return await get_openrouter_balance()


@router.get("/hybrid-search")
async def get_hybrid_search_health():
    """Sprawdza dostępność RPC hybrid_search_legal / hybrid_search_user w Supabase."""
    return await check_hybrid_search_rpc()


@router.get("/supabase-check")
async def check_supabase_data():
    """Pobiera próbkę danych z tabeli knowledge_base_legal."""
    import httpx
    import os
    SUPABASE_URL = os.getenv("SUPABASE_URL") or ""
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or ""
    headers = {
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "apikey": str(SUPABASE_ANON_KEY)
    }
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{SUPABASE_URL}/rest/v1/knowledge_base_legal?select=id,content,metadata&limit=10", headers=headers)
        return {
            "status": res.status_code,
            "data": res.json() if res.status_code == 200 else res.text
        }



@router.get("/external-retrieval")
async def get_external_retrieval_health():
    """Testuje wyszukiwanie w zewnętrznych systemach SAOS i ELI (z debugowaniem)."""
    import httpx
    from services.retrieval_service import retrieval_service
    
    saos_debug = {}
    try:
        url = "https://www.saos.org.pl/api/search/judgments"
        headers = {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.saos.org.pl/"
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, params={"all": "narkotyki", "pageSize": 10}, headers=headers)
        saos_debug["status"] = res.status_code
        if res.status_code == 200:
            json_data = res.json()
            saos_debug["keys"] = list(json_data.keys())
            saos_debug["items_count"] = len(json_data.get("items", []))
            saos_debug["info"] = json_data.get("info", {})
        else:
            saos_debug["body"] = res.text[:200]
    except Exception as e:
        import traceback
        saos_debug["error"] = str(e) or type(e).__name__
        saos_debug["traceback"] = traceback.format_exc()
        
    eli_results = []
    eli_error = None
    try:
        eli_results = await retrieval_service.search_eli(keywords="Kodeks postępowania karnego", limit=3)
    except Exception as e:
        eli_error = str(e)
        
    return {
        "saos_debug": saos_debug,
        "eli": {
            "ok": len(eli_results) > 0 and eli_error is None,
            "count": len(eli_results),
            "results": [{"source": r.get("source"), "title": r.get("title")} for r in eli_results],
            "error": eli_error
        }
    }


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
