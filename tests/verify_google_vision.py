import os
import sys
from PIL import Image
import io

# Dodaj bieżący katalog do ścieżki
sys.path.append(os.getcwd())

from document_processor import extract_text_from_pil_image, GOOGLE_VISION_AVAILABLE

def test_google_vision():
    print("=== Test Integracji Google Cloud Vision ===")
    
    if not GOOGLE_VISION_AVAILABLE:
        print("❌ Biblioteka google-cloud-vision nie jest zainstalowana.")
        return

    # Sprawdź credentials
    key_path = os.path.join(os.getcwd(), "google-cloud-key.json")
    if not os.path.exists(key_path) and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        print(f"⚠️ Nie znaleziono pliku {key_path}")
        print("Wskazówka: Umieść plik JSON z kluczami konta serwisowego w głównym folderze projektu pod nazwą 'google-cloud-key.json'")
        return

    print("✅ Środowisko wydaje się gotowe.")
    
    # Próba OCR na małym obrazku
    try:
        # Tworzymy prosty obrazek z tekstem (jeśli pillow działa)
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (200, 50), color = (255, 255, 255))
        d = ImageDraw.Draw(img)
        d.text((10,10), "Test Google Vision API", fill=(0,0,0))
        
        print("🚀 Wysyłanie testowego obrazu do Google Cloud Vision...")
        text, error = extract_text_from_pil_image(img)
        
        if error:
            print(f"❌ Błąd: {error}")
        else:
            print(f"✅ Sukces! Wyekstrahowany tekst: '{text}'")
            
    except Exception as e:
        print(f"❌ Wystąpił nieoczekiwany błąd podczas testu: {e}")

if __name__ == "__main__":
    test_google_vision()
