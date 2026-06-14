"""Trwały cache OCR dla obrazów — ten sam skan nie wywołuje Vision drugi raz (upload → chat)."""
from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_OCR_DIR = Path("pdfs") / ".ocr_cache"

# Poniżej progu uznajemy OCR za zawodny (np. pusty/krótki bełkot zamiast dokumentu) — nie cache'ujemy.
MIN_OCR_CHARS = 200


def _processed_image_fingerprint(file_bytes: bytes) -> str:
    from utils.image_preprocessor import preprocess_image_for_ocr

    processed = preprocess_image_for_ocr(file_bytes)
    return hashlib.sha256(processed).hexdigest()


def get_cached_ocr_for_image(file_bytes: bytes) -> Optional[str]:
    """Zwraca tekst OCR jeśli istnieje plik cache dla przetworzonego obrazu."""
    if not file_bytes:
        return None
    try:
        fp = _processed_image_fingerprint(file_bytes)
    except Exception as exc:
        logger.debug("[ocr_cache] fingerprint skip: %s", exc)
        return None
    path = _OCR_DIR / f"{fp}.txt"
    if not path.is_file():
        return None
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
        if text.strip() and len(text.strip()) >= MIN_OCR_CHARS:
            logger.info("[ocr_cache] hit fp=%s chars=%s", fp[:12], len(text))
            return text
        if text.strip():
            logger.warning(
                "[ocr_cache] ignoring short cached OCR fp=%s chars=%s (< %s)",
                fp[:12],
                len(text.strip()),
                MIN_OCR_CHARS,
            )
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass
    except OSError as exc:
        logger.warning("[ocr_cache] read fail: %s", exc)
    return None


def set_cached_ocr_for_image(file_bytes: bytes, text: str) -> None:
    """Zapisuje wynik OCR (np. po uploadzie lub po Vision w czacie)."""
    if not file_bytes or not (text or "").strip():
        return
    if len(text.strip()) < MIN_OCR_CHARS:
        logger.warning(
            "[ocr_cache] skip store: too few chars (%s < %s)",
            len(text.strip()),
            MIN_OCR_CHARS,
        )
        return
    try:
        fp = _processed_image_fingerprint(file_bytes)
    except Exception as exc:
        logger.debug("[ocr_cache] save skip fingerprint: %s", exc)
        return
    try:
        _OCR_DIR.mkdir(parents=True, exist_ok=True)
        path = _OCR_DIR / f"{fp}.txt"
        path.write_text(text.replace("\x00", ""), encoding="utf-8")
        logger.info("[ocr_cache] stored fp=%s chars=%s", fp[:12], len(text))
    except OSError as exc:
        logger.warning("[ocr_cache] write fail: %s", exc)
