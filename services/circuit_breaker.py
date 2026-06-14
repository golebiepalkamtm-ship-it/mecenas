from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable, Dict, Optional


@dataclass
class CircuitBreakerSnapshot:
    name: str
    state: str
    failures: int
    open_until_monotonic: Optional[float]
    last_error: Optional[str]


class CircuitBreaker:
    def __init__(
        self,
        *,
        name: str,
        failure_threshold: int = 3,
        open_seconds: float = 60.0,
        half_open_max_calls: int = 1,
        time_fn: Optional[Callable[[], float]] = None,
    ) -> None:
        self._name = name
        self._failure_threshold = max(1, int(failure_threshold))
        self._open_seconds = max(1.0, float(open_seconds))
        self._half_open_max_calls = max(1, int(half_open_max_calls))
        self._time = time_fn or time.monotonic

        self._state = "closed"
        self._failures = 0
        self._open_until: Optional[float] = None
        self._half_open_remaining = 0
        self._last_error: Optional[str] = None

    @property
    def name(self) -> str:
        return self._name

    def snapshot(self) -> CircuitBreakerSnapshot:
        return CircuitBreakerSnapshot(
            name=self._name,
            state=self._state,
            failures=int(self._failures),
            open_until_monotonic=float(self._open_until) if self._open_until is not None else None,
            last_error=self._last_error,
        )

    def _trip_open(self, error: str = "") -> None:
        now = self._time()
        self._state = "open"
        self._open_until = now + self._open_seconds
        self._half_open_remaining = 0
        self._last_error = (error or "")[:240] or self._last_error

    def _maybe_transition(self) -> None:
        if self._state != "open":
            return
        now = self._time()
        if self._open_until is None or now < self._open_until:
            return
        self._state = "half_open"
        self._half_open_remaining = self._half_open_max_calls

    def allow_request(self) -> bool:
        self._maybe_transition()
        if self._state == "closed":
            return True
        if self._state == "open":
            return False
        if self._state == "half_open":
            if self._half_open_remaining <= 0:
                return False
            self._half_open_remaining -= 1
            return True
        return False

    def on_success(self) -> None:
        self._failures = 0
        self._last_error = None
        self._state = "closed"
        self._open_until = None
        self._half_open_remaining = 0

    def on_failure(self, error: str = "") -> None:
        self._last_error = (error or "")[:240] or self._last_error
        if self._state == "half_open":
            self._trip_open(self._last_error or "")
            return
        self._failures += 1
        if self._failures >= self._failure_threshold:
            self._trip_open(self._last_error or "")


def snapshots_dict(
    breakers: Dict[str, CircuitBreaker],
) -> Dict[str, dict]:
    out: Dict[str, dict] = {}
    for key, cb in breakers.items():
        snap = cb.snapshot()
        out[key] = {
            "state": snap.state,
            "failures": snap.failures,
            "open_until_monotonic": snap.open_until_monotonic,
            "last_error": snap.last_error,
        }
    return out

