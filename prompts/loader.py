"""Ładowanie promptów z plików .txt — edycja bez zmiany kodu potoku."""
from __future__ import annotations

import functools
from pathlib import Path

_PROMPTS_DIR = Path(__file__).resolve().parent


@functools.lru_cache(maxsize=None)
def load_prompt(name: str) -> str:
    path = _PROMPTS_DIR / f"{name}.txt"
    if not path.is_file():
        raise FileNotFoundError(f"Brak pliku promptu: {path}")
    return path.read_text(encoding="utf-8").strip()


@functools.lru_cache(maxsize=None)
def get_master_system_prompt() -> str:
    """Jeden główny prompt tematyczny — prefix dla każdego modelu w potoku."""
    return load_prompt("lexmind_master_system")
