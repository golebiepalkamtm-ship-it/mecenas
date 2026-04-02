import pickle
from pathlib import Path

CACHE_DIR = Path("cache")
PDF_DIR = Path("pdfs")
CHUNKS_PATH = CACHE_DIR / "all_chunks.pkl"

def check_indexing():
    pdf_files = {p.name for p in PDF_DIR.glob("*.pdf")}
    
    if not CHUNKS_PATH.exists():
        print(f"Brak pliku cache: {CHUNKS_PATH}")
        print(f"Wszystkie PDFy do zaindeksowania: {len(pdf_files)}")
        for pdf in sorted(pdf_files):
            print(f"- {pdf}")
        return

    try:
        with open(CHUNKS_PATH, "rb") as f:
            chunks = pickle.load(f)
    except Exception as e:
        print(f"Błąd podczas ładowania cache: {e}")
        return

    indexed_pdfs = {getattr(chunk, 'metadata', {}).get("source") for chunk in chunks if hasattr(chunk, 'metadata')}
    
    missing = pdf_files - indexed_pdfs
    extra = indexed_pdfs - pdf_files # Should probably be empty unless files were deleted
    
    if not missing:
        print("Wszystkie PDFy w folderze /pdfs są zaindeksowane.")
    else:
        print(f"Następujące PDFy NIE są zaindeksowane ({len(missing)}):")
        for pdf in sorted(missing):
            print(f"- {pdf}")
            
    print(f"\nStatystyka:")
    print(f"Pliki w /pdfs: {len(pdf_files)}")
    print(f"Zaindeksowane pliki: {len(indexed_pdfs)}")
    
    if extra:
        print(f"\nUwaga: W indeksie znajdują się pliki, których nie ma w folderze /pdfs ({len(extra)}):")
        for pdf in sorted(extra):
            if pdf: print(f"- {pdf}")

if __name__ == "__main__":
    check_indexing()
