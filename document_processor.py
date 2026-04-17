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
import asyncio
from typing import Optional, Tuple, List
import base64
import threading
import hashlib

from PIL import Image
# Lazy imports for better startup performance
# from PyPDF2 import PdfReader (Moved to function)
# from docx import Document (Moved to function)

# Optymalizacja Surya dla CPU (tryb maksymalnej stabilności)
os.environ["DETECTOR_BATCH_SIZE"] = "1"      # Zminimalizowano błędy indeksowania na CPU
os.environ["RECOGNITION_BATCH_SIZE"] = "1"    # Zminimalizowano błędy indeksowania na CPU
os.environ["OMP_NUM_THREADS"] = "4"          # Zapobiega przeciążeniu wątków na Windows
os.environ["MKL_NUM_THREADS"] = "4"


# Konfiguracja OCR
SURYA_AVAILABLE = False
EASY_OCR_AVAILABLE = False
GOOGLE_VISION_AVAILABLE = False
AI_VISION_OCR_AVAILABLE = True  # Nowy silnik oparty o Gemini/GPT-4o via OpenRouter

# Cache dla wyników OCR (żeby uniknąć podwójnego przetwarzania tego samego dokumentu)
MAX_OCR_CACHE_SIZE = 50 
_ocr_cache = {}
_ocr_cache_order = [] # Prosta implementacja list-based LRU dla uniknięcia nowych zależności
_ocr_cache_lock = threading.Lock()


def get_cached_ocr_result(content: bytes, ocr_func, *args, **kwargs) -> Tuple[str, Optional[str]]:
    """Pobiera wynik OCR z cache'a lub oblicza go (z limitem rozmiaru)."""
    content_hash = hashlib.md5(content).hexdigest()
    with _ocr_cache_lock:
        if content_hash in _ocr_cache:
            print("OCR Cache: Użyto cache'a dla dokumentu")
            # Przesuń na koniec (najświeższe)
            if content_hash in _ocr_cache_order:
                _ocr_cache_order.remove(content_hash)
            _ocr_cache_order.append(content_hash)
            return _ocr_cache[content_hash]
    
    # Oblicz wynik
    result = ocr_func(*args, **kwargs)
    
    # Zapisz w cache
    with _ocr_cache_lock:
        if len(_ocr_cache) >= MAX_OCR_CACHE_SIZE:
            # Usuń najstarszy element (z początku listy)
            oldest = _ocr_cache_order.pop(0)
            _ocr_cache.pop(oldest, None)
            
        _ocr_cache[content_hash] = result
        if content_hash not in _ocr_cache_order:
            _ocr_cache_order.append(content_hash)
    
    return result


# Modele Surya (Singleton/Lazy Loading)
_surya_models = {"det": None, "rec": None, "layout": None, "langs": ["pl", "en"]}
_surya_lock = threading.Lock()


def get_surya_models():
    """Zwraca modele Surya (ładowane leniwie)."""
    with _surya_lock:
        if _surya_models["det"] is None:
            try:
                from surya.models import load_predictors

                print("Inicjalizacja modeli Surya (OCR + Layout)...")
                predictors = load_predictors()
                _surya_models["det"] = predictors.get("detection")
                _surya_models["rec"] = predictors.get("recognition")
                _surya_models["layout"] = predictors.get("layout")
            except Exception as e:
                print(f"⚠️ Błąd podczas ładowania modeli Surya: {e}")
                return None, None, None
        return _surya_models["det"], _surya_models["rec"], _surya_models["layout"]


# 1. Sprawdź dostępność Surya (Leniwie przy pierwszym użyciu)
SURYA_AVAILABLE = True # Zakładamy dostępność jeśli zainstalowane, sprawdzimy przy imporcie
try:
    import importlib.util
    SURYA_AVAILABLE = importlib.util.find_spec("surya") is not None
    if SURYA_AVAILABLE:
        print("[OK] Surya OCR detected (Initialization deferred)")
except:
    SURYA_AVAILABLE = False

