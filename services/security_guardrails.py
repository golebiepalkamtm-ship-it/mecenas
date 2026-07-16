from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Tuple

from services.pii_mask import mask_pii


@dataclass(frozen=True)
class InboundGuardResult:
    allowed: bool
    reason: str
    matched_patterns: List[str]


class SecurityGuardrails:
    _INJECTION_PATTERNS: List[Tuple[str, re.Pattern]] = [
        ("ignore_previous_pl", re.compile(r"\bzignoruj\s+poprzednie\b", re.IGNORECASE)),
        ("ignore_previous_en", re.compile(r"\bignore\s+previous\s+instructions\b", re.IGNORECASE)),
        ("system_override", re.compile(r"\bsystem\s+prompt\s+override\b", re.IGNORECASE)),
        ("leave_role_pl", re.compile(r"\bwyjd[źz]\s+z\s+roli\b", re.IGNORECASE)),
        ("developer_message", re.compile(r"\bdeveloper\s+message\b", re.IGNORECASE)),
        ("reveal_system", re.compile(r"\bpoka[zż]\s+(?:mi\s+)?system\s+prompt\b", re.IGNORECASE)),
        ("jailbreak", re.compile(r"\bjailbreak\b|\bdan\b|\bdo\s+anything\s+now\b", re.IGNORECASE)),
    ]

    @classmethod
    def verify_inbound_prompt(cls, prompt: str) -> InboundGuardResult:
        text = (prompt or "").strip()
        if not text:
            return InboundGuardResult(allowed=True, reason="", matched_patterns=[])
        matched: List[str] = []
        for name, pat in cls._INJECTION_PATTERNS:
            if pat.search(text):
                matched.append(name)
        if matched:
            return InboundGuardResult(
                allowed=False,
                reason="Wykryto niedozwoloną próbę manipulacji instrukcjami systemowymi.",
                matched_patterns=matched,
            )
        return InboundGuardResult(allowed=True, reason="", matched_patterns=[])

    @classmethod
    def sanitize_outbound_text(cls, text: str) -> Tuple[str, bool]:
        original = text or ""
        masked = mask_pii(original)
        masked2 = re.sub(
            r"(?i)\bpesel\b[^0-9]{0,24}(\d{11})\b",
            lambda m: m.group(0).replace(m.group(1), "[PESEL]"),
            masked,
        )
        return masked2, masked2 != original
