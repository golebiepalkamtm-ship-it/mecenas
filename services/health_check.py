import asyncio
import time
import logging
from typing import List, Dict, Any
from moa.config import FREE_FALLBACK_MODELS, get_async_client
from openai import AsyncOpenAI

logger = logging.getLogger("LexMindHealthCheck")

async def check_model_health(client: AsyncOpenAI, model_id: str) -> Dict[str, Any]:
    """Sprawdza pojedynczy model wysyłając minimalne żądanie."""
    start_time = time.perf_counter()
    try:
        # Minimalny test: Pusty prompt lub proste "hi"
        response = await client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": "hi"}],
            max_tokens=5,
            timeout=10.0 # Krótki timeout dla zdrowego modelu
        )
        latency = (time.perf_counter() - start_time) * 1000
        return {
            "id": model_id,
            "status": "online",
            "latency_ms": int(latency),
            "error": None
        }
    except Exception as e:
        return {
            "id": model_id,
            "status": "offline",
            "latency_ms": -1,
            "error": str(e)
        }

async def run_global_free_models_health_check() -> List[Dict[str, Any]]:
    """Przeprowadza równoległy test wszystkich darmowych modeli."""
    logger.info("   [HEALTH] Rozpoczynam sprawdzanie dostępności darmowych modeli...")
    client = get_async_client()
    
    tasks = [check_model_health(client, m) for m in FREE_FALLBACK_MODELS]
    results = await asyncio.gather(*tasks)
    
    # Sortowanie po opóźnieniu (najpierw działające i najszybsze)
    online_models = sorted(
        [r for r in results if r["status"] == "online"], 
        key=lambda x: x["latency_ms"]
    )
    offline_models = [r for r in results if r["status"] == "offline"]
    
    logger.info(f"   [HEALTH] Wynik: {len(online_models)} online, {len(offline_models)} offline.")
    return online_models + offline_models
