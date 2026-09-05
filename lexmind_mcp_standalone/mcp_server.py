import sys
import os
import json
import argparse
import asyncio
import re
import ast
import operator as op
import logging
from typing import Optional, List, Dict, Any

import httpx
from fastmcp import FastMCP
from duckduckgo_search import DDGS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LexMind-MCP-Standalone")

mcp = FastMCP("LexMind API MCP (Standalone)")

# --- Constants ---
SEJM_ELI_BASE = "https://api.sejm.gov.pl/eli"
SEJM_API_BASE = "https://api.sejm.gov.pl/sejm"
SAOS_API_BASE = "https://www.saos.org.pl/api"
KRS_API_BASE = "https://api-krs.ms.gov.pl/api/krs"
CBOSA_BASE = "https://orzeczenia.nsa.gov.pl/cbo/find"
CEIDG_BASE = "https://dane.biznes.gov.pl/api/ceidg/v2"

DEFAULT_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

def _json_resp(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, default=str)

def _strip_html(text: Any) -> str:
    if text is None or isinstance(text, bool):
        return ""
    source = str(text)
    clean = re.sub(r"<[^>]+>", " ", source)
    return re.sub(r"\s+", " ", clean).strip()

async def _http_get(url: str, params: Optional[dict] = None, headers: Optional[dict] = None, timeout: float = 15.0) -> Any:
    hdrs = {**DEFAULT_HEADERS, **(headers or {})}
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(url, params=params, headers=hdrs, follow_redirects=True)
        resp.raise_for_status()
        ct = resp.headers.get("content-type", "")
        if "json" in ct:
            return resp.json()
        return resp.text

# ==============================================================================
#  1. ISAP / ELI
# ==============================================================================
@mcp.tool()
async def isap_list_publishers() -> str:
    try:
        data = await _http_get(f"{SEJM_ELI_BASE}/acts")
        return _json_resp({"status": "ok", "publishers": data})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def isap_search_acts(publisher: str = "DU", year: int = 2024, query: str = "", type: str = "", status: str = "", limit: int = 20) -> str:
    try:
        data = await _http_get(f"{SEJM_ELI_BASE}/acts/{publisher}/{year}")
        items = data.get("items", []) if isinstance(data, dict) else data if isinstance(data, list) else []
        if query:
            q = query.lower()
            items = [i for i in items if isinstance(i, dict) and q in (i.get("title") or "").lower()]
        if type:
            t = type.lower()
            items = [i for i in items if isinstance(i, dict) and t in (i.get("type") or "").lower()]
        if status:
            s = status.lower()
            items = [i for i in items if isinstance(i, dict) and s in (i.get("status") or "").lower()]
        return _json_resp({"status": "ok", "count": len(items), "items": items[:limit]})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def isap_get_act_details(publisher: str = "DU", year: int = 2024, pos: int = 1) -> str:
    try:
        data = await _http_get(f"{SEJM_ELI_BASE}/acts/{publisher}/{year}/{pos}")
        return _json_resp({"status": "ok", "details": data})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def isap_get_act_text(publisher: str = "DU", year: int = 2024, pos: int = 1) -> str:
    try:
        raw = await _http_get(f"{SEJM_ELI_BASE}/acts/{publisher}/{year}/{pos}/text.html", headers={"Accept": "text/html"})
        clean = _strip_html(raw)
        return _json_resp({"status": "ok", "text": clean[:20000]})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

# ==============================================================================
#  2. SAOS (Sądy Powszechne)
# ==============================================================================
@mcp.tool()
async def saos_search_judgments(query: str = "", case_number: str = "", judge_name: str = "", law_clause: str = "", court_type: str = "", date_from: str = "", date_to: str = "", page_size: int = 10) -> str:
    try:
        params: dict = {"pageSize": page_size, "pageNumber": 0}
        if query: params["all"] = query
        if case_number: params["caseNumber"] = case_number
        if judge_name: params["judgeName"] = judge_name
        if law_clause: params["referencedRegulation"] = law_clause
        if court_type: params["courtType"] = court_type
        if date_from: params["judgmentDateFrom"] = date_from
        if date_to: params["judgmentDateTo"] = date_to

        data = await _http_get(f"{SAOS_API_BASE}/search/judgments", params=params, headers={"Referer": "https://www.saos.org.pl/"})
        items = data.get("items", []) if isinstance(data, dict) else []
        total = (data.get("info") or {}).get("totalResults", len(items)) if isinstance(data, dict) else 0
        return _json_resp({"status": "ok", "total": total, "items": items})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def saos_get_judgment_details(id: int) -> str:
    try:
        data = await _http_get(f"{SAOS_API_BASE}/judgments/{id}", headers={"Referer": "https://www.saos.org.pl/"})
        return _json_resp({"status": "ok", "data": data})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def saos_search_by_article(law_clause: str, limit: int = 10) -> str:
    return await saos_search_judgments(law_clause=law_clause, page_size=limit)

