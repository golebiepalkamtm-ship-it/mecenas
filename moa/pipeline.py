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
from moa.prompt_builder import IdentityMode, build_judge_system_prompt


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
        # 1. RETRIEVAL
        print(f"\n[WAIT] KROK 1: Przeszukiwanie bazy wiedzy (RAG)...")
        rag_query = request.query
        try:
            chunks, context_text = await retrieve_legal_context(
                query=rag_query, 
                category=request.category,
                document_text=request.document_text
            )
            has_legal_context = bool(context_text.strip())
            print(f"[OK] RAG zakonczony. Znaleziono {len(chunks)} fragmentow.")
        except Exception as rag_err:
            print(f"[ERR] RAG nie zadzialal: {str(rag_err)}")
            chunks, context_text, has_legal_context = [], "", False

        # 2. ANALYSIS
        async with AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
            timeout=LLM_TIMEOUT,
        ) as shared_client:
            print(f"[WAIT] KROK 2: Analiza rownolegla ({len(analyst_models)} ekspertow)...")
            # Logujemy przypisane role jeśli istnieją
            if request.expert_roles:
                for m_id in analyst_models:
                    role = request.expert_roles.get(m_id, "default")
                    print(f"       -> Agent: {m_id} | Rola: {role}")
            else:
                print(f"   [INFO] Korzystanie z ustandaryzowanych ról z bazowego PromptBuilder.")

            analyst_results = await run_parallel_analysis(
                context=context_text,
                query=request.query,
                models=analyst_models,
                client=shared_client,
                document_text=request.document_text,
                history=request.history[-10:],
                expert_roles=request.expert_roles,
                expert_role_prompts=request.expert_role_prompts,
                mode=IdentityMode(request.mode or "advocate"),
                api_keys=request.api_keys,
                attachments=request.attachments,
            )
            
            success_count = sum(1 for r in analyst_results if r.success)
            print(f"[OK] Eksperci zakonczyli prace. Sukces: {success_count}/{len(analyst_results)}")

            for res in analyst_results:
                if not res.success:
                    print(f"      [ERR] Model {res.model} zawiodl: {res.response[:100]}...")

            if success_count == 0:
                print("[CRITICAL] Zaden ekspert nie odpowiedzial poprawnie!")

            # 3. SYNTHESIS
            print(f"[WAIT] KROK 3: Synteza sedziego ({judge_model})...")
            current_mode = IdentityMode(request.mode or "advocate")
            try:
                final_answer = await synthesize_judgment(
                    client=shared_client,
                    query=request.query,
                    analyst_results=analyst_results,
                    raw_context=context_text,
                    judge_model=judge_model,
                    judge_system_prompt=request.judge_system_prompt or build_judge_system_prompt(current_mode),
                    mode=current_mode,
                    api_keys=request.api_keys,
                )
                print(f"[OK] Sedzia wygenerowal werdykt ({len(final_answer)} znakow).")
            except Exception as j_err:
                print(f"[ERR] Blad krytyczny sedziego: {str(j_err)}")
                final_answer = f"Blad syntezy sedziego: {str(j_err)}"

            # 4. ELI
            print("[WAIT] KROK 4: Weryfikacja ELI (Explainable AI)...")
            try:
                from moa.eli import generate_eli_explanation
                eli_explanation = await generate_eli_explanation(
                    final_answer=final_answer,
                    retrieved_chunks=chunks,
                    query=request.query
                )
                print("[OK] Warstwa ELI gotowa.")
            except Exception as e_err:
                print(f"[ERR] Blad warstwy ELI: {str(e_err)}")
                eli_explanation = "Nie udalo sie wygenerowac wyjasnienia ELI."

        pipeline_latency = (time.perf_counter() - pipeline_start) * 1000
        print(f"[SUCCESS] Pipeline finished in {pipeline_latency:.0f}ms")
        print(f"{'=' * 60}\n")

        return MOAResult(
            final_answer=final_answer,
            judge_model=judge_model,
            analyst_results=analyst_results,
            sources=sorted(set(c.source for c in chunks)),
            total_context_chars=len(context_text),
            retrieved_chunks_count=len(chunks),
            pipeline_latency_ms=pipeline_latency,
            success=True,
            eli_explanation=eli_explanation, # Dodane wyjaśnienie ELI
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
