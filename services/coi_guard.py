from __future__ import annotations


_CONFLICTED_ENTITIES = (
    "Kowalski Sp. z o.o.",
    "Pol-Hurt S.A.",
    "Acme Corp",
    "Janusz Kowalski",
    "Marek Nowak",
    "Bank Millennium",
    "PKO BP",
)


def check_coi(text: str) -> list[str]:
    if not text:
        return []
    found_conflicts: list[str] = []
    for entity in _CONFLICTED_ENTITIES:
        if entity.lower() in text.lower():
            found_conflicts.append(entity)
    return found_conflicts
