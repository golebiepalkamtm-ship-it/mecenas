import logging
from typing import Dict, Any
import httpx
from moa.config import OPENROUTER_API_KEY

logger = logging.getLogger("LexMindHealthCheck")

async def get_openrouter_balance() -> Dict[str, Any]:
    """Pobiera aktualny stan środków z konta OpenRouter."""
    if not OPENROUTER_API_KEY:
        return {"success": False, "error": "Brak klucza OpenRouter."}
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://openrouter.ai/api/v1/credits",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
                timeout=10.0
            )
            if res.status_code == 200:
                data = res.json().get("data", {})
                return {
                    "success": True,
                    "total_credits": data.get("total_credits"),
                    "total_usage": data.get("total_usage"),
                    "remaining": data.get("total_credits", 0) - data.get("total_usage", 0)
                }
            else:
                return {"success": False, "error": f"API Error {res.status_code}"}
    except Exception as e:
        return {"success": False, "error": str(e)}