# 2. Fallback do EasyOCR (stary system)
if not SURYA_AVAILABLE:
    import importlib.util
    EASY_OCR_AVAILABLE = importlib.util.find_spec("easyocr") is not None
    if EASY_OCR_AVAILABLE:
        print("[OK] EasyOCR detected (jako fallback)")


def get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is not None:
        return _easyocr_reader

    try:
        import easyocr
        _easyocr_reader = easyocr.Reader(["pl", "en"])
        return _easyocr_reader
    except Exception as e:
        print(f"⚠️ Nie można zainicjalizować EasyOCR: {e}")
        return None


async def extract_text_via_ai(image_bytes: bytes) -> Tuple[str, Optional[str]]:
    """Wykorzystuje Vision LLM (Gemini 2.0 Flash) do precyzyjnego OCR."""
    from moa.config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL
    import httpx
    import json
    import base64

    if not OPENROUTER_API_KEY:
        return "", "Brak klucza OpenRouter dla Vision OCR"

    try:
        # Kodowanie obrazu do base64
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        # Używamy Gemini 2.0 Flash - jest najszybszy i świetny w OCR
        model = "google/gemini-2.0-flash-001"
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": "Odczytaj CAŁY tekst z tego obrazu. Zachowaj układ (akapity, nagłówki). Zwróć TYLKO odczytany tekst, bez żadnych komentarzy. Jeśli to dokument urzędowy, zwróć szczególną uwagę na sygnatury akt, daty i pieczątki."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            "temperature": 0.0
        }

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer": "http://127.0.0.1:8003",
            "X-Title": "LexMind AI OCR",
            "Content-Type": "application/json"
        }

        print(f"[AI OCR] Wysyłanie strony do {model}...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            result_json = response.json()
            
            text = result_json['choices'][0]['message']['content']
            if text:
                print(f"[OK] [AI OCR] Sukces ({len(text)} znaków)")
                return text.strip(), None
            return "", "AI OCR zwróciło pustą odpowiedź"

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 403:
            msg = "Przekroczono limit klucza OpenRouter (monthly limit) lub brak uprawnień!"
            print(f"[ERR] [AI OCR] {msg}")
            return "", msg
        elif e.response.status_code == 401:
            msg = "Nieprawidłowy klucz API OpenRouter!"
            print(f"[ERR] [AI OCR] {msg}")
            return "", msg
        elif e.response.status_code == 402:
            msg = "Brak środków na koncie OpenRouter (Insufficient Balance)!"
            print(f"[ERR] [AI OCR] {msg}")
            return "", msg
        print(f"[ERR] [AI OCR] HTTP Error {e.response.status_code}")
        return "", f"Błąd OpenRouter: Status {e.response.status_code}"
    except Exception as e:
        print(f"[ERR] [AI OCR] Błąd: {e}")
        return "", f"Błąd Vision OCR: {str(e)}"


async def extract_text_via_ocr_space(image_bytes: bytes) -> Tuple[str, Optional[str]]:
    """Wykorzystuje darmowe/tanie API OCR.space jako szybki fallback cloud."""
    from moa.config import OCR_SPACE_API_KEY
    import httpx
    import base64

    if not OCR_SPACE_API_KEY:
        return "", "Brak klucza OCR.space"

    try:
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        payload = {
            "apikey": OCR_SPACE_API_KEY,
            "base64Image": f"data:image/jpeg;base64,{base64_image}",
            "language": "pol",
            "isOverlayRequired": False,
            "OCREngine": 2 # Engine 2 jest lepszy dla złożonych układów i tabel
        }

        print("[CLOUD] [OCR.space] Wysyłanie obrazu do OCR.space...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.ocr.space/parse/image",
                data=payload
            )
            response.raise_for_status()
            result_json = response.json()
            
            if result_json.get("IsErroredOnProcessing"):
                err = result_json.get("ErrorMessage", ["Nieznany błąd OCR.space"])[0]
                return "", f"OCR.space Error: {err}"
            
            # Pobierz tekst ze wszystkich stron (zazwyczaj jedna dla obrazu)
            parsed_results = result_json.get("ParsedResults", [])
            text = "\n".join([r.get("ParsedText", "") for r in parsed_results])
            
            if text.strip():
                print(f"[OK] [OCR.space] Sukces ({len(text)} znaków)")
                return text.strip(), None
            return "", "OCR.space nie znalazł tekstu"

    except Exception as e:
        print(f"[ERR] [OCR.space] Błąd: {e}")
        return "", f"Błąd OCR.space: {str(e)}"


async def extract_text_from_pdf(pdf_content: bytes) -> Tuple[str, Optional[str]]:
    """Ekstrakcja tekstu z PDF (z auto-detekcją skanów i OCR)."""
    try:
        import fitz  # PyMuPDF
        from PIL import Image
        doc = fitz.open(stream=pdf_content, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text() + "\n"

        # Jeśli PDF jest pusty lub ma bardzo mało tekstu (prawdopodobnie skan), spróbuj OCR
        if (not text.strip() or len(text.strip()) < 50) and (SURYA_AVAILABLE or EASY_OCR_AVAILABLE or AI_VISION_OCR_AVAILABLE):
            print(f"PDF ma zbyt mało tekstu ({len(text.strip())} zn.). Uruchamiam silnik OCR...")
            
            # Sprawdź cache dla OCR
            content_hash = hashlib.md5(pdf_content).hexdigest()
            cache_key = f"pdf_ocr_{content_hash}"
            with _ocr_cache_lock:
                if cache_key in _ocr_cache:
                    print("PDF OCR Cache: Użyto cache'a dla dokumentu")
                    cached_result = _ocr_cache[cache_key]
                    if cached_result[0]:  # Jeśli jest tekst
                        return cached_result
            
            try:
                import fitz  # PyMuPDF

                doc = fitz.open(stream=pdf_content, filetype="pdf")
                ocr_text = ""
                page_count = len(doc)
                print(f"[PDF OCR] Przetwarzanie równoległe {page_count} stron...")
                
                async def process_page(page_num):
                    page = doc[page_num]
                    # Renderuj stronę do obrazu (2.0x zoom = 144 DPI - optymalny balans)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    img = resize_image_for_ocr(img)
                    
                    page_text, _ = await extract_text_from_pil_image(img)
                    return page_text or ""

                # Przetwarzaj strony równolegle (max 5 na raz, żeby nie zabić CPU/limitów)
                semaphore = asyncio.Semaphore(5)
                async def sem_process_page(i):
                    async with semaphore:
                        return await process_page(i)

                page_tasks = [sem_process_page(i) for i in range(page_count)]
                page_results = await asyncio.gather(*page_tasks)
                ocr_text = "\n\n".join(page_results)

                ocr_result = (ocr_text.strip(), None) if ocr_text.strip() else ("", "OCR nie znalazł tekstu")
                
                # Zapisz w cache
                with _ocr_cache_lock:
                    _ocr_cache[cache_key] = ocr_result
                
                if ocr_text.strip():
                    return ocr_result
            except Exception as ocr_err:
                print(f"⚠️ Błąd OCR w PDF: {ocr_err}")

        return text.strip(), None
    except Exception as e:
        return "", f"Błąd PDF: {str(e)}"


def extract_text_from_docx(docx_content: bytes) -> Tuple[str, Optional[str]]:
    """Ekstrakcja tekstu z DOCX."""
    try:
        from docx import Document
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
        text = txt_content.decode("utf-8")
        return text.strip(), None
    except UnicodeDecodeError:
        try:
            text = txt_content.decode("latin-1")
            return text.strip(), None
        except Exception as e:
            return "", f"Błąd kodowania TXT: {str(e)}"
    except Exception as e:
        return "", f"Błąd TXT: {str(e)}"


def resize_image_for_ocr(image: Image.Image, max_dimension: int = 2000) -> Image.Image:
    """Skaluje obraz w dół, jeśli przekracza zadany wymiar, zachowując proporcje."""
    width, height = image.size
    if width <= max_dimension and height <= max_dimension:
        return image
    
    # Oblicz nowe wymiary
    if width > height:
        new_width = max_dimension
        new_height = int(height * (max_dimension / width))
    else:
        new_height = max_dimension
        new_width = int(width * (max_dimension / height))
        
    print(f"📏 [RESIZE] Skalowanie obrazu z {width}x{height} do {new_width}x{new_height}")
    return image.resize((new_width, new_height), Image.Resampling.LANCZOS)


async def extract_text_from_pil_image(image: Image.Image) -> Tuple[str, Optional[str]]:
    """Ekstrakcja tekstu bezpośrednio z obiektu PIL Image."""
    if not any([SURYA_AVAILABLE, EASY_OCR_AVAILABLE, AI_VISION_OCR_AVAILABLE]):
        return "", "Brak silnika OCR"

    # Optymalizacja rozdzielczości przed przetwarzaniem
    image = resize_image_for_ocr(image)

    # Konwersja do bytes dla silników które tego wymagają (JPEG dla oszczędności pasma w AI OCR)
    img_byte_arr = io.BytesIO()
    image.convert("RGB").save(img_byte_arr, format="JPEG", quality=90)
    img_bytes = img_byte_arr.getvalue()

    # Sprawdź cache
    content_hash = hashlib.md5(img_bytes).hexdigest()
    cache_key = f"pil_ocr_{content_hash}"
    with _ocr_cache_lock:
        if cache_key in _ocr_cache:
            print("PIL OCR Cache: Użyto cache'a dla obrazu")
            return _ocr_cache[cache_key]

    # 1. Próba użycia AI Vision OCR (CHMURA - NAJSZYBSZA I NAJDOKŁADNIEJSZA)
    from moa.config import OPENROUTER_API_KEY
    if AI_VISION_OCR_AVAILABLE and OPENROUTER_API_KEY:
        try:
            print("[CLOUD] [AI OCR] Przesyłanie do chmury (Gemini Vision)...")
            text, err = await extract_text_via_ai(img_bytes)
            if text and not err:
                result = text, None
                with _ocr_cache_lock:
                    _ocr_cache[cache_key] = result
                return result
        except Exception as ai_err:
            print(f"⚠️ AI OCR error: {ai_err}")

    # 2. Próba użycia OCR.space (CHMURA - SZYBKI FALLBACK)
    from moa.config import OCR_SPACE_API_KEY
    if OCR_SPACE_API_KEY:
        try:
            print("[CLOUD] [OCR.space] Próba fallbacku do OCR.space...")
            text, err = await extract_text_via_ocr_space(img_bytes)
            if text and not err:
                result = text, None
                with _ocr_cache_lock:
                    _ocr_cache[cache_key] = result
                return result
        except Exception as ocr_space_err:
            print(f"⚠️ OCR.space error: {ocr_space_err}")

    # 3. Próba użycia Surya (LOKALNY FALLBACK - DARMOWY)
    if SURYA_AVAILABLE:
        try:
            det_predictor, rec_predictor, _ = get_surya_models()
            if det_predictor and rec_predictor:
                # Upewniamy się, że obraz jest w formacie RGB
                # Skalujemy nieco bardziej dla lokalnego OCR (optymalizacja prędkości i stabilności)
                rgb_image = image.convert("RGB")
                if max(rgb_image.size) > 1600:
                    rgb_image = resize_image_for_ocr(rgb_image, max_dimension=1600)

                print(f"[LOCAL] [LOKALNY FALLBACK] Surya (res: {rgb_image.size})...")
                # Surya jest CPU-intensive, odpalamy w osobnym wątku
                ocr_results = await asyncio.to_thread(rec_predictor, [rgb_image], det_predictor=det_predictor)

                full_text = ""
                for page_result in ocr_results:
                    for line in page_result.text_lines:
                        # Pomijamy linie o bardzo niskiej pewności (< 20%)
                        if hasattr(line, 'confidence') and line.confidence < 0.2:
                            continue
                        full_text += line.text + "\n"

                if full_text.strip():
                    print("[OK] [LOKALNY FALLBACK] Surya sukces")
                    result = full_text.strip(), None
                    with _ocr_cache_lock:
                        _ocr_cache[cache_key] = result
                    return result
        except Exception as surya_err:
            print(f"⚠️ Surya OCR error: {surya_err}")

    # 3. Fallback do EasyOCR
    if EASY_OCR_AVAILABLE:
        try:
            import numpy as np

            reader = get_easyocr_reader()
            if reader is not None:
                image_array = np.array(image.convert("RGB"))
                results = await asyncio.to_thread(reader.readtext, image_array)
                text = "\n".join([result[1] for result in results if result[2] > 0.5])
                result = text.strip(), None
                with _ocr_cache_lock:
                    _ocr_cache[cache_key] = result
                return result
            else:
                print("⚠️ EasyOCR reader nie jest dostępny")
        except Exception as easy_err:
            print(f"⚠️ EasyOCR PIL error: {easy_err}")

    # 4. Finalna informacja o błędzie (jeśli wszystkie zawiodły)
    last_error = "Wszystkie systemy OCR (AI, Surya, EasyOCR) zawiodły lub są przekroczone limity."
    print(f"[ERR] {last_error}")
    result = "", last_error
    with _ocr_cache_lock:
        _ocr_cache[cache_key] = result
    return result


async def extract_text_from_image(image_content: bytes) -> Tuple[str, Optional[str]]:
    """Ekstrakcja tekstu z obrazu (bytes) przez Surya lub EasyOCR."""
    # Sprawdź cache
    content_hash = hashlib.md5(image_content).hexdigest()
    cache_key = f"image_ocr_{content_hash}"
    with _ocr_cache_lock:
        if cache_key in _ocr_cache:
            print("Image OCR Cache: Użyto cache'a dla obrazu")
            return _ocr_cache[cache_key]
    
    try:
        from PIL import Image
        image = Image.open(io.BytesIO(image_content))
        result = await extract_text_from_pil_image(image)
        
        # Zapisz w cache
        with _ocr_cache_lock:
            _ocr_cache[cache_key] = result
        
        return result
    except Exception as e:
        return "", f"Błąd otwierania obrazu: {str(e)}"


async def process_document(
    file_content: bytes, filename: str, content_type: str
) -> Tuple[str, Optional[str]]:
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
    if filename_lower.endswith(".pdf") or "application/pdf" in content_type_lower:
        return await extract_text_from_pdf(file_content)

    # DOCX
    elif (
        filename_lower.endswith(".docx")
        or "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        in content_type_lower
    ):
        return extract_text_from_docx(file_content)

    # DOC (starszy format) - nie obsługiwany przez python-docx
    elif filename_lower.endswith(".doc") or "application/msword" in content_type_lower:
        return "", "Format .doc (Word 97-2003) nie jest wspierany. Użyj .docx"

    # TXT
    elif filename_lower.endswith(".txt") or "text/plain" in content_type_lower:
        # Dekodowanie tekstu jest szybkie, nie wymaga async, ale używamy await dla spójności i przyszłej rozbudowy
        return extract_text_from_txt(file_content)

    # Obrazy
    elif filename_lower.endswith(
        (".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff")
    ) or content_type_lower.startswith("image/"):
        return await extract_text_from_image(file_content)

    else:
        return "", f"Nieobsługiwany format: {filename} (type: {content_type})"


async def process_base64_document(
    base64_content: str, filename: str, content_type: str
) -> Tuple[str, Optional[str]]:
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
        return await process_document(file_content, filename, content_type)
    except Exception as e:
        return "", f"Błąd dekodowania base64: {str(e)}"


if __name__ == "__main__":
    # Testy
    print("Document Processor - testy jednostkowe")

    # Test PDF
    test_pdf = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000054 00000 n\n0000000101 00000 n\n0000000200 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n299\n%%EOF"

    text, error = process_document(test_pdf, "test.pdf", "application/pdf")
    print(f"PDF test: {text[:50]}... Error: {error}")
