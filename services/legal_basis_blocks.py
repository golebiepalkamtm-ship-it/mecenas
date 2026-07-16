from __future__ import annotations

from typing import List


def format_expert_legal_basis(
    rag_legal_content: str,
    saos_block: str,
    eli_block: str,
) -> str:
    parts: List[str] = []
    if (rag_legal_content or "").strip():
        parts.append(
            "[PRZEPISY BAZY PRAWNEJ — cytuj art. TYLKO stąd, z ELI lub z akt klienta]\n"
            f"{rag_legal_content.strip()}"
        )
    if (eli_block or "").strip():
        parts.append(f"[AKTY PRAWNE ELI/ISAP]\n{eli_block.strip()}")
    if (saos_block or "").strip():
        parts.append(f"[ORZECZNICTWO SAOS]\n{saos_block.strip()}")
    if not parts:
        return ""
    blob = "\n\n".join(parts)
    legal_cap = max(18_000, min(len(blob), 48_000))
    if len(blob) <= legal_cap:
        return blob
    return blob[: legal_cap - 48] + "\n\n[… skrócono blok prawny — reszta w syntezie końcowej …]\n"
