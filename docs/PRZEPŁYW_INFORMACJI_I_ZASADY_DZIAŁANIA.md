# 📋 Dokumentacja: Przepływ Informacji i Zasady Działania — LexMind AI

> **Wersja:** 1.0 | **Data:** 2026-04-02  
> **Autor:** System Documentation Generator

---

## 🏗️ 1. ARCHITEKTURA SYSTEMU — PRZEGLĄD

### 1.1 Warstwy systemu

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                     │
│         Chat | Knowledge | Drafter | Documents | Settings       │
├─────────────────────────────────────────────────────────────────┤
│                    BACKEND API (FastAPI)                         │
│   /chat | /chat-consensus | /draft-document | /upload-document  │
├─────────────────────────────────────────────────────────────────┤
│                    MOA ENGINE (Python)                           │
│   Pipeline → Retrieval → Analysis → Synthesis → Response        │
├─────────────────────────────────────────────────────────────────┤
│                    ZEWNĘTRZNE SERWISY                            │
│   OpenRouter (LLM) | Supabase (pgvector) | SAOS (Orzecznictwo)  │
├─────────────────────────────────────────────────────────────────┤
│                    BAZA DANYCH (SQLite)                          │
│   Sessions | Messages | Settings                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technologie

| Warstwa | Technologia | Rola |
|---------|-------------|------|
| Frontend | React + Vite + TypeScript + Tailwind CSS + Framer Motion | UI interfejs użytkownika |
| Backend | FastAPI + Python | REST API, orkiestracja |
| LLM | OpenRouter API (Claude, GPT-4o, Gemini) | Generowanie odpowiedzi |
| Embeddings | OpenAI text-embedding-3-small (1536-dim) | Wektorowe reprezentacje tekstu |
| Baza wektorowa | Supabase pgvector (RPC: match_knowledge) | Semantyczne wyszukiwanie prawnicze |
| Orzecznictwo | SAOS API (saos.org.pl) | Orzeczenia sądowe |
| Baza sesji | SQLite (cache/prawnik.db) | Historia czatu, ustawienia |

---

## 🔄 2. PRZEPŁYW INFORMACJI — KROK PO KROKU

### 2.1 Single Model Chat (`POST /chat`)

```
Użytkownik (Frontend)
    │
    ▼
┌─────────────────────────────┐
│ 1. KLASYFIKACJA INTENCJI    │  ← moa/intent.py
│    (Reguły + LLM fallback)  │
└─────────────┬───────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
GREETING/SMALL_TALK    LEGAL_QUERY
    │                    │
    ▼                    ▼
Lekka odpowiedź     ┌─────────────────┐
(tani model,        │ 2. RAG RETRIEVAL │  ← moa/retrieval.py
 max 300 tokenów)   │ Hybrid Search:   │
                    │  • Keywords      │
                    │  • Vector (pg)   │
                    │  • SAOS (orzeczn)│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ 3. BUDOWA PROMPT │  Hierarchiczna struktura:
                    │  Arch + Role +   │  MASTER_PROMPT → SYSTEM_ROLES
                    │  Task + Analyst  │  → TASK_PROMPTS → ANALYST
                    │  + Context (RAG) │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ 4. WYWOŁANIE LLM │  OpenRouter API
                    │  (1 model, temp= │  AsyncOpenAI client
                    │   0.1, timeout=  │
                    │   120s)          │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ 5. ZAPIS DO DB   │  SQLite
                    │  sessions +      │
                    │  messages        │
                    └────────┬────────┘
                             │
                             ▼
                      Odpowiedź JSON
                      do Frontendu
```

### 2.2 MOA Consensus Chat (`POST /chat-consensus`)

