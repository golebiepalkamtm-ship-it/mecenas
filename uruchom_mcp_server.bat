@echo off
setlocal EnableExtensions
pushd "%~dp0"
set "ROOT_DIR=%CD%"

title LexMind Master MCP Server (32 Tools)

echo.
echo =======================================================================
echo       LEXMIND MASTER MCP SERVER — ULTIMATE EDITION (32 TOOLS)
echo =======================================================================
echo  MCP Endpoint: http://localhost:8005/sse
echo.
echo  Wszystkie 32 Narzędzia MCP w jednym module:
echo    1. ISAP / ELI (Akty prawne, Dzienniki Ustaw) — 4 narzędzia
echo    2. SAOS (Sądy powszechne, wyroki, uzasadnienia) — 4 narzędzia
echo    3. SEJM RP (Prace legislacyjne, druki, posłowie, głosowania) — 7 narzędzi
echo    4. REJESTRY (KRS spółki, CEIDG jednoosobowe firmy) — 2 narzędzia
echo    5. NSA / WSA (CBOSA Sądownictwo Administracyjne) — 1 narzędzie
echo    6. UODO (Ochrona danych osobowych / RODO / kary) — 1 narzędzie
echo    7. KIO (Zamówienia publiczne / przetargi) — 1 narzędzie
echo    8. TSUE (Orzecznictwo UE / sprawy frankowe) — 1 narzędzie
echo    9. INTERNET SEARCH (Wyszukiwanie informacji na żywo) — 1 narzędzie
echo   10. LEXMIND RAG (Supabase hybrid vector search) — 3 narzędzia
echo   11. CHAT HISTORY (Baza SQLite z historią czatów) — 2 narzędzia
echo   12. FILE NAVIGATOR (Zarządzanie PDF, plikami i kodem) — 4 narzędzia
echo   13. CALCULATOR (Bezpieczny kalkulator opłat/odsetek) — 1 narzędzie
echo =======================================================================
echo.

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" mcp_master_server.py --transport sse --port 8005
) else (
    python mcp_master_server.py --transport sse --port 8005
)

pause
popd
