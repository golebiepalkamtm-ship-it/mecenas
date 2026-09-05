"""
LexMind MoA v2.5 — Rejestr Domyślnych Modeli Prawnych (Primary + Fallback) dla Ról Eksperckich
Strategia fallbacków: Primary → Starszy model tego samego providera → Last-Resort (Gemini)
"""
from typing import Dict, List, TypedDict, Tuple, Optional

class ModelConfig(TypedDict):
    primary: Optional[str]
    fallback: Optional[str]  # starszy model TEGO SAMEGO providera
    legal_rank: int
    input_cost_1m: float
    output_cost_1m: float
    description: str

# Absolutny last-resort: model, który niemal zawsze działa
GLOBAL_LAST_RESORT = "google/gemini-3.7-flash"

EXPERT_MODEL_REGISTRY: Dict[str, ModelConfig] = {
    # == ROLE EKSPERCKIE (Prawy panel strategii) ==
    "oracle": {
        "primary": "anthropic/claude-sonnet-5",
        "fallback": "anthropic/claude-opus-4.8",
        "legal_rank": 1,
        "input_cost_1m": 3.0,
        "output_cost_1m": 10.6,
        "description": "Wyrocznia Prawna / Główna analiza i orzecznictwo"
    },
    "inquisitor": {
        "primary": "deepseek/deepseek-v4-pro",
        "fallback": None,
        "legal_rank": 2,
        "input_cost_1m": 2.7,
        "output_cost_1m": 10.4,
        "description": "Inkwizytor Doktrynalny (Eliminacja halucynacji i sprzeczności)"
    },
    "evidencecracker": {
        "primary": "meta/muse-spark-1.1",
        "fallback": "meta/muse-spark-1.3",
        "legal_rank": 3,
        "input_cost_1m": 0.4,
        "output_cost_1m": 1.25,
        "description": "Analityk Dowodowy / Audytor dokumentów i klauzul"
    },
    "proceduralist": {
        "primary": "openai/gpt-5.6-terra",
        "fallback": "openai/gpt-5.6-sol",
        "legal_rank": 4,
        "input_cost_1m": 2.5,
        "output_cost_1m": 10.3,
        "description": "Specjalista Proceduralny / Terminy i procedury formalne"
    },
    "defender": {
        "primary": "x-ai/grok-4.3",
        "fallback": None,
        "legal_rank": 5,
        "input_cost_1m": 1.5,
        "output_cost_1m": 4.25,
        "description": "Obrońca / Strateg obrony i linia procesowa"
    },
    "negotiator": {
        "primary": "openai/gpt-5.6-luna",
        "fallback": "minimax/minimax-m2.1",
        "legal_rank": 6,
        "input_cost_1m": 0.3,
        "output_cost_1m": 1.24,
        "description": "Mediator / Negocjator i ugodowe opcje rozwiązania sporu"
    },
    "constitutionalist": {
        "primary": "google/gemini-3.1-pro-preview",
        "fallback": "google/gemini-3.7-flash",
        "legal_rank": 7,
        "input_cost_1m": 7.0,
        "output_cost_1m": 21.0,
        "description": "Konstytucjonalista / Prawo ustrojowe i EPCz"
    },
    # == GŁÓWNE ROLE ZESPOŁU (Lewy panel UI - przypisania) ==
    "drafter": {
        "primary": "anthropic/claude-sonnet-5",
        "fallback": "anthropic/claude-opus-4.8",
        "legal_rank": 8,
        "input_cost_1m": 3.0,
        "output_cost_1m": 10.6,
        "description": "Pisma procesowe / Drafter"
    },
    "judge": {
        "primary": "openai/gpt-5.6-luna",
        "fallback": "anthropic/claude-opus-4.8",
        "legal_rank": 9,
        "input_cost_1m": 0.3,
        "output_cost_1m": 1.24,
        "description": "Sędzia Arbiter Syntezy / Pisarz Ostatecznych Pism"
    },
    "long_context": {
        "primary": "google/gemini-3.1-pro-preview",
        "fallback": "google/gemini-3.7-flash",
        "legal_rank": 10,
        "input_cost_1m": 7.0,
        "output_cost_1m": 21.0,
        "description": "Analiza długich akt sprawy / 1M tokenów kontekstu"
    },
    "fast": {
        "primary": "openai/gpt-5.4-nano",
        "fallback": "google/gemini-3.7-flash",
        "legal_rank": 11,
        "input_cost_1m": 0.1,
        "output_cost_1m": 0.4,
        "description": "Szybki model pomocniczy (wyciąganie danych, klasyfikacja)"
    },
    "ocr": {
        "primary": "google/gemini-3.7-flash",
        "fallback": "google/gemini-3.8-flash",
        "legal_rank": 12,
        "input_cost_1m": 0.1,
        "output_cost_1m": 0.4,
        "description": "Model OCR / Wizyjny"
    },
    "query_planner": {
        "primary": "openai/gpt-5.4-nano",
        "fallback": "google/gemini-3.7-flash",
        "legal_rank": 13,
        "input_cost_1m": 0.1,
        "output_cost_1m": 0.4,
        "description": "Planner Zapytań i Wyszukiwania"
    }
}

DEFAULT_PRIMARY_FALLBACK = (None, None)

def get_expert_models(role_id: str) -> Tuple[Optional[str], Optional[str]]:
    """Zwraca parę (primary_model, fallback_model) dla danej roli.
    Zgodnie z IMR, modele są puste, chyba że użytkownik wybierze inaczej w UI.
    """
    role_key = (role_id or "").lower().strip()
    if role_key in EXPERT_MODEL_REGISTRY:
        cfg = EXPERT_MODEL_REGISTRY[role_key]
        return cfg["primary"], cfg["fallback"]
    
    return DEFAULT_PRIMARY_FALLBACK

def get_expert_fallback_chain(role_id: str) -> List[str]:
    """Zwraca łańcuch fallbacków: [primary, fallback, GLOBAL_LAST_RESORT] (zdeduplikowany, bez None)."""
    role_key = (role_id or "").lower().strip()
    chain: List[str] = []
    if role_key in EXPERT_MODEL_REGISTRY:
        cfg = EXPERT_MODEL_REGISTRY[role_key]
        if cfg["primary"]:
            chain.append(cfg["primary"])
        if cfg["fallback"] and cfg["fallback"] not in chain:
            chain.append(cfg["fallback"])
    if GLOBAL_LAST_RESORT not in chain:
        chain.append(GLOBAL_LAST_RESORT)
    return chain
