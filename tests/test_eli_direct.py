import asyncio
import sys
import os

sys.path.append(os.getcwd())

from moa.retrieval import retrieve_legal_context

async def test_direct_reference():
    print("=== TEST BEZPOŚREDNIEGO ODNIESIENIA (Dz.U.) ===")
    # Ustawa o systemie oświaty z doca: 1991 poz. 425
    query = "Co mówi ustawa z dnia 7 września 1991 r. (Dz.U. 1991 poz. 425)?"
    
    chunks, context = await retrieve_legal_context(query)
    
    eli_chunks = [c for c in chunks if "ELI" in c.source]
    print(f"Liczba fragmentów z ELI: {len(eli_chunks)}")
    
    if eli_chunks:
        print(f"Źródło: {eli_chunks[0].source}")
        print(f"Podobieństwo: {eli_chunks[0].similarity}")
        if "o systemie oświaty" in eli_chunks[0].content.lower():
            print("✅ Sukces: Wykryto i pobrano poprawny akt!")
        else:
            print("❌ Błąd: Pobrany akt nie pasuje do zapytania.")
    else:
        print("❌ Błąd: Nie wykryto odniesienia Dz.U.")

    print("\n=== KONIEC TESTU ===")

if __name__ == "__main__":
    asyncio.run(test_direct_reference())
