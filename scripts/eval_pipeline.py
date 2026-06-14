import asyncio
import json
import logging
import sys
from typing import Any, Dict, List

# Konfiguracja logowania
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Symulacja testowego zestawu danych (Golden Dataset)
# W przyszłości można to pobierać z Supabase
TEST_DATASET = [
    {
        "case_id": "TEST-001",
        "description": "Zatrzymanie prawa jazdy za prędkość w terenie zabudowanym. Klient twierdzi, że radar był źle skalibrowany, a znak zasłonięty.",
        "expected_high_arguments": [
            "Brak ważnej homologacji lub kalibracji radaru",
            "Znak ograniczenia prędkości był niewidoczny (zasłonięty)"
        ],
        "expected_tone": "formal_defense",
        "rag_context_chunks": ["art. 135 pkt 1 pr. o r.d.", "art. 65 kw"]
    },
    {
        "case_id": "TEST-002",
        "description": "Spór o zachowek. Powód domaga się 100 tys. zł, ale spadkodawca w testamencie wydziedziczył powoda z powodu rażącej niewdzięczności.",
        "expected_high_arguments": [
            "Wydziedziczenie w testamencie z powodu rażącej niewdzięczności",
            "Brak prawa do zachowku z uwagi na skuteczne wydziedziczenie"
        ],
        "expected_tone": "formal_civil",
        "rag_context_chunks": ["art. 991 KC", "art. 1008 KC"]
    }
]

# Prosty prompt ewaluacyjny
EVAL_PROMPT = """
Jesteś obiektywnym sędzią ewaluacyjnym (LLM-as-a-Judge). Twoim zadaniem jest ocena jakości wygenerowanej analizy/debaty prawniczej.

Oto opis sprawy:
{description}

Oczekiwane kluczowe argumenty (HIGH priority), które MUSZĄ pojawić się w debacie:
{expected_args}

Dostępny kontekst RAG (istniejące przepisy dla tej sprawy):
{rag_context}

Oczekiwany ton wypowiedzi: {expected_tone}

Oto wygenerowana debata ekspertów (zrzut JSON z modelu ExpertAnalysis):
{debate_json}

Przeanalizuj i zwróć odpowiedź w formacie JSON z następującymi kluczami:
- "matched_args": lista oczekiwanych argumentów, które ZNALEZIONO.
- "missing_args": lista oczekiwanych argumentów, których NIE ZNALEZIONO.
- "recall_score": ułamek (od 0.0 do 1.0) określający procent znalezionych argumentów obrony.
- "hallucinated_citations": lista przepisów prawa przytoczonych w analizie, których NIE MA w `Dostępny kontekst RAG`.
- "citation_hallucination_rate": ułamek (od 0.0 do 1.0) określający stosunek zmyślonych przepisów do wszystkich zacytowanych.
- "tone_drift_score": ułamek (od 0.0 do 1.0), gdzie 0.0 to idealnie zachowany formalny ton prawniczy (draft), a 1.0 to całkowity zjazd w stronę nieformalną (citizen, np. zbyt wiele wyjaśnień w nawiasach).
- "reasoning": krótkie uzasadnienie twoich ocen.

Musisz zwrócić wyłącznie prawidłowy JSON, żadnego dodatkowego tekstu.
"""

async def mock_run_expert_debate(case_desc: str) -> str:
    """Symuluje uruchomienie debaty ekspertów z wykorzystaniem nowego schematu JSON.
    W rzeczywistym kodzie należałoby podpiąć wywołanie orchestrator.py / run_agent."""
    from services.llm_client import LLMClientService
    from schemas.moa_contracts import ExpertAnalysis
    from config import settings
    
    # Do celów testowych użyjemy po prostu _llm_client do wygenerowania "fejkowej" odpowiedzi eksperta na temat sprawy
    from moa.http_client import get_shared_openai_client
    client = LLMClientService(get_shared_openai_client())
    messages = [
        {"role": "system", "content": "Jesteś wybitnym prawnikiem analizującym sprawę. Zwróć ustrukturyzowaną analizę z kluczowymi argumentami obrony."},
        {"role": "user", "content": case_desc}
    ]
    
    try:
        response, _ = await client.call_with_fallback(
            settings.default_models[0],
            messages,
            response_format=ExpertAnalysis,
            max_tokens=1500,
            temperature=0.2
        )
        return response
    except Exception as e:
        logger.error(f"Błąd podczas symulacji debaty: {e}")
        return "{}"

