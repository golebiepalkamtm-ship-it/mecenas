import asyncio
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Fix encoding for Windows consoles
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

KNOWLEDGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'local_storage', 'knowledge_base')

UNIQUE_FILES = [
    "konstytucja.pdf", "Kodeks Cywilny.pdf", "Kodeks Karny.pdf", 
    "Kodeks Postępowania Karnego.pdf", "kodeks postepowania cywilnego.pdf",
    "kodeks postepowania administracyjnego.pdf", "kodeks postepowania w sprawach o wykroczenia.pdf",
    "kodeks pracy.pdf", "kodeks karny skarbowy.pdf", "kodeks karny wykonawczy.pdf",
    "kodeks morski.pdf", "kodeks spolek handlowych.pdf", "kodeks wyborczy.pdf",
    "kodeks wykroczen.pdf", "Kodeks rodzinny i opiekunczy.pdf", "Prawo o Ruchu drogowym.pdf"
]

progress_counter = 0

def normalize_pl(text):
    """Szybka normalizacja polskich znaków i wielkości liter."""
    return text.lower().translate(str.maketrans('ąćęłńóśźż', 'acelnoszz'))

def print_overall_progress(total):
    global progress_counter
    length = 40
    if total == 0: total = 1
    percent = ("{0:.1f}").format(100 * (progress_counter / float(total)))
    filled_length = int(length * progress_counter // total)
    bar = '█' * filled_length + '-' * (length - filled_length)
    sys.stdout.write(f'\rGLOBALNY POSTĘP: |{bar}| {percent}% ({progress_counter}/{total} plików)   ')
    sys.stdout.flush()

async def main():
    global progress_counter
    print("\n" + "="*70)
    print("🚀 LEXMIND AI: INDEKSOWANIE PANCERNE (FIXED - SEKWEKCYJNE)")
    print("======================================================================\n")
    
    print("   [DEBUG] Startujemy proces debugowania...")
    from services.document_service_debug import index_document_to_supabase

    if not os.path.exists(KNOWLEDGE_DIR):
        print(f"❌ BLĄD: Katalog {KNOWLEDGE_DIR} nie istnieje!")
        return

    files_in_dir = os.listdir(KNOWLEDGE_DIR)
    total = len(UNIQUE_FILES)
    print_overall_progress(total)
    
    for filename in UNIQUE_FILES:
        filepath = os.path.join(KNOWLEDGE_DIR, filename)
        
        if not os.path.exists(filepath):
            found = False
            target_name = normalize_pl(filename)
            for f in files_in_dir:
                if normalize_pl(f) == target_name:
                    filepath = os.path.join(KNOWLEDGE_DIR, f)
                    filename = f
                    found = True
                    break
            
            if not found:
                sys.stdout.write(f"\n⚠️ Nie znaleziono pliku: {filename}\n")
                sys.stdout.flush()
                progress_counter += 1
                print_overall_progress(total)
                continue

        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            
            # URUCHAMIAMY PO KOLEI (BEZ GATHER NA POZIOMIE PLIKÓW)
            result = await index_document_to_supabase(
                file_content=content,
                filename=filename,
                content_type='application/pdf'
            )
        except Exception as e:
            sys.stdout.write(f"\n[!] Krytyczny błąd pliku {filename}: {e}\n")
            sys.stdout.flush()
            
        progress_counter += 1
        print_overall_progress(total)

    print(f"\n\n✅ ZAKOŃCZONO POMYŚLNIE.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nPrzerwano przez użytkownika.")