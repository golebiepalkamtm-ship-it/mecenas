"""PrawMi Legal AI & MCP Client (https://prawmi.pl)

Klient integrujący bazę aktów prawnych, orzecznictwa sądowego (SN, NSA, WSA, SA, SO)
oraz weryfikacji cytowań i halucynacji PrawMi.
"""
from __future__ import annotations

import os
import json
import asyncio
import logging
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger(__name__)

PRAWMI_DEFAULT_URL = "https://api.prawmi.pl/mcp"
PRAWMI_API_KEY = os.getenv("PRAWMI_API_KEY", "prawmi_live_826e9bb65bf779a5dcc252bd40b32f57")
PRAWMI_MCP_URL = os.getenv("PRAWMI_MCP_URL", PRAWMI_DEFAULT_URL)


class PrawmiClient:
    """Asynchroniczny klient do serwera MCP PrawMi (JSON-RPC over HTTP)."""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, timeout: float = 20.0):
        self.api_key = api_key or os.getenv("PRAWMI_API_KEY", PRAWMI_API_KEY)
        self.base_url = base_url or os.getenv("PRAWMI_MCP_URL", PRAWMI_MCP_URL)
        self.timeout = timeout
        self._msg_id = 0

    def _next_id(self) -> int:
        self._msg_id += 1
        return self._msg_id

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "LexMind/1.0",
        }

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any], max_retries: int = 3) -> Dict[str, Any]:
        """Wykonuje wywołanie narzędzia MCP w formacie JSON-RPC 2.0 z obsługą ponowień przy 429."""
        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(self.base_url, headers=self._headers(), json=payload)
                    
                    if resp.status_code == 429 and attempt < max_retries:
                        retry_after = float(resp.headers.get("Retry-After", 2.0 * (attempt + 1)))
                        logger.warning(f"[PrawMi] Rate limit 429, czekam {retry_after}s przed próbą {attempt + 1}/{max_retries}...")
                        await asyncio.sleep(retry_after)
                        continue
                    
                    resp.raise_for_status()
                    data = resp.json()

                    if "error" in data:
                        return {"status": "error", "error": data["error"]}

                    result = data.get("result", {})
                    # Sprawdź czy wynik zawiera structuredContent
                    if "structuredContent" in result:
                        return result["structuredContent"]

                    # Jeśli zawiera content typu text z JSON-em
                    content_list = result.get("content", [])
                    for c in content_list:
                        if c.get("type") == "text" and c.get("text"):
                            try:
                                parsed = json.loads(c["text"])
                                if isinstance(parsed, dict):
                                    return parsed
                            except Exception:
                                return {"status": "ok", "raw_text": c["text"]}

                    return {"status": "ok", "result": result}
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and attempt < max_retries:
                    await asyncio.sleep(2.0 * (attempt + 1))
                    continue
                return {"status": "error", "error": str(e)}
            except Exception as e:
                if attempt < max_retries:
                    await asyncio.sleep(1.0)
                    continue
                return {"status": "error", "error": str(e)}

        return {"status": "error", "message": "Max retries exceeded"}


    async def search_rulings(
        self,
        query: Optional[str] = None,
        case_number: Optional[str] = None,
        court_filter: Optional[str] = None,
        limit: int = 5,
    ) -> Dict[str, Any]:
        """Wyszukuje orzeczenia sądów polskich (SN, SA, SO, NSA, WSA) semantycznie lub po sygnaturze."""
        args: Dict[str, Any] = {"limit": limit}
        if query:
            args["query"] = query
        if case_number:
            args["case_number"] = case_number
        if court_filter:
            args["court_filter"] = court_filter
        return await self.call_tool("search_rulings", args)

    async def verify_ruling(self, case_number: str, skip_external: bool = False) -> Dict[str, Any]:
        """Weryfikuje poprawność sygnatury orzeczenia w bazie PrawMi oraz źródłach zewnętrznych (SAOS, NSA, SN)."""
        return await self.call_tool("verify_ruling", {"case_number": case_number, "skip_external": skip_external})

    async def get_article(self, act_shortname: str, article_number: str, include_regulations: bool = False) -> Dict[str, Any]:
        """Pobiera autorytatywną treść artykułu z ustawy (np. 'KK', 'KC', 'KPC') wraz z ustępami."""
        return await self.call_tool(
            "get_article",
            {"act_shortname": act_shortname, "article_number": str(article_number), "include_regulations": include_regulations},
        )

    async def get_ruling_text(self, ruling_link: str) -> Dict[str, Any]:
        """Pobiera pełny tekst orzeczenia sądowego po linku/identyfikatorze."""
        return await self.call_tool("get_ruling_text", {"ruling_link": ruling_link})

    async def search_acts(self, query: str, limit: int = 5) -> Dict[str, Any]:
        """Wyszukuje ustawy i kodeksy według tematu (zapobiega halucynacjom nazw ustaw)."""
        return await self.call_tool("search_acts", {"query": query, "limit": limit})

    async def search_rulings_by_article(
        self,
        act_shortname: str,
        article_number: str,
        court_filter: Optional[str] = None,
        limit: int = 5,
    ) -> Dict[str, Any]:
        """Wyszukuje orzeczenia sądowe cytujące dany artykuł ustawy/kodeksu."""
        args: Dict[str, Any] = {
            "act_shortname": act_shortname,
            "article_number": str(article_number),
            "limit": limit,
        }
        if court_filter:
            args["court_filter"] = court_filter
        return await self.call_tool("search_rulings_by_article", args)

    async def search_act_articles(
        self,
        topic: str,
        act_unified: Optional[str] = None,
        act_title: Optional[str] = None,
        limit: int = 5,
    ) -> Dict[str, Any]:
        """Wyszukuje właściwe artykuły w ramach danej ustawy po temacie."""
        args: Dict[str, Any] = {"topic": topic, "limit": limit}
        if act_unified:
            args["act_unified"] = act_unified
        if act_title:
            args["act_title"] = act_title
        return await self.call_tool("search_act_articles", args)

    async def verify_article_reference(self, fragment: str) -> Dict[str, Any]:
        """Audytuje tekst prawny pod kątem zmyślonych przepisów i sygnatur (detekcja halucynacji)."""
        return await self.call_tool("verify_article_reference", {"fragment": fragment})


prawmi_client = PrawmiClient()
