"""Silnik strategii procesowej — JSON StrategyOptions dla trybu strategic."""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class StrategyOption:
    name: str
    steps: List[str] = field(default_factory=list)
    deadline: str = ""
    p_success: float = 0.0
    cost_band: str = "medium"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "steps": self.steps,
            "deadline": self.deadline,
            "p_success": self.p_success,
            "cost_band": self.cost_band,
        }


@dataclass
class StrategyResult:
    options: List[StrategyOption] = field(default_factory=list)
    recommended: str = ""
    risks: List[str] = field(default_factory=list)

    def to_context_block(self) -> str:
        if not self.options:
            return ""
        lines = ["[STRATEGIA PROCESOWA — JSON]"]
        for opt in self.options[:4]:
            lines.append(
                f"- {opt.name}: P≈{opt.p_success:.0%}, kroki: {'; '.join(opt.steps[:5])}"
            )
        if self.recommended:
            lines.append(f"Rekomendacja: {self.recommended}")
        for r in self.risks[:5]:
            lines.append(f"Ryzyko: {r}")
        return "\n".join(lines)


async def generate_litigation_strategy(
    *,
    call_llm: Callable[..., Any],
    model_id: str,
    case_summary: str,
    procedural_snippet: str = "",
    debate_snippet: str = "",
) -> StrategyResult:
    prompt = (
        "Jesteś strategiem procesowym (PL). Na podstawie materiałów zwróć WYŁĄCZNIE JSON:\n"
        '{"options":[{"name":"...","steps":["..."],"deadline":"ISO lub opis",'
        '"p_success":0.0-1.0,"cost_band":"low|medium|high"}],'
        '"recommended":"nazwa opcji","risks":["..."]}\n'
        "Nie wymyślaj faktów spoza materiałów. Max 3 opcje.\n\n"
        f"SPRAWA:\n{case_summary[:6000]}\n\n"
        f"PROCEDURA:\n{procedural_snippet[:3000]}\n\n"
        f"DEBATA:\n{debate_snippet[:4000]}"
    )
    try:
        raw, _ = await call_llm(
            model_id,
            [{"role": "user", "content": prompt}],
            max_tokens=900,
            temperature=0.15,
            timeout=50.0,
        )
        text = raw if isinstance(raw, str) else str(raw or "")
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            return StrategyResult()
        data = json.loads(m.group(0))
        options = []
        for o in data.get("options") or []:
            if isinstance(o, dict):
                options.append(
                    StrategyOption(
                        name=str(o.get("name") or "opcja"),
                        steps=[str(s) for s in (o.get("steps") or [])][:8],
                        deadline=str(o.get("deadline") or ""),
                        p_success=float(o.get("p_success") or 0.0),
                        cost_band=str(o.get("cost_band") or "medium"),
                    )
                )
        return StrategyResult(
            options=options,
            recommended=str(data.get("recommended") or ""),
            risks=[str(r) for r in (data.get("risks") or [])][:6],
        )
    except Exception as e:
        logger.warning("[StrategyEngine] %s", e)
        return StrategyResult()
