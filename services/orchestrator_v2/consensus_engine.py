import logging
from typing import Any, List, Dict
import asyncio

from config import settings

logger = logging.getLogger(__name__)

class ConsensusEngine:
    """
    Consensus Engine (V3.0) - zbiera opinie ekspertów, deduplikuje argumenty
    i tworzy ujednolicony raport (ConsensusReport) dla Głównego Adwokata.
    Zastępuje prostą macierz konfliktów.
    """
    def __init__(self):
        pass

    async def generate_consensus(self, expert_opinions: List[Dict[str, Any]], user_query: str, llm_service: Any) -> str:
        """
        Generuje Consensus Report na podstawie debaty.
        """
        if not expert_opinions:
            return ""
            
        logger.info("[ConsensusEngine] Generowanie Consensus Report z opinii ekspertów...")
            
        from database import get_setting
        from config import settings
        fast_model = settings.resolve_model_id(get_setting("assigned_model_fast"))
        
        # Przygotowanie wsadu
        expert_texts = []
        for i, expert in enumerate(expert_opinions, 1):
            role = expert.get("role", f"Ekspert {i}")
            resp = expert.get("response", "")
            ver_flag = expert.get("verification_flag", "")
            
            flag_str = f" [UWAGA: OPINIA ZAWIERA BŁĄD: {ver_flag}]" if ver_flag and ver_flag.upper().startswith("BŁĄD") else ""
            expert_texts.append(f"--- OPINIA: {role}{flag_str} ---\n{resp}\n")
            
        all_expert_opinions = "\n".join(expert_texts)
        
        consensus_prompt = (
            "Przeanalizuj poniższe niezależne opinie ekspertów w kontekście zapytania użytkownika.\n"
            "Stwórz Protokół Pojednania Debaty (Consensus Report), który wykona semantyczną deduplikację i konsolidację argumentów.\n\n"
            "Wymagany format wyjściowy:\n"
            "1) ZDEDUPLIKOWANE ARGUMENTY: Główne tezy ekspertów. Dla każdego argumentu podaj, z jakim poparciem się spotkał (np. Popiera 3/4 ekspertów).\n"
            "2) ZGODNOŚĆ (Consensus): W jakich aspektach prawnych eksperci są absolutnie zgodni?\n"
            "3) SPRZECZNOŚCI I RYZYKA (Conflicts): Jakie są sprzeczności między ekspertami? Zidentyfikuj je i wskaż rozstrzygnięcie na korzyść klienta.\n"
            "4) LUKI W ANALIZIE (Coverage Gaps): Czego brakuje w opinii ekspertów, co warto żeby Główny Adwokat sprawdził?\n"
            "5) KOŁA RATUNKOWE: Wszystkie ścieżki wyjścia i najbezpieczniejsza opcja dla klienta.\n\n"
            "Protokół musi być merytoryczny i zwięzły, bez zbędnych wstępów. Stanowi on wsad dla Głównego Adwokata."
        )
        
        try:
            res, _ = await llm_service.call_with_fallback(
                fast_model,
                [
                    {"role": "system", "content": consensus_prompt},
                    {"role": "user", "content": f"PYTANIE KLIENTA:\n{user_query}\n\nDEBATA EKSPERTÓW:\n{all_expert_opinions}"}
                ],
                max_tokens=2500,
                temperature=0.15,
                timeout=45.0,
                log_context="ConsensusEngine"
            )
            return f"\n=== RAPORT KONSENSUSU (Consensus Engine) ===\n{res}\n"
        except Exception as e:
            logger.warning(f"[ConsensusEngine] Błąd generowania raportu: {e}")
            return ""

