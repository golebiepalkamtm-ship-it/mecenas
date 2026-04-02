# ===========================================================================
# MOA — Mixture of Agents: Moduł analizy prawnej multi-model
# ===========================================================================
# Architektura:
#   1. Retrieval  → Supabase pgvector (16 polskich kodeksów)
#   2. Analysis   → N analityków równolegle (OpenRouter)
#   3. Synthesis  → Sędzia-agregator (krytyczna synteza)
# ===========================================================================

from moa.pipeline import run_moa_pipeline, MOAResult
from moa.models import MOARequest

__all__ = ["run_moa_pipeline", "MOAResult", "MOARequest"]
