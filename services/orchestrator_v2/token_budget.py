import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Conservative Polish-language character-to-token ratio (1 token ≈ 3.0 characters)
CHARS_PER_TOKEN = 3.0

def get_model_context_limit(model_id: str) -> int:
    """Returns context window token limit for a given model ID dynamically from settings."""
    from database import get_setting
    # Fetch from settings or fallback to a safe 64000 token limit if undefined
    try:
        return int(get_setting("default_context_tokens", "64000"))
    except ValueError:
        return 64000

def calculate_char_budget(model_id: str, reserve_output_tokens: int, safety_margin_tokens: int = 2000) -> int:
    """
    Computes the maximum allowed characters for the input block,
    reserving space for output generation and a safety margin.
    """
    context_tokens = get_model_context_limit(model_id)
    input_tokens = max(2000, context_tokens - reserve_output_tokens - safety_margin_tokens)
    return int(input_tokens * CHARS_PER_TOKEN)

def allocate_synthesis_context(
    model_id: str,
    reserve_output_tokens: int,
    system_prompt: str,
    user_query: str,
    expert_opinions: str,
    combined_context: str
) -> str:
    """
    Dynamically computes the remaining character budget for the legal context
    after accounting for system prompt, user query, expert opinions, and format overhead.
    Slices the combined_context to fit the remaining budget safely.
    """
    total_char_budget = calculate_char_budget(model_id, reserve_output_tokens)
    
    # Calculate non-context prompt size plus formatting overhead
    prompt_overhead = (
        len(system_prompt or "") +
        len(user_query or "") +
        len(expert_opinions or "") +
        1500 # safety padding for prompt wrappers and formatting labels
    )
    
    remaining_char_budget = total_char_budget - prompt_overhead
    # Ensure a minimum context of at least 5000 characters (approx. 1600 tokens)
    safe_char_limit = max(5000, remaining_char_budget)
    
    logger.info(
        f"[TokenBudget] Model: {model_id} | Total Char Budget: {total_char_budget} | "
        f"Prompt Overhead Chars: {prompt_overhead} | Safe Legal Context Cap Chars: {safe_char_limit}"
    )
    
    if len(combined_context) > safe_char_limit:
        logger.warning(
            f"[TokenBudget] Combined context size ({len(combined_context)} chars) exceeds "
            f"safe limit ({safe_char_limit} chars). Slicing context."
        )
        return combined_context[:safe_char_limit] + "\n\n... [Koniec kontekstu, przycięto dynamicznie z powodu limitów LLM]"
        
    return combined_context
