import asyncio
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

from services.document_service_debug import index_document_to_supabase

KNOWLEDGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'local_storage', 'knowledge_base')
# Poprawiona nazwa pliku z dysku
FILENAME = "Kodeks roddzinny i opiekunczy.pdf"

async def main():
    filepath = os.path.join(KNOWLEDGE_DIR, FILENAME)
    if not os.path.exists(filepath):
        print(f"❌ Nie znaleziono pliku: {filepath}")
        return

    print(f"🚀 Indeksowanie ostatniego brakującego elementu: {FILENAME}")
    with open(filepath, 'rb') as f:
        content = f.read()
    
    result = await index_document_to_supabase(
        file_content=content,
        filename="Kodeks rodzinny i opiekunczy.pdf", # Rezultat w bazie bedzie z poprawna nazwa
        content_type='application/pdf'
    )
    if result.get('success'):
        print(f"✅ SUKCES! Dodano {result.get('fragments')} fragmentów.")
    else:
        print(f"❌ BŁĄD: {result.get('error')}")

if __name__ == "__main__":
    asyncio.run(main())
