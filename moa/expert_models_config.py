"""
LexMind MoA v2.5 — Rejestr Domyślnych Modeli Prawnych (Primary + Fallback) dla Ról Eksperckich
Sprawdzone i aktywne modele OpenRouter z oficjalnych benchmarków Legal.
"""
from typing import Dict, TypedDict, Tuple

class ModelConfig(TypedDict):
    primary: str
    fallback: str
    legal_rank: int
    input_cost_1m: float
    output_cost_1m: float
    description: str

EXPERT_MODEL_REGISTRY: Dict[str, ModelConfig] = {
    "oracle": {
        "primary": "deepseek/deepseek-v4-pro",
        "fallback": "deepseek/deepseek-v4-flash",
        "legal_rank": 1,
        "input_cost_1m": 0.435,
        "output_cost_1m": 0.87,
        "description": "Wyrocznia Prawna / Badacz precedensów i akt (1M ctx)"
    },
    "inquisitor": {
        "primary": "qwen/qwen3.5-flash",
        "fallback": "deepseek/deepseek-v4-flash",
        "legal_rank": 2,
        "input_cost_1m": 0.065,
        "output_cost_1m": 0.26,
        "description": "Inkwizytor Doktrynalny (Anti-hallucination grounded decoding)"
    },
    "evidencecracker": {
        "primary": "deepseek/deepseek-v4-flash",
        "fallback": "openai/gpt-oss-120b",
        "legal_rank": 3,
        "input_cost_1m": 0.09,
        "output_cost_1m": 0.18,
        "description": "Analityk Dowodowy / Audytor umów i klauzul abuzywnych"
    },
    "proceduralist": {
        "primary": "openai/gpt-5-nano",
        "fallback": "inclusionai/ling-2.6-flash",
        "legal_rank": 4,
        "input_cost_1m": 0.05,
        "output_cost_1m": 0.40,
        "description": "Specjalista Proceduralny / Terminy i uchybienia formalne"
    },
    "defender": {
        "primary": "deepseek/deepseek-v4-pro",
        "fallback": "qwen/qwen3.5-flash",
        "legal_rank": 5,
        "input_cost_1m": 0.435,
        "output_cost_1m": 0.87,
        "description": "Obrońca / Strateg obrony i linia procesowa"
    },
    "negotiator": {
        "primary": "openai/gpt-oss-120b",
        "fallback": "inclusionai/ling-2.6-flash",
        "legal_rank": 6,
        "input_cost_1m": 0.03,
        "output_cost_1m": 0.17,
        "description": "Mediator / Negocjator i ugodowe opcje rozwiązania sporu"
    },
    "constitutionalist": {
        "primary": "qwen/qwen3.5-flash",
        "fallback": "deepseek/deepseek-v4-flash",
        "legal_rank": 7,
        "input_cost_1m": 0.065,
        "output_cost_1m": 0.26,
        "description": "Konstytucjonalista / Prawo ustrojowe i EPCz"
    },
    "judge": {
        "primary": "deepseek/deepseek-v4-pro",
        "fallback": "deepseek/deepseek-v4-flash",
        "legal_rank": 8,
        "input_cost_1m": 0.435,
        "output_cost_1m": 0.87,
        "description": "Sędzia Arbiter Syntezy / Pisarz Ostatecznych Pism"
    }
}

DEFAULT_PRIMARY_FALLBACK = ("deepseek/deepseek-v4-pro", "deepseek/deepseek-v4-flash")

def get_expert_models(role_id: str) -> Tuple[str, str]:
    """Zwraca para (primary_model, fallback_model) dla danej roli."""
    role_key = (role_id or "").lower().strip()
    if role_key in EXPERT_MODEL_REGISTRY:
        cfg = EXPERT_MODEL_REGISTRY[role_key]
        return cfg["primary"], cfg["fallback"]
    
    # Fallback dla nieznanych ról
    return DEFAULT_PRIMARY_FALLBACK
