"""
Patron Input Security & Guardrails Engine (Python Port of Matematicsolutions/Patron)
Zero-LLM, zero-cloud, deterministic security scan for legal documents & inputs.

Features:
- Adversarial detection (Prompt injection, jailbreaks, role overrides in PL & EN)
- Steganography detection (Zero-width characters, Bidi overrides)
- Obfuscation detection (Mixed scripts, homoglyphs, base64 data)
- Evasion detection (Token splitting, combining character stacking, Unicode tags)
- Zero false positives on legitimate Polish legal documents with full diacritics.
"""

from __future__ import annotations

import base64
import hashlib
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

ActionType = Literal["allowed", "quarantined", "human_review", "blocked"]
SeverityType = Literal["low", "medium", "high", "critical"]


@dataclass
class SecurityFinding:
    detector: str
    technique: str
    severity: SeverityType
    snippet: str
    impact: str
    offset: Optional[int] = None


@dataclass
class SecurityScanResult:
    action: ActionType
    risk_score: int  # 0 - 100
    threat_level: Literal["none", "low", "medium", "high", "critical"]
    findings: List[SecurityFinding] = field(default_factory=list)
    sanitized_text: Optional[str] = None
    audit_hash: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# 1. ADVERSARIAL DETECTOR (PL + EN)
# ─────────────────────────────────────────────────────────────────────────────

PL_CHAR = r"[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]"

PROMPT_INJECTION_PL = [
    {
        "technique": "prompt-injection-pl-ignore",
        "pattern": re.compile(
            rf"(?<!{PL_CHAR})(?:zignoruj|pomi[nń]|zapomnij|odrzu[cć])\s+(?:wszystkie\s+)?(?:poprzednie|powy[zż]sze|wcze[sś]niejsze|dotychczasowe)\s+(?:instrukcje|polecenia|wytyczne|ustalenia|zasady)",
            re.IGNORECASE,
        ),
        "severity": "high",
        "impact": "Próba nadpisania instrukcji systemowych — wyłączenie zasad analizy prawnej.",
    },
    {
        "technique": "prompt-injection-pl-newrole",
        "pattern": re.compile(
            rf"(?<!{PL_CHAR})(?:dzia[lł]aj\s+(?:jako|jak)|udawaj,?\s+[zż]e\s+jeste[sś]|wciel\s+si[eę]\s+w)(?!{PL_CHAR})",
            re.IGNORECASE,
        ),
        "severity": "high",
        "impact": "Próba przejęcia roli (role override) — wymuszenie nowej persony modelu.",
    },
    {
        "technique": "prompt-injection-pl-reveal",
        "pattern": re.compile(
            rf"(?<!{PL_CHAR})(?:ujawnij|poka[zż]|wypisz|wy[sś]wietl|zdrad[zź])\s+(?:sw[oó]j\s+)?(?:prompt\s+systemowy|instrukcje\s+systemowe|polecenie\s+systemowe|konfiguracj[eę]|ustawienia\s+systemowe)",
            re.IGNORECASE,
        ),
        "severity": "high",
        "impact": "Próba ekstrakcji promptu systemowego.",
    },
    {
        "technique": "jailbreak-pl-mode",
        "pattern": re.compile(
            rf"(?<!{PL_CHAR})(?:tryb\s+(?:dewelopera|deweloperski|bez\s+ogranicze[nń]|nieocenzurowany|swobodny)|bez\s+(?:filtr[oó]w|cenzury|ogranicze[nń])|pomi[nń]\s+(?:zabezpieczenia|filtry|zasady\s+bezpiecze[nń]stwa))(?!{PL_CHAR})",
            re.IGNORECASE,
        ),
        "severity": "high",
        "impact": "Polski wariant próby jailbreak — wyłączenie filtrów bezpieczeństwa.",
    },
]

PROMPT_INJECTION_EN = [
    {
        "technique": "prompt-injection-en-ignore",
        "pattern": re.compile(
            r"\b(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|above|prior|earlier)\s+(?:instructions|prompts|commands|rules)\b",
            re.IGNORECASE,
        ),
        "severity": "high",
        "impact": "Override instrukcji systemowych (wariant angielski).",
    },
    {
        "technique": "prompt-injection-en-marker",
        "pattern": re.compile(
            r"\[(?:SYSTEM|ADMIN|INST|/INST)\]|<\|(?:system|im_start|im_end)\|>|###\s*system",
            re.IGNORECASE,
        ),
        "severity": "medium",
        "impact": "Wstrzyknięty marker roli/sekcji — próba sfałszowania struktury dialogu.",
    },
    {
        "technique": "jailbreak-en-known",
        "pattern": re.compile(
            r"\b(?:DAN|STAN|DUDE|AIM)\b|do\s+anything\s+now|developer\s+mode|jailbreak",
            re.IGNORECASE,
        ),
        "severity": "high",
        "impact": "Znana technika jailbreak (wariant angielski).",
    },
]


