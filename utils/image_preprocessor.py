import io
from PIL import Image, ImageOps, ImageEnhance

def preprocess_image_for_ocr(file_bytes: bytes) -> bytes:
    """
    Koryguje orientacje obrazu (EXIF), dynamicznie dostosowuje rozdzielczość (Lanczos)
    oraz agresywnie koryguje jasność, kontrast i ostrość, aby mały, rozmyty lub
    ciemny tekst na zdjęciu dokumentu stał się idealnie czytelny dla modeli OCR/Vision.
    """
    try:
        # Odczyt obrazu z bajtow
        image = Image.open(io.BytesIO(file_bytes))
        
        # 1. Automatyczna korekta orientacji na podstawie EXIF (transpozycja)
        image = ImageOps.exif_transpose(image)
        
        # Konwersja do RGB, aby prawidlowo zapisac jako JPEG i obsłuzyc inne formaty (np. RGBA, CMYK)
        if image.mode != "RGB":
            image = image.convert("RGB")
            
        # 2. Dynamiczne dostosowanie rozdzielczości (Upscaling / Downscaling)
        # Optymalny wymiar dla modeli Vision to przedział 2000px - 3200px na dłuższym boku.
        width, height = image.size
        min_dimension = 2000
        max_dimension = 3200
        
        # Bezpieczne pobranie filtra LANCZOS
        resample_filter = Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else getattr(Image, "LANCZOS", Image.BICUBIC)
        
        # Jeśli zdjęcie jest zbyt małej rozdzielczości (np. drobny druk), powiększamy je (Lanczos Super-Resolution)
        if width < min_dimension or height < min_dimension:
            scale_factor = max(min_dimension / width, min_dimension / height)
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)
            image = image.resize((new_width, new_height), resample_filter)
            print(f"   [IMAGE RESCALE] Powiększono obraz z {width}x{height} do {new_width}x{new_height} (Lanczos Upscaling)")
            
        # Jeśli zdjęcie jest monstrualnie wielkie (np. surowy plik 108Mpix), skalujemy w dół w celu optymalizacji kosztów i limitów API
        elif width > max_dimension or height > max_dimension:
            scale_factor = min(max_dimension / width, max_dimension / height)
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)
            image = image.resize((new_width, new_height), resample_filter)
            print(f"   [IMAGE RESCALE] Zoptymalizowano rozmiar z {width}x{height} do {new_width}x{new_height} (Lanczos Downscaling)")

        # 3. Rozjaśnienie papieru / tła (eliminacja cieni na zdjęciu z telefonu)
        brightness = ImageEnhance.Brightness(image)
        image = brightness.enhance(1.25)
        
        # 4. Agresywne wzmocnienie kontrastu (głęboka czerń czcionek kontra biały papier)
        contrast = ImageEnhance.Contrast(image)
        image = contrast.enhance(2.0)
        
        # 5. Silne wyostrzenie krawędzi liter
        sharpness = ImageEnhance.Sharpness(image)
        image = sharpness.enhance(2.5)
        
        # Zapisz z powrotem do JPEG o wysokiej jakosci
        output_buffer = io.BytesIO()
        image.save(output_buffer, format="JPEG", quality=95)
        
        print("   [IMAGE PREPROCESS] Pomyślnie zoptymalizowano rozdzielczość (Lanczos), kontrast, jasność i ostrość do OCR.")
        return output_buffer.getvalue()
    except Exception as e:
        print(f"   [IMAGE PREPROCESS WARN] Blad podczas preprocessingu obrazu: {e}")
        # W razie jakiegokolwiek bledu zwracamy oryginalne bajty
        return file_bytes

def preprocess_base64_image(base64_str_or_url: str) -> str:
    """
    Dekoduje obraz base64 (lub url danych base64), aplikuje optymalizacje
    orientacji, kontrastu i ostrosci, a nastepnie zwraca gotowy url base64.
    """
    try:
        import base64
        
        header = ""
        pure_b64 = base64_str_or_url
        if "," in base64_str_or_url:
            header, pure_b64 = base64_str_or_url.split(",", 1)
            header += ","
            
        file_bytes = base64.b64decode(pure_b64)
        processed_bytes = preprocess_image_for_ocr(file_bytes)
        processed_b64 = base64.b64encode(processed_bytes).decode("utf-8")
        
        if not header:
            header = "data:image/jpeg;base64,"
            
        return header + processed_b64
    except Exception as e:
        print(f"   [BASE64 IMAGE PREPROCESS WARN] Blad preprocessingu base64: {e}")
        return base64_str_or_url
