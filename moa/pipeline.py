# ===========================================================================
# MOA Pipeline — Orkiestrator: Retrieval → Analysis → Synthesis
# ===========================================================================
"""
Łączy wszystkie moduły w jeden przepływ:
  1. Retrieval  (moa.retrieval)  → kontekst z Supabase pgvector
  2. Analysis   (moa.llm_agents) → N modeli równolegle
  3. Synthesis  (moa.synthesizer) → sędzia-agregator
"""

import time
import asyncio
from typing import Optional
from openai import AsyncOpenAI

from moa.config import (
    DEFAULT_ANALYST_MODELS,
    DEFAULT_JUDGE_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    LLM_TIMEOUT,
)
from moa.models import MOARequest, MOAResult
from moa.retrieval import retrieve_legal_context
from moa.llm_agents import run_parallel_analysis
from moa.synthesizer import synthesize_judgment


async def run_moa_pipeline(request: MOARequest) -> MOAResult:
    """
    Pełen pipeline Mixture of Agents.
    Implementuje Connection Pooling poprzez dzielenie jednego AsyncOpenAI clienta.
    """
    pipeline_start = time.perf_counter()

    analyst_models = (
        request.analyst_models
        if request.analyst_models is not None
        else DEFAULT_ANALYST_MODELS
    )
    judge_model = request.judge_model or DEFAULT_JUDGE_MODEL

    print(f"\n{'=' * 60}")
    print(f"[START] MOA Pipeline")
    print(f"   Pytanie: {request.query[:100]}...")
    print(
        f"   Dokument: {'TAK (' + str(len(request.document_text)) + ' znaków)' if request.document_text else 'NIE'}"
    )
    print(f"{'=' * 60}")

    try:
        # 1. RETRIEVAL — łącz pytanie z treścią dokumentu, aby wykryć
        #    kluczowe artykuły i skróty kodeksów (KPA, KC, KK…) nawet
        #    jeśli użytkownik nie wymienił ich w pytaniu.
        rag_query = request.query
        if request.document_text:
            rag_query = f"{request.query}\n\n{request.document_text[:8000]}"
        try:
            chunks, context_text = await retrieve_legal_context(rag_query)
            has_legal_context = bool(context_text.strip())
            print(f"   [OK] RAG: {len(chunks)} fragmentów, {len(context_text)} znaków")
        except Exception as rag_err:
            print(f"   [WARN] RAG nie powiódł się, kontynuuję bez kontekstu: {rag_err}")
            chunks = []
            context_text = ""
            has_legal_context = False

        # Inicjalizacja współdzielonego klienta (Connection Pooling)
        async with AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
            timeout=LLM_TIMEOUT,
            default_headers={
                "HTTP-Referer": "http://127.0.0.1:8003",
                "X-Title": "LexMind AI",
            },
        ) as shared_client:
            # 2. ANALYSIS
            analyst_results = await run_parallel_analysis(
                context=context_text,
                query=request.query,
                models=analyst_models,
                task=request.task,
                custom_task_prompt=request.custom_task_prompt,
                architect_prompt=request.architect_prompt,
                system_role_prompt=request.system_role_prompt,
                client=shared_client,
                has_legal_context=has_legal_context,
                document_text=request.document_text,
            )

            # 3. SYNTHESIS (Re-ranking Judge)
            final_answer = await synthesize_judgment(
                client=shared_client,
                query=request.query,
                analyst_results=analyst_results,
                raw_context=context_text,
                judge_model=judge_model,
                has_legal_context=has_legal_context,
                document_text=request.document_text,
            )

        pipeline_latency = (time.perf_counter() - pipeline_start) * 1000
        print(f"[OK] Pipeline zakonczony w {pipeline_latency:.0f}ms")

        return MOAResult(
            final_answer=final_answer,
            judge_model=judge_model,
            analyst_results=analyst_results,
            sources=sorted(set(c.source for c in chunks)),
            total_context_chars=len(context_text),
            retrieved_chunks_count=len(chunks),
            pipeline_latency_ms=pipeline_latency,
            success=True,
        )

    except Exception as e:
        pipeline_latency = (time.perf_counter() - pipeline_start) * 1000
        error_msg = f"{type(e).__name__}: {str(e)}"
        print(f"[ERR] Pipeline FAILED: {error_msg}")
        return MOAResult(
            final_answer=f"[ERR] Blad pipeline'u: {error_msg}",
            judge_model=judge_model,
            success=False,
            error=error_msg,
            pipeline_latency_ms=pipeline_latency,
        )