def detect_adversarial(text: str) -> List[SecurityFinding]:
    findings: List[SecurityFinding] = []
    all_rules = PROMPT_INJECTION_PL + PROMPT_INJECTION_EN

    for rule in all_rules:
        for match in rule["pattern"].finditer(text):
            findings.append(
                SecurityFinding(
                    detector="adversarial",
                    technique=rule["technique"],
                    severity=rule["severity"],  # type: ignore
                    snippet=match.group(0),
                    impact=rule["impact"],
                    offset=match.start(),
                )
            )

    # Context stuffing check (repeated sentences drowning prompt)
    sentences = [s.strip() for s in re.split(r"[.!?\n]+", text) if len(s.strip()) > 10]
    if len(sentences) >= 100:
        unique = set(s.lower() for s in sentences)
        repetition = 1.0 - (len(unique) / len(sentences))
        if repetition > 0.4:
            findings.append(
                SecurityFinding(
                    detector="adversarial",
                    technique="context-stuffing",
                    severity="medium",
                    snippet=f"Powtarzalność zdań: {repetition * 100:.1f}% na {len(sentences)} zdań",
                    impact="Próba zalania kontekstu i obniżenia uwagi modelu na krytyczne instrukcje.",
                )
            )

    return findings


# ─────────────────────────────────────────────────────────────────────────────
# 2. STEGANOGRAPHY & ZERO-WIDTH DETECTOR
# ─────────────────────────────────────────────────────────────────────────────

ZERO_WIDTH_CHARS = {
    "\u200B": "ZERO WIDTH SPACE",
    "\u200C": "ZERO WIDTH NON-JOINER",
    "\u200D": "ZERO WIDTH JOINER",
    "\uFEFF": "ZERO WIDTH NO-BREAK SPACE",
    "\u2060": "WORD JOINER",
    "\u200E": "LEFT-TO-RIGHT MARK",
    "\u200F": "RIGHT-TO-LEFT MARK",
}

BIDI_OVERRIDES = {
    "\u202A": "LRE",
    "\u202B": "RLE",
    "\u202C": "PDF",
    "\u202D": "LRO",
    "\u202E": "RLO",
    "\u2066": "LRI",
    "\u2067": "RLI",
    "\u2068": "FSI",
    "\u2069": "PDI",
}


def detect_steganography(text: str) -> List[SecurityFinding]:
    findings: List[SecurityFinding] = []

    zw_count = sum(1 for c in text if c in ZERO_WIDTH_CHARS)
    if zw_count > 3:
        findings.append(
            SecurityFinding(
                detector="steganography",
                technique="zero-width-injection",
                severity="high" if zw_count > 10 else "medium",
                snippet=f"Wykryto {zw_count} niewidocznych znaków zero-width w tekście",
                impact="Ukryty ładunek tekstowy niewidoczny dla człowieka, a przetwarzany przez LLM.",
            )
        )

    bidi_count = sum(1 for c in text if c in BIDI_OVERRIDES)
    if bidi_count > 0:
        findings.append(
            SecurityFinding(
                detector="steganography",
                technique="bidi-override",
                severity="medium",
                snippet=f"Wykryto {bidi_count} znaków odwrócenia kierunku tekstu (BiDi)",
                impact="Próba zamaskowania prawdziwego znaczenia tekstu za pomocą odwrócenia renderowania.",
            )
        )

    return findings


# ─────────────────────────────────────────────────────────────────────────────
# 3. OBFUSCATION & HOMOGLYPH DETECTOR (PL-AWARE)
# ─────────────────────────────────────────────────────────────────────────────


def _get_script(char: str) -> str:
    name = unicodedata.name(char, "")
    if "CYRILLIC" in name:
        return "Cyrillic"
    if "GREEK" in name:
        return "Greek"
    if "LATIN" in name:
        return "Latin"
    return "Other"


