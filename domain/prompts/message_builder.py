"""Składanie ustrukturyzowanych wiadomości LLM (system / user)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from prompts.loader import get_master_system_prompt, load_prompt
from schemas.chat_contract import ProcessSide, ResponseMode


@dataclass(frozen=True)
class ExpertGuards:
    master_system: str
    expert_task_preamble: str
    expert_output_format: str
    strict_no_quote: str
    individual_context: str
    polish_legal: str


def default_expert_guards() -> ExpertGuards:
    return ExpertGuards(
        master_system=get_master_system_prompt(),
        expert_task_preamble=load_prompt("expert_task_preamble"),
        expert_output_format=load_prompt("expert_output_format"),
        strict_no_quote=load_prompt("strict_no_quote_guard"),
        individual_context=load_prompt("individual_context_guard"),
        polish_legal=load_prompt("polish_legal_language_guard"),
    )


def _join_blocks(blocks: List[str]) -> str:
    return "\n\n".join(b.strip() for b in blocks if b and b.strip())


class PromptMessageBuilder:
    def __init__(
        self,
        side: ProcessSide,
        response_mode: ResponseMode,
        guards: Optional[ExpertGuards] = None,
    ) -> None:
        self.side = side
        self.response_mode = response_mode
        self.guards = guards or default_expert_guards()

    def build_expert_messages(
        self,
        role_block: str,
        task_block: str,
        case_context: str,
        user_query: str,
        legal_basis_block: str = "",
    ) -> List[dict]:
        system_blocks = [
            self.guards.master_system,
            self.guards.expert_task_preamble,
            self.guards.strict_no_quote,
            self.guards.individual_context,
            task_block,
            role_block,
        ]
        user_blocks: List[str] = []
        if (legal_basis_block or "").strip():
            user_blocks.append(
                "--- PODSTAWA PRAWNA (RAG — obowiązkowa) ---\n"
                f"{legal_basis_block.strip()}"
            )
        user_blocks.append(
            "--- KONTEKST SPRAWY ---\n"
            f"{(case_context or '').strip()}\n\n"
            "--- PYTANIE KLIENTA ---\n"
            f"{(user_query or '').strip()}"
        )
        user_blocks.append(self.guards.expert_output_format)
        user_blocks.append(self.guards.polish_legal)

        return [
            {"role": "system", "content": _join_blocks(system_blocks)},
            {"role": "user", "content": _join_blocks(user_blocks)},
        ]

    def build_single_messages(
        self,
        architect_instructions: str,
        system_role: str,
        case_context: str,
        user_query: str,
        legal_basis_block: str = "",
        extra_system_guards: Optional[List[str]] = None,
    ) -> List[dict]:
        system_blocks = [
            self.guards.master_system,
            f"Tożsamość:\n{(system_role or 'Jesteś ekspertem prawnym.').strip()}",
            f"Formatowanie (Architekt):\n{architect_instructions.strip()}",
        ]
        if extra_system_guards:
            system_blocks.extend(extra_system_guards)

        user_blocks: List[str] = []
        if (legal_basis_block or "").strip():
            user_blocks.append(f"Przepisy (RAG):\n{legal_basis_block.strip()}")
        user_blocks.append(f"Akta sprawy:\n{(case_context or '').strip()}")
        user_blocks.append(f"Zadanie klienta: {(user_query or '').strip()}")

        return [
            {"role": "system", "content": _join_blocks(system_blocks)},
            {"role": "user", "content": _join_blocks(user_blocks)},
        ]

    def build_judge_messages(
        self,
        system_content: str,
        advisor_user_content: str,
    ) -> List[dict]:
        """Sędzia: system_content już zawiera guardy + architekt (bez roli eksperta)."""
        return [
            {"role": "system", "content": system_content.strip()},
            {"role": "user", "content": advisor_user_content.strip()},
        ]
