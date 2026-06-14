"""Etap 1 orchestratora — ekstrakcja załączników."""
from __future__ import annotations

from typing import Any, List, Optional

from services.pipeline.attachments import extract_all_attachments_text


async def run_attachment_stage(
    attachments: Optional[List[Dict[str, Any]]],
    client: Any,
    extracted_text: str,
):
    """Dopisuje tekst z załączników do extracted_text. Yields dict z metadanymi po drodze."""
    if not attachments:
        yield extracted_text
        return
        
    attachment_text = ""
    async for chunk in extract_all_attachments_text(attachments, client):
        if isinstance(chunk, dict):
            yield chunk
        elif isinstance(chunk, str):
            attachment_text += chunk
            
    if attachment_text:
        yield (extracted_text or "") + attachment_text
    else:
        yield extracted_text
