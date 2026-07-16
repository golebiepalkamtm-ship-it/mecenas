from __future__ import annotations

from domain.prompts.message_builder import ExpertGuards
from prompts.loader import get_master_system_prompt, load_prompt

EXPERT_TASK_PREAMBLE = load_prompt("expert_task_preamble")
EXPERT_OUTPUT_FORMAT = load_prompt("expert_output_format")
STRICT_NO_QUOTE_GUARD = load_prompt("strict_no_quote_guard")
INDIVIDUAL_CONTEXT_GUARD = load_prompt("individual_context_guard")
POLISH_LEGAL_LANGUAGE_GUARD = load_prompt("polish_legal_language_guard")
MASTER_SYSTEM_PROMPT = get_master_system_prompt()


def build_expert_guards() -> ExpertGuards:
    return ExpertGuards(
        master_system=MASTER_SYSTEM_PROMPT,
        expert_task_preamble=EXPERT_TASK_PREAMBLE,
        expert_output_format=EXPERT_OUTPUT_FORMAT,
        strict_no_quote=STRICT_NO_QUOTE_GUARD,
        individual_context=INDIVIDUAL_CONTEXT_GUARD,
        polish_legal=POLISH_LEGAL_LANGUAGE_GUARD,
    )
