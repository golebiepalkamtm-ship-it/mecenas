"""
Presety promptów LexMind MOA — obrona i oskarżenie.
Używane przez routes/core.py (/prompts/presets) oraz orchestrator (role ekspertów).
"""
import logging
from typing import Dict, Literal, Optional, TypedDict
from prompts.loader import load_prompt

logger = logging.getLogger(__name__)

# --- TYPY ---


class UniverseDict(TypedDict):
    identity: str
    judge: str
    roles: Dict[str, str]
    tasks: Dict[str, str]


SideType = Literal["defense", "prosecution"]


# --- PRESETY PROMPTÓW ---

DEFENSE_UNIVERSE: UniverseDict = {
    "identity": (
        "[CORE_IDENTITY: SUPREME_DEFENSE_COMMAND]\n"
        "Jesteś Naczelnym Dowódcą Sztabu Obrony — meta-strategiem koordynującym zespół "
        "adwokatów, radców, konstytucjonalistów i obrońców praw człowieka.\n"
        "Misja: doradztwo prawne — wyjaśnienie przepisów, poszerzenie podstawy (RAG/ELI/SAOS), "
        "procedura dopasowana do dziedziny (KPA/KPK/KPC/inne), wyjście ze sprawy. NIE streszczaj pisma.\n"
        "Domysły oznaczaj [wymaga weryfikacji w ISAP]."
    ),
    "judge": (
        "[JUDGE_ROLE: SUPREME_DEFENSE_COORDINATOR]\n"
        "Syntetyzujesz debatę ekspertów w rekomendację maksymalnie korzystną dla klienta.\n"
        "NIE opisujesz pisma akapit po akapicie — wybierasz najsilniejsze tezy z sekcji I–IV ekspertów.\n"
        "Format: rekomendacja → dziedzina i etap → wyjaśnienie przepisów → dodatkowa podstawa RAG/ELI → ścieżki → wyjście ze sprawy."
    ),
    "roles": {
        "defender": load_prompt("prompt_agent_criminal_defense"),
        "constitutionalist": load_prompt("prompt_agent_constitutional"),
        "proceduralist": load_prompt("prompt_agent_strategic"), # Używamy strategic jako fallback proceduralny
        "evidencecracker": load_prompt("prompt_agent_document_destructor"),
        "negotiator": load_prompt("prompt_agent_emergency"), # Emergency jako negocjator/kryzys
        "inquisitor": load_prompt("prompt_agent_doctrinal"),
        "oracle": load_prompt("prompt_agent_rag_researcher"),
    },
    "tasks": {
        "general": (
            "[TASK: GENERAL_LEGAL_ADVICE]\n"
            "Odpowiedz na pytanie klienta: diagnoza, ścieżki działania, terminy, ryzyka."
        ),
        "criminal_defense": load_prompt("prompt_agent_criminal_defense"),
        "rights_defense": load_prompt("prompt_agent_constitutional"),
        "document_attack": load_prompt("prompt_agent_document_destructor"),
        "emergency_relief": load_prompt("prompt_agent_emergency"),
        "analysis": load_prompt("prompt_agent_master_strategist"),
        "drafting": load_prompt("prompt_agent_legal_draftsman"),
        "research": load_prompt("prompt_agent_rag_researcher"),
        "strategy": load_prompt("prompt_agent_master_strategist"),
    },
}

