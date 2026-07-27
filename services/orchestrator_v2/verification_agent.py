import logging
from typing import Any, List, Dict

from config import settings

logger = logging.getLogger(__name__)

class VerificationAgent:
    """
    Verification Agent (Faza 5)
    Sprawdza logikę i prawidłowość prawną argumentów z debaty ekspertów,
    zanim trafią one do Consensus Engine i Głównego Adwokata.
    Oznacza błędne lub zdezaktualizowane argumenty.
    """
    def __init__(self):
        pass

    async def verify_opinions(
        self,
        expert_opinions: List[Dict[str, Any]],
        user_query: str,
        context_text: str,
        llm_service: Any
    ) -> List[Dict[str, Any]]:
        """
        Ocenia argumentację każdego eksperta. Jeśli wykryje krytyczny błąd merytoryczny,
        dodaje informację o błędzie do opinii eksperta (tzw. "Red Flag").
        """
        logger.info("[VerificationAgent] Weryfikacja logiczno-prawna argumentów ekspertów...")
        from database import get_setting
        from config import settings
        import asyncio
        fast_model = settings.resolve_model_id(get_setting("assigned_model_fast"))
        
        async def verify_single(op: Dict[str, Any]) -> Dict[str, Any]:
            prompt = (
                "Jesteś Audytorem Prawnym (Verification Agent).\n"
                "Sprawdź poniższą opinię eksperta pod kątem KRYTYCZNYCH BŁĘDÓW merytorycznych, logicznych lub oparcia o nieistniejące/uchylone przepisy.\n"
                "Odnieś się do kontekstu sprawy.\n"
                "Jeśli opinia zawiera rażący błąd prawny, opisz go krótko zaczynając od słowa 'BŁĄD:'.\n"
                "Jeśli opinia jest merytorycznie dopuszczalna (nawet jeśli kontrowersyjna), zwróć słowo 'ZATWIERDZONO'."
            )
            try:
                res, _ = await llm_service.call_with_fallback(
                    fast_model,
                    [
                        {"role": "system", "content": prompt},
                        {
                            "role": "user",
                            "content": f"ZAPYTANIE KLIENTA:\n{user_query}\n\nKONTEKST SPRAWY:\n{context_text[:3000]}\n\nOPINIA EKSPERTA:\n{op.get('response', '')[:4000]}"
                        }
                    ],
                    max_tokens=250,
                    temperature=0.1,
                    timeout=20.0,
                    log_context="VerificationAgent"
                )
                if "BŁĄD:" in res.upper():
                    import re
                    # Extract the error message starting from BŁĄD:
                    match = re.search(r'(?i)(BŁĄD:.*?)(?:\n|$)', res)
                    error_msg = match.group(1).strip() if match else res.strip()
                    op["verification_flag"] = error_msg
                    logger.warning(f"[VerificationAgent] Wykryto błąd u eksperta {op.get('role')}: {error_msg}")
                else:
                    op["verification_flag"] = "ZATWIERDZONO"
            except Exception as e:
                logger.warning(f"[VerificationAgent] Błąd weryfikacji: {e}")
                op["verification_flag"] = "NIE ZWERYFIKOWANO"
            return op

        coros = [verify_single(op) for op in expert_opinions]
        return await asyncio.gather(*coros)

