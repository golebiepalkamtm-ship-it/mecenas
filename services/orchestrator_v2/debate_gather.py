"""Adaptacyjne zbieranie opinii ekspertów — early cutoff wolnych modeli."""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, List

from config import settings

logger = logging.getLogger(__name__)


async def gather_experts_adaptive(
    expert_coros: List[Any],
    *,
    labels: List[str],
) -> List[Dict[str, Any]]:
    """
    Uruchamia N ekspertów równolegle. Gdy N-1 odpowie, anuluje maruderów
    przekraczających medianę * debate_slow_multiplier (min debate_min_cutoff_ms).
    """
    n = len(expert_coros)
    if n == 0:
        return []
    if n == 1:
        return [await expert_coros[0]]

    tasks: Dict[asyncio.Task, Dict[str, Any]] = {}
    for i, coro in enumerate(expert_coros):
        label = labels[i] if i < len(labels) else f"Ekspert-{i + 1}"
        task = asyncio.create_task(coro)
        tasks[task] = {"label": label, "started_at": time.time()}

    results: List[Dict[str, Any]] = []
    min_success = max(1, n - 1)
    slow_mult = settings.debate_slow_multiplier
    min_cutoff_ms = settings.debate_min_cutoff_ms

    try:
        while tasks:
            pending = [t for t in tasks if not t.done()]
            if not pending:
                break

            done_set, still_pending = await asyncio.wait(
                pending,
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in done_set:
                meta = tasks.pop(task, {})
                try:
                    results.append(task.result())
                except asyncio.CancelledError:
                    results.append(_cancelled_result(meta))
                except Exception as exc:
                    results.append(_error_result(meta, exc))

            ok_latencies = [
                int(r.get("latency_ms") or 0)
                for r in results
                if not r.get("error")
            ]
            if len(ok_latencies) >= min_success and still_pending:
                median_ms = sorted(ok_latencies)[len(ok_latencies) // 2]
                cutoff_ms = max(int(median_ms * slow_mult), min_cutoff_ms)
                now = time.time()
                for task in list(still_pending):
                    if task not in tasks:
                        continue
                    meta = tasks[task]
                    elapsed_ms = int((now - meta["started_at"]) * 1000)
                    if elapsed_ms > cutoff_ms:
                        logger.warning(
                            "[DebateGather] Anuluję '%s' po %dms (cutoff=%dms, median=%dms)",
                            meta["label"],
                            elapsed_ms,
                            cutoff_ms,
                            median_ms,
                        )
                        task.cancel()
                        tasks.pop(task, None)
                        results.append(_cancelled_result(meta, elapsed_ms))

        # Dokończ pozostałe bez dalszego czekania na pełny timeout
        for task in list(tasks.keys()):
            if task.done() and not task.cancelled():
                meta = tasks.pop(task, {})
                try:
                    results.append(task.result())
                except Exception as exc:
                    results.append(_error_result(meta, exc))
    finally:
        for task in list(tasks.keys()):
            if not task.done():
                task.cancel()
            tasks.pop(task, None)

    return results


def _cancelled_result(meta: Dict[str, Any], elapsed_ms: int | None = None) -> Dict[str, Any]:
    if elapsed_ms is None:
        elapsed_ms = int((time.time() - meta.get("started_at", time.time())) * 1000)
    return {
        "role": meta.get("label", "Ekspert"),
        "model": "",
        "response": "Anulowano — adaptacyjny cutoff debaty MOA.",
        "latency_ms": elapsed_ms,
        "error": True,
        "cancelled": True,
    }


def _error_result(meta: Dict[str, Any], exc: Exception) -> Dict[str, Any]:
    return {
        "role": meta.get("label", "Ekspert"),
        "model": "",
        "response": f"BŁĄD: {exc}",
        "latency_ms": int((time.time() - meta.get("started_at", time.time())) * 1000),
        "error": True,
    }
