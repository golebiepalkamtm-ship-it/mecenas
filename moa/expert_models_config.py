"""
LexMind MoA v2.5 — Rejestr Domyślnych Modeli Prawnych (Primary + Fallback) dla Ról Eksperckich
Strategia fallbacków: Primary → Starszy model tego samego providera → Last-Resort (Gemini)
"""
from typing import Dict, List, TypedDict, Tuple

class ModelConfig(TypedDict):
    primary: str
    fallback: str  # starszy model TEGO SAMEGO providera
    legal_rank: int
    input_cost_1m: float
    output_cost_1m: float
    description: str

# Absolutny last-resort: model, który niemal zawsze działa
GLOBAL_LAST_RESORT = "google/gemini-3.7-flash"

EXPERT_MODEL_REGISTRY: Dict[str, ModelConfig] = {
    "oracle": {
        "primary": "qwen/qwen3.8-max",
        "fallback": "qwen/qwen3.7-max",
        "legal_rank": 1,
        "input_cost_1m": 2.0,
        "output_cost_1m": 6.0,
        "description": "Wyrocznia Prawna / Główna analiza i orzecznictwo"
    },
    "inquisitor": {
        "primary": "~deepseek/deepseek-v4-flash-latest",
        "fallback": "deepseek/deepseek-v4-flash",
        "legal_rank": 2,
        "input_cost_1m": 0.0765,
        "output_cost_1m": 0.1530,
        "description": "Inkwizytor Doktrynalny (Eliminacja halucynacji i sprzeczności)"
    },
    "evidencecracker": {
        "primary": "z-ai/glm-5.3",
        "fallback": "z-ai/glm-5.2",
        "legal_rank": 3,
        "input_cost_1m": 1.4,
        "output_cost_1m": 4.4,
        "description": "Analityk Dowodowy / Audytor dokumentów i klauzul"
    },
    "proceduralist": {
        "primary": "openai/gpt-5.4-nano",
        "fallback": "openai/gpt-5.4-mini",
        "legal_rank": 4,
        "input_cost_1m": 0.20,
        "output_cost_1m": 1.25,
        "description": "Specjalista Proceduralny / Terminy i procedury formalne"
    },
    "defender": {
        "primary": "x-ai/grok-4.6",
        "fallback": "x-ai/grok-4.5",
        "legal_rank": 5,
        "input_cost_1m": 2.0,
        "output_cost_1m": 6.0,
        "description": "Obrońca / Strateg obrony i linia procesowa"
    },
    "negotiator": {
        "primary": "google/gemini-3.7-flash",
        "fallback": "qwen/qwen3.7-flash",
        "legal_rank": 6,
        "input_cost_1m": 0.375,
        "output_cost_1m": 1.875,
        "description": "Mediator / Negocjator i ugodowe opcje rozwiązania sporu"
    },
    "constitutionalist": {
        "primary": "qwen/qwen3.8-max",
        "fallback": "qwen/qwen3.7-max",
        "legal_rank": 7,
        "input_cost_1m": 2.0,
        "output_cost_1m": 6.0,
        "description": "Konstytucjonalista / Prawo ustrojowe i EPCz"
    },
    "judge": {
        "primary": "qwen/qwen3.8-max",
        "fallback": "qwen/qwen3.7-max",
        "legal_rank": 8,
        "input_cost_1m": 2.0,
        "output_cost_1m": 6.0,
        "description": "Sędzia Arbiter Syntezy / Pisarz Ostatecznych Pism"
    }
}

DEFAULT_PRIMARY_FALLBACK = ("qwen/qwen3.8-max", "qwen/qwen3.7-max")

def get_expert_models(role_id: str) -> Tuple[str, str]:
    """Zwraca parę (primary_model, fallback_model) dla danej roli."""
    role_key = (role_id or "").lower().strip()
    if role_key in EXPERT_MODEL_REGISTRY:
        cfg = EXPERT_MODEL_REGISTRY[role_key]
        return cfg["primary"], cfg["fallback"]
    
    # Fallback dla nieznanych ról
    return DEFAULT_PRIMARY_FALLBACK

def get_expert_fallback_chain(role_id: str) -> List[str]:
    """Zwraca pełny łańcuch fallbacków: [starszy model tego samego providera, last-resort].
    
    Używany przez DebateEngine do tworzenia dedykowanego LLMClientService per ekspert.
    Dzięki temu łańcuch to: Primary → Starszy tego samego providera → Gemini (last resort).
    """
    _, same_provider_fallback = get_expert_models(role_id)
    chain = []
    if same_provider_fallback:
        chain.append(same_provider_fallback)
    # Dodaj globalny last-resort jeśli nie jest już w łańcuchu
    if GLOBAL_LAST_RESORT not in chain:
        chain.append(GLOBAL_LAST_RESORT)
    return chain
