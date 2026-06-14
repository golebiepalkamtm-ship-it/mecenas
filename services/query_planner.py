"""QueryPlanner — JSON intent + parametry retrieval (zastępuje router 40 tok)."""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class QueryPlan:
    intent: str = "case_analysis"
    keywords: str = ""
    act_terms: List[str] = field(default_factory=list)
    use_saos: bool = True
    use_eli: bool = True
    skip_debate: bool = False
    rag_match_count: int = 5
    saos_limit: int = 5
    eli_limit: int = 5
    estimated_complexity: str = "medium"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "QueryPlan":
        kw = data.get("keywords") or data.get("keyword") or ""
        if isinstance(kw, list):
            kw = ", ".join(str(x) for x in kw if x)
        acts = data.get("act_terms") or []
        if isinstance(acts, str):
            acts = [a.strip() for a in acts.split(",") if a.strip()]
        return cls(
            intent=str(data.get("intent") or "case_analysis"),
            keywords=str(kw).strip(),
            act_terms=[str(a) for a in acts if a],
            use_saos=bool(data.get("use_saos", True)),
            use_eli=bool(data.get("use_eli", True)),
            skip_debate=bool(data.get("skip_debate", False)),
            rag_match_count=int(data.get("rag_match_count") or 5),
            saos_limit=int(data.get("saos_limit") or 5),
            eli_limit=int(data.get("eli_limit") or 5),
            estimated_complexity=str(data.get("estimated_complexity") or "medium"),
        )


def _extract_json_blob(text: str) -> Optional[Dict[str, Any]]:
    text = (text or "").strip()
    if not text:
        return None
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


async def plan_query(
    *,
    call_llm: Callable[..., Any],
    model_id: str,
    user_query: str,
    document_excerpt: str = "",
    history_snippet: str = "",
    fallback_keywords: str = "",
) -> QueryPlan:
    """LLM planner ~200 tok → QueryPlan; fallback na heurystykę."""
    prompt = (
        "Zaplanuj wyszukiwanie prawne (PL). Zwróć WYŁĄCZNIE JSON:\n"
        '{"intent":"article_explain|case_analysis|litigation_strategy|draft_pleading",'
        '"keywords":"fraza1, fraza2, fraza3",'
        '"act_terms":["KPA"],'
        '"use_saos":true,"use_eli":true,"skip_debate":false,'
        '"rag_match_count":5,"saos_limit":5,"eli_limit":5,'
        '"estimated_complexity":"low|medium|high"}\n\n'
        f"Zapytanie: {user_query[:500]}\n"
        f"Dokument: {document_excerpt[:1200]}\n"
        f"Historia: {history_snippet[:800]}"
    )
    try:
        raw, _ = await call_llm(
            model_id,
            [
                {
                    "role": "system",
                    "content": "Jesteś routerem LegalTech. Odpowiadasz tylko poprawnym JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=220,
            temperature=0.1,
            timeout=20.0,
        )
        data = _extract_json_blob(raw if isinstance(raw, str) else str(raw))
        if data:
            plan = QueryPlan.from_dict(data)
            if not plan.keywords.strip():
                plan.keywords = fallback_keywords
            return plan
    except Exception as e:
        logger.warning("[QueryPlanner] %s — fallback keywords", e)

    return QueryPlan(
        intent="case_analysis",
        keywords=fallback_keywords,
        use_saos=True,
        use_eli=True,
    )


def apply_plan_to_retrieval_counts(
    plan: QueryPlan,
    *,
    use_fast_path: bool,
    base_use_saos: bool,
    base_use_eli: bool,
) -> Dict[str, Any]:
    """Mapuje plan na parametry Etapu 6."""
    if use_fast_path:
        return {
            "keywords": plan.keywords,
            "rag_n": 4,
            "saos_n": 2,
            "eli_n": 0,
            "use_eli_eff": False,
            "use_saos_eff": base_use_saos,
            "skip_debate": True,
        }
    intent = (plan.intent or "").lower()
    skip = plan.skip_debate or intent == "article_explain"
    return {
        "keywords": plan.keywords,
        "rag_n": plan.rag_match_count,
        "saos_n": plan.saos_limit if plan.use_saos and base_use_saos else 0,
        "eli_n": plan.eli_limit if plan.use_eli and base_use_eli else 0,
        "use_eli_eff": plan.use_eli and base_use_eli,
        "use_saos_eff": plan.use_saos and base_use_saos,
        "skip_debate": skip,
        "act_terms_extra": plan.act_terms,
    }
