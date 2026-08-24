# MCP Server Configuration — LexMind AI

## 🌟 Uniwersalny Serwer MCP (`mcp_master_server.py`) — **32 Narzędzia**

Projekt LexMind AI posiada uniwersalny serwer MCP, który udostępnia **pełne 32 narzędzia** prawnicze, rejestrowe i systemowe dla **dowolnego modelu LLM** (Claude Desktop, Cursor, Antigravity, Windsurf, ChatGPT, Ollama, Continue.dev, LangChain itp.).

---

## 🛠️ Wykaz Wszystkich 32 Narzędzi MCP

### 📜 1. ISAP / ELI (Sejm RP — Akty Prawne i Dzienniki Ustaw)
- `isap_list_publishers` — Wykaz wydawców (Dziennik Ustaw `DU`, Monitor Polski `MP`)
- `isap_search_acts` — Wyszukiwanie aktów prawnych (po roku, wydawcy, typie, statusie, frazie)
- `isap_get_act_details` — Szczegółowe metadane i status prawny aktu
- `isap_get_act_text` — Pobieranie pełnego tekstu aktu w czystym formacie

### ⚖️ 2. SAOS (Sądownictwo Powszechne)
- `saos_search_judgments` — Zaawansowane szukanie wyroków (sędzia, przepis, typ sądu, zakres dat)
- `saos_get_judgment_details` — Pełna treść wyroku i uzasadnienia po ID
- `saos_search_by_article` — Szukanie wyroków powołujących się na dany artykuł/kodeks
- `saos_list_courts` — Wykaz sądów apelacyjnych, okręgowych i rejonowych

### 🏛️ 3. SEJM RP (Prace Legislacyjne & Głosowania)
- `sejm_list_prints` — Druki sejmowe (projekty ustaw, sprawozdania)
- `sejm_get_print_details` — Szczegóły druku i przebieg procesu legislacyjnego
- `sejm_list_mps` — Wykaz posłów na Sejm RP danej kadencji
- `sejm_search_interpellations` — Baza interpelacji poselskich
- `sejm_list_committees` — Wykaz komisji sejmowych
- `sejm_list_votings` — Głosowania sejmowe
- `sejm_get_voting_details` — Rozkład głosów posłów w konkretnym głosowaniu

### 🏢 4. REJESTRY GOSPODARCZE (KRS & CEIDG)
- `krs_get_company` — Pobieranie aktualnego odpisu spółki z KRS
- `ceidg_search_business` — Weryfikacja i dane jednoosobowej firmy w CEIDG po NIP

### 🏛️ 5. NSA / WSA (CBOSA — Sądy Administracyjne)
- `cbosa_search_judgments` — Przeszukiwanie bazy 2,39 mln orzeczeń NSA i WSA

### 🛡️ 6. UODO (Ochrona Danych / RODO)
- `uodo_search_decisions` — Baza decyzji i kar finansowych UODO za naruszenia RODO

### 🏗️ 7. KIO (Zamówienia Publiczne)
- `kio_search_judgments` — Orzeczenia Krajowej Izby Odwoławczej ws. przetargów i Pzp

### 🇪🇺 8. TSUE (Orzecznictwo Unii Europejskiej)
- `tsue_search_judgments` — Kluczowe wyroki TSUE (m.in. sprawy frankowe C-520/21)

### 🌐 9. WYSZUKIWANIE W INTERNECIE
- `internet_search` — Wyszukiwanie aktualnych informacji prawnych na żywo via DuckDuckGo

### 🧠 10. LEXMIND RAG & KNOWLEDGE BASE
- `search_legal_acts` — Szybkie wyszukiwanie aktów w bazie LexMind
- `search_judgments` — Szybkie wyszukiwanie wyroków powszechnych
- `search_supabase_rag` — Hybrydowe wyszukiwanie semantyczne RAG w bazie Supabase

### 💬 11. HISTORIA CZATÓW
- `list_sessions` — Lista ostatnich konwersacji z bazy SQLite
- `get_session_messages` — Pobieranie historii wiadomości z danej sesji

### 🧭 12. PLIKI & KOD ZRÓDŁOWY
- `list_documents` — Przeglądanie dokumentów PDF/aktów w katalogu projektu
- `get_document_info` — Metadane i rozmiar pliku
- `find_files` — Wyszukiwanie plików po wzorcu glob
- `search_code` — Szukanie fraz/funkcji w kodzie źródłowym

### 🧮 13. KALKULATOR
- `calculate_expression` — Bezpieczny kalkulator opłat, terminów i odsetek

---

## 🚀 Uruchamianie i Integracja z Dowolnym LLM

### 1. Claude Desktop (Oficjalna aplikacja Anthropic)
Skopiuj plik `claude_desktop_config.json` do `%APPDATA%\Claude\claude_desktop_config.json`.

### 2. Cursor / Antigravity / Windsurf / VS Code
Edytor automatycznie załaduje narzędzia z pliku `.mcp.json`.

### 3. Zdalne LLM / Web API / ChatGPT / Ollama (Tryb HTTP / SSE)

Uruchom serwer dwuklikiem w skrypt:
```cmd
uruchom_mcp_server.bat
```
lub w konsoli:
```bash
python mcp_master_server.py --transport sse --port 8005
```

Punkt końcowy SSE:
`http://localhost:8005/sse`
