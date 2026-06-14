import asyncio
import re
from typing import List, Optional, Tuple

async def _extract_search_plans(
    user_query: str,
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Buduje zoptymalizowane frazy wyszukiwania z zapytania użytkownika.
    Zwraca (legal_plan, saos_plan, eli_plan) — judgments używa głównie saos_plan.
    """
    q = (user_query or "").strip()
    if not q:
        return None, None, None

    from services.retrieval_service import _external_search_queries

    queries = _external_search_queries(q, q, max_queries=3)
    saos_plan = queries[0] if queries else q[:120]
    eli_plan = queries[1] if len(queries) > 1 else saos_plan
    legal_plan = queries[2] if len(queries) > 2 else None

    if len(q) <= 10:
        return legal_plan, saos_plan, eli_plan

    try:
        from moa.http_client import get_shared_openai_client

        client = get_shared_openai_client()
        completion = await client.chat.completions.create(
            model="google/gemini-2.5-flash-lite",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Wyodrębnij dokładnie 3 krótkie frazy do wyszukiwania prawnego (SAOS/ELI), "
                        "oddzielone przecinkami. Frazy po polsku, konkretne instytucje prawne, "
                        "bez numeracji i bez zdań. Przykład: zaliczenie nadpłaty, egzekucja administracyjna"
                    ),
                },
                {"role": "user", "content": q[:2000]},
            ],
            max_tokens=80,
            temperature=0.1,
        )
        raw = (completion.choices[0].message.content or "").strip()
        if raw:
            parts = [p.strip() for p in re.split(r"[,;]+", raw) if p.strip()]
            if parts:
                saos_plan = parts[0][:120]
                if len(parts) > 1:
                    eli_plan = parts[1][:120]
                if len(parts) > 2:
                    legal_plan = parts[2][:120]
    except Exception as err:
        print(f"   [SAOS AI QUERY] Optymalizacja zapytania nie powiodła się, używam heurystyki: {err}")

    return legal_plan, saos_plan, eli_plan


async def get_text_embeddings(texts: List[str], input_type: str = "search_document") -> List[List[float]]:
    """Embeddingi przez indexing_service (batch gdy wiele tekstów)."""
    from services.indexing_service import indexing_service

    cleaned = [(t or "") for t in texts if (t or "").strip()]
    if not cleaned:
        return []
    if len(cleaned) == 1:
        emb = await indexing_service.get_embedding(cleaned[0])
        return [emb] if emb else []
    try:
        return await indexing_service.get_embeddings_batch(cleaned)
    except Exception:
        results: List[List[float]] = []
        for text in cleaned:
            try:
                emb = await indexing_service.get_embedding(text)
                if emb:
                    results.append(emb)
            except Exception:
                pass
        return results

class RetrievedChunk:
    def __init__(self, content: str, source: str, similarity: float):
        self.content = content
        self.source = source
        self.similarity = similarity
