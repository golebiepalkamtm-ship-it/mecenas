#!/usr/bin/env python3
"""
MOA Model Update Script
Aktualizuje listę modeli z OpenRouter API
"""

import asyncio
import sys
import os

# Dodaj katalog moa do ścieżki
sys.path.insert(0, os.path.dirname(__file__))

from config import (
    fetch_openrouter_models,
    update_models_config_from_openrouter,
    save_models_config,
)


async def main():
    print("UPDATING: Aktualizuje liste modeli z OpenRouter...")

    # Pobierz modele z API
    models_data = await fetch_openrouter_models()

    if not models_data:
        print("ERROR: Nie udalo sie pobrac modeli z API")
        return

    print(f"DOWNLOAD: Pobrano {len(models_data)} modeli z OpenRouter")

    # Zaktualizuj konfigurację
    new_config = update_models_config_from_openrouter(models_data)

    # Zapisz nową konfigurację
    if save_models_config(new_config):
        print("SUCCESS: Lista modeli zostala pomyslnie zaktualizowana!")
        print(f"STATS: Dostępnych modeli: {len(new_config['models'])}")
    else:
        print("ERROR: Blad podczas zapisywania konfiguracji")


if __name__ == "__main__":
    asyncio.run(main())
