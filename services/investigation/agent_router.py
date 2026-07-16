"""Router problemów prawnych → dynamiczna lista agentów (modele + prompty)."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from config import settings


def _tags(text: str, query: str) -> List[str]:
    blob = f"{text} {query}".lower()
    tags: List[str] = []
    if re.search(r"dor[eę]cz|termin|fikcj|zpo|upo|nieważn.*post", blob):
        tags.append("procedural")
    if re.search(r"podatk|vat|cit|pit|kasacja skarbow", blob):
        tags.append("tax")
    if re.search(r"\btsue\b|unii europejsk|traktat|dyrektyw", blob, re.I):
        tags.append("eu")
    if re.search(r"konstytucj|etpc|strasbur|konwencja", blob, re.I):
        tags.append("human_rights")
    if re.search(
        r"narkotyk|marihuan|amfetamin|mefedron|kokain|heroina|haszysz|extasy|mdma|lsd|grzyb.*psylo"
        r"|62 ust|62a|art\.\s*53|art\.\s*55|art\.\s*56|art\.\s*58|art\.\s*61|art\.\s*63"
        r"|znaczna ilość|udzielani|posiadani|UoPN|przeciwdziałan.*narkoman"
        r"|wytwarzan|produk.*narkot|prekursor|odczynnik.*chemi|laboratori.*narkot"
        r"|upraw.*konop|upraw.*mak|plantacj|dopalacz|nowa substancja psychoaktyw"
        r"|przemyt|wwóz|wywóz|przewo[zź].*narkot"
        r"|\bćpan|\bjoint|\btrawka|\bjaranie|\bdziałk[aię]|\bkoks\b|\bspeed\b|\bmdm\b",
        blob, re.I
    ):
        tags.append("narcotics")
    if re.search(r"\bkpk\b|karne|prokurat|oskarżon|podejrzan|zatrzym", blob):
        tags.append("criminal")
    if re.search(r"kryzys|natyc?hmiast|zatrzym|przeszuk|kontrol|alarm|pilne|24\s*h|72\s*h", blob):
        tags.append("emergency")
    if re.search(r"pismo|pozew|odwoła|zażal|skarg|wnios.*o\b|petitum|apelacj", blob):
        tags.append("drafting")
    if re.search(r"dekonstru|destruk|luki|błęd.*formal|sprzeczno|wadliw|zaskarż", blob):
        tags.append("document_attack")
    if re.search(
        r"nadużyci|manipulacj.*dow|fałszow.*dow|zawyż.*wag|podrzuc"
        r"|wymusz.*zeznań|wymusz.*groźb|zastrasz.*rodzin|odebr.*dziec"
        r"|reaktor.*chemi|mieszad.*magnet|fikcyj.*protok"
        r"|pretekst.*zatrzym|prowokacj.*polic"
        r"|art\.\s*231|art\.\s*235|art\.\s*246|art\.\s*271"
        r"|cbzc|cbśp|bswp|biuro.*spraw.*wewnętrzn"
        r"|łańcuch.*dowod|chain.*custody|body.?cam|exif"
        r"|owoce.*zatrut|fruit.*poison|osob.*przybran"
        r"|komisyjn.*waż|rozbieżn.*wag",
        blob, re.I
    ):
        tags.append("police_misconduct")
    return tags


def detect_problem_tags(text: str, query: str) -> List[str]:
    return _tags(text, query)


def route_agent_specs(
    *,
    expert_models: List[str],
    default_prompts: Tuple[str, str, str],
    labels: Tuple[str, str, str],
    text: str,
    query: str,
    specialized_prompts: Optional[Dict[str, str]] = None,
) -> List[Tuple[str, str, str, str]]:
    """
    Zwraca listę (model_id, role_name, default_role_prompt, chunk_focus).
    Zachowuje min 3 sloty dla kompatybilności; dodaje agenty do limitu dynamic_agent_max.

    specialized_prompts — opcjonalny słownik z kluczami odpowiadającymi tagom:
        "criminal_defense", "narcotics_defense", "constitutional", "document_destructor",
        "emergency", "legal_draftsman", "rag_researcher", "master_strategist"
    """
    doctrinal, strategic, counter = default_prompts
    l1, l2, l3 = labels
    sp = specialized_prompts or {}
    tags = detect_problem_tags(text, query)

    # --- Bazowe 3 sloty — adaptacja do wykrytych tagów ---
    # Slot 1: prawo materialne (lub specjalista od narkotyków/karnista)
    if "narcotics" in tags and sp.get("narcotics_defense"):
        slot1_prompt = sp["narcotics_defense"]
        slot1_label = "Specjalista ds. Narkotyków"
        slot1_focus = "fokus: UoPN, art. 62a, błędy dowodowe, substancja aktywna"
    elif "criminal" in tags and sp.get("criminal_defense"):
        slot1_prompt = sp["criminal_defense"]
        slot1_label = "Agent Obrony Karnej"
        slot1_focus = "fokus: dekonstrukcja zarzutów, znamiona, dowody, KPK/KK"
    else:
        slot1_prompt = doctrinal
        slot1_label = l1
        slot1_focus = "fokus: prawo materialne — wyjaśnienie art."

    # Slot 2: procedura / strategia (lub emergency gdy kryzys)
    if "emergency" in tags and sp.get("emergency"):
        slot2_prompt = sp["emergency"]
        slot2_label = "Agent Reagowania Kryzysowego"
        slot2_focus = "fokus: natychmiastowe działania, prawa klienta TERAZ, czerwone linie 24/72h"
    elif "drafting" in tags and sp.get("legal_draftsman"):
        slot2_prompt = sp["legal_draftsman"]
        slot2_label = "Inżynier Pism Procesowych"
        slot2_focus = "fokus: petitum, uzasadnienie, wymogi formalne, placeholdery"
    else:
        slot2_prompt = strategic
        slot2_label = l2
        slot2_focus = "fokus: właściwy kodeks postępowania i czynności"

    # Slot 3: kontr-argumentacja (lub destruktor dokumentu)
    if "document_attack" in tags and sp.get("document_destructor"):
        slot3_prompt = sp["document_destructor"]
        slot3_label = "Destruktor Argumentacji Przeciwnika"
        slot3_focus = "fokus: błędy formalne, luki logiczne, plan zaskarżenia"
    else:
        slot3_prompt = counter
        slot3_label = l3
        slot3_focus = "fokus: furtki prawne, wyjątki, błędy organu — RAG/ELI/SAOS"

    specs: List[Tuple[str, str, str, str]] = [
        (expert_models[0 % len(expert_models)], slot1_label, slot1_prompt, slot1_focus),
        (expert_models[1 % len(expert_models)], slot2_label, slot2_prompt, slot2_focus),
        (expert_models[2 % len(expert_models)], slot3_label, slot3_prompt, slot3_focus),
    ]

    mmax = max(3, settings.dynamic_agent_max)
    mi = 3

    # --- Spawny dodatkowe ze specjalistycznymi promptami ---
    if "procedural" in tags and mmax >= 4:
        specs.append(
            (
                expert_models[mi % len(expert_models)],
                "Agent Proceduralny (spawn)",
                strategic,
                "fokus: wady formalne, doręczenie, termin, pouczenie, kompetencja",
            )
        )
        mi += 1

    if "tax" in tags and len(specs) < mmax:
        specs.append(
            (
                expert_models[mi % len(expert_models)],
                "Specjalista podatkowy (spawn)",
                doctrinal,
                "fokus: prawo podatkowe, ordynacja, przedawnienie zobowiązań",
            )
        )
        mi += 1

    if "eu" in tags and len(specs) < mmax:
        specs.append(
            (
                expert_models[mi % len(expert_models)],
                "Agent UE (spawn)",
                doctrinal,
                "fokus: prawo UE, skutek bezpośredni, wykładnia TSUE",
            )
        )
        mi += 1

    if "human_rights" in tags and len(specs) < mmax:
        specs.append(
            (
                expert_models[mi % len(expert_models)],
                "Agent ETPCz/Konstytucja (spawn)",
                sp.get("constitutional", doctrinal),
                "fokus: prawa podstawowe, proporcjonalność, standardy strasburskie, EKPCz",
            )
        )
        mi += 1

    if "criminal" in tags and len(specs) < mmax and sp.get("criminal_defense"):
        # Dodatkowy agent karny jeśli slot1 został nadpisany
        specs.append(
            (
                expert_models[mi % len(expert_models)],
                "Agent Karnista (spawn)",
                sp["criminal_defense"],
                "fokus: audyt proceduralny KPK, zatrute drzewo, domniemanie niewinności",
            )
        )
        mi += 1

    if "document_attack" in tags and len(specs) < mmax and sp.get("document_destructor"):
        # Jeśli destruktor nie był w slocie 3, dodaj jako spawn
        if slot3_label != "Destruktor Argumentacji Przeciwnika":
            specs.append(
                (
                    expert_models[mi % len(expert_models)],
                    "Destruktor Dokumentu (spawn)",
                    sp["document_destructor"],
                    "fokus: chirurgiczna dekonstrukcja pisma przeciwnika",
                )
            )
            mi += 1

    # Spawn: Agent nadużyć policji — gdy sprawa narkotykowa z elementem karnym
    # lub gdy wykryto wzorzec nadużyć policji (manipulacja dowodami, wymuszanie zeznań)
    if (
        (
            ("narcotics" in tags and "criminal" in tags)
            or "police_misconduct" in tags
        )
        and len(specs) < mmax
        and sp.get("narcotics_defense")
    ):
        specs.append(
            (
                expert_models[mi % len(expert_models)],
                "Agent Kontr-Ofensywny (nadużycia policji)",
                sp["narcotics_defense"],
                "fokus: art. 224/231/235/246/271 KK/KPK, łańcuch dowodowy, owoce zatrutego drzewa, "
                "manipulacja wagą, pretextual stop, wymuszenie groźbą, body-cam/EXIF, kontroffensywa BSWP",
            )
        )
        mi += 1

    return specs[:mmax]