async def run_evaluation_for_case(eval_client: Any, case: Dict[str, Any]) -> Dict[str, float]:
    logger.info(f"--- Ewaluacja sprawy: {case['case_id']} ---")
    
    # 1. Uruchomienie debaty
    logger.info("Uruchamianie debaty ekspertów (może potrwać kilka sekund)...")
    debate_json = await mock_run_expert_debate(case['description'])
    
    # 2. Ewaluacja za pomocą "Zimnego" LLM-as-a-judge
    prompt = EVAL_PROMPT.format(
        description=case['description'],
        expected_args=json.dumps(case['expected_high_arguments'], ensure_ascii=False, indent=2),
        rag_context=json.dumps(case.get('rag_context_chunks', []), ensure_ascii=False),
        expected_tone=case.get('expected_tone', 'formal'),
        debate_json=debate_json
    )
    
    from config import settings
    # Używamy modelu ewaluacyjnego (np. claude-3-5-sonnet lub gpt-4o)
    eval_model = settings.default_models[0] 
    
    messages = [
        {"role": "system", "content": "Zwracasz wyłącznie czysty format JSON."},
        {"role": "user", "content": prompt}
    ]
    
    logger.info("Ocenianie wyniku przez LLM-as-a-Judge...")
    response, _ = await eval_client.call_with_fallback(
        eval_model,
        messages,
        response_format={"type": "json_object"},
        max_tokens=800,
        temperature=0.0
    )
    
    try:
        eval_result = json.loads(response)
        recall = float(eval_result.get("recall_score", 0.0))
        chr_score = float(eval_result.get("citation_hallucination_rate", 0.0))
        td_score = float(eval_result.get("tone_drift_score", 0.0))
        
        logger.info(f"Wynik Recall: {recall * 100:.1f}%, CHR: {chr_score * 100:.1f}%, Tone Drift: {td_score * 100:.1f}%")
        logger.info(f"Uzasadnienie: {eval_result.get('reasoning')}")
        if eval_result.get("missing_args"):
            logger.warning(f"Brakujące argumenty: {eval_result.get('missing_args')}")
        if eval_result.get("hallucinated_citations"):
            logger.warning(f"Zmyślone cytaty: {eval_result.get('hallucinated_citations')}")
            
        return {"recall": recall, "chr": chr_score, "tone_drift": td_score}
    except json.JSONDecodeError:
        logger.error(f"Błąd parsowania odpowiedzi ewaluatora: {response}")
        return {"recall": 0.0, "chr": 1.0, "tone_drift": 1.0}

async def main():
    logger.info("Rozpoczynanie potoku ewaluacyjnego (CI/CD Eval Pipeline)")
    from services.llm_client import LLMClientService
    
    from moa.http_client import get_shared_openai_client
    eval_client = LLMClientService(get_shared_openai_client())
    total_metrics = {"recall": 0.0, "chr": 0.0, "tone_drift": 0.0}
    
    for case in TEST_DATASET:
        metrics = await run_evaluation_for_case(eval_client, case)
        total_metrics["recall"] += metrics["recall"]
        total_metrics["chr"] += metrics["chr"]
        total_metrics["tone_drift"] += metrics["tone_drift"]
        
    num_cases = len(TEST_DATASET)
    avg_recall = total_metrics["recall"] / num_cases
    avg_chr = total_metrics["chr"] / num_cases
    avg_td = total_metrics["tone_drift"] / num_cases
    
    logger.info(f"==========================================")
    logger.info(f"Średni Defense Argument Recall: {avg_recall * 100:.1f}% (Cel: >= 95%)")
    logger.info(f"Średni Citation Hallucination Rate: {avg_chr * 100:.1f}% (Cel: <= 5%)")
    logger.info(f"Średni Tone Drift Score: {avg_td * 100:.1f}% (Cel: <= 10%)")
    
    failed = False
    if avg_recall < 0.95:
        logger.error(f"FAIL: Recall ({avg_recall * 100:.1f}%) poniżej progu 95%!")
        failed = True
    if avg_chr > 0.05:
        logger.error(f"FAIL: Citation Hallucination Rate ({avg_chr * 100:.1f}%) powyżej progu 5%!")
        failed = True
    if avg_td > 0.10:
        logger.error(f"FAIL: Tone Drift Score ({avg_td * 100:.1f}%) powyżej progu 10%!")
        failed = True
        
    if failed:
        sys.exit(1)
    else:
        logger.info("SUCCESS: Wszystkie metryki w normie.")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())