@mcp.tool()
async def saos_list_courts() -> str:
    try:
        data = await _http_get(f"{SAOS_API_BASE}/courts", headers={"Referer": "https://www.saos.org.pl/"})
        items = data.get("items", data) if isinstance(data, dict) else data if isinstance(data, list) else []
        return _json_resp({"status": "ok", "courts": items})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

# ==============================================================================
#  3. SEJM RP
# ==============================================================================
@mcp.tool()
async def sejm_list_prints(term: int = 10, query: str = "", limit: int = 20) -> str:
    try:
        data = await _http_get(f"{SEJM_API_BASE}/term{term}/prints")
        items = data if isinstance(data, list) else []
        if query:
            q = query.lower()
            items = [p for p in items if isinstance(p, dict) and q in (p.get("title") or "").lower()]
        return _json_resp({"status": "ok", "count": len(items), "prints": items[:limit]})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def sejm_get_print_details(number: str, term: int = 10) -> str:
    try:
        data = await _http_get(f"{SEJM_API_BASE}/term{term}/prints/{number}")
        return _json_resp({"status": "ok", "print": data})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def sejm_list_mps(term: int = 10) -> str:
    try:
        data = await _http_get(f"{SEJM_API_BASE}/term{term}/MP")
        return _json_resp({"status": "ok", "mps": data if isinstance(data, list) else []})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def sejm_search_interpellations(term: int = 10, query: str = "", limit: int = 20) -> str:
    try:
        data = await _http_get(f"{SEJM_API_BASE}/term{term}/interpellations")
        items = data if isinstance(data, list) else []
        if query:
            q = query.lower()
            items = [i for i in items if isinstance(i, dict) and q in (i.get("title") or "").lower()]
        return _json_resp({"status": "ok", "count": len(items), "interpellations": items[:limit]})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def sejm_list_committees(term: int = 10) -> str:
    try:
        data = await _http_get(f"{SEJM_API_BASE}/term{term}/committees")
        return _json_resp({"status": "ok", "committees": data if isinstance(data, list) else []})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def sejm_list_votings(term: int = 10) -> str:
    try:
        data = await _http_get(f"{SEJM_API_BASE}/term{term}/votings")
        return _json_resp({"status": "ok", "votings": data if isinstance(data, list) else []})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def sejm_get_voting_details(sitting: int, voting_number: int, term: int = 10) -> str:
    try:
        data = await _http_get(f"{SEJM_API_BASE}/term{term}/votings/{sitting}/{voting_number}")
        return _json_resp({"status": "ok", "voting": data})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

# ==============================================================================
#  4. KRS & CEIDG
# ==============================================================================
@mcp.tool()
async def krs_get_company(krs: str) -> str:
    try:
        clean_krs = krs.strip().zfill(10)
        try:
            data = await _http_get(f"{KRS_API_BASE}/OdpisAktualny/{clean_krs}?rejestr=P&format=json")
            return _json_resp({"status": "ok", "krs": clean_krs, "company": data})
        except httpx.HTTPStatusError as http_err:
            if http_err.response.status_code == 404:
                return _json_resp({"status": "ok", "krs": clean_krs, "company": None, "message": "Nie znaleziono podmiotu w KRS"})
            raise
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def ceidg_search_business(nip: str) -> str:
    try:
        data = await _http_get(f"{CEIDG_BASE}/firmy", params={"nip": nip})
        return _json_resp({"status": "ok", "query": nip, "data": data})
    except Exception as e:
        return _json_resp({"status": "ok", "query": nip, "data": {"firmy": []}, "message": str(e)})

# ==============================================================================
#  5. CBOSA
# ==============================================================================
@mcp.tool()
async def cbosa_search_judgments(query: str = "", symbol: str = "", limit: int = 10) -> str:
    try:
        headers = {
            "Accept": "text/html",
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://orzeczenia.nsa.gov.pl/",
        }
        q = query or symbol
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(CBOSA_BASE, params={"q": q, "pn": 1, "ps": limit}, headers=headers, follow_redirects=True)
            if response.status_code != 200:
                return _json_resp({"status": "error", "message": "Błąd serwera CBOSA"})
            html = response.text
            
            blocks = re.findall(r'<tr[^>]*class="[^"]*lista[^"]*"[^>]*>.*?</tr>', html, re.DOTALL | re.IGNORECASE)
            results = []
            if not blocks:
                links = re.findall(r'href="(/doc/[^"]+)"[^>]*>([^<]+)</a>', html)
                for href, link_text in links[:limit]:
                    syg = link_text.strip()
                    results.append({"sygnatura": syg, "link": f"https://orzeczenia.nsa.gov.pl{href}"})
            else:
                for block in blocks[:limit]:
                    sygnatura_match = re.search(r'(?:sygn\.|sygnatura)[:\s]*([A-Z]+[\s/]+[A-Za-z0-9/\s-]+)', block)
                    sygnatura = sygnatura_match.group(1).strip() if sygnatura_match else "brak sygn."
                    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', block)
                    date_str = date_match.group(1) if date_match else "brak daty"
                    snippet = _strip_html(block)[:1000]
                    results.append({"sygnatura": sygnatura, "data": date_str, "snippet": snippet})
        return _json_resp({"status": "ok", "count": len(results), "items": results})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

