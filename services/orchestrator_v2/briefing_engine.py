import logging
import json
import re
from typing import List, Optional
from pydantic import BaseModel, Field

from services.llm_client import LLMClientService
from services.orchestrator_types import OrchestratorInputParams

logger = logging.getLogger(__name__)

class CaseBrief(BaseModel):
    analiza_wstepna: str = Field(default="", description="Głęboka analiza detektywistyczna (Chain-of-Thought) - przemyśl logikę, powiązania faktów i domniemane przepisy ZANIM wypełnisz kolejne pola. Zawsze uzupełniaj to pole jako pierwsze.")
    stan_faktyczny: str = Field(default="", description="Zwięzłe streszczenie stanu faktycznego na podstawie załączników i zapytania.")
    cele_analizy: str = Field(default="", description="Główne problemy prawne i tezy do udowodnienia przez ekspertów.")
    wykryte_przepisy_prawne: List[str] = Field(default_factory=list, description="Lista konkretnych przepisów prawnych powołanych w dokumentach. MUSI TO BYĆ WYŁĄCZNIE zapis typu 'art 155 kpk', 'art. 286 Kodeksu karnego', '§ 12'. ZABRONIONE jest dodawanie tu słów opisowych, haseł i wyrazów ogólnych! Zwróć pustą listę, jeśli brak konkretnych artykułów.")

class BriefingEngine:
    """
    Silnik odpowiedzialny za wygenerowanie Karty Sprawy przed główną debatą ekspertów.
    Pomaga ustalić jednoznaczne ramy i cele dla agencji RAG i agentów.
    """
    async def generate_brief(self, params: OrchestratorInputParams, llm_service: LLMClientService, raw_text: str, max_context_chars: Optional[int] = None) -> CaseBrief:
        logger.info("[BriefingEngine] Rozpoczynam generowanie Karty Sprawy (Case Brief)...")
        
        from database import get_setting
        from config import settings
        raw_model = params.aggregator_model or params.selected_model or get_setting("assigned_model_fast")
        model_to_use = settings.resolve_model_id(raw_model)
        
        if max_context_chars is None:
            from services.orchestrator_v2.token_budget import calculate_char_budget
            # Reserve 4000 tokens for CaseBrief generation
            max_context_chars = calculate_char_budget(model_to_use, reserve_output_tokens=4000)
            logger.info(f"[BriefingEngine] Dynamiczny budżet kontekstu dla {model_to_use}: {max_context_chars} znaków.")

        system_prompt = (
            "Jesteś wybitnym Asystentem Śledczym. Twoim zadaniem jest przeczytanie surowych dokumentów i "
            "historii konwersacji, a następnie przygotowanie zwięzłej Karty Sprawy (Case Brief). "
            "Karta ma jednoznacznie określać: stan faktyczny, problemy do rozwiązania oraz TYLKO I WYŁĄCZNIE KONKRETNE "
            "PRZEPISY PRAWNE (np. 'art. 286 Kodeksu karnego', 'art. 104 Kodeksu postępowania administracyjnego'). MASZ ABSOLUTNY ZAKAZ wypisywania w liście przepisów "
            "jakichkolwiek słów opisowych (np. 'odwołanie', 'kradzież', 'wypadek'). Jeśli w tekście nie ma powołanych "
            "żadnych artykułów ani paragrafów, zwróć pustą listę. To kluczowe, aby baza SAOS i ELI nie została zaspamowana śmieciowymi słowami."
        )
        
        user_prompt = (
            f"ZAPYTANIE GŁÓWNE:\n{params.user_query}\n\n"
            f"SUROWE MATERIAŁY (Załączniki i historia):\n{raw_text[:max_context_chars]}\n\n"
            "Wygeneruj Kartę Sprawy (Case Brief) w formacie JSON."
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            result_json, used_model = await llm_service.call_with_fallback(
                model_id=model_to_use,
                messages=messages,
                max_tokens=4000,
                temperature=0.1,
                response_format=CaseBrief,
                log_context="BRIEFING"
            )
            
            # Parsowanie JSON-a w przypadku starszych SDK
            try:
                data = json.loads(result_json)
            except json.JSONDecodeError:
                logger.warning("[BriefingEngine] Model nie zwrócił czystego JSONa. Próba wydobycia...")
                start = result_json.find('{')
                end = result_json.rfind('}')
                if start != -1 and end != -1 and end > start:
                    data = json.loads(result_json[start:end+1])
                else:
                    raise
                    
            brief = CaseBrief(**data)
            
            # Walidacja i filtrowanie przepisów przed zanieczyszczeniem SAOS
            if brief.wykryte_przepisy_prawne:
                brief.wykryte_przepisy_prawne = [
                    p for p in brief.wykryte_przepisy_prawne
                    if re.search(r'art\.|§|\bust\.\s*\d', p, re.IGNORECASE)
                ]
                
            logger.info(f"[BriefingEngine] Sukces. Znaleziono przepisy: {brief.wykryte_przepisy_prawne}")
            return brief
                
        except Exception as e:
            logger.error(f"[BriefingEngine] Błąd generowania Karty Sprawy: {e}")
            logger.warning("[BriefingEngine] Wykorzystano pustą Kartę Sprawy (Fallback) - uwaga, kontekst i słowa kluczowe SAOS mogą być zdegradowane!")
            # Fallback - pusta karta
            return CaseBrief(
                analiza_wstepna="Błąd generowania wstępnego. Silnik LLM nie odpowiedział poprawnie.",
                stan_faktyczny="Nie udało się wygenerować streszczenia ze względu na błąd silnika LLM.",
                cele_analizy="Przeanalizuj dostępne materiały zgodnie z zapytaniem użytkownika.",
                wykryte_przepisy_prawne=[]
            )