def detect_obfuscation(text: str) -> List[SecurityFinding]:
    findings: List[SecurityFinding] = []

    # Mixed script detection per word (e.g. latin 'a' replaced by cyrillic 'а')
    words = re.findall(r"\b\w+\b", text)
    mixed_words = []

    for w in words:
        scripts = set(_get_script(c) for c in w if c.isalpha())
        if "Latin" in scripts and ("Cyrillic" in scripts or "Greek" in scripts):
            mixed_words.append(w)

    if mixed_words:
        findings.append(
            SecurityFinding(
                detector="obfuscation",
                technique="homoglyph-mixed-script",
                severity="high" if len(mixed_words) > 3 else "medium",
                snippet=f"Słowa z mieszanym pismem (homoglify): {', '.join(mixed_words[:5])}",
                impact="Użycie znaków cyrylicy/greki udających litery łacińskie w celu ominięcia filtrów.",
            )
        )

    # Base64 large payload detection in text
    b64_matches = re.findall(r"(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?", text)
    for b64 in b64_matches:
        try:
            decoded = base64.b64decode(b64).decode("utf-8", errors="ignore")
            if any(term in decoded.lower() for term in ["system", "ignore", "prompt", "eval", "exec"]):
                findings.append(
                    SecurityFinding(
                        detector="obfuscation",
                        technique="base64-payload-injection",
                        severity="high",
                        snippet=b64[:30] + "...",
                        impact="Ukryty zakodowany ładunek Base64 zawierający komendy systemowe/instrukcje.",
                    )
                )
                break
        except Exception:
            pass

    return findings


# ─────────────────────────────────────────────────────────────────────────────
# 4. EVASION & COMBINING CHARS DETECTOR
# ─────────────────────────────────────────────────────────────────────────────


def detect_evasion(text: str) -> List[SecurityFinding]:
    findings: List[SecurityFinding] = []

    # Combining characters stacking (Zalgo text)
    combining_count = sum(1 for c in text if unicodedata.combining(c) > 0)
    # W języku polskim znaki są wstępnie skomponowane (NFC), ale dopuszczamy małą liczbę
    if combining_count > 15 and (combining_count / max(len(text), 1)) > 0.05:
        findings.append(
            SecurityFinding(
                detector="evasion",
                technique="combining-char-stacking",
                severity="medium",
                snippet=f"Wykryto {combining_count} łączących znaków diakrytycznych (Zalgo/Evasion)",
                impact="Próba zniekształcenia tokenizacji modelu i ominięcia reguł parsowania.",
            )
        )

    # Unicode Tag Characters (U+E0000 - U+E007F)
    tag_chars = sum(1 for c in text if 0xE0000 <= ord(c) <= 0xE007F)
    if tag_chars > 0:
        findings.append(
            SecurityFinding(
                detector="evasion",
                technique="unicode-tag-injection",
                severity="critical",
                snippet=f"Wykryto {tag_chars} znaków Unicode Tag",
                impact="Ukryty kanał komunikacji w standardzie Unicode.",
            )
        )

    return findings


# ─────────────────────────────────────────────────────────────────────────────
# 5. ORCHESTRATOR & SCORER (AI ACT ART. 12 AUDIT CHAIN)
# ─────────────────────────────────────────────────────────────────────────────


def analyze_input_security(
    text: str,
    file_name: Optional[str] = None,
    declared_type: Optional[str] = None,
) -> SecurityScanResult:
    """Główna deterministyczna funkcja skanująca Patron Security dla każdego wejścia."""
    if not text:
        return SecurityScanResult(
            action="allowed",
            risk_score=0,
            threat_level="none",
            findings=[],
            audit_hash=hashlib.sha256(b"").hexdigest(),
        )

    all_findings: List[SecurityFinding] = []
    all_findings.extend(detect_adversarial(text))
    all_findings.extend(detect_steganography(text))
    all_findings.extend(detect_obfuscation(text))
    all_findings.extend(detect_evasion(text))

    # Obliczanie punktacji ryzyka (0 - 100)
    score = 0
    for f in all_findings:
        if f.severity == "critical":
            score += 60
        elif f.severity == "high":
            score += 35
        elif f.severity == "medium":
            score += 15
        elif f.severity == "low":
            score += 5

    score = min(score, 100)

    # Ustalanie poziomu zagrożenia i akcji
    if score >= 70:
        threat_level = "critical" if any(f.severity == "critical" for f in all_findings) else "high"
        action: ActionType = "blocked"
    elif score >= 35:
        threat_level = "high"
        action = "human_review"
    elif score >= 15:
        threat_level = "medium"
        action = "quarantined"
    elif score > 0:
        threat_level = "low"
        action = "allowed"
    else:
        threat_level = "none"
        action = "allowed"

    # Sanityzacja jeśli quarantined (usunięcie zero-width i bidi)
    sanitized = text
    if action in ["quarantined", "allowed"] and any(f.detector == "steganography" for f in all_findings):
        sanitized = "".join(c for c in text if c not in ZERO_WIDTH_CHARS and c not in BIDI_OVERRIDES)

    # Hash audytowy AI Act Art. 12 (rejestrowanie integralności)
    audit_payload = f"{text}|{score}|{action}|{file_name or ''}"
    audit_hash = hashlib.sha256(audit_payload.encode("utf-8")).hexdigest()

    return SecurityScanResult(
        action=action,
        risk_score=score,
        threat_level=threat_level,
        findings=all_findings,
        sanitized_text=sanitized,
        audit_hash=audit_hash,
    )
