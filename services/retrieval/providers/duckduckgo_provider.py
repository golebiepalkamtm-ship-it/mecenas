import logging
from typing import Dict, Any, List
from ddgs import DDGS

logger = logging.getLogger(__name__)

async def duckduckgo_search(query: str, max_results: int = 5) -> Dict[str, Any]:
    """
    Wykonuje wyszukiwanie w internecie za pomocą DuckDuckGo.
    """
    logger.info(f"[DuckDuckGo] Wyszukiwanie frazy: '{query}', limit={max_results}")
    
    try:
        # Biblioteka duckduckgo-search ma wbudowane wsparcie dla asyncio w pewnych wersjach,
        # ale w bezpiecznym standardowym podejściu używamy asynchronicznego uruchomienia blokującego kodu
        import asyncio
        
        def _search():
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
                return results

        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, _search)
        
        formatted_results = []
        for r in results:
            formatted_results.append({
                "title": r.get("title", ""),
                "href": r.get("href", ""),
                "body": r.get("body", "")
            })
            
        logger.info(f"[DuckDuckGo] Znaleziono {len(formatted_results)} wyników dla: '{query}'")
        
        return {
            "status": "ok",
            "items": formatted_results
        }
        
    except Exception as e:
        logger.error(f"[DuckDuckGo] Błąd wyszukiwania: {e}")
        return {
            "status": "error",
            "message": str(e)
        }
