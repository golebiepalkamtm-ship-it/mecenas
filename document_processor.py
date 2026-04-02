# ===========================================================================
# Document Processor - Obsługa PDF, TXT, DOC, i obrazów z OCR
# ===========================================================================
"""
Ekstrakcja tekstu z różnych formatów dokumentów:
- PDF: PyPDF2 (+ OCR fallback dla skanów)
- DOCX: python-docx  
- TXT: natywnie
- Obrazy OCR (priorytet): Google Cloud Vision → Surya OCR → EasyOCR
"""

import os
import io
import tempfile
from typing import Optional, Tuple
import base64
import threading

from PyPDF2 import PdfReader
from docx import Document
from PIL import Image

# Konfiguracja OCR
SURYA_AVAILABLE = False
EASY_OCR_AVAILABLE = False
GOOGLE_VISION_AVAILABLE = False

# Klient Google Cloud Vision (Singleton)
_vision_client = None

def get_vision_client():
    """Inicjalizuje i zwraca klienta Google Cloud Vision."""
    global _vision_client
    if _vision_client is None:
        try:
            from google.cloud import vision
            import os
            # Sprawdź czy plik klucza istnieje w domyślnej lokalizacji
            key_path = os.path.join(os.getcwd(), "google-cloud-key.json")
            if os.path.exists(key_path):
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = key_path
            
            # Jeśli mamy credentials lub plik klucza, spróbuj zainicjalizować
            if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or os.path.exists(key_path):
                _vision_client = vision.ImageAnnotatorClient()
                print("🚀 Google Cloud Vision client initialized.")
            else:
                print("⚠️ Brak Google Cloud Credentials (GOOGLE_APPLICATION_CREDENTIALS lub google-cloud-key.json)")
                return None
        except Exception as e:
            print(f"⚠️ Nie udało się zainicjalizować Google Cloud Vision: {e}")
            return None
    return _vision_client

# Modele Surya (Singleton/Lazy Loading)
_surya_models = {
    "det": None,
    "rec": None,
    "layout": None,
    "langs": ["pl", "en"]
}
_surya_lock = threading.Lock()

def get_surya_models():
    """Zwraca modele Surya (ładowane leniwie)."""
    with _surya_lock:
        if _surya_models["det"] is None:
            try:
                from surya.models import load_predictors
                print("🚀 Inicjalizacja modeli Surya (OCR + Layout)...")
                predictors = load_predictors()
                _surya_models["det"] = predictors.get("detection")
                _surya_models["rec"] = predictors.get("recognition")
                _surya_models["layout"] = predictors.get("layout")
            except Exception as e:
                print(f"⚠️ Błąd podczas ładowania modeli Surya: {e}")
                return None, None, None
        return _surya_models["det"], _surya_models["rec"], _surya_models["layout"]

# 1. Sprawdź dostępność Surya
try:
    from surya.models import load_predictors
    SURYA_AVAILABLE = True
    print("✅ Surya OCR jest wykryta i dostępna (v0.17+)")
except (ImportError, ModuleNotFoundError):
    print("⚠️ Surya OCR nie jest zainstalowana")
except Exception as e:
    print(f"⚠️ Błąd podczas weryfikacji Surya: {e}")

# 2. Fallback do EasyOCR (stary system)
if not SURYA_AVAILABLE:
    try:
        import easyocr
        import numpy as np
        EASY_OCR_AVAILABLE = True
        reader = easyocr.Reader(['pl', 'en'])
        print("✅ EasyOCR jest gotowy (jako fallback)")
    except ImportError:
        print("⚠️ EasyOCR nie jest dostępny")
    except Exception as e:
        print(f"⚠️ Błąd inicjalizacji EasyOCR: {e}")


# 3. Sprawdź dostępność Google Cloud Vision
try:
    from google.cloud import vision
    # Sprawdzamy tylko czy biblioteka jest, a nie czy auth działa (to sprawdzimy przy pierwszym użyciu)
    GOOGLE_VISION_AVAILABLE = True
    print("✅ Google Cloud Vision library is available")
except ImportError:
    print("⚠️ Google Cloud Vision library NOT installed")
except Exception as e:
    print(f"⚠️ Błąd podczas sprawdzania Google Cloud Vision: {e}")


