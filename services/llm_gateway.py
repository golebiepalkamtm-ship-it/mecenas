from __future__ import annotations

from typing import Any, Optional

from config import settings
from moa.http_client import get_shared_openai_client
from services.llm_client import LLMClientService
from services.model_resolution import resolve_model_id


_llm_gateway = LLMClientService(
    get_shared_openai_client(),
    fallback_models=settings.fallback_models,
    resolve_model_id=resolve_model_id,
)


async def call_with_fallback(
    model_id: str,
    messages: list,
    *,
    max_tokens: int = 1000,
    temperature: float = 0.2,
    timeout: float = 60.0,
    status_callback: Optional[Any] = None,
    log_context: str = "",
    response_format: Optional[Any] = None,
):
    return await _llm_gateway.call_with_fallback(
        model_id,
        messages,
        max_tokens=max_tokens,
        temperature=temperature,
        timeout=timeout,
        status_callback=status_callback,
        log_context=log_context,
        response_format=response_format,
    )


async def call_with_fallback_stream(
    model_id: str,
    messages: list,
    *,
    max_tokens: int = 2000,
    temperature: float = 0.3,
    timeout: float = 30.0,
    status_callback: Optional[Any] = None,
):
    return await _llm_gateway.call_with_fallback_stream(
        model_id,
        messages,
        max_tokens=max_tokens,
        temperature=temperature,
        timeout=timeout,
        status_callback=status_callback,
    )