# ==============================================================================
#  6. UODO & KIO & TSUE (Mocked or simple implementations)
# ==============================================================================
@mcp.tool()
async def uodo_search_decisions(query: str = "") -> str:
    # Static data extracted from the full app
    decisions = [
        {"id": "UODO-DKN-512-23", "sygnatura": "DKN.512.1.2023", "dataDecyzji": "2023-10-12", "podmiot": "Spółka z o.o. z sektora E-commerce", "karaFinansowa": "450 000 PLN", "opis": "Naruszenie zasady poufności i integralności (art. 5 ust. 1 lit. f RODO)...", "powolanePrzepisy": ["art. 5 ust. 1 lit. f RODO"]},
        {"id": "UODO-ZSPR-440-24", "sygnatura": "ZSPR.440.3.2024", "dataDecyzji": "2024-02-20", "podmiot": "Bank komercyjny", "karaFinansowa": "1 200 000 PLN", "opis": "Niezgłoszenie naruszenia ochrony danych osobowych...", "powolanePrzepisy": ["art. 33 ust. 1 RODO"]},
    ]
    return _json_resp({"status": "ok", "count": len(decisions), "items": decisions})

@mcp.tool()
async def kio_search_judgments(query: str = "") -> str:
    judgments = [
        {"id": "KIO-2201-23", "sygnatura": "KIO 2201/23", "dataWyroku": "2023-09-28", "rozstrzygniecie": "Uwzględnia odwołanie...", "uzasadnienie": "Krajowa Izba Odwoławcza ustaliła, że..."}
    ]
    return _json_resp({"status": "ok", "count": len(judgments), "items": judgments})

@mcp.tool()
async def tsue_search_judgments(query: str = "") -> str:
    tsue = [
        {"id": "C-520-21", "sygnatura": "C-520/21", "sprawa": "Sprawy frankowe", "tezaWyroku": "W przypadku uznania umowy kredytu hipotecznego za nieważną..."}
    ]
    return _json_resp({"status": "ok", "count": len(tsue), "items": tsue})

# ==============================================================================
#  7. DUCKDUCKGO
# ==============================================================================
@mcp.tool()
async def internet_search(query: str, limit: int = 5) -> str:
    try:
        def _search():
            with DDGS() as ddgs:
                return list(ddgs.text(query, max_results=limit))
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, _search)
        
        formatted_results = []
        for r in results:
            formatted_results.append({
                "title": r.get("title", ""),
                "href": r.get("href", ""),
                "body": r.get("body", "")
            })
        return _json_resp({"status": "ok", "items": formatted_results})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

# ==============================================================================
#  8. CALCULATOR
# ==============================================================================
@mcp.tool()
def calculate_expression(expression: str) -> str:
    try:
        allowed_operators = {
            ast.Add: op.add, ast.Sub: op.sub, ast.Mult: op.mul,
            ast.Div: op.truediv, ast.Pow: op.pow, ast.USub: op.neg, ast.UAdd: op.pos
        }
        def eval_node(node):
            if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
                return node.value
            elif hasattr(ast, 'Num') and isinstance(node, getattr(ast, 'Num')):
                return node.n
                return node.value
            elif isinstance(node, ast.BinOp):
                return allowed_operators[type(node.op)](eval_node(node.left), eval_node(node.right))
            elif isinstance(node, ast.UnaryOp):
                return allowed_operators[type(node.op)](eval_node(node.operand))
            raise ValueError("Niedozwolony element w wyrażeniu")
            
        node = ast.parse(expression.strip(), mode='eval').body
        res = eval_node(node)
        return _json_resp({"status": "ok", "expression": expression, "result": res})
    except Exception as e:
        return _json_resp({"status": "error", "message": f"Błąd kalkulatora: {str(e)}"})

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LexMind Standalone API MCP Server")
    parser.add_argument("--transport", choices=["stdio", "sse"], default="stdio", help="Transport mode")
    parser.add_argument("--host", default="0.0.0.0", help="Host for SSE transport")
    default_port = int(os.environ.get("PORT", 8005))
    parser.add_argument("--port", type=int, default=default_port, help="Port for SSE transport")
    args = parser.parse_args()

    if args.transport == "sse":
        logger.info(f"Starting Standalone SSE HTTP server on {args.host}:{args.port}")
        mcp.run(transport="sse", host=args.host, port=args.port)
    else:
        mcp.run(transport="stdio")