def extract_text_from_pdf(pdf_content: bytes) -> Tuple[str, Optional[str]]:
    """Ekstrakcja tekstu z PDF (z auto-detekcją skanów i OCR)."""
    try:
        pdf_file = io.BytesIO(pdf_content)
        reader = PdfReader(pdf_file)
        
        text = ""
        for page in reader.pages:
            text += (page.extract_text() or "") + "\n"
        
        # Jeśli PDF jest pusty (prawdopodobnie skan), spróbuj OCR
        if not text.strip() and (SURYA_AVAILABLE or EASY_OCR_AVAILABLE):
            print("🚀 PDF nie zawiera warstwy tekstowej. Uruchamiam silnik OCR...")
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(stream=pdf_content, filetype="pdf")
                ocr_text = ""
                for page in doc:
                    # Renderuj stronę do obrazu
                    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))  # 1.5x zoom dla szybszego OCR (zamiast 2.x)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    
                    page_text, err = extract_text_from_pil_image(img)
                    if page_text:
                        ocr_text += page_text + "\n"
                
                if ocr_text.strip():
                    return ocr_text.strip(), None
            except Exception as ocr_err:
                print(f"⚠️ Błąd OCR w PDF: {ocr_err}")
        
        return text.strip(), None
    except Exception as e:
        return "", f"Błąd PDF: {str(e)}"


def extract_text_from_docx(docx_content: bytes) -> Tuple[str, Optional[str]]:
    """Ekstrakcja tekstu z DOCX."""
    try:
        docx_file = io.BytesIO(docx_content)
        doc = Document(docx_file)
        
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        
        return text.strip(), None
    except Exception as e:
        return "", f"Błąd DOCX: {str(e)}"


def extract_text_from_txt(txt_content: bytes) -> Tuple[str, Optional[str]]:
    """Ekstrakcja tekstu z pliku TXT."""
    try:
        text = txt_content.decode('utf-8')
        return text.strip(), None
    except UnicodeDecodeError:
        try:
            text = txt_content.decode('latin-1')
            return text.strip(), None
        except Exception as e:
            return "", f"Błąd kodowania TXT: {str(e)}"
    except Exception as e:
        return "", f"Błąd TXT: {str(e)}"


def extract_text_from_google_vision(image_content: bytes) -> Tuple[str, Optional[str]]:
    """Ekstrakcja tekstu przy użyciu Google Cloud Vision API."""
    client = get_vision_client()
    if not client:
        return "", "Google Cloud Vision client not available"
    
    try:
        from google.cloud import vision
        # Utwórz obiekt Image z binariów
        image = vision.Image(content=image_content)
        
        # Używamy DOCUMENT_TEXT_DETECTION dla lepszej obsługi gęstego tekstu/dokumentów
        response = client.document_text_detection(image=image)
        
        if response.error.message:
            return "", f"Vision API Error: {response.error.message}"
        
        # Zwróć wyekstrahowany tekst
        return response.full_text_annotation.text, None
    except Exception as e:
        return "", f"Google Vision Error: {str(e)}"


