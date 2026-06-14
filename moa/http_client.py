from typing import Optional
from openai import AsyncOpenAI
from moa.config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL

_shared_openai_client: Optional[AsyncOpenAI] = None
_ping_openai_client: Optional[AsyncOpenAI] = None

def get_shared_openai_client() -> AsyncOpenAI:
    """Zwraca współdzielony klient OpenAI/OpenRouter do odpytywania modeli."""
    global _shared_openai_client
    if _shared_openai_client is None:
        _shared_openai_client = AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
            timeout=120.0  # Musi być >= najdłuższego asyncio.wait_for w orchestratorze
        )
    return _shared_openai_client


def get_ping_openai_client(timeout_seconds: float = 12.0) -> AsyncOpenAI:
    global _ping_openai_client
    if _ping_openai_client is None:
        _ping_openai_client = AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
            timeout=float(timeout_seconds),
            max_retries=0,
        )
    return _ping_openai_client