```
Użytkownik (Frontend)
    │
    ▼
┌─────────────────────────────┐
│ 1. KLASYFIKACJA INTENCJI    │  ← moa/intent.py
└─────────────┬───────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
GREETING/SMALL_TALK    LEGAL_QUERY
    │                    │
    ▼                    ▼
Lekka odpowiedź     ┌─────────────────────┐
(tani model)        │ 2. RAG RETRIEVAL    │
                    │ (keywords + vector  │
                    │  + SAOS parallel)   │
                    └────────┬────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │ 3. PARALLEL ANALYSIS│  ← moa/llm_agents.py
                    │ Model A (Claude)    │
                    │ Model B (GPT-4o)    │  asyncio.gather()
                    │ Model C (Gemini)    │  + retry z backoff
                    └────────┬────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │ 4. JUDGE SYNTHESIS  │  ← moa/synthesizer.py
                    │ Re-ranking + Audit  │  JUDGE_SYSTEM_PROMPT:
                    │ cytowań + Anti-     │  • Re-ranking ekspertów
                    │ hallucynacja        │  • Audyt źródeł
                    │ + Konsensus         │  • Rozstrzyganie sprzeczności
                    └────────┬────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │ 5. ZAPIS DO DB      │
                    └────────┬────────────┘
                             │
                             ▼
                      Odpowiedź JSON
                      (final_answer +
                       expert_analyses +
                       sources)
```

---

## 🧠 3. ZASADY DZIAŁANIA — GŁÓWNE REGUŁY

### 3.1 Hierarchia Źródeł Prawdy

System działa według **ściśle określonej hierarchii wiarygodności**:

```
🥇 POZIOM 1: DOKUMENT UŻYTKOWNIKA (<user_document>)
   → Źródło GŁÓWNE — jeśli użytkownik dostarczył dokument,
     analizujemy TEN dokument, nie ogólne przepisy.

🥈 POZIOM 2: KONTEKST PRAWNY RAG (<legal_context>)
   → Przepisy, orzecznictwo z bazy wiedzy Supabase.
   → WSPARCIE do interpretacji dokumentu użytkownika.

🥉 POZIOM 3: WIEDZA LLM (treningowa)
   → Używana TYLKO gdy brak źródeł z poz. 1 i 2.
   → Zawsze oznaczana jako [HIPOTEZA].
```

### 3.2 Zasady Anti-Hallucynacji

```
╔═══════════════════════════════════════════════════════════════╗
║  ZAKAZ KONFABULACJI                                          ║
║                                                              ║
║  • Jeśli w źródłach NIE MA przepisu → pisz:                 ║
║    "Brak danych w dostarczonym kontekście."                  ║
║                                                              ║
║  • NIE wymyślaj numerów artykułów                            ║
║  • NIE zgaduj treści przepisów                               ║
║  • NIE obiecuj 100% wygranej                                 ║
║  • Operuj prawdopodobieństwem i stopniem ryzyka              ║
╚═══════════════════════════════════════════════════════════════╝
```

### 3.3 Zasady Cytowania