def extract_text_from_pil_image(image: Image.Image) -> Tuple[str, Optional[str]]:
    """Ekstrakcja tekstu bezpośrednio z obiektu PIL Image."""
    if not any([SURYA_AVAILABLE, EASY_OCR_AVAILABLE, GOOGLE_VISION_AVAILABLE]):
        return "", "Brak silnika OCR (Google Vision/Surya/EasyOCR nie są dostępne)"
    
    # Konwersja do bytes dla silników które tego wymagają (lub dla Google Vision)
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format='PNG')
    img_bytes = img_byte_arr.getvalue()

    # 1. Próba użycia Google Cloud Vision (NAJLEPSZA JAKOŚĆ)
    if GOOGLE_VISION_AVAILABLE:
        # Sprawdzamy czy mamy szansę na auth (czy plik istnieje lub zmienna środowiskowa)
        if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or os.path.exists("google-cloud-key.json"):
            print("🚀 Próba OCR: Google Cloud Vision...")
            text, err = extract_text_from_google_vision(img_bytes)
            if text and not err:
                print("✅ OCR: Google Cloud Vision sukces")
                return text.strip(), None
            else:
                print(f"⚠️ Google Vision failed, falling back... Error: {err}")

    # 2. Próba użycia Surya (zalecane lokalnie)
    if SURYA_AVAILABLE:
        try:
            det_predictor, rec_predictor, _ = get_surya_models()
            if det_predictor and rec_predictor:
                langs = _surya_models["langs"]
                
                # Surya v0.17+ pipeline:
                # 1. Detekcja linii tekstu
                # Upewniamy się, że obraz jest w formacie RGB
                rgb_image = image.convert("RGB")
                
                print("🚀 Próba OCR: Surya...")
                # Surya v0.17+ API: rec(images, det_predictor=det_predictor_obj)
                # RecognitionPredictor sam uruchamia detekcję wewnętrznie
                ocr_results = rec_predictor(
                    [rgb_image],
                    det_predictor=det_predictor
                )
                
                full_text = ""
                for page_result in ocr_results:
                    for line in page_result.text_lines:
                        full_text += line.text + "\n"
                
                if full_text.strip():
                    print("✅ OCR: Surya sukces")
                    return full_text.strip(), None
        except Exception as surya_err:
            print(f"⚠️ Surya OCR error: {surya_err}")
            # Kontynuuj do EasyOCR
        
    # 2. Fallback do EasyOCR
    if EASY_OCR_AVAILABLE:
        try:
            import numpy as np
            image_array = np.array(image.convert("RGB"))
            results = reader.readtext(image_array)
            text = '\n'.join([result[1] for result in results if result[2] > 0.5])
            return text.strip(), None
        except Exception as easy_err:
            print(f"⚠️ EasyOCR PIL error: {easy_err}")
            
    return "", "Nie udało się uzyskać tekstu z obrazu"


def extract_text_from_image(image_content: bytes) -> Tuple[str, Optional[str]]:
    """Ekstrakcja tekstu z obrazu (bytes) przez Surya lub EasyOCR."""
    try:
        image = Image.open(io.BytesIO(image_content))
        return extract_text_from_pil_image(image)
    except Exception as e:
        return "", f"Błąd otwierania obrazu: {str(e)}"


def process_document(file_content: bytes, filename: str, content_type: str) -> Tuple[str, Optional[str]]:
    """
    Główna funkcja przetwarzająca dokument.
    
    Args:
        file_content: Bity pliku
        filename: Nazwa pliku
        content_type: MIME type
    
    Returns:
        Tuple: (ekstraktowany_tekst, błąd)
    """
    filename_lower = filename.lower()
    content_type_lower = content_type.lower()
    
    # PDF
    if (filename_lower.endswith('.pdf') or 
        'application/pdf' in content_type_lower):
        return extract_text_from_pdf(file_content)
    
    # DOCX
    elif (filename_lower.endswith('.docx') or 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' in content_type_lower):
        return extract_text_from_docx(file_content)
    
    # DOC (starszy format) - nie obsługiwany przez python-docx
    elif (filename_lower.endswith('.doc') or 
          'application/msword' in content_type_lower):
        return "", "Format .doc (Word 97-2003) nie jest wspierany. Użyj .docx"
    
    # TXT
    elif (filename_lower.endswith('.txt') or 
          'text/plain' in content_type_lower):
        return extract_text_from_txt(file_content)
    
    # Obrazy
    elif (filename_lower.endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff')) or
          content_type_lower.startswith('image/')):
        return extract_text_from_image(file_content)
    
    else:
        return "", f"Nieobsługiwany format: {filename} (type: {content_type})"


def process_base64_document(base64_content: str, filename: str, content_type: str) -> Tuple[str, Optional[str]]:
    """
    Przetwarzanie dokumentu z base64.
    
    Args:
        base64_content: Zawartość zakodowana w base64
        filename: Nazwa pliku
        content_type: MIME type
    
    Returns:
        Tuple: (ekstraktowany_tekst, błąd)
    """
    try:
        file_content = base64.b64decode(base64_content)
        return process_document(file_content, filename, content_type)
    except Exception as e:
        return "", f"Błąd dekodowania base64: {str(e)}"


if __name__ == "__main__":
    # Testy
    print("Document Processor - testy jednostkowe")
    
    # Test PDF
    test_pdf = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000054 00000 n\n0000000101 00000 n\n0000000200 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n299\n%%EOF"
    
    text, error = process_document(test_pdf, "test.pdf", "application/pdf")
    print(f"PDF test: {text[:50]}... Error: {error}")
