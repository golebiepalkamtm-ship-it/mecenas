import asyncio
import os
import time
from moa.prompt_builder import (
    PromptConfig, 
    IdentityMode, 
    build_moa_prompts, 
    build_judge_system_prompt,
    build_system_prompt
)
from moa.pipeline import run_moa_pipeline, MOARequest

async def test_legal_os_workflow():
    print("START TEST: LexMind Legal Operating System v4.0 Flow")
    print("-" * 50)

    # 1. TEST GENEROWANIA PROMPTÓW (MODELS DIFFERENTIATION)
    print("\nKROK 1: Model Personality Injection (Sterydy)")
    models = [
        "anthropic/claude-3-haiku", 
        "openai/gpt-4o-mini", 
        "google/gemini-2.0-flash-lite:preview"
    ]
    
    config = PromptConfig(
        mode=IdentityMode.STRICT,
        task="analysis",
        role="inquisitor",
        has_document=True,
        has_legal_context=True
    )
    
    prompts = build_moa_prompts(models, config)
    
    for mid, prompt in prompts.items():
        m_name = mid.split('/')[-1]
        print(f"OK: {m_name}: Wygenerowano prompt ({len(prompt)} znaków)")
        
        # Sprawdzanie iniekcji osobowości
        if "claude" in mid.lower():
            assert "TOTAL PRECISION" in prompt, f"Brak Precyzji w Claude ({m_name})"
            print(f"   OS: PRECISION Mode detected for Claude")
        if "gpt" in mid.lower():
            assert "CREATIVE INTERPRETATION" in prompt, f"Brak Kreatywności w GPT ({m_name})"
            print(f"   OS: CREATIVE Mode detected for GPT")
        if "gemini" in mid.lower():
            assert "DEVIL'S ADVOCATE" in prompt, f"Brak Kontrargumentacji w Gemini ({m_name})"
            print(f"   OS: CONTRARIAN Mode detected for Gemini")

    # 2. TEST WARSTW (8-LAYER AUDIT)
    print("\nKROK 2: Weryfikacja warstw (8 Layers Audit)")
    sample_prompt = prompts[models[0]]
    layers = [
        "EPISTEMIC CONTROL PROTOCOL",
        "ROLA: INQUISITOR",
        "ZADANIE: GŁĘBOKA ANALIZA DOKUMENTU",
        "REASONING PROTOCOL",
        "SELF-AUDIT PROTOCOL"
    ]
    
    for layer in layers:
        assert layer in sample_prompt, f"Brak warstwy: {layer} w prompcie!"
        print(f"   Warstwa: '{layer}' obecna")

    # 3. TEST SEDZIEGO (JUDGE SUPREME v4.0)
    print("\nKROK 3: Sedzia Paranoiczny v4.0")
    judge_prompt = build_judge_system_prompt()
    assert "JUDGE_PROTOCOL_V4.0" in judge_prompt
    assert "Nie ufaj ekspertom" in judge_prompt
    print(f"   Sedzia: '{judge_prompt[:40]}...' (Aktywny Protocol v4.0)")

    # 4. SYMULACJA RUNTIME (KOMPATYBILNOSC REQUEST)
    print("\nKROK 4: Symulacja Runtime Request")
    request = MOARequest(
        query="Czy ta umowa najmu jest bezpieczna?",
        document_text="Umowa najmu mieszkania za 5000 PLN miesiecznie...",
        task="analysis",
        system_role_prompt="inquisitor",
        analyst_models=models
    )
    print(f"   Request zbudowany pomyslnie (Experts: {len(models)})")
    
    print("\n" + "="*50)
    print("WYNIK: Legal Operating System v4.0 DZIAŁA POPRAWNIE")
    print("Eksperci otrzymuja zroznicowane 'sterydy', Sedzia jest paranoiczny.")
    print("="*50 + "\n")

if __name__ == "__main__":
    asyncio.run(test_legal_os_workflow())