Każde stwierdzenie prawne MUSI zawierać:
- **Nazwę aktu prawnego** (np. „Kodeks cywilny")
- **Numer artykułu, paragrafu, ustępu** (np. „Art. 415 KC")
- **Dosłowny cytat lub precyzyjną parafrazę** z kontekstu

---

## 🔍 4. RAG (Retrieval-Augmented Generation) — HYBRYDOWY

### 4.1 Strategia wyszukiwania

```
┌─────────────────────────────────────────────────────────┐
│              HYBRYDOWY PIPELINE RETRIEVAL                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  KROK 1: KEYWORD EXTRACTION (Zero koszt)                │
│  ├── Wzorzec: "Art. XXX" → szukaj w bazie              │
│  ├── Skróty: KPA, KC, KK, KPK, KSH → mapowanie         │
│  └── Priorytet: similarity = 0.95 (najwyższy)           │
│                                                         │
│  KROK 2: VECTOR SEARCH (OpenAI Embeddings)              │
│  ├── Model: text-embedding-3-small (1536-dim)           │
│  ├── RPC: Supabase match_knowledge                      │
│  ├── Threshold: 0.05 (niska = więcej wyników)           │
│  └── Count: 12 fragmentów                               │
│                                                         │
│  KROK 3: SAOS SEARCH (Równolegle)                       │
│  ├── API: https://www.saos.org.pl/api/search/judgments  │
│  ├── Params: pageSize=4, sorting=JUDGMENT_DATE DESC     │
│  └── Priorytet: similarity = 0.9                        │
│                                                         │
│  KROK 4: DEDUPLIKACJA                                    │
│  ├── Hash pierwszych 200 znaków treści                  │
│  ├── Sortowanie po similarity (malejąco)                │
│  └── Limit: 48 000 znaków (MAX_CONTEXT_CHARS)           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Parametry konfiguracyjne

| Parametr | Wartość | Opis |
|----------|---------|------|
| `EMBEDDING_MODEL` | text-embedding-3-small | Model embeddingów OpenAI |
| `EMBEDDING_DIMENSIONS` | 1536 | Wymiar wektora |
| `DEFAULT_MATCH_COUNT` | 12 | Liczba fragmentów do pobrania |
| `DEFAULT_MATCH_THRESHOLD` | 0.05 | Próg podobieństwa (niski = więcej wyników) |
| `MAX_CONTEXT_CHARS` | 48 000 | Limit znaków kontekstu (~12k tokenów) |

---

## 🎯 5. INTENT CLASSIFICATION — KLASYFIKACJA INTENCJI

### 5.1 Strategia dwustopniowa

```
┌─────────────────────────────────────────────────────────┐
│  KROK 1: REGUŁY (Zero koszt, zero opóźnienia)          │
│  ├── Wzorce powitań (PL + EN):                          │
│  │   "cześć", "hej", "witam", "dzień dobry",           │
│  │   "hello", "hi", "good morning"                      │
│  ├── Wzorce small-talku:                                │
│  │   "co słychać", "dziękuję", "okej", "test",         │
│  │   Wiadomości 1-5 znaków                               │
│  └── Jeśli dopasowanie → zwraca Intent natychmiast      │
│                                                         │
│  KROK 2: LLM (Tani model, ~200ms)                      │
│  ├── Model: openai/gpt-4o-mini                          │
│  ├── Temperature: 0.0 (deterministyczny)                │
│  ├── Max tokens: 10                                     │
│  ├── Prompt: klasyfikacja na GREETING/SMALL_TALK/LEGAL  │
│  └── Fallback: w razie błędu → LEGAL_QUERY (bezpieczny) │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Typy intencji

| Intent | Zachowanie | RAG | MOA | Przykłady |
|--------|-----------|-----|-----|-----------|
| `GREETING` | Lekka odpowiedź, tani model | ❌ | ❌ | "Cześć", "Dzień dobry" |
| `SMALL_TALK` | Lekka odpowiedź, tani model | ❌ | ❌ | "Jak się masz?", "Dzięki!" |
| `LEGAL_QUERY` | Pełny pipeline | ✅ | ✅ | "Co to art. 212 KK?", "Jakie mam prawa?" |

---

## 🤖 6. MOA (Mixture of Agents)

### 6.1 Architektura konsylium

MOA to **architektura wielomodelowa** — jedno zapytanie trafia do N modeli jednocześnie, a jeden „sędzia" scala ich odpowiedzi w konsensus.

```
                    ┌─────────────────┐
                    │  QUERY + RAG    │
                    │  + DOCUMENT     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │  EXPERT A    │ │  EXPERT B    │ │  EXPERT C    │
     │  Claude 3.5  │ │  GPT-4o     │ │  Gemini 2.0  │
     │  Sonnet      │ │              │ │  Flash       │
     └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  JUDGE / SYNTH  │
                    │  Claude 3.5     │
                    │  Sonnet         │
                    │  (Re-ranking)   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  FINAL ANSWER  │
                    └─────────────────┘
```

### 6.2 Domyślne modele

| Rola | Model | Uzasadnienie |
|------|-------|-------------|
| **Sędzia (Judge)** | `anthropic/claude-3.5-sonnet` | Najwyższa jakość syntezy, re-ranking |
| **Analityk A** | `anthropic/claude-3.5-sonnet` | Precyzyjna analiza prawna |
| **Analityk B** | `openai/gpt-4o` | Alternatywna perspektywa |
| **Analityk C** | `google/gemini-2.0-flash` | Szybki, inny paradygmat myślowy |

### 6.3 Mechanizmy odporności (Resilience)

```
┌─────────────────────────────────────────────────────────┐
│  CONNECTION POOLING                                      │
│  → Jeden AsyncOpenAI client dla całego pipeline'u       │
│  → Re-użycja sesji HTTP (keep-alive)                     │
│                                                         │
│  EXPONENTIAL BACKOFF                                     │
│  → Bazowe opóźnienie: 1.0s                               │
│  → Wzór: delay = min(base * 2^attempt + jitter, 15s)   │
│  → Statusy retry: 429, 500, 502, 503, 504               │
│  → Max retries: 3                                        │
│                                                         │
│  GLOBAL TIMEOUT                                          │
│  → 135s na CAŁY pipeline MOA                             │
│  → 120s na pojedynczy model                              │
│  → Nieukończone zadania → anulowane, zgłaszane          │
│    jako timeout error                                    │
│                                                         │
│  PARTIAL RESULTS                                         │
│  → Jeśli 1 z 3 modeli nie odpowie → kontynuuj z 2      │
│  → Sędzia działa tylko na udanych analizach              │
└─────────────────────────────────────────────────────────┘
```

### 6.4 Zasady Sędziego (Judge)

Sędzia jest najwyższym autorytetem w konsylium. Jego obowiązki:

1. **RE-RANKING I AUDYT**: Konfrontuje każdą analizę z źródłami. Odrzuca fragmenty, które nie mają potwierdzenia w kontekście prawnym.
2. **ROZSTRZYGANIE SPRZECZNOŚCI**: Jeśli eksperci podają różne interpretacje — sędzia rozstrzyga na podstawie litery prawa.
3. **MINIMALIZACJA RYZYKA**: W przypadku niejasności — podaje najbardziej zachowawczą (bezpieczną) ścieżkę.
4. **AUDYT CYTOWAŃ**: Sprawdza, czy eksperci nie zmyślili przepisów (article hallucination check).

### 6.5 Struktura odpowiedzi sędziego

```
📋 PODSUMOWANIE (Triage)
   → Krótka decyzja biznesowa

📖 ANALIZA FUNDAMENTALNA
   → 🟢 Potwierdzone w ustawie
   → 🟡 Interpretacja/Zależność
   → 🔴 Brak danych/Ryzyko

⚖️ AUDYT EKSPERTÓW (Re-ranking)
   → Zgodność analityków
   → Powody odrzucenia błędnych sugestii

✅ REKOMENDACJA I KROKI
   → Konkretna lista To-Do dla użytkownika
```

---

## 🎨 7. SYSTEM PROMPTÓW — HIERARCHICZNA STRUKTURA

### 7.1 Architektura trójwarstwowa

Każda odpowiedź LLM jest budowana hierarchicznie z trzech warstw promptów:

```
┌─────────────────────────────────────────┐
│  1. MASTER PROMPT (Architect / Szef)    │  ← moa/prompts.py::MASTER_PROMPT
│  → Nadrzędna logika operacyjna          │
│  → Data Sovereignty: prawda z RAG       │
│  → Self-Correction Loop                 │
│  → Safety Buffer                        │
├─────────────────────────────────────────┤
│  2. SYSTEM ROLE (Osobowość)             │  ← moa/prompts.py::SYSTEM_ROLES
│  → Definiuje „kim" jest agent           │
│  → Navigator: diagnosta prawny          │
│  → Inquisitor: rewident kontraktowy     │
│  → Draftsman: architekt tekstów         │
│  → Oracle: analityk orzecznictwa        │
│  → Grandmaster: strateg procesowy       │
├─────────────────────────────────────────┤
│  3. TASK PROMPT (Instrukcja)            │  ← moa/prompts.py::TASK_PROMPTS
│  → Definiuje „co" ma zrobić             │
│  → General: multi-level diagnosis       │
│  → Analysis: adversarial audit          │
│  → Drafting: bulletproof writing        │
│  → Research: jurisprudence synthesis    │
│  → Strategy: war room plan              │
├─────────────────────────────────────────┤
│  4. ANALYST SYSTEM PROMPT               │  ← moa/llm_agents.py
│  → Zasady anti-hallucynacji             │
│  → Zasady cytowania                     │
│  → Reguły analizy dokumentu             │
└─────────────────────────────────────────┘
```

### 7.2 Dostępne Role (SYSTEM_ROLES)

| Rola | Identyfikator | Osobowość | Użycie |
|------|--------------|-----------|--------|
| **Navigator** | `navigator` | Diagnosta prawny — mapuje chaos na strukturę kodeksową | Domyślna dla zapytań ogólnych |
| **Inquisitor** | `inquisitor` | Rewident kontraktowy — „niszczy" dokument w poszukiwaniu luk | Analiza dokumentów |
| **Draftsman** | `draftsman` | Architekt tekstów — odporny na ataki procesowe | Tworzenie pism |
| **Oracle** | `oracle` | Analityk linii orzeczniczych — czyta wyroki, nie przepisy | Badania orzecznictwa |
| **Grandmaster** | `grandmaster` | Strateg procesowy — szach-mat w 3 ruchach | Planowanie strategii |

### 7.3 Dostępne Zadania (TASK_PROMPTS)

| Zadanie | Identyfikator | Metodologia | Użycie |
|---------|--------------|-------------|--------|
| **Multi-Level Diagnosis** | `general` | Conflict Topology → Context Anchoring → Solution Path → Human Summary | Domyślne |
| **Adversarial Audit** | `analysis` | Structural Check → Abusive Clause Detection → Risk Heatmap → Hidden Traps | Analiza umów |
| **Bulletproof Drafting** | `drafting` | Formal Compliance → Logic Chaining → Strategic Placeholders → Final Polish | Pisma procesowe |
| **Jurisprudence Synthesis** | `research` | Case Law Matrix → Precedent Analysis → Bias ID → Winning Argument | Badania prawne |
| **Strategic War Room** | `strategy` | Off/Def Posture → Evidence Inventory → Anticipatory Response → Tactical Timeline | Planowanie spraw |

---

## 📄 8. PRZETWARZANIE DOKUMENTÓW

### 8.1 Obsługiwane formaty

| Format | Biblioteka | Uwagi |
|--------|-----------|-------|
| **PDF** | PyPDF2 | Ekstrakcja tekstu ze stron |
| **DOCX** | python-docx | Akapity dokumentu |
| **TXT** | Natywnie | UTF-8 z fallbackiem na Latin-1 |
| **Obrazy** | EasyOCR | Polski + angielski, próg pewności > 50% |

### 8.2 Pipeline przetwarzania

```
Plik (upload)
    │
    ▼
┌─────────────────────────────┐
│  DETECTION                   │
│  Content-Type + Rozszerzenie │
└─────────────┬───────────────┘
              │
    ┌─────────┼──────────┐
    │         │          │
    ▼         ▼          ▼
  PDF       DOCX/TXT    Image
    │         │          │
    ▼         ▼          ▼
 PyPDF2   python-docx  EasyOCR
    │         │          │
    └─────────┼──────────┘
              │
              ▼
     Extracted Text (string)
              │
              ▼
     Dołączony do zapytania
     jako <user_document>
```

### 8.3 Endpointy dokumentów

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/upload-document` | POST | Upload pliku, ekstrakcja tekstu |
| `/upload-base64-document` | POST | Upload base64 (z frontendu) |
| `/analyze-document` | POST | Analiza tekstu dokumentu z RAG |

---

## 💾 9. BAZA DANYCH — LOKALNA (SQLite)

### 9.1 Schemat

```sql
sessions (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
)

messages (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL,        -- FK → sessions.id
    role        TEXT NOT NULL,         -- 'user' | 'assistant'
    content     TEXT NOT NULL,
    sources     TEXT,                  -- CSV źródeł
    timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
)

settings (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
)
```

### 9.2 Operacje

| Operacja | Funkcja | Opis |
|----------|---------|------|
| Init DB | `init_db()` | Tworzy tabele + migracja domyślnego system_prompt |
| Save Message | `save_message()` | Auto-tworzy sesję, aktualizuje tytuł |
| Get Messages | `get_messages()` | Pobiera historię czatu (limit 200) |
| Get Sessions | `get_sessions()` | Lista sesji sortowana po dacie |
| Delete Session | `delete_session()` | Usuwa sesję + kaskadowo wiadomości |
| Settings | `get_setting()` / `set_setting()` | CRUD klucz-wartość |

---

## 🔌 10. API ENDPOINTY — PODSUMOWANIE

| Endpoint | Metoda | Moduł | Opis |
|----------|--------|-------|------|
| `/models/all` | GET | api.py | Lista modeli z OpenRouter |
| `/models/presets` | GET | api.py | Predefiniowane zespoły modeli |
| `/models/admin` | GET | api.py | Modele dla panelu admina |
| `/sessions` | GET | database.py | Lista sesji |
| `/sessions/{id}/messages` | GET | database.py | Wiadomości sesji |
| `/sessions/{id}` | DELETE | database.py | Usuń sesję |
| `/chat` | POST | api.py | Single Model Chat |
| `/chat-consensus` | POST | api.py | MOA Consensus Chat |
| `/draft-document` | POST | api.py | Generator pism procesowych |
| `/upload-document` | POST | document_processor.py | Upload + ekstrakcja tekstu |
| `/upload-base64-document` | POST | document_processor.py | Upload base64 |
| `/analyze-document` | POST | api.py | Analiza dokumentu z RAG |

---

## 🌐 11. INTEGRACJA SAOS (System Analizy Orzeczeń Sądowych)

### 11.1 Źródło danych

- **URL**: `https://www.saos.org.pl/api/search/judgments`
- **Typ**: Publiczne API, bez autoryzacji
- **Format**: JSON (textContent, judgmentDate, courtCases)

### 11.2 Parametry wyszukiwania

```python
params = {
    "pageSize": 4,              # max 4 orzeczenia na zapytanie
    "pageNumber": 0,
    "all": query,               # zapytanie użytkownika
    "sortingField": "JUDGMENT_DATE",
    "sortingDirection": "DESC"   # najnowsze pierwsze
}
```

### 11.3 Mapowanie wyników

Każde orzeczenie SAOS jest mapowane na `RetrievedChunk`:
- **content**: textContent wyroku (lub fallback: data + sygnatura + sąd)
- **source**: `"ORZECZENIE SAOS ID: {id} ({court}, {case_number})"`
- **similarity**: 0.9 (stała — SAOS nie zwraca score)

### 11.4 Miejsce w pipeline

SAOS jest uruchamiany **równolegle** z keyword extraction i vector search. Wyniki SAOS są dodawane na końcu listy chunków (po keyword i vector), ale sortowanie po similarity zapewnia ich właściwą kolejność.

---

## ⚙️ 12. KONFIGURACJA — KLUCZOWE PARAMETRY

### 12.1 LLM

| Parametr | Wartość | Opis |
|----------|---------|------|
| `LLM_TEMPERATURE` | 0.1 | Niska temperatura = mniej halucynacji |
| `LLM_TIMEOUT` | 120s | Timeout pojedynczego wywołania |
| `GLOBAL_MOA_TIMEOUT` | 135s | Twardy limit całego MOA |
| `MAX_RETRIES` | 3 | Liczba powtórzeń przy błędzie |
| `RETRY_BASE_DELAY` | 1.0s | Bazowe opóźnienie (backoff) |
| `RETRY_MAX_DELAY` | 15.0s | Maksymalne opóźnienie |
| `RETRYABLE_STATUS_CODES` | 429, 500, 502, 503, 504 | Statusy do retry |

### 12.2 Embeddings

| Parametr | Wartość | Opis |
|----------|---------|------|
| `EMBEDDING_MODEL` | text-embedding-3-small | Model OpenAI |
| `EMBEDDING_DIMENSIONS` | 1536 | Wymiar wektora |
| `OPENROUTER_EMBEDDINGS_URL` | `{BASE_URL}/embeddings` | Endpoint embeddingów |

### 12.3 Retrieval

| Parametr | Wartość | Opis |
|----------|---------|------|
| `DEFAULT_MATCH_COUNT` | 12 | Fragmentów do pobrania |
| `DEFAULT_MATCH_THRESHOLD` | 0.05 | Próg podobieństwa |
| `MAX_CONTEXT_CHARS` | 48 000 | Limit znaków kontekstu |

---

## 🖥️ 13. FRONTEND — STRUKTURA

### 13.1 Główne widoki (Tabs)

| Tab | Komponent | Opis |
|-----|-----------|------|
| `chat` | `ChatView` | Konsultacja AI (Single + MOA) |
| `knowledge` | `KnowledgeView` | Centralna Baza Wiedzy |
| `drafter` | `DrafterView` | Kreator Pism |
| `documents` | `DocumentsView` | Dokumenty użytkownika |
| `settings` | `SettingsView` | Profil i ustawienia |
| `admin` | `AdminView` | Panel administracyjny (admin only) |

### 13.2 Stan aplikacji

| Store | Rola |
|-------|------|
| `useChatSettingsStore` | Ustawienia czatu (model, task, tab settings) |
| `useOrchestratorStore` | Stan orchestratora modeli |
| `uiStore` | Ogólny stan UI |
| `ChatContext` | Kontekst czatu (współdzielony przez ChatProvider) |

### 13.3 Auth

- **Dostawca**: Supabase Auth
- **Sesja**: `supabase.auth.getSession()` + `onAuthStateChange`
- **Role**: `profiles.role` (user / admin) — z Supabase
- **Guard**: Brak sesji → `LandingView` (strona powitalna)

---

## 📊 14. PRZEPŁYW DANYCH — PODSUMOWANIE

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  USER INPUT                                                          │
│  └─→ [Frontend] ChatView / DrafterView / DocumentsView              │
│       │                                                              │
│       └─→ POST /chat (lub /chat-consensus)                          │
│            │                                                         │
│            ├─→ [Intent Classifier]                                   │
│            │    ├─→ Rules (regex, zero cost)                         │
│            │    └─→ LLM fallback (gpt-4o-mini, $0.0001)             │
│            │                                                         │
│            ├─→ [RAG Retrieval] (jeśli LEGAL_QUERY)                   │
│            │    ├─→ Keyword Extraction                               │
│            │    ├─→ Vector Search (OpenAI → Supabase RPC)            │
│            │    └─→ SAOS Search (parallel)                           │
│            │                                                         │
│            ├─→ [Prompt Builder]                                      │
│            │    ├─→ MASTER_PROMPT (Architect)                        │
│            │    ├─→ SYSTEM_ROLE (Personality)                        │
│            │    ├─→ TASK_PROMPT (Methodology)                        │
│            │    └─→ ANALYST_PROMPT (Anti-hallucination)              │
│            │                                                         │
│            ├─→ [LLM Execution]                                       │
│            │    ├─→ Single: 1 model                                  │
│            │    └─→ MOA: 3 experts + 1 judge                         │
│            │                                                         │
│            ├─→ [Database Save]                                       │
│            │    └─→ SQLite: sessions + messages                      │
│            │                                                         │
│            └─→ [Response JSON] → Frontend                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 15. BEZPIECZEŃSTWO

| Aspekt | Implementacja |
|--------|--------------|
| **CORS** | Dozwolone origins: localhost:3000, 5173, 8003 |
| **API Keys** | Zmienne środowiskowe (.env) — nigdy w kodzie |
| **Anti-hallucynacja** | Zakaz konfabulacji, obowiązkowe cytowania |
| **Timeouts** | Twarde limity na LLM (120s) i MOA (135s) |
| **Rate Limiting** | Exponential backoff + retry na 429 |
| **Auth** | Supabase Auth z rolami (user/admin) |
| **Frontend** | AES-256 badge (deklaratywny) |

---

## 📝 LEGENDA SKRÓTÓW

| Skrót | Pełna nazwa |
|-------|-------------|
| MOA | Mixture of Agents |
| RAG | Retrieval-Augmented Generation |
| SAOS | System Analizy Orzeczeń Sądowych |
| KPA | Kodeks Postępowania Administracyjnego |
| KC | Kodeks Cywilny |
| KK | Kodeks Karny |
| KPK | Kodeks Postępowania Karnego |
| KSH | Kodeks Spółek Handlowych |
| LLM | Large Language Model |
| RPC | Remote Procedure Call |
| pgvector | Rozszerzenie PostgreSQL do wektorów |

---

## 🚀 16. KIERUNKI ROZWOJU (ROADMAP)

Na podstawie analizy architektury oraz aktualnych trendów LLMOps, wyznaczono następujące priorytety rozwojowe:

### 16.1 Smart Caching (Embedding & Prompt Cache)

- **Cel**: Redukcja kosztów OpenAI API oraz skrócenie czasu odpowiedzi dla powtarzalnych zapytań.
- **Implementacja**:
  - Wdrożenie **Redis** lub **Upstash** jako warstwy cache dla wektorów embeddingów.
  - Zapytania o czyste teksty ustaw (np. "Art. 212 KK") będą serwowane z cache, omijając generowanie wektora przez OpenAI.

### 16.2 Zaawansowany Reranking

- **Cel**: Zmniejszenie "szumu" w kontekście prawnym i poprawa precyzji odpowiedzi (rozwiązanie problemu *Lost in the Middle*).
- **Implementacja**:
  - Dodanie kroku **Cohere Rerank** lub **BGE-Reranker** po wstępnym pobraniu 12-20 fragmentów.
  - Do modeli MOA trafiać będzie tylko 3-5 absolutnie najważniejszych fragmentów, co drastycznie zmniejszy zużycie tokenów.

### 16.3 Wizualizacja "Tactical Timeline" (Grandmaster)

- **Cel**: Automatyczne generowanie osi czasu wydarzeń na podstawie analizowanych dokumentów.
- **Implementacja**:
  - Rola **Grandmaster** będzie ekstrahować chronologię zdarzeń w formacie **Mermaid.js**.
  - Frontend wyrenderuje interaktywny wykres Gantta lub Timeline, pozwalający na wizualną weryfikację terminów zawitych i przedawnień.

### 16.4 Audyt i Monitoring "Sędziego"

- **Cel**: Doskonalenie promptów sędziego i eliminacja sprzeczności w konsylium.
- **Implementacja**:
  - Logowanie przypadków, w których sędzia (Judge) musiał odrzucić analizę eksperta lub rozstrzygnąć jawną sprzeczność.
  - Analiza tych logów pod kątem optymalizacji instrukcji systemowych dla analityków.

---

## 📈 17. OPTYMALIZACJA WYDAJNOŚCI I KOSZTÓW

| Metoda | Opis | Zysk |
| :--- | :--- | :--- |
| **Intent Guard** | Omijanie RAG dla powitań | ~3-5s szybciej, 100% oszczędności tokenów RAG |
| **Connection Pooling** | Współdzielenie sesji HTTP w MOA | Redukcja overheadu o ~200-500ms na model |
| **Streaming (Planned)** | Stopniowe wyświetlanie odpowiedzi | Lepsze UX (perceived latency) |
| **Context Pruning** | Usuwanie redundancji z pobranych tekstów | ~15-20% mniej tokenów wejściowych |

---

*Dokumentacja aktualizowana dynamicznie na podstawie rozwoju systemu LexMind AI.*
