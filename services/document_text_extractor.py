from __future__ import annotations

import io
import os
from dataclasses import dataclass

import docx
import pypdf


@dataclass
class DocumentExtractionResult:
    text: str
    error: str | None = None

    @property
    def success(self) -> bool:
        return self.error is None


def save_local_document(file_content: bytes, filename: str, base_dir: str = "pdfs") -> str:
    os.makedirs(base_dir, exist_ok=True)
    path = os.path.join(base_dir, filename)
    with open(path, "wb") as f:
        f.write(file_content)
    return path


def _extract_pdf_text(file_content: bytes) -> str:
    pdf_reader = pypdf.PdfReader(io.BytesIO(file_content))
    page_parts = []
    for i, page in enumerate(pdf_reader.pages, start=1):
        page_text = page.extract_text() or ""
        page_parts.append(f"--- STRONA {i} ---\n{page_text}")
    return "\n\n".join(page_parts).strip()


def _extract_docx_text(file_content: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_content))
    md_lines = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        style_name = (para.style.name or "") if para.style else ""
        if style_name.startswith("Heading"):
            try:
                level = int(style_name.replace("Heading ", ""))
                md_lines.append(f"\n{'#' * level} {text}\n")
            except Exception:
                md_lines.append(f"\n## {text}\n")
        elif "List" in style_name:
            md_lines.append(f"- {text}")
        else:
            is_bold = all(run.bold for run in para.runs if run.text.strip())
            if is_bold and text:
                md_lines.append(f"\n**{text}**\n")
            else:
                md_lines.append(text)
    return "\n".join(md_lines)


async def _extract_image_text(file_content: bytes, filename: str) -> str:
    from moa.http_client import get_shared_openai_client
    from services.ocr_cache import MIN_OCR_CHARS, get_cached_ocr_for_image, set_cached_ocr_for_image
    from services.vision_ocr import run_verbatim_vision_ocr

    # Sprawdź cache lokalny przed wysłaniem do API
    cached_text = get_cached_ocr_for_image(file_content)
    if cached_text:
        print(
            f"   [EXTRACT] Trafienie w cache OCR ({len(cached_text)} znaków)"
        )
        return cached_text

    client = get_shared_openai_client()
    extracted_text = ""
    model_name = None
    last_err = None

    try:
        extracted_text, model_name = await run_verbatim_vision_ocr(client, file_content)
    except Exception as ocr_err:
        last_err = ocr_err
        extracted_text = ""

    if extracted_text.strip() and len(extracted_text.strip()) < MIN_OCR_CHARS:
        print(
            f"   [EXTRACT] OCR za krótki ({len(extracted_text.strip())} < {MIN_OCR_CHARS} zn.)"
        )
        extracted_text = ""

    if extracted_text.strip():
        print(
            f"   [EXTRACT] Sukces OCR (model={model_name}, {len(extracted_text)} znaków)"
        )
        set_cached_ocr_for_image(file_content, extracted_text)
        return extracted_text

    if last_err:
        raise last_err
    raise RuntimeError("Wszystkie modele wizyjne zawiodły lub OCR zbyt krótki")


async def extract_text_from_bytes(
    *,
    file_content: bytes,
    filename: str,
    content_type: str = "",
    binary_placeholder: bool = True,
) -> DocumentExtractionResult:
    extracted_text = ""
    path_lower = filename.lower()

    try:
        if content_type == "application/pdf" or path_lower.endswith(".pdf"):
            print(f"   [EXTRACT] Rozpoczynam odczyt PDF (bez skracania treści): {filename}")
            extracted_text = _extract_pdf_text(file_content)
            print(f"   [EXTRACT] Sukces PDF ({len(extracted_text)} znaków)")
            from services.ocr_cache import MIN_OCR_CHARS

            if len(extracted_text) < MIN_OCR_CHARS:
                print(
                    f"   [EXTRACT WARN] PDF ma mało tekstu ({len(extracted_text)} zn.) — "
                    "możliwy skan; rozważ upload zdjęć stron (OCR wizyjny)."
                )
        elif (
            content_type
            == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            or path_lower.endswith(".docx")
        ):
            print(f"   [EXTRACT] Rozpoczynam odczyt DOCX do Markdown: {filename}")
            extracted_text = _extract_docx_text(file_content)
            print(f"   [EXTRACT] Sukces DOCX ({len(extracted_text)} znaków)")
        elif content_type == "text/plain" or path_lower.endswith(".txt"):
            print(f"   [EXTRACT] Rozpoczynam odczyt TXT: {filename}")
            extracted_text = file_content.decode("utf-8", errors="ignore")
        elif (content_type and content_type.startswith("image/")) or path_lower.endswith(
            (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic", ".tiff", ".tif")
        ):
            print(f"   [EXTRACT] Rozpoczynam dosłowny OCR wizyjny obrazu: {filename}")
            try:
                extracted_text = await _extract_image_text(file_content, filename)
            except Exception as vision_err:
                print(f"   [EXTRACT ERR] Błąd analizy wizyjnej obrazu: {vision_err}")
                extracted_text = (
                    f"[Plik graficzny {filename}. Nie udało się wyekstrahować tekstu podczas przesyłania: "
                    f"{vision_err}]"
                )
        elif binary_placeholder:
            extracted_text = f"[V2: Plik binarny {filename}]"
        else:
            extracted_text = file_content.decode("utf-8")

        return DocumentExtractionResult(text=extracted_text)
    except Exception as extract_err:
        error = f"Błąd ekstrakcji: {extract_err}"
        print(f"   [EXTRACT ERROR] {error}")
        return DocumentExtractionResult(text="", error=error)
