import re
import importlib
import sys
from pathlib import Path

ROOT_DIR = Path(r"e:\moj prawnik")
sys.path.insert(0, str(ROOT_DIR))

def parse_and_check():
    mcp_file = ROOT_DIR / "mcp_master_server.py"
    content = mcp_file.read_text(encoding="utf-8")
    
    # Znajdź wszystkie narzędzia
    tools = []
    pattern = re.compile(r'@mcp\.tool\(\)\s+(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(')
    for match in pattern.finditer(content):
        tools.append(match.group(1))
    
    print(f"Znaleziono {len(tools)} narzędzi zarejestrowanych w mcp_master_server:\n")
    
    # Import modułu żeby sprawdzić błędy przy uruchomieniu
    print("Ładowanie mcp_master_server.py...")
    try:
        import mcp_master_server
        print("[OK] Serwer główny załadował się bez błędu składni.\n")
    except Exception as e:
        print(f"[FAIL] Błąd ładowania serwera: {e}\n")
        
    print("Sprawdzanie obecności wewnętrznych definicji...")
    # Każde narzędzie ładuje `from services.mcp_tool_bridge import ...` lub `from services.prawmi_client ...`
    # Sprawdźmy, czy te moduły mają te funkcje.
    
    try:
        import services.mcp_tool_bridge as bridge
        import services.prawmi_client as prawmi
        import services.retrieval_service as rservice
        import database as db
    except Exception as e:
        print(f"Błąd ładowania modułów podrzędnych: {e}")
        return
        
    for tool_name in tools:
        found = False
        
        # Sprawdzamy gdzie narzędzie fizycznie się znajduje
        if hasattr(bridge, tool_name):
            found = True
        elif hasattr(prawmi.prawmi_client, tool_name) or hasattr(prawmi, tool_name):
            found = True
        elif hasattr(rservice.retrieval_service, tool_name) or hasattr(rservice, tool_name):
            found = True
        elif hasattr(db, tool_name):
            found = True
        elif "list_documents" in tool_name or "get_document_info" in tool_name: # te są zdefiniowane bezpośrednio w pliku
            found = True
            
        if found:
            print(f" [OK] {tool_name}")
        else:
            print(f" [UWAGA] {tool_name} nie znaleziono bezpośrednio w mapowanych modułach, może być zdefiniowane inaczej.")

if __name__ == "__main__":
    parse_and_check()
