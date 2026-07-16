from __future__ import annotations

from services.llm_gateway import call_with_fallback
from services.prompts import load_prompt


async def run_debate_cross_exam(
    *,
    agent_results: list,
    combined_context: str,
    user_query: str,
    primary_model: str,
    status_callback=None,
) -> str:
    try:
        cross_prompt = load_prompt("debate_cross_exam")
    except FileNotFoundError:
        return ""
    claims_blob = "\n".join(
        f"--- {ar.get('model', 'ekspert')} ---\n{(ar.get('response') or '')[:2000]}"
        for ar in agent_results[:5]
    )
    prompt = (
        f"{cross_prompt}\n\n"
        f"PYTANIE: {user_query[:600]}\n\n"
        f"OPINIE:\n{claims_blob}\n\n"
        f"KONTEKST (skrót):\n{combined_context[:4000]}"
    )
    try:
        text, _ = await call_with_fallback(
            primary_model,
            [{"role": "user", "content": prompt}],
            max_tokens=1200,
            temperature=0.2,
            timeout=45.0,
            status_callback=status_callback,
            log_context="ETAP 8 R2 cross-exam",
        )
        return (text or "").strip()
    except Exception:
        return ""
