"""
SKRYPT MULTI-CORE + PROGRESS BAR (2 pliki naraz)
"""
import asyncio
import os
import sys
import time

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Fix encoding for Windows consoles to support emojis
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from services.document_service import index_document_to_supabase

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

def print_overall_progress(total):
    global progress_counter
    length = 40
    iteration = progress_counter
    percent = ("{0:.1f}").format(100 * (iteration / float(total)))
    filled_length = int(length * iteration // total)
    bar = '█' * filled_length + '-' * (length - filled_length)
    sys.stdout.write(f'\rGLOBALNY POSTĘP: |{bar}| {percent}% ({iteration}/{total} plików)')
    sys.stdout.flush()

async def process_file_with_semaphore(filename, semaphore, files_in_dir, total_files):
    global progress_counter
    async with semaphore:
        filepath = os.path.join(KNOWLEDGE_DIR, filename)
        
        if not os.path.exists(filepath):
            # Szukanie pliku ignorując wielkość liter i polskie znaki
            target_name = filename.lower().replace('ę', 'e').replace('ó', 'o')
            for f in files_in_dir:
                if f.lower().replace('ę', 'e').replace('ó', 'o') == target_name:
                    filepath = os.path.join(KNOWLEDGE_DIR, f)
                    filename = f
                    break
            else:
                sys.stdout.write(f"\n⚠️ Nie znaleziono pliku: {filename}\n")
                sys.stdout.flush()
                progress_counter += 1
                print_overall_progress(total_files)
                return False
        
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            
            result = await index_document_to_supabase(
                file_content=content,
                filename=filename,
                content_type='application/pdf',
                category='rag_legal'
            )
            
            if not result.get('success'):
                sys.stdout.write(f"\n❌ Błąd indeksowania (API) dla {filename}\n")
                sys.stdout.flush()
                
        except Exception as e:
            sys.stdout.write(f"\n❌ Wyjątek podczas przetwarzania {filename}: {str(e)}\n")
            sys.stdout.flush()
        
        progress_counter += 1
        print_overall_progress(total_files)
        return True

async def main():
    if not os.path.exists(KNOWLEDGE_DIR):
        print(f"Katalog {KNOWLEDGE_DIR} nie istnieje. Tworzę...")
        os.makedirs(KNOWLEDGE_DIR, exist_ok=True)
        
    files_in_dir = os.listdir(KNOWLEDGE_DIR)
    
    print("\n" + "="*70)
    print("🚀 LEXMIND AI: INDEKSOWANIE MULTI-CORE (TRYB: 2 PLIKI NARAZ)")
    print("="*70 + "\n")
    
    start_time = time.time()
    semaphore = asyncio.Semaphore(2) 
    total = len(UNIQUE_FILES)
    
    print_overall_progress(total)
    
    tasks = [process_file_with_semaphore(f, semaphore, files_in_dir, total) for f in UNIQUE_FILES]
    await asyncio.gather(*tasks)
    
    duration = time.time() - start_time
    print(f"\n\n" + "="*70)
    print(f"🏁 ZAKOŃCZONO PEŁNY PROCES")
    print(f"Czas: {duration:.1f} sek.")
    print("="*70 + "\n")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nPrzerwano przez użytkownika.")