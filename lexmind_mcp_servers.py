"""LexMind AI Custom MCP Servers

Serwery MCP zoptymalizowane dla pracy z LexMind:
1. Legal Search - wyszukiwanie w bazie aktów prawnych
2. Chat History - zarządzanie historią chatów
3. Document Manager - obsługa dokumentów PDF
4. Code Navigator - nawigacja po kodzie projektu
"""

from fastmcp import FastMCP, Context
import json
from pathlib import Path
from typing import Optional, List, Dict
import asyncio

# ====================
# 1. LEGAL SEARCH MCP
# ====================
legal_search_mcp = FastMCP("LexMind Legal Search")

@legal_search_mcp.tool()
async def search_legal_acts(keywords: str, limit: int = 5) -> str:
    """Szuka aktów prawnych w bazie LexMind
    
    Args:
        keywords: Słowa kluczowe do wyszukania (np. 'kodeks karny', 'art. 100')
        limit: Maksymalna liczba wyników
    
    Returns:
        JSON z wynikami wyszukiwania
    """
    from services.retrieval_service import retrieval_service
    
    try:
        results = await retrieval_service.search_eli(keywords=keywords, limit=limit)
        return json.dumps({
            "status": "ok",
            "query": keywords,
            "count": len(results),
            "results": [{"title": r.get("title"), "source": r.get("source")} for r in results]
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

@legal_search_mcp.tool()
async def search_judgments(keywords: str, limit: int = 5) -> str:
    """Szuka wyroków w SAOS
    
    Args:
        keywords: Słowa kluczowe
        limit: Maksymalna liczba wyników
    
    Returns:
        JSON z wynikami
    """
    from services.retrieval_service import retrieval_service
    
    try:
        results = await retrieval_service.search_saos(keywords=keywords, limit=limit)
        return json.dumps({
            "status": "ok",
            "query": keywords,
            "count": len(results),
            "results": results
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

@legal_search_mcp.tool()
async def search_supabase_rag(query: str, table_name: str = "knowledge_base_legal", limit: int = 5) -> str:
    """Szuka w bazie wiedzy RAG w Supabase (wyszukiwanie hybrydowe/wektorowe)
    
    Args:
        query: Zapytanie tekstowe/przepis/zagadnienie
        table_name: Nazwa tabeli (domyślnie 'knowledge_base_legal')
        limit: Maksymalna liczba wyników
    
    Returns:
        JSON z wynikami wyszukiwania RAG
    """
    from services.retrieval_service import retrieval_service
    
    try:
        results = await retrieval_service.search_supabase(
            query=query,
            table_name=table_name,
            match_count=limit,
            hybrid=True
        )
        return json.dumps({
            "status": "ok",
            "query": query,
            "count": len(results),
            "results": results
        }, default=str)
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


# ====================
# 2. CHAT HISTORY MCP
# ====================
chat_history_mcp = FastMCP("LexMind Chat History")

@chat_history_mcp.tool()
def list_sessions() -> str:
    """Wyświetla ostatnie sesje czatu
    
    Returns:
        JSON z listą sesji
    """
    from database import get_recent_sessions
    
    try:
        sessions = get_recent_sessions(limit=10)
        return json.dumps({
            "status": "ok",
            "sessions": sessions
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

@chat_history_mcp.tool()
def get_session_messages(session_id: str) -> str:
    """Pobiera wiadomości z sesji
    
    Args:
        session_id: ID sesji
    
    Returns:
        JSON z wiadomościami
    """
    from database import get_session_messages
    
    try:
        messages = get_session_messages(session_id)
        return json.dumps({
            "status": "ok",
            "session_id": session_id,
            "messages": messages
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

# ====================
# 3. DOCUMENT MANAGER MCP
# ====================
doc_manager_mcp = FastMCP("LexMind Document Manager")

@doc_manager_mcp.tool()
def list_documents(folder: str = "lexmind_acts") -> str:
    """Wyświetla dokumenty w folderze
    
    Args:
        folder: Folder do przeszukania
    
    Returns:
        JSON z listą dokumentów
    """
    try:
        path = Path(folder)
        docs = [
            {"name": f.name, "size": f.stat().st_size, "type": f.suffix}
            for f in path.glob("**/*") if f.is_file()
        ]
        return json.dumps({
            "status": "ok",
            "folder": folder,
            "count": len(docs),
            "documents": docs
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

@doc_manager_mcp.tool()
def get_document_info(filepath: str) -> str:
    """Pobiera info o dokumencie
    
    Args:
        filepath: Ścieżka do dokumentu
    
    Returns:
        JSON z metadanymi
    """
    try:
        path = Path(filepath)
        if not path.exists():
            return json.dumps({"status": "error", "message": "File not found"})
        
        stat = path.stat()
        return json.dumps({
            "status": "ok",
            "filepath": filepath,
            "size": stat.st_size,
            "modified": stat.st_mtime,
            "type": path.suffix
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

# ====================
# 4. CODE NAVIGATOR MCP
# ====================
code_nav_mcp = FastMCP("LexMind Code Navigator")

@code_nav_mcp.tool()
def find_files(pattern: str = "*.py") -> str:
    """Znajduje pliki w projekcie
    
    Args:
        pattern: Glob pattern
    
    Returns:
        JSON z listą plików
    """
    try:
        files = list(Path(".").glob(pattern))
        return json.dumps({
            "status": "ok",
            "pattern": pattern,
            "count": len(files),
            "files": [str(f) for f in files[:20]]  # First 20
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

@code_nav_mcp.tool()
def search_code(keyword: str, file_pattern: str = "**/*.py") -> str:
    """Szuka słowa kluczowego w kodzie
    
    Args:
        keyword: Słowo do wyszukania
        file_pattern: Mask plików
    
    Returns:
        JSON z wynikami
    """
    try:
        results = []
        for fpath in Path(".").glob(file_pattern):
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    for i, line in enumerate(f, 1):
                        if keyword.lower() in line.lower():
                            results.append({
                                "file": str(fpath),
                                "line": i,
                                "text": line.strip()
                            })
                            if len(results) >= 10:
                                break
            except:
                pass
            if len(results) >= 10:
                break
        
        return json.dumps({
            "status": "ok",
            "keyword": keyword,
            "count": len(results),
            "results": results
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

# ====================
# ROUTER - Wszystkie MCP
# ====================
if __name__ == "__main__":
    # Uruchom wybrany MCP server
    import sys
    
    if len(sys.argv) > 1:
        server_name = sys.argv[1]
        if server_name == "legal":
            legal_search_mcp.run(transport="stdio")
        elif server_name == "chat":
            chat_history_mcp.run(transport="stdio")
        elif server_name == "docs":
            doc_manager_mcp.run(transport="stdio")
        elif server_name == "code":
            code_nav_mcp.run(transport="stdio")
        else:
            print(f"Unknown server: {server_name}")
            print("Available: legal, chat, docs, code")
    else:
        # Default: legal search
        legal_search_mcp.run(transport="stdio")
