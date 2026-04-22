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
    FREE_FALLBACK_MODELS,
)
from moa.models import MOARequest, MOAResult, StepDiagnostic
from moa.retrieval import retrieve_legal_context
from moa.llm_agents import run_parallel_analysis
from moa.synthesizer import synthesize_judgment
from moa.prompt_builder import IdentityMode, build_judge_system_prompt
from moa.architect import run_architect_analysis
from moa.context_synthesizer import filter_and_compress_context
from moa.checker import run_consistency_check
from moa.query_parser import parse_user_query


async def run_moa_pipeline(request: MOARequest) -> MOAResult:
    """
    Pełen pipeline Mixture of Agents z diagnostyką i automatycznym wyborem modeli.
    """
    pipeline_start = time.perf_counter()
    diagnostics = []
    judge_model = request.judge_model or DEFAULT_JUDGE_MODEL

    try:
        # --- MODEL SELECTION LOGIC ---
        analyst_models = request.analyst_models

        # Automatyczny wybór modeli jeśli nie podano konkretnych
        if not analyst_models or len(analyst_models) == 0:
            if request.model_latencies:
                # Wybieramy top 5 najszybszych dostępnych modeli z listy fallbacków
                available_fallbacks = [
                    m
                    for m in FREE_FALLBACK_MODELS
                    if request.model_latencies.get(m, -1) != -1
                ]
                if available_fallbacks:
                    analyst_models = sorted(
                        available_fallbacks,
                        key=lambda m: request.model_latencies.get(m, 999999),
                    )[:5]
                    print(
                        f"   [AUTO-SELECT] Wybrano 5 najszybszych modeli na podstawie połączenia."
                    )
                else:
                    analyst_models = DEFAULT_ANALYST_MODELS[:5]
            else:
                analyst_models = DEFAULT_ANALYST_MODELS[:5]

        # Sortowanie wybranych modeli (jeśli mamy dane o latencji)
        if request.model_latencies:
            analyst_models = sorted(
                analyst_models,
                key=lambda m: request.model_latencies.get(m, float("inf")),
            )
            print(f"   [SPEED SORT] Modele posortowane według latencji.")

        print(f"\n{'=' * 60}")
        print(f"[START] MOA Pipeline (Models: {len(analyst_models)})")
        print(f"   Pytanie: {request.query[:100]}...")
        print(f"{'=' * 60}")

        # --- NODE 1: QUERY PARSER ---
        step_start = time.perf_counter()
        print(f"[WAIT] WĘZEŁ 1: Parsowanie zapytania...")
        try:
            parsed_query = await parse_user_query(
                request.query, api_keys=request.api_keys
            )
            is_legal = parsed_query.get("is_legal_query", True)
            status = "ok"
        except Exception as pq_err:
            print(f"[WARN] WĘZEŁ 1 błąd: {pq_err}")
            parsed_query = {
                "is_legal_query": True,
                "supabase_vector_query": request.query,
            }
            status = "warning"

        diagnostics.append(
            StepDiagnostic(
                step_name="Query Parser",
                latency_ms=(time.perf_counter() - step_start) * 1000,
                status=status,
                details=f"is_legal: {parsed_query.get('is_legal_query')}",
            )
        )

        # --- NODE 2: RETRIEVAL ---
        step_start = time.perf_counter()
        if request.context_text:
            context_text = request.context_text
            chunks = []
            has_legal_context = True
            print(f"[OK] Pominięto retrieval (kontekst przekazany bezpośrednio).")
        else:
            print(f"[WAIT] KROK 2: Przeszukiwanie bazy wiedzy (RAG)...")
            try:
                chunks, context_text = await retrieve_legal_context(
                    query=request.query,
                    category=request.category,
                    document_text=request.document_text,
                    include_user_db=request.include_user_db,
                    parsed_params=parsed_query,
                )
                has_legal_context = bool(context_text.strip())
                status = "ok"
            except Exception as rag_err:
                print(f"[ERR] RAG nie zadzialal: {str(rag_err)}")
                chunks, context_text, has_legal_context = [], "", False
                status = "error"

        diagnostics.append(
            StepDiagnostic(
                step_name="Retrieval (RAG)",
                latency_ms=(time.perf_counter() - step_start) * 1000,
                status=status,
                details=f"Found {len(chunks)} chunks",
            )
        )

        # --- NODE 3: CONTEXT SYNTHESIZER ---
        if has_legal_context and not request.context_text:
            step_start = time.perf_counter()
            print(f"[WAIT] KROK 3: Kompresja i filtracja kontekstu...")
            try:
                context_text = await filter_and_compress_context(
                    query=request.query,
                    raw_context=context_text,
                    api_keys=request.api_keys,
                )
                status = "ok"
            except Exception as e:
                print(f"[WARN] Context Synth błąd: {e}")
                status = "warning"

            diagnostics.append(
                StepDiagnostic(
                    step_name="Context Synthesizer",
                    latency_ms=(time.perf_counter() - step_start) * 1000,
                    status=status,
                )
            )

        # --- NODE 4: ARCHITECT ---
        architect_plan = None
        if has_legal_context or request.document_text:
            step_start = time.perf_counter()
            print(f"[WAIT] KROK 4: Architect Analysis...")
            try:
                architect_plan = await run_architect_analysis(
                    query=request.query,
                    document_text=request.document_text or "",
                    context_text=context_text,
                    expert_count=len(analyst_models),
                    api_keys=request.api_keys,
                )
                status = "ok" if architect_plan.success else "warning"
            except Exception as arch_err:
                print(f"[WARN] Architect nie zadziałał: {arch_err}")
                status = "error"

            diagnostics.append(
                StepDiagnostic(
                    step_name="Architect",
                    latency_ms=(time.perf_counter() - step_start) * 1000,
                    status=status,
                    details=f"Task: {architect_plan.recommended_task if architect_plan else 'default'}",
                )
            )

        # --- NODE 5: ANALYSIS (Parallel) ---
        step_start = time.perf_counter()
        async with AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
            timeout=LLM_TIMEOUT,
        ) as shared_client:
            print(
                f"[WAIT] KROK 5: Analiza równoległa ({len(analyst_models)} ekspertów)..."
            )
            analyst_results = await run_parallel_analysis(
                context=context_text,
                query=request.query,
                models=analyst_models,
                client=shared_client,
                document_text=request.document_text,
                history=request.history[-10:],
                expert_roles=request.expert_roles,
                expert_role_prompts=request.expert_role_prompts,
                mode=IdentityMode.from_str(request.mode or "advocate"),
                api_keys=request.api_keys,
                attachments=request.attachments,
                architect_plan=architect_plan,
                model_latencies=request.model_latencies,
                user_id=request.user_id,
            )
            success_count = sum(1 for r in analyst_results if r.success)
            status = "ok" if success_count > 0 else "error"

            diagnostics.append(
                StepDiagnostic(
                    step_name="Analyst Layer",
                    latency_ms=(time.perf_counter() - step_start) * 1000,
                    status=status,
                    details=f"Success: {success_count}/{len(analyst_results)}",
                )
            )

            # --- NODE 6: JUDGE / SYNTHESIS ---
            step_start = time.perf_counter()
            print(f"[WAIT] KROK 6: Opinia Głównego Mecenasa ({judge_model})...")
            current_mode = IdentityMode.from_str(request.mode or "advocate")
            try:
                final_answer = await synthesize_judgment(
                    client=shared_client,
                    query=request.query,
                    analyst_results=analyst_results,
                    raw_context=context_text,
                    judge_model=judge_model,
                    judge_system_prompt=request.judge_system_prompt
                    or build_judge_system_prompt(current_mode),
                    mode=current_mode,
                    api_keys=request.api_keys,
                )
                status = "ok"
            except Exception as j_err:
                print(f"[ERR] Błąd krytyczny Mecenasa: {str(j_err)}")
                final_answer = f"Błąd syntezy Mecenasa: {str(j_err)}"
                status = "error"

            diagnostics.append(
                StepDiagnostic(
                    step_name="Judge (Synthesis)",
                    latency_ms=(time.perf_counter() - step_start) * 1000,
                    status=status,
                    details=f"Model: {judge_model}",
                )
            )

            # --- NODE 7: CONSISTENCY GUARD ---
            step_start = time.perf_counter()
            print("[WAIT] KROK 7: Fact-checking...")
            try:
                verification = await run_consistency_check(
                    context_text=context_text,
                    draft_analysis=final_answer,
                    api_keys=request.api_keys,
                )
                if not verification.get("is_consistent", True) and verification.get(
                    "corrected_draft"
                ):
                    final_answer = verification["corrected_draft"]
                status = "ok"
            except Exception as check_err:
                print(f"[WARN] Consistency Guard błąd: {check_err}")
                status = "warning"

            diagnostics.append(
                StepDiagnostic(
                    step_name="Consistency Guard",
                    latency_ms=(time.perf_counter() - step_start) * 1000,
                    status=status,
                )
            )

            # --- NODE 8: ELI ---
            step_start = time.perf_counter()
            print("[WAIT] KROK 8: Wyjaśnienie ELI...")
            try:
                from moa.eli import generate_eli_explanation

                eli_explanation = await generate_eli_explanation(
                    final_answer=final_answer,
                    retrieved_chunks=chunks,
                    query=request.query,
                )
                status = "ok"
            except Exception as e_err:
                print(f"[ERR] Blad warstwy ELI: {str(e_err)}")
                eli_explanation = "Nie udalo sie wygenerowac wyjasnienia ELI."
                status = "error"

            diagnostics.append(
                StepDiagnostic(
                    step_name="ELI (Explainable AI)",
                    latency_ms=(time.perf_counter() - step_start) * 1000,
                    status=status,
                )
            )

        # Build Source References
        from moa.models import SourceReference

        cited_sources_out = []
        for chunk in chunks:
            if chunk.ref_id:
                cited_sources_out.append(
                    SourceReference(
                        ref_id=chunk.ref_id,
                        label=chunk.source,
                        source_type=chunk.source_type,
                        snippet=chunk.content[:150] + "...",
                        url=chunk.source_url,
                    )
                )

        pipeline_latency = (time.perf_counter() - pipeline_start) * 1000
        print(f"[SUCCESS] Pipeline finished in {pipeline_latency:.0f}ms")

        return MOAResult(
            final_answer=final_answer,
            judge_model=judge_model,
            analyst_results=analyst_results,
            sources=sorted(set(c.source for c in chunks)),
            cited_sources=cited_sources_out,
            total_context_chars=len(context_text),
            retrieved_chunks_count=len(chunks),
            pipeline_latency_ms=pipeline_latency,
            success=True,
            eli_explanation=eli_explanation,
            diagnostics=diagnostics,
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
            diagnostics=diagnostics,
        )
