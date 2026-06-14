import asyncio
import logging
from typing import AsyncGenerator, Dict, Any

from services.orchestrator_types import OrchestratorInputParams
from .context_builder import LegalContextBuilder
from .debate_engine import DebateEngine
from .synthesis_engine import SeniorJudgeSynthesis

logger = logging.getLogger(__name__)

class OrchestrationPipeline:
    def __init__(self):
        self.context_builder = LegalContextBuilder()
        self.debate_engine = DebateEngine()
        self.synthesis_engine = SeniorJudgeSynthesis()

    async def execute(self, params: OrchestratorInputParams) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Zupełnie nowa, czysta implementacja koordynatora.
        Każdy etap to wywołanie dedykowanego obiektu.
        """
        logger.info(f"[PIPELINE] Rozpoczynam przetwarzanie nową architekturą V2. Task: {params.current_task}")

        # 1. Budowanie Kontekstu
        yield {"type": "metadata", "message": "[Etap 1] Budowanie kontekstu (RAG, SAOS, ELI)..."}
        await asyncio.sleep(0.5)
        context_result = await self.context_builder.build_context(params)
        
        # 2. Debata Ekspertów (MOA)
        yield {"type": "metadata", "message": "[Etap 2] Rozpoczynam równoległą debatę ekspertów..."}
        await asyncio.sleep(0.5)
        debate_result = await self.debate_engine.run_debate(params, context_result)
        
        # Przekażmy częściowe wyniki na frontend (jeśli potrzebne)
        yield {
            "type": "metadata", 
            "expert_analyses": debate_result.expert_opinions
        }
        await asyncio.sleep(0.5)

        # 3. Synteza Końcowa (Sędzia) z Metrykami (Judge Metrics)
        yield {"type": "metadata", "message": "[Etap 3] Synteza końcowa z weryfikacją halucynacji..."}
        await asyncio.sleep(0.5)
        
        async for chunk in self.synthesis_engine.synthesize(params, context_result, debate_result):
            yield chunk
            
        logger.info("[PIPELINE] Przetwarzanie zakończone sukcesem.")
