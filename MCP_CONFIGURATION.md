# MCP Server Configuration — LexMind AI

## 🌟 Uniwersalny Serwer MCP (`mcp_master_server.py`) — **40 Narzędzi**

Projekt LexMind AI posiada uniwersalny serwer MCP, który udostępnia **pełne 40 narzędzi** prawniczych, rejestrowych, antyhalucynacyjnych i systemowych dla **dowolnego modelu LLM** (Claude Desktop, Cursor, Antigravity, Windsurf, ChatGPT, Ollama, Continue.dev, LangChain itp.).

---

## 🛠️ Wykaz Wszystkich 40 Narzędzi MCP

### 🛡️ 1. PRAWMi AI & ANTI-HALLUCINATION (PrawMi.pl) — 8 Narzędzi
- `prawmi_verify_ruling` — Autorytatywna weryfikacja istnienia sygnatury orzeczenia (baza PrawMi + fallback SAOS/NSA/SN)
- `prawmi_verify_article_reference` — Audyt tekstu prawnego pod kątem zmyślonych artykułów i sygnatur (detekcja halucynacji)
- `prawmi_get_article` — Pobieranie autorytatywnej treści artykułu (KC, KPC, KK, KSH...) z pełną strukturą ustępów i klauzul
- `prawmi_search_rulings` — Semantyczne i sygnaturowe wyszukiwanie orzeczeń (SN, SA, SO, NSA, WSA)
- `prawmi_get_ruling_text` — Pobieranie pełnego tekstu orzeczenia sądowego po linku/identyfikatorze
- `prawmi_search_acts` — Wyszukiwanie właściwych ustaw i kodeksów według tematu (zapobiega zmyślaniu nazw aktów)
- `prawmi_search_rulings_by_article` — Wyszukiwanie wyroków cytujących dany artykuł ustawy/kodeksu
- `prawmi_search_act_articles` — Wyszukiwanie właściwych artykułów w ramach konkretnej ustawy

### 📜 2. ISAP / ELI (Sejm RP — Akty Prawne i Dzienniki Ustaw) — 4 Narzędzia
- `isap_list_publishers` — Wykaz wydawców (Dziennik Ustaw `DU`, Monitor Polski `MP`)
- `isap_search_acts` — Wyszukiwanie aktów prawnych (po roku, wydawcy, typie, statusie, frazie)
- `isap_get_act_details` — Szczegółowe metadane i status prawny aktu
- `isap_get_act_text` — Pobieranie pełnego tekstu aktu w czystym formacie

### ⚖️ 3. SAOS (Sądownictwo Powszechne) — 5 Narzędzi
- `saos_search_judgments` — Zaawansowane szukanie wyroków (sędzia, przepis, typ sądu, zakres dat)
- `saos_get_judgment_details` — Pełna treść wyroku i uzasadnienia po ID
- `saos_search_by_article` — Szukanie wyroków powołujących się na dany artykuł/kodeks
- `saos_list_courts` — Wykaz sądów apelacyjnych, okręgowych i rejonowych
- `saos_cite_check` — Weryfikacja cytowań orzeczeń

### 🏛️ 4. SEJM RP (Prace Legislacyjne & Głosowania) — 7 Narzędzi
- `sejm_list_prints` — Druki sejmowe (projekty ustaw, sprawozdania)
- `sejm_get_print_details` — Szczegóły druku i przebieg procesu legislacyjnego
- `sejm_list_mps` — Wykaz posłów na Sejm RP danej kadencji
- `sejm_search_interpellations` — Baza interpelacji poselskich
- `sejm_list_committees` — Wykaz komisji sejmowych
- `sejm_list_votings` — Głosowania sejmowe
- `sejm_get_voting_details` — Rozkład głosów posłów w konkretnym głosowaniu

### 🏢 5. REJESTRY GOSPODARCZE (KRS, CEIDG, Biała Lista VAT) — 4 Narzędzia
- `krs_get_company` — Pobieranie aktualnego odpisu spółki z KRS
- `ceidg_search_business` — Weryfikacja i dane jednoosobowej firmy w CEIDG po NIP
- `wl_search_vat` — Weryfikacja statusu podatnika VAT na Białej Liście MF
- `wl_check_vat_account` — Weryfikacja rachunku bankowego na Białej Liście VAT

### 🏛️ 6. NSA / WSA (CBOSA — Sądy Administracyjne) — 3 Narzędzia
- `cbosa_search_judgments` — Przeszukiwanie bazy 2,39 mln orzeczeń NSA i WSA
- `cbosa_search_by_case` — Wyszukiwanie orzeczenia administracyjnego po sygnaturze
- `cbosa_get_judgment` — Pobieranie pełnego uzasadnienia wyroku NSA/WSA

### 🛡️ 7. UODO (Ochrona Danych / RODO) — 1 Narzędzie
- `uodo_search_decisions` — Baza decyzji i kar finansowych UODO za naruszenia RODO

### 🏗️ 8. KIO (Zamówienia Publiczne) — 1 Narzędzie
- `kio_search_judgments` — Orzeczenia Krajowej Izby Odwoławczej ws. przetargów i Pzp

### 🇪🇺 9. TSUE (Orzecznictwo Unii Europejskiej) — 1 Narzędzie
- `tsue_search_judgments` — Kluczowe wyroki TSUE (m.in. sprawy frankowe C-520/21)

### 🌐 10. WYSZUKIWANIE W INTERNECIE — 1 Narzędzie
- `internet_search` — Wyszukiwanie aktualnych informacji prawnych na żywo via DuckDuckGo

### 🧠 11. LEXMIND RAG & KNOWLEDGE BASE — 3 Narzędzia
- `search_legal_acts` — Szybkie wyszukiwanie aktów w bazie LexMind
- `search_judgments` — Szybkie wyszukiwanie wyroków powszechnych
- `search_supabase_rag` — Hybrydowe wyszukiwanie semantyczne RAG w bazie Supabase

### 💬 12. HISTORIA CZATÓW — 2 Narzędzia
- `list_sessions` — Lista ostatnich konwersacji z bazy SQLite
- `get_session_messages` — Pobieranie historii wiadomości z danej sesji

### 🧭 13. PLIKI & KOD ZRÓDŁOWY — 4 Narzędzia
- `list_documents` — Przeglądanie dokumentów PDF/aktów w katalogu projektu
- `get_document_info` — Metadane i rozmiar pliku
- `find_files` — Wyszukiwanie plików po wzorcu glob
- `search_code` — Szukanie fraz/funkcji w kodzie źródłowym

### 🧮 14. KALKULATOR — 1 Narzędzie
- `calculate_expression` — Bezpieczny kalkulator opłat, terminów i odsetek

---

## 🚀 Uruchamianie i Integracja

### 1. Konfiguracja `.mcp.json` / Claude Desktop / Cursor
```json
{
  "mcpServers": {
    "prawmi": {
      "url": "https://api.prawmi.pl/mcp",
      "headers": {
        "X-API-Key": "prawmi_live_826e9bb65bf779a5dcc252bd40b32f57"
      }
    },
    "lexmind-master": {
      "command": "${workspaceFolder}/.venv/Scripts/python.exe",
      "args": ["${workspaceFolder}/mcp_master_server.py"],
      "env": {
        "PYTHONPATH": "${workspaceFolder}"
      }
    }
  }
}
```

### 2. Zdalne LLM / Web API / ChatGPT / Ollama (Tryb HTTP / SSE)
```bash
python mcp_master_server.py --transport sse --port 8005
```
