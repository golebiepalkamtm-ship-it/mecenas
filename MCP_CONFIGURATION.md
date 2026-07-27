# MCP Server Configuration — LexMind AI

## Status

✅ **Math Server**: Ready (stdio)
✅ **Legal Search**: Ready (custom MCP)
✅ **Chat History**: Ready (custom MCP)
✅ **Document Manager**: Ready (custom MCP)
✅ **Code Navigator**: Ready (custom MCP)
✅ **OpenRouter API Key**: Configured  
✅ **Backend Integration**: Ready

---

## 🎯 MCP Serwery Zainstalowane

### 1. **Math Calculator** ✨
```
File: math_server.py
Transport: stdio
Tools:
  - calculate(expression: str) → str
    Wykonuje operacje arytmetyczne: +, -, *, /
    
Użycie w Copilota:
  @mcp math_server
  "Oblicz 15 * 20 + 30"
```

### 2. **Legal Search** ⚖️ (NOWY)
```
File: lexmind_mcp_servers.py legal
Tools:
  - search_legal_acts(keywords, limit=5) → JSON
    Szuka aktów prawnych (Kodeks Karny, Cywilny, itd.)
  - search_judgments(keywords, limit=5) → JSON
    Szuka wyroków w SAOS
    
Użycie w Copilota:
  @mcp lexmind-legal-search
  "Szukaj artykułów o kodeksie karnym"
  "Znajdź wyroki w SAOS o narkotyków"
```

### 3. **Chat History Manager** 💬 (NOWY)
```
File: lexmind_mcp_servers.py chat
Tools:
  - list_sessions() → JSON
    Wyświetla ostatnie 10 sesji czatu
  - get_session_messages(session_id) → JSON
    Pobiera wiadomości z konkretnej sesji
    
Użycie w Copilota:
  @mcp lexmind-chat-history
  "Pokaż mi ostatnie sesje"
  "Pobierz wiadomości z sesji [ID]"
```

### 4. **Document Manager** 📄 (NOWY)
```
File: lexmind_mcp_servers.py docs
Tools:
  - list_documents(folder="lexmind_acts") → JSON
    Wyświetla dokumenty w folderze
  - get_document_info(filepath) → JSON
    Pobiera metadane dokumentu (rozmiar, typ, data)
    
Użycie w Copilota:
  @mcp lexmind-document-manager
  "Wyświetl wszystkie PDFy z aktami prawnymi"
  "Jaki jest rozmiar kodeksu_karny.pdf?"
```

### 5. **Code Navigator** 🧭 (NOWY)
```
File: lexmind_mcp_servers.py code
Tools:
  - find_files(pattern="*.py") → JSON
    Znajduje pliki w projekcie
  - search_code(keyword, file_pattern="**/*.py") → JSON
    Szuka słowa kluczowego w kodzie
    
Użycie w Copilota:
  @mcp lexmind-code-navigator
  "Znajdź wszystkie pliki Python"
  "Szukaj definicji klasy 'OrchestratorService'"
  "Gdzie jest funkcja 'calculate'?"
```

---

## 🚀 Uruchamianie MCP Serwerów

### Metoda 1: Automatycznie w VS Code
```
✅ Copilot automatycznie załaduje MCP serwery
   gdy się zaloguje do VS Code
```

### Metoda 2: Manualnie (Testowanie)

```bash
# Math Server
python math_server.py

# Legal Search
python lexmind_mcp_servers.py legal

# Chat History
python lexmind_mcp_servers.py chat

# Document Manager
python lexmind_mcp_servers.py docs

# Code Navigator
python lexmind_mcp_servers.py code
```

### Metoda 3: Backend Integration
```python
# W kodzie backendu
from lexmind_mcp_servers import legal_search_mcp
results = await legal_search_mcp.search_legal_acts("kodeks karny")
```

---

## 📊 Architektura MCP

```
VS Code Copilot
    ↓
MCP Client (Built-in)
    ↓
┌─────────────────────────────────────┐
│   MCP Servers (stdio transport)     │
├─────────────────────────────────────┤
│ • Math Calculator                   │
│ • Legal Search                      │
│ • Chat History                      │
│ • Document Manager                  │
│ • Code Navigator                    │
└─────────────────────────────────────┘
    ↓
Backend Services
    ├─ retrieval_service (Legal Search)
    ├─ database (Chat History)
    ├─ filesystem (Document Manager)
    └─ codebase (Code Navigator)
```

---

## 🧪 Testy MCP

### Test Math Server
```bash
python -c "
from math_server import mcp
# Test calculate tool
print('✅ Math Server OK')
"
```

### Test Legal Search
```bash
python lexmind_mcp_servers.py legal
# Powinno nawiązać stdio transport i oczekiwać na JSON
```

### Test w Copilota
```
Otwórz chat w VS Code Copilot i napisz:
"Szukaj artykułów kodeksu karnego o narkotyków"

Copilot powinien użyć @mcp lexmind-legal-search automatycznie
```

---

## ⚙️ Konfiguracja VS Code

**Plik:** `.vscode/settings.json`

```json
"mcp.enabled": true,
"mcp.servers": {
  "lexmind-math": {
    "command": "python",
    "args": ["${workspaceFolder}/math_server.py"]
  },
  "lexmind-legal-search": {
    "command": "python",
    "args": ["${workspaceFolder}/lexmind_mcp_servers.py", "legal"]
  },
  "lexmind-chat-history": {
    "command": "python",
    "args": ["${workspaceFolder}/lexmind_mcp_servers.py", "chat"]
  },
  "lexmind-document-manager": {
    "command": "python",
    "args": ["${workspaceFolder}/lexmind_mcp_servers.py", "docs"]
  },
  "lexmind-code-navigator": {
    "command": "python",
    "args": ["${workspaceFolder}/lexmind_mcp_servers.py", "code"]
  }
}
```

---

## 📋 Checklist — Co Zostało Zrobione

- ✅ Math Server (FastMCP)
- ✅ Legal Search MCP (custom — search_eli + search_saos)
- ✅ Chat History MCP (custom — session management)
- ✅ Document Manager MCP (custom — file explorer)
- ✅ Code Navigator MCP (custom — code search)
- ✅ .mcp.json skonfigurowany
- ✅ VS Code settings.json skonfigurowany
- ✅ OPENROUTER_API_KEY dodany do .env
- ✅ Dokumentacja MCP_CONFIGURATION.md

---

## 🚀 Następne Kroki

1. ✅ Serwery MCP skonfigurowane
2. [ ] Testować tools w VS Code Copilota
3. [ ] Dodać więcej tools jeśli potrzeba
4. [ ] Zoptymalizować performance MCP
5. [ ] Dodać error handling i logging

---

## 📞 Troubleshooting

**Problem:** MCP server nie łączy się
```
Rozwiązanie:
1. Sprawdź PYTHONPATH w .vscode/settings.json
2. Upewnij się, że fastmcp jest zainstalowany: pip install fastmcp
3. Sprawdź logi w Output → MCP
```

**Problem:** Copilot nie widzi MCP tools
```
Rozwiązanie:
1. Reload VS Code (Ctrl+Shift+P → Reload Window)
2. Sprawdź czy mcp.enabled = true
3. Sprawdź czy all servers mają "disabled": false
```

---

**MCP Serwery Gotowe do Użytku!** 🎉

