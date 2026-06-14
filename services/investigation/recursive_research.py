"""Rekurencyjne dochodzenie: clue → nowe zapytania → retrieval, aż zbieżność lub budżet."""
from __future__ import annotations

import hashlib
import json
import logging
import re
from typing import Any, Callable, Dict, List, Set, Tuple

from config import settings
from services.investigation.types import CaseInvestigationState, EvidenceItem, Hypothesis, ResearchRound
from services.investigation.hypothesis_rag import gather_evidence_for_hypotheses, merge_evidence_into_legal_list

logger = logging.getLogger(__name__)


def _norm_clue(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())[:500]


class RecursiveResearchLoop:
    def __init__(
        self,
        state: CaseInvestigationState,
        *,
        call_llm: Callable[..., Any],
        model_id: str,
    ):
        self.state = state
        self.call_llm = call_llm
        self.model_id = model_id
        self._seen_clues: Set[str] = set()
        self._seen_queries: Set[str] = set()

    async def run(
        self,
        *,
        hypotheses: List[Hypothesis],
        query_for_retrieval: str,
        use_rag_legal: bool,
        use_saos: bool,
        use_eli: bool,
        base_legal: List[Dict[str, Any]],
    ) -> Tuple[List[Dict[str, Any]], List[ResearchRound]]:
        """
        Zwraca zaktualizowaną listę legal (scala kolejne rundy) oraz historię rund.
        """
        rounds: List[ResearchRound] = []
        legal_acc = list(base_legal)
        max_r = settings.investigation_max_rounds

        for rnd in range(max_r):
            if self.state.budget_retrieval_calls >= settings.investigation_max_retrieval_calls:
                break
            if self.state.budget_llm_calls >= settings.investigation_max_llm_calls:
                break

            snippet = "\n\n".join(
                (x.get("content") or "")[:800] for x in legal_acc[:12]
            )
            clues, new_queries = await self._extract_clues_and_queries(
                snippet, hypotheses, rnd
            )
            if not new_queries:
                rounds.append(ResearchRound(round_index=rnd, new_clues=clues, summary="brak nowych zapytań"))
                break

            fresh_queries = [q for q in new_queries if self._q_fresh(q)]
            if not fresh_queries:
                rounds.append(ResearchRound(round_index=rnd, new_clues=clues, summary="duplikat zapytań — stop"))
                break

            # Mapuj zapytania na sztuczne hipotezy robocze (jedno zapytanie = jedna mini-hipoteza)
            mini_hyps: List[Hypothesis] = []
            for i, q in enumerate(fresh_queries[:5]):
                mini_hyps.append(
                    Hypothesis(
                        id=f"Q{rnd}_{i}",
                        label=f"Śledztwo r{rnd}",
                        description=q,
                        priority=0,
                        rag_keywords=q,
                        act_terms=[],
                        eli_queries=[q] if use_eli else [],
                    )
                )
            if not mini_hyps:
                break

            by_l, by_s, by_e = await gather_evidence_for_hypotheses(
                mini_hyps,
                query_for_retrieval=query_for_retrieval,
                use_rag_legal=use_rag_legal,
                use_saos=use_saos,
                use_eli=use_eli,
                state=self.state,
                round_index=rnd + 1,
                cache_namespace=f"inv_rec_{rnd}",
            )
            prev_len = len(legal_acc)
            legal_acc = merge_evidence_into_legal_list(legal_acc, by_l)

            new_ids: List[str] = []
            for h in mini_hyps:
                for row in by_l.get(h.id, []):
                    c = str(row.get("content") or "")[:3000]
                    eid = f"ev_{h.id}_{rnd}_{hashlib.sha256(c.encode()).hexdigest()[:10]}"
                    self.state.evidence.append(
                        EvidenceItem(
                            id=eid,
                            source="legal",
                            hypothesis_id=h.id,
                            round_index=rnd + 1,
                            content=c,
                            metadata=row.get("metadata") or {},
                        )
                    )
                    new_ids.append(eid)

            rounds.append(
                ResearchRound(
                    round_index=rnd,
                    new_clues=clues,
                    new_evidence_ids=new_ids,
                    summary=f"+{len(legal_acc) - prev_len} fragmentów RAG",
                )
            )
            if len(legal_acc) <= prev_len:
                break

        self.state.research_rounds.extend(rounds)
        return legal_acc, rounds

    def _q_fresh(self, q: str) -> bool:
        n = _norm_clue(q)
        if len(n) < 8:
            return False
        h = hashlib.sha256(n.encode()).hexdigest()
        if h in self._seen_queries:
            return False
        self._seen_queries.add(h)
        return True

    async def _extract_clues_and_queries(
        self,
        corpus_snippet: str,
        hypotheses: List[Hypothesis],
        rnd: int,
    ) -> Tuple[List[str], List[str]]:
        if self.state.budget_llm_calls >= settings.investigation_max_llm_calls:
            return [], []
        self.state.budget_llm_calls += 1
        hyp_txt = "\n".join(f"- {h.id} {h.label}: {h.description}" for h in hypotheses[:8])
        prompt = (
            "Na podstawie poniższych fragmentów bazy prawnej wypisz:\n"
            "1) clues: 2-5 krótkich faktów prawnych / haczyków (np. konkretny przepis, instytucja).\n"
            "2) queries: 2-5 KRÓTKICH zapytań po polsku do wyszukiwarki prawniczej (nowe, nie powtarzaj oczywistego).\n"
            "Zwróć WYŁĄCZNIE JSON: {\"clues\":[...],\"queries\":[...]}\n\n"
            f"HIPOTEZY:\n{hyp_txt}\n\nFRAGMENTY:\n{corpus_snippet[:12000]}"
        )
        text, _ = await self.call_llm(
            self.model_id,
            [{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.1,
            timeout=40.0,
        )
        raw = (text or "").strip()
        m = re.search(r"\{[\s\S]*\}", raw)
        if m:
            raw = m.group(0)
        clues: List[str] = []
        queries: List[str] = []
        try:
            data = json.loads(raw)
            clues = [str(x) for x in (data.get("clues") or []) if x]
            queries = [str(x) for x in (data.get("queries") or []) if x]
        except json.JSONDecodeError:
            logger.warning("[INV] recursive clue JSON fail")

        fresh_clues: List[str] = []
        for c in clues:
            n = _norm_clue(c)
            if len(n) < 6:
                continue
            h = hashlib.sha256(n.encode()).hexdigest()
            if h in self._seen_clues:
                continue
            self._seen_clues.add(h)
            fresh_clues.append(c)
        return fresh_clues, queries
