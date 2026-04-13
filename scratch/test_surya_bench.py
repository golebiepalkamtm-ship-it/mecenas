
import os
import time
import io
import sys

# Dodaj ścieżkę główną projektu do sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from document_processor import process_document
from PIL import Image

# Zapobieganie błędom kodowania w konsoli Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

def test_single_file(file_path):
    print(f"\n[TEST] Przetwarzanie pliku: {os.path.basename(file_path)}")
    
    with open(file_path, "rb") as f:
        content = f.read()
    
    # Rozmiar oryginalny
    img = Image.open(io.BytesIO(content))
    print(f"   - Rozmiar oryginalny: {img.size[0]}x{img.size[1]}")
    
    start_time = time.time()
    
    # Wywołujemy process_document (który teraz ma wbudowany resize)
    text, error = process_document(content, os.path.basename(file_path), "image/jpeg")
    
    end_time = time.time()
    duration = end_time - start_time
    
    if error:
        print(f"   [ERROR]: {error}")
    else:
        print(f"   [SUCCESS]")
        print(f"   - Czas trwania: {duration:.2f} sekundy")
        print(f"   - Długość tekstu: {len(text)} znaków")
        print(f"   - Pierwsze 100 znaków: {text[:100]}...")

if __name__ == "__main__":
    test_dir = r"c:\Users\Marcin_Palka\moj prawnik\local_storage\chat_attachments"
    # Wybieramy jeden z dużych plików (6MB+)
    test_file = os.path.join(test_dir, "1775728976_1.jpg")
    
    if os.path.exists(test_file):
        test_single_file(test_file)
    else:
        print(f"Plik testowy nie istnieje: {test_file}")
