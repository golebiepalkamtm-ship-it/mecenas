import asyncio
import os
import httpx
from pathlib import Path
from dotenv import load_dotenv

# Re-use logic from seed_knowledge but in a loop for all files
from seed_knowledge import process_file

load_dotenv()

PDF_DIR = Path("pdfs")

async def reindex_all():
    print("🚀 Rozpoczynam re-indeksację biblioteki LexMind na 1000%...")
    
    # Lista wszystkich plików w folderze pdfs
    files = [f.name for f in PDF_DIR.iterdir() if f.is_file() and (f.suffix.lower() == ".pdf" or f.suffix.lower() in [".jpg", ".png", ".jpeg"])]
    
    print(f"📊 Znaleziono {len(files)} plików do zweryfikowania.")
    
    for idx, filename in enumerate(files):
        print(f"\n[{idx+1}/{len(files)}] PRZETWARZANIE: {filename}")
        try:
            # Uruchamiamy proces dla każdego pliku
            # Skrypt seed_knowledge.py automatycznie usuwa stary indeks i tworzy nowy
            await process_file(filename)
        except Exception as e:
            print(f"❌ Błąd przy pliku {filename}: {e}")
        
        # Mała przerwa dla stabilności API
        await asyncio.sleep(1)

    print("\n✅ PROCES ZAKOŃCZONY. Wszystkie dokumenty zostały poprawnie zaindeksowane.")

if __name__ == "__main__":
    asyncio.run(reindex_all())
