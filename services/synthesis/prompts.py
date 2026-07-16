from __future__ import annotations

from prompts.loader import get_master_system_prompt, load_prompt

CONVERSATION_CONTINUITY_GUARD = load_prompt("conversation_continuity_guard")

DEFAULT_ARCHITECT_PROMPT = load_prompt("architect_default")
CITIZEN_ARCHITECT_PROMPT = load_prompt("architect_citizen")
DRAFT_ARCHITECT_PROMPT = load_prompt("architect_draft")

DRAFT_SYNTHESIS_GUARD = load_prompt("draft_synthesis_guard")
PROCEDURE_ADAPTIVE_GUARD = load_prompt("procedure_adaptive_guard")
ANTI_PARAPHRASE_GUARD = load_prompt("anti_paraphrase_guard")
STRICT_NO_QUOTE_GUARD = load_prompt("strict_no_quote_guard")
STRATEGIST_ENGAGEMENT_GUARD = load_prompt("strategist_engagement_guard")
INDIVIDUAL_CONTEXT_GUARD = load_prompt("individual_context_guard")
COHERENCE_SYNTHESIS_GUARD = load_prompt("coherence_synthesis_guard")
ADVISOR_SYNTHESIS_GUARD = load_prompt("advisor_synthesis_guard")
STRATEGIC_SYNTHESIS_GUARD = load_prompt("strategic_synthesis_guard")
JUDGE_DEBATE_SYNTHESIS = load_prompt("judge_debate_synthesis")
LOW_CONFIDENCE_SYNTHESIS_EXTRA = load_prompt("low_confidence_synthesis_extra")
CLIENT_PLAIN_LANGUAGE_GUARD = load_prompt("client_plain_language_guard")
LITIGATION_STRATEGIC_GUARD = load_prompt("litigation_strategic_guard")
HUMANIZED_OUTPUT_GUARD = load_prompt("humanized_output_guard")

MASTER_SYSTEM_PROMPT = get_master_system_prompt()
