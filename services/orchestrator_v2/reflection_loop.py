import logging
from typing import Any, Tuple, List, Dict
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class ReflectionResult:
    score: float               # 0.0 - 1.0
    issues: List[str]          # wykryte problemy
    needs_regeneration: bool   # True jeśli score < threshold
    improved_answer: str       # poprawiona odpowiedź (jeśli wygenerowana)

class ReflectionLoop:
    """
    Self-Critic (V3.0) - po wygenerowaniu odpowiedzi przez Głównego Adwokata,
    szybki model ocenia odpowiedź (kompletność, halucynacje, logika).
    Jeśli score jest poniżej progu, zwraca uwagi do regeneracji.
    """
    
    async def evaluate_answer(
        self,
        draft_answer: str,
        user_query: str,
        context_text: str,
        llm_service: Any,
        threshold: float = 0.7,
        hallucination_rate: float = 0.0
    ) -> ReflectionResult:
        logger.info(f"[ReflectionLoop] Rozpoczynam ewaluację odpowiedzi (Self-Critic, hall_rate={hallucination_rate:.1f}%)...")
        from database import get_setting
        from config import settings
        fast_model = settings.resolve_model_id(get_setting("assigned_model_fast"))
        
        prompt = (
            "Jesteś surowym audytorem prawnym (Self-Critic).\n"
            "Oceń poniższą odpowiedź (DRAFT) wygenerowaną przez Głównego Adwokata na zapytanie klienta.\n"
            "Kryteria oceny (0.0 - 1.0):\n"
            "- Kompletność: Czy odpowiedziano na wszystkie istotne aspekty pytania?\n"
            "- Logika i Spójność: Czy argumentacja jest zrozumiała i nie zawiera sprzeczności?\n"
            "- Przydatność (Actionability): Czy klient wie, co ma zrobić po przeczytaniu opinii?\n"
            "- Halucynacje: Zwróć uwagę na podejrzane cytowania (zestaw je z Kontekstem).\n\n"
            "WYMOGI WYJŚCIOWE (dokładny format, użyj kropek dla liczb):\n"
            "SCORE: <liczba 0.0-1.0>\n"
            "ISSUES:\n- <problem 1>\n- <problem 2>\n"
            "(Jeśli SCORE >= 0.9, możesz napisać 'ISSUES: Brak krytycznych uwag'.)"
        )
        
        try:
            res, _ = await llm_service.call_with_fallback(
                fast_model,
                [
                    {"role": "system", "content": prompt},
                    {
                        "role": "user", 
                        "content": f"ZAPYTANIE KLIENTA:\n{user_query}\n\nKONTEKST (skrót):\n{context_text[:5000]}\n\nODPOWIEDŹ DRAFT:\n{draft_answer}"
                    }
                ],
                max_tokens=600,
                temperature=0.1,
                timeout=30.0,
                log_context="ReflectionLoop"
            )
            
            score_match = re.search(r"SCORE:\s*([0-1](?:\.\d+)?)", res)
            score = 1.0
            if score_match:
                score = float(score_match.group(1))
                
            issues = []
            issues_match = re.search(r"ISSUES:(.*)", res, re.DOTALL)
            if issues_match:
                issues_text = issues_match.group(1).strip()
                if "Brak" not in issues_text and "None" not in issues_text:
                    issues = [line.strip("- ") for line in issues_text.split('\n') if line.strip().startswith("-")]
                    
            needs_regen = score <= threshold
            
            # Detekcja słów kluczowych świadczących o krytycznych błędach
            critical_keywords = ["nieaktualn", "fałszyw", "uchylon", "błędn", "nieistniejąc"]
            for issue in issues:
                if any(kw in issue.lower() for kw in critical_keywords):
                    logger.warning(f"[ReflectionLoop] Wymuszona regeneracja z powodu krytycznego błędu w issues: {issue}")
                    needs_regen = True
                    break
            
            # Wymuś regenerację, jeśli współczynnik halucynacji jest zbyt wysoki
            if hallucination_rate > 30.0:
                logger.warning(f"[ReflectionLoop] Wymuszona regeneracja: Hallucination rate {hallucination_rate}% przekracza 30.0%")
                needs_regen = True
                issues.insert(0, f"Zbyt wysoki wskaźnik halucynacji ({hallucination_rate:.1f}%). Zignoruj nieprawdziwe przepisy.")
                
            logger.info(f"[ReflectionLoop] Ocena DRAFTU: {score:.2f} (Threshold: {threshold}). Needs regen: {needs_regen}")
            
            return ReflectionResult(
                score=score,
                issues=issues,
                needs_regeneration=needs_regen,
                improved_answer=""
            )
        except Exception as e:
            logger.warning(f"[ReflectionLoop] Błąd ewaluacji odpowiedzi: {e}")
            return ReflectionResult(1.0, [], False, "")

