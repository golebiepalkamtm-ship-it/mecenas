import pytest
from prompts.loader import load_prompt, get_master_system_prompt

def test_load_all_prompts():
    prompts_to_test = [
        # Agents
        "prompt_agent_constitutional",
        "prompt_agent_counter",
        "prompt_agent_criminal_defense",
        "prompt_agent_doctrinal",
        "prompt_agent_document_destructor",
        "prompt_agent_emergency",
        "prompt_agent_legal_draftsman",
        "prompt_agent_master_strategist",
        "prompt_agent_narcotics_defense",
        "prompt_agent_rag_researcher",
        "prompt_agent_strategic",
        # Guards
        "advisor_synthesis_guard",
        "anti_paraphrase_guard",
        "client_plain_language_guard",
        "coherence_synthesis_guard",
        "concrete_client_actions_guard",
        "conversation_continuity_guard",
        "document_presence_guard",
        "draft_synthesis_guard",
        "helpful_synthesis_guard",
        "humanized_output_guard",
        "individual_context_guard",
        "judge_debate_synthesis",
        "litigation_strategic_guard",
        "low_confidence_synthesis_extra",
        "multi_stage_synthesis",
        "polish_legal_language_guard",
        "procedure_adaptive_guard",
        "strategic_synthesis_guard",
        "strategist_engagement_guard",
        "strict_no_quote_guard",
        "traffic_stop_fast_answer_guard",
        "traffic_stop_guard",
        "user_priority_guard",
        # Architect
        "architect_citizen",
        "architect_default",
        "architect_draft",
        "architect_with_document_addendum",
        # System / General
        "debate_cross_exam",
        "document_context_header",
        "expert_output_format",
        "expert_task_preamble",
        "lexmind_master_system",
        "ocr_verbatim",
        "ocr_verbatim_continue",
        "router_keywords_system"
    ]

    for p in prompts_to_test:
        content = load_prompt(p)
        assert len(content) > 0, f"Prompt {p} jest pusty"

def test_get_master_system_prompt():
    master = get_master_system_prompt()
    assert len(master) > 0
    assert "CORE_THEME" in master or "LexMind" in master or len(master) > 100
