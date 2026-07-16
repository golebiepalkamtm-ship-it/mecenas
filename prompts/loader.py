"""Ładowanie promptów z plików .txt — edycja bez zmiany kodu potoku."""
from __future__ import annotations

import functools
from pathlib import Path

_PROMPTS_DIR = Path(__file__).resolve().parent


@functools.lru_cache(maxsize=128)
def load_prompt(name: str) -> str:
    # 1. Sprawdź czy to ścieżka bezpośrednia w katalogu głównym (legacy fallback)
    path = _PROMPTS_DIR / f"{name}.txt"
    if path.is_file():
        return path.read_text(encoding="utf-8").strip()

    # 2. Przeszukaj rekurencyjnie podkatalogi
    matches = list(_PROMPTS_DIR.rglob(f"{name}.txt"))
    if matches:
        return matches[0].read_text(encoding="utf-8").strip()

    raise FileNotFoundError(f"Brak pliku promptu: {name}.txt w {_PROMPTS_DIR} i podkatalogach")


def get_master_system_prompt() -> str:
    """Jeden główny prompt tematyczny — prefix dla każdego modelu w potoku."""
    return load_prompt("lexmind_master_system")

