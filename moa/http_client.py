import httpx
from openai import AsyncOpenAI
from moa.config import (
    OPENROUTER_API_KEY, 
    OPENROUTER_BASE_URL, 
    LLM_TIMEOUT
)

class HTTPClientPool:
    _instance = None
    _httpx_client: httpx.AsyncClient = None
    _openai_client: AsyncOpenAI = None
    _openai_direct_client: AsyncOpenAI = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(HTTPClientPool, cls).__new__(cls)
        return cls._instance

    def get_httpx_client(self) -> httpx.AsyncClient:
        if self._httpx_client is None or self._httpx_client.is_closed:
            self._httpx_client = httpx.AsyncClient(
                timeout=httpx.Timeout(timeout=LLM_TIMEOUT),
                follow_redirects=True,
                limits=httpx.Limits(max_connections=100, max_keepalive_connections=20)
            )
        return self._httpx_client

    def get_openrouter_client(self) -> AsyncOpenAI:
        if self._openai_client is None:
            self._openai_client = AsyncOpenAI(
                api_key=OPENROUTER_API_KEY,
                base_url=OPENROUTER_BASE_URL,
                timeout=LLM_TIMEOUT,
                default_headers={
                    "HTTP-Referer": "http://127.0.0.1:8003",
                    "X-Title": "LexMind AI",
                },
                http_client=self.get_httpx_client(),
                max_retries=0
            )
        return self._openai_client

    def get_openai_direct_client(self) -> AsyncOpenAI:
        """Klienci bezpośredni dla OpenAI (nie przez OpenRouter)."""
        from moa.config import OPENAI_API_KEY
        if self._openai_direct_client is None and OPENAI_API_KEY:
            self._openai_direct_client = AsyncOpenAI(
                api_key=OPENAI_API_KEY,
                timeout=LLM_TIMEOUT,
                http_client=self.get_httpx_client(),
            )
        return self._openai_direct_client

    async def close_all(self):
        if self._httpx_client and not self._httpx_client.is_closed:
            await self._httpx_client.aclose()
        self._httpx_client = None
        self._openai_client = None
        self._openai_direct_client = None

# Global instance
client_pool = HTTPClientPool()

def get_shared_httpx_client() -> httpx.AsyncClient:
    return client_pool.get_httpx_client()

def get_shared_openai_client() -> AsyncOpenAI:
    """Zwraca domyślny klient (OpenRouter)."""
    return client_pool.get_openrouter_client()

def get_direct_openai_client() -> AsyncOpenAI:
    return client_pool.get_openai_direct_client()
