import sys
import os

# Upewnij się, że katalog projektu jest w PATH
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

import asyncio
import time

try:
    from services.document_service import index_document_to_supabase
except ImportError as e:
    print(f"ERROR: {e}")
    print(f"Uruchom skrypt przez: .venv\\Scripts\\python upload_kodeksy.py")
    sys.exit(1)

async def main():
    folder = os.path.join(PROJECT_DIR, 'local_storage', 'knowledge_base')

    if not os.path.isdir(folder):
        print(f"Error: Folder nie istnieje: {folder}")
        sys.exit(1)

    pdf_files = [f for f in os.listdir(folder) if f.lower().endswith('.pdf')]
    total = len(pdf_files)

    if total == 0:
        print(f"Warning: Brak plikow PDF w: {folder}")
        sys.exit(0)

    print(f'Znaleziono {total} plikow PDF do wyslania.')
    print(f'Folder: {folder}')
    print('Rozpoczynam wysylke...')
    print()

    ok = 0
    fail = 0
    start_time = time.time()

    for idx, filename in enumerate(sorted(pdf_files), 1):
        path = os.path.join(folder, filename)
        progress = int((idx / total) * 100)
        print(f'[{idx}/{total}] ({progress}%) {filename}')
        try:
            with open(path, 'rb') as f:
                content = f.read()

            result = await index_document_to_supabase(
                file_content=content,
                filename=filename,
                content_type='application/pdf',
                category='rag_legal'
            )

            if result.get('success'):
                ok += 1
                print(f'   OK - {result.get("fragments")} fragmentow, zapisano do {result.get("table")}')
            else:
                fail += 1
                print(f'   Blad: {result.get("error")}')
        except Exception as e:
            fail += 1
            print(f'   Wyjątek: {e}')

        elapsed = time.time() - start_time
        avg = elapsed / idx if idx else 0
        remaining = avg * (total - idx)
        print(f'   Czas: {elapsed:.1f}s, srednio {avg:.1f}s/plk, reszta ~{remaining:.1f}s')
        print('-' * 60)

    end_time = time.time()
    print('\n=== PODSUMOWANIE ===')
    print(f'   Sukcesy: {ok}')
    print(f'   Bledy: {fail}')
    print(f'   Calkowity czas: {end_time - start_time:.1f}s')

if __name__ == '__main__':
    asyncio.run(main())
