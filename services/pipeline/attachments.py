"""Etap 1 — ekstrakcja tekstu z załączników (PDF, DOCX, obrazy przez vision OCR, plaintext)."""
from __future__ import annotations

import base64
import io
import logging
from typing import Any, Dict, List, Optional

from config import settings
from services.indexing_service import indexing_service
from services.ocr_cache import (
    MIN_OCR_CHARS,
    get_cached_ocr_for_image,
    set_cached_ocr_for_image,
)
from services.user_kb_cache import (
    fetch_full_text_by_source_hash,
    source_bytes_sha256,
)

logger = logging.getLogger(__name__)


def _attachment_to_bytes(att: Dict[str, Any]) -> tuple[bytes, Optional[Exception]]:
    content = att.get("content") or ""
    if not content:
        return b"", None
    try:
        if "data:" in content:
            pure = content.split(",", 1)[1]
        else:
            pure = content
        return base64.b64decode(pure), None
    except Exception as exc:
        return b"", exc


async def _extract_fast_metadata(file_bytes: bytes, client: Any, filename: str) -> Dict[str, Any]:
    """Szybka ekstrakcja metadanych (sygnatura, sąd) przy użyciu szybkiego modelu."""
    try:
        # We only take the first 4000 bytes as rough text approximation if it's text,
        # but for PDFs/images we might need to rely on the filename first to be really fast.
        # However, calling gpt-4o-mini is fast enough.
        prompt = f"Przeanalizuj nazwę pliku '{filename}' i jeśli to możliwe, wyciągnij sygnaturę akt i nazwę sądu/organu. Zwróć jako JSON z polami 'sygnatura' i 'sad'."
        
        # This is a very simplified fast metadata step to optimize TTFT
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Jesteś asystentem prawnym. Zwracasz wyłącznie poprawny JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=150,
            temperature=0.0
        )
        import json
        content = res.choices[0].message.content
        if content:
            return json.loads(content)
    except Exception as e:
        logger.warning(f"Fast metadata extraction failed: {e}")
    return {}

async def extract_single_attachment(att: Dict[str, Any], client: Any):
    """
    Jedna pozycja z listy `attachments`; zwraca async generator.
    Yields dict z metadanymi, a na końcu string z tekstem.
    """
    content_type = att.get("content_type") or att.get("type") or ""
    filename = (att.get("name") or "temp_doc").lower()
    name_display = att.get("name") or "temp_doc"

    file_bytes, b64_err = _attachment_to_bytes(att)
    if b64_err is not None:
        logger.error("[stage=1] base64_failed file=%s err=%s", name_display, b64_err)
        yield ""
        return

    # Szybka ekstrakcja metadanych (Metadata Extract) i wysłanie do UI (TTFT optimization)
    fast_metadata = await _extract_fast_metadata(file_bytes, client, name_display)
    if fast_metadata:
        fast_metadata["filename"] = name_display
        yield {
            "type": "metadata",
            "message": f"Wstępne rozpoznanie pliku: {name_display}",
            "attachment_metadata": fast_metadata,
            "preliminary": True,
            "hint": "Wstępne wykrycie — weryfikuję dokładniej...",
        }

    source_hash = source_bytes_sha256(file_bytes)
    cached_supabase = await fetch_full_text_by_source_hash(source_hash)
    if cached_supabase and cached_supabase.strip():
        logger.info(
            "[stage=1] user_kb_reuse file=%s hash=%s… chars=%s",
            name_display,
            source_hash[:12],
            len(cached_supabase),
        )
        yield f"\n--- TEKST Z {att.get('name')} ---\n{cached_supabase.strip()}\n"
        return

    text = ""
    skip_kb_index = False

    try:
        if content_type == "application/pdf" or filename.endswith(".pdf"):
            import pypdf

            logger.info("[stage=1] pdf_read file=%s", name_display)
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            page_parts = []
            for i, page in enumerate(pdf_reader.pages, start=1):
                page_text = page.extract_text()
                if page_text is None:
                    page_text = ""
                page_parts.append(f"--- STRONA {i} ---\n{page_text}")
            text = "\n\n".join(page_parts).strip()

        elif (
            content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            or filename.endswith(".docx")
        ):
            import docx

            logger.info("[stage=1] docx_read file=%s", name_display)
            doc = docx.Document(io.BytesIO(file_bytes))
            text = "\n".join(para.text for para in doc.paragraphs)

        elif content_type.startswith("image/") or filename.endswith((".jpg", ".jpeg", ".png", ".webp")):
            ocr_from_cache = get_cached_ocr_for_image(file_bytes)
            if ocr_from_cache:
                text = ocr_from_cache
                skip_kb_index = True
                logger.info("[stage=1] vision_cache file=%s chars=%s", name_display, len(text))
            else:
                logger.info("[stage=1] vision_ocr_start file=%s", name_display)
                try:
                    from services.vision_ocr import run_verbatim_vision_ocr

                    text, model_used = await run_verbatim_vision_ocr(client, file_bytes)
                    if text.strip() and len(text.strip()) < MIN_OCR_CHARS:
                        logger.warning(
                            "[stage=1] vision_short_reply file=%s model=%s chars=%s — próba następnego modelu",
                            name_display,
                            model_used,
                            len(text.strip()),
                        )
                        text = ""
                    if text.strip():
                        logger.info(
                            "[stage=1] vision_ok file=%s model=%s chars=%s",
                            name_display,
                            model_used,
                            len(text),
                        )
                        set_cached_ocr_for_image(file_bytes, text)
                    if not text.strip():
                        raise RuntimeError("Wszystkie modele wizyjne zawiodły lub OCR zbyt krótki")
                except Exception as vision_err:
                    logger.error("[stage=1] vision_fatal file=%s err=%s", name_display, vision_err)
                    text = (
                        f"[Plik graficzny {name_display}. Nie udało się wyekstrahować tekstu: {vision_err}]"
                    )

        else:
            text = file_bytes.decode("utf-8", errors="ignore")

        if text.strip():
            if not skip_kb_index:
                filename_safe = str(att.get("name") or f"attachment_{source_hash[:8]}")
                await indexing_service.index_text(
                    text,
                    filename_safe,
                    source_file_hash=source_hash,
                )
            else:
                logger.info("[stage=1] skip_kb_index file=%s (OCR z cache — indeks z uploadu)", name_display)
            logger.info("[stage=1] extracted_ok file=%s chars=%s", name_display, len(text))
            # Potwierdzenie po pełnym OCR — aktualizuje wstępne wykrycie
            if fast_metadata:
                yield {
                    "type": "metadata",
                    "message": f"Dokładne rozpoznanie pliku: {name_display} ({len(text)} znaków)",
                    "attachment_metadata": fast_metadata,
                    "preliminary": False,
                    "hint": "Dokument zweryfikowany.",
                }
            yield f"\n--- TEKST Z {att.get('name')} ---\n{text}\n"
    except Exception as e:
        logger.error("[stage=1] parse_fail file=%s err=%s", name_display, e)

    yield ""


async def extract_all_attachments_text(attachments: Optional[List[Dict[str, Any]]], client: Any):
    """Łączy teksty ze wszystkich załączników (puste gdy brak attachments). Zwraca async generator."""
    if not attachments:
        yield ""
        return
    parts: List[str] = []
    for att in attachments:
        if not (att.get("content") or "").strip():
            continue
        async for chunk in extract_single_attachment(att, client):
            if isinstance(chunk, dict):
                yield chunk
            elif isinstance(chunk, str) and chunk:
                parts.append(chunk)
    yield "".join(parts)
