"""Dzielenie długich dokumentów na fragmenty dla ekspertów MOA."""
from __future__ import annotations

import re
from typing import List, Dict


def chunk_document(
    text: str,
    chunk_size: int = 8000,
    overlap: int = 400,
    max_chunks: int = 5,
) -> List[Dict[str, object]]:
    """Dzieli tekst na fragmenty z lekkim nakładaniem (zachowanie kontekstu na granicach)."""
    cleaned = (text or "").strip()
    if not cleaned:
        return []
    if len(cleaned) <= chunk_size:
        return [{"index": 1, "total": 1, "start": 0, "end": len(cleaned), "text": cleaned}]

    chunks: List[Dict[str, object]] = []
    start = 0
    while start < len(cleaned) and len(chunks) < max_chunks:
        end = min(start + chunk_size, len(cleaned))
        if end < len(cleaned):
            para_break = cleaned.rfind("\n\n", start + chunk_size // 3, end)
            if para_break > start:
                end = para_break
            else:
                line_break = cleaned.rfind("\n", start + chunk_size // 2, end)
                if line_break > start:
                    end = line_break

        piece = cleaned[start:end].strip()
        if piece:
            chunks.append({
                "index": len(chunks) + 1,
                "start": start,
                "end": end,
                "text": piece,
            })

        if end >= len(cleaned):
            break
        start = max(end - overlap, start + 1)

    total = len(chunks)
    for ch in chunks:
        ch["total"] = total
    return chunks


_LEGAL_SEGMENT_RE = re.compile(
    r"(?=\n(?:Art\.|ART\.|§\s*\d|Rozdział|ROZDZIAŁ|Część|CZĘŚĆ|WYROK|SENTENCJA|UZASADNIENIE))",
    re.MULTILINE,
)


def chunk_document_legal_semantic(
    text: str,
    *,
    max_chunk_chars: int = 6000,
    max_chunks: int = 12,
) -> List[Dict[str, object]]:
    """Segmentacja prawnicza (Art., §, rozdziały) — parent-child MVP."""
    cleaned = (text or "").strip()
    if not cleaned:
        return []
    parts = _LEGAL_SEGMENT_RE.split(cleaned)
    segments = [p.strip() for p in parts if p and p.strip()]
    if len(segments) <= 1:
        return chunk_document(cleaned, chunk_size=max_chunk_chars, overlap=300, max_chunks=max_chunks)

    chunks: List[Dict[str, object]] = []
    buf = ""
    for seg in segments:
        if len(buf) + len(seg) + 2 > max_chunk_chars and buf:
            chunks.append(buf.strip())
            buf = seg
        else:
            buf = f"{buf}\n\n{seg}".strip() if buf else seg
        if len(chunks) >= max_chunks:
            break
    if buf.strip() and len(chunks) < max_chunks:
        chunks.append(buf.strip())

    out: List[Dict[str, object]] = []
    total = len(chunks)
    pos = 0
    for i, piece in enumerate(chunks, start=1):
        out.append({
            "index": i,
            "total": total,
            "start": pos,
            "end": pos + len(piece),
            "text": piece,
            "chunking": "legal_semantic",
        })
        pos += len(piece)
    return out


def document_overview(text: str, head_chars: int = 2500, tail_chars: int = 2000) -> str:
    """Skrót początek + koniec dokumentu dla kontekstu globalnego."""
    cleaned = (text or "").strip()
    if not cleaned:
        return ""
    if len(cleaned) <= head_chars + tail_chars + 200:
        return cleaned
    head = cleaned[:head_chars]
    tail = cleaned[-tail_chars:]
    omitted = len(cleaned) - head_chars - tail_chars
    return (
        f"{head}\n\n"
        f"[… pominięto ~{omitted} znaków środka dokumentu — szczegóły w fragmentach ekspertów …]\n\n"
        f"{tail}"
    )
