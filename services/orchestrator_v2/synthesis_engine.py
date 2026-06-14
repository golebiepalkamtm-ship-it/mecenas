import logging
from typing import AsyncGenerator, Dict, Any

from services.orchestrator_types import OrchestratorInputParams
from .context_builder import InvestigationContext
from .debate_engine import DebateResult

logger = logging.getLogger(__name__)

class SeniorJudgeSynthesis:
    """
    Synteza końcowa pełniąca rolę Głównego Sędziego.
    To tutaj zostaną wpięte interfejsy weryfikacji halucynacji (Judge Metrics).
    """
    def __init__(self):
        pass

    async def synthesize(
        self, 
        params: OrchestratorInputParams, 
        context: InvestigationContext, 
        debate: DebateResult
    ) -> AsyncGenerator[Dict[str, Any], None]:
        logger.info("[SynthesisEngine] Rozpoczynam syntezę końcową i weryfikację metryk...")
        
        # Miejsce na Judge Metrics (Weryfikacja halucynacji przed wygenerowaniem odpowiedzi)
        await self._verify_hallucinations(context, debate)

        yield {"type": "chunk", "text": "*(Generowanie ostatecznej porady przez Twojego Głównego Adwokata...)*\n\n"}
        
        from services.llm_client import LLMClientService
        from moa.http_client import get_shared_openai_client
        import asyncio
        
        client = get_shared_openai_client()
        llm_service = LLMClientService(client=client)
        
        all_expert_opinions = ""
        for expert in debate.expert_opinions:
            role = expert.get("role", "Ekspert")
            resp = expert.get("response", "")
            all_expert_opinions += f"--- OPINIA: {role} ---\n{resp}\n\n"
            
        system_prompt = params.judge_system_prompt or "Jesteś wybitnym adwokatem i osobistym doradcą prawnym klienta. Na podstawie analiz ekspertów i dostarczonych materiałów przygotuj dla niego profesjonalną, wspierającą poradę prawną i strategię działania. Zwracaj się bezpośrednio do klienta."
        
        truncated_context = context.combined_full_text[:40000]
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"ZAPYTANIE UŻYTKOWNIKA:\n{params.user_query}\n\nKONTEKST PRAWNY:\n{truncated_context}\n\nANALIZY EKSPERTÓW (dla Ciebie do wglądu):\n{all_expert_opinions}\n\nPrzygotuj ostateczną poradę prawną i strategię dla klienta."}
        ]
        
        try:
            stream_gen, used_model = await llm_service.call_with_fallback_stream(
                params.aggregator_model or "openai/gpt-4o",
                messages,
                max_tokens=4000,
                temperature=0.3,
                timeout=30.0
            )
            
            async for chunk in stream_gen:
                text = chunk.choices[0].delta.content or ""
                if text:
                    yield {"type": "chunk", "text": text}
                    await asyncio.sleep(0.01) # Small delay for smoother streaming UI
        except Exception as e:
            logger.error(f"[SynthesisEngine] Błąd generowania strumienia sędziego: {e}")
            yield {"type": "chunk", "text": f"\n\n[BŁĄD SYNTEZY: {e}]"}
            await asyncio.sleep(0.5)

    async def _verify_hallucinations(self, context: InvestigationContext, debate: DebateResult):
        """
        Implementacja systemu oceny halucynacji cytowań i jakości kontrargumentów (Judge Metrics).
        """
        logger.info("[SynthesisEngine] Weryfikacja halucynacji (Citation Hallucination Rate) i jakości kontrargumentów...")
        
        # W prawdziwym wdrożeniu użylibyśmy LLM do weryfikacji. 
        # Ponieważ jest to silnik V2, zasymulujemy logikę lub użyjemy prostej weryfikacji heurystycznej 
        # (np. sprawdzenie, czy powoływane artykuły z 'debate' występują w 'context.combined_full_text').
        
        all_expert_text = "\n".join([str(op.get("response", "")) for op in debate.expert_opinions])
        
        import re
        # Proste wyszukiwanie wzorców 'art. X' w wypowiedziach ekspertów
        citations = set(re.findall(r'art\.\s*\d+', all_expert_text, flags=re.IGNORECASE))
        
        hallucinated_citations = []
        for citation in citations:
            if citation.lower() not in context.combined_full_text.lower():
                hallucinated_citations.append(citation)
                
        total_citations = len(citations)
        hallucination_rate = len(hallucinated_citations) / total_citations if total_citations > 0 else 0.0
        
        logger.info(f"[SynthesisEngine] Wskaźnik halucynacji: {hallucination_rate:.2f} ({len(hallucinated_citations)}/{total_citations})")
        
        # Oznaczmy wyniki w obiekcie debaty (na potrzeby zwrotne)
        debate.hallucination_rate = hallucination_rate
        debate.hallucinated_citations = hallucinated_citations
        
        # TODO: Złożona ocena 'Counter-Argument Quality' przy pomocy LLM
        debate.counter_argument_quality = 0.85 # Placeholder