PROSECUTION_UNIVERSE: UniverseDict = {
    "identity": (
        "[CORE_IDENTITY: STATE_PROSECUTION_APPARATUS]\n"
        "Koordynator aparatu oskarżycielskiego: szczelny przypadek oskarżenia zgodny z literą prawa.\n"
        "Test ponad wszelką wątpliwość. Antycypuj atak obrony. Fakty tylko z akt i RAG."
    ),
    "judge": (
        "[JUDGE_ROLE: COLD_COURT_ARBITER]\n"
        "Syntetyzujesz analizy prokuratora/śledczego/biegłego — nie przepisujesz akt.\n"
        "Format: orzeczenie wstępne, uzasadnienie, słabości oskarżenia, prognoza instancyjna."
    ),
    "roles": {
        "prosecutor": (
            "[SYSTEM_ROLE: THE PROSECUTOR — PROKURATOR PROWADZĄCY]\n"
            "Kwalifikacja prawna, łańcuch dowodowy, akt oskarżenia odporny na obronę."
        ),
        "investigator": (
            "[SYSTEM_ROLE: THE INVESTIGATOR — OFICER ŚLEDCZY]\n"
            "Chronologia, świadkowie, alibi, ślady cyfrowe i finansowe."
        ),
        "forensic_expert": (
            "[SYSTEM_ROLE: THE FORENSIC_EXPERT — BIEGŁY SĄDOWY]\n"
            "Opinie nienaruszalne dla obrony: DNA, pismo, informatyka śledcza."
        ),
        "hard_judge": (
            "[SYSTEM_ROLE: THE JUDGE — ZIMNY SĘDZIA]\n"
            "Ocena czy akt/wniosek wytrzyma sąd — bezlitosny audyt słabości przed wysłaniem."
        ),
        "sentencing_expert": (
            "[SYSTEM_ROLE: THE SENTENCING_EXPERT — WYMIAR KARY]\n"
            "Okoliczności obciążające/łagodzące, linia orzecznicza SN, wniosek o karę."
        ),
        "inquisitor": (
            "[SYSTEM_ROLE: INQUISITOR — ANALITYK OSKARŻENIA]\n"
            "Budowa zarzutów i ocena siły materiału dowodowego."
        ),
        "oracle": (
            "[SYSTEM_ROLE: ORACLE — PRECEDENSY KARNE]\n"
            "Orzecznictwo SN i SAOS pod kątem kwalifikacji i wymiaru kary."
        ),
    },
    "tasks": {
        "general": (
            "[TASK: PROSECUTION_OVERVIEW]\n"
            "Ocena szans oskarżenia, luki dowodowe, kolejne czynności śledcze."
        ),
        "charge_building": (
            "[TASK: CHARGE_ARCHITECTURE]\n"
            "Kwalifikacja, piramida dowodów, obalenie alibi, antycypacja obrony."
        ),
        "indictment_review": (
            "[TASK: INDICTMENT_STRESS_TEST]\n"
            "Atak na AO jak obrona — następnie fortifikacja aktu."
        ),
        "sentencing_argument": (
            "[TASK: SENTENCING_MAXIMIZATION]\n"
            "Okoliczności obciążające, neutralizacja łagodzących, wniosek o karę."
        ),
        "warrant_application": (
            "[TASK: PRETRIAL_DETENTION]\n"
            "Wniosek o TA: podstawa dowodowa, przesłanka, proporcjonalność — 48h."
        ),
        "analysis": "[TASK: CASE_ANALYSIS]\nAnaliza materiału pod kątem oskarżenia.",
        "drafting": "[TASK: INDICTMENT_DRAFTING]\nProjekt aktu lub wniosku procesowego.",
        "research": "[TASK: PRECEDENT_RESEARCH]\nOrzecznictwo wspierające oskarżenie.",
        "strategy": "[TASK: PROSECUTION_STRATEGY]\nPlan działań i prognoza skazania.",
    },
}


# --- LOGIKA DOSTĘPU ---


def _get_universe(side: SideType) -> UniverseDict:
    """Wewnętrzna funkcja mapująca stronę na odpowiedni słownik."""
    return DEFENSE_UNIVERSE if side == "defense" else PROSECUTION_UNIVERSE


def get_role_prompt(role_id: str, side: SideType = "defense") -> str:
    """
    Zwraca prompt roli po ID.
    W przypadku braku roli, zwraca domyślnego 'inquisitora' i loguje ostrzeżenie.
    """
    roles = _get_universe(side)["roles"]

    if role_id not in roles:
        logger.warning(
            "Brak roli '%s' w uniwersum '%s'. Zastosowano bezpieczny fallback (inquisitor).",
            role_id,
            side,
        )
        return roles.get("inquisitor", "[SYSTEM_ROLE: FALLBACK INQUISITOR] Analizuj stan faktyczny.")

    return roles[role_id]


def get_task_prompt(task_id: str, side: SideType = "defense") -> str:
    """
    Zwraca prompt zadania po ID.
    W przypadku braku zadania, zwraca zadanie domyślne ('general').
    """
    tasks = _get_universe(side)["tasks"]

    if task_id not in tasks:
        logger.debug("Zadanie '%s' nie istnieje (%s). Używam 'general'.", task_id, side)

    return tasks.get(task_id, tasks.get("general", ""))


def merge_role_catalog(
    custom_roles: Optional[Dict[str, str]] = None,
    side: SideType = "defense",
) -> Dict[str, str]:
    """
    Scala katalog ról z frontendu z presetami systemowymi.
    Zwraca nową instancję słownika, aby chronić zmienne globalne przed mutacją.
    """
    base = _get_universe(side)["roles"].copy()

    if custom_roles:
        for key, value in custom_roles.items():
            if isinstance(value, str) and value.strip():
                base[key] = value.strip()

    return base
