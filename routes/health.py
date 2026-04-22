from fastapi import APIRouter
from services.health_check import run_global_free_models_health_check
from typing import List, Dict, Any

router = APIRouter()

@router.get("/free-models")
async def get_free_models_health():
    """Zwraca status i opóźnienie darmowych modeli LLM."""
    results = await run_global_free_models_health_check()
    return {
        "success": True,
        "models": results
    }
