# 📋 Dokumentacja: Przepływ Informacji i Zasady Działania — LexMind AI

> **Wersja:** 1.3 | **Data:** 2026-06-26  
> **Autor:** System Documentation Generator  
> **Ostatni audyt:** Principal Engineer / CAO (2026-06-26)

---

## 🏗️ 1. ARCHITEKTURA SYSTEMU — PRZEGLĄD

### 1.1 Warstwy systemu

```text
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                     │
│         Chat | Knowledge | Drafter | Documents | Settings       │
├─────────────────────────────────────────────────────────────────┤
│                    BACKEND API (FastAPI)                         │
│   POST /chat (SSE) | /documents/* | /judgments/* | /models/*    │
├─────────────────────────────────────────────────────────────────┤
│              ORCHESTRATOR V2 (services/orchestrator_v2/)       │
│   Context → Debate (MOA) → Synthesis → cited_sources → SSE      │
├─────────────────────────────────────────────────────────────────┤
│                    ZEWNĘTRZNE SERWISY                            │
│   OpenRouter (LLM) | Supabase (pgvector) | SAOS (Orzecznictwo)  │
├─────────────────────────────────────────────────────────────────┤
│                    BAZA DANYCH (SQLite)                          │
│   Sessions | Messages | Settings                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Dualność baz (uwaga operacyjna):** SQLite przechowuje sesje i historię czatu lokalnie; Supabase — wektory (`knowledge_base_*`), auth i Edge Functions. To dwa źródła prawdy. Przy skalowaniu planowana migracja relacyjna do Postgres w Supabase (sekcja 16.1). Do tego czasu `cited_sources` są już persystowane w SQLite (sekcja 3.4).

### 1.2 Technologie

| Warstwa        | Technologia                                              | Rola                               |
| -------------- | -------------------------------------------------------- | ---------------------------------- |
| Frontend       | React + Vite + TypeScript + Tailwind CSS + Framer Motion | UI interfejs użytkownika           |
| Backend        | FastAPI + Python                                         | REST API, orkiestracja             |
| LLM            | OpenRouter API (Claude, GPT-4o, Gemini)                  | Generowanie odpowiedzi             |
| Embeddings     | OpenAI text-embedding-3-small (1536-dim)                 | Wektorowe reprezentacje tekstu     |
| Baza wektorowa | Supabase pgvector (RPC: match_knowledge)                 | Semantyczne wyszukiwanie prawnicze |
| Orzecznictwo   | SAOS API (saos.org.pl)                                   | Orzeczenia sądowe                  |
| Baza sesji     | SQLite (cache/prawnik.db)                                | Historia czatu, ustawienia         |

---

## 🔄 2. PRZEPŁYW INFORMACJI — KROK PO KROKU

### 2.1 Jednolity endpoint czatu (`POST /chat` — SSE)

Wszystkie tryby (`single`, `moa`, `consensus`) korzystają z **jednego endpointu** strumieniowego. Tryb wybiera frontend w polu `chat_mode` payloadu (`schemas/chat_request.py` → `ChatPayloadV2`).

```text
Użytkownik (Frontend — Chat/index.tsx)
    │
    ▼
POST /chat  (Content-Type: application/json)
    │
    ▼
routes/chat_v2.py  →  application/chat/use_case.py
    │
    ▼
services/orchestrator_v2/pipeline.py  (OrchestrationPipeline)
    │
    ├── [Etap 1] context_builder.LegalContextBuilder
    │       • RAG prawny (hybrid_search_legal_v2 / Supabase pgvector)
    │       • RAG użytkownika (hybrid_search_user_v2)
    │       • SAOS (services/retrieval/providers/saos_provider.py)
    │       • ELI (services/citation_eli_l1.py)
    │       • Załączniki / document_text
    │       → combined_full_text + raw_*_results
    │
    ├── [Etap 2] debate_engine.DebateEngine  (tylko gdy chat_mode = moa|consensus)
    │       • Równoległa debata N modeli (asyncio.gather)
    │       → expert_opinions, urgency_alerts, hallucination_rate
    │       → SSE: metadata { expert_analyses }
    │
    ├── [Etap 3] synthesis_engine.SeniorAdvocateSynthesis
    │       • Single: 1 model | MOA: sędzia scala ekspertów
    │       • citation_guard: weryfikacja cytatów w korpusie
    │       → SSE: chunk { text } (tokeny odpowiedzi na żywo)
    │
    ├── [Etap 4] statute_excerpt_service.build_cited_sources_for_answer
    │       • Ekstrakcja art. / sygn. z final_answer
    │       • Pełne brzmienie z RAG, ELI API lub Supabase
    │       • Orzeczenia SAOS → full_text
    │       → cited_sources[] w final_metadata
    │
    ├── Zapis SQLite (utils/helpers.save_chat_messages)
    │       content + expert_analyses + eli_explanation + cited_sources (JSON)
    │
    └── SSE final_metadata → Frontend
            cited_sources, confidence_score, claim_scores, timeline, …
```

### 2.2 Typy eventów SSE (kontrakt strumienia)

Parser frontendu: `frontend/src/utils/consumeChatSSE.ts`  
Schemat backendu: `schemas/chat_stream.py`

| Typ eventu        | Kiedy                          | Kluczowe pola                                              |
| ----------------- | ------------------------------ | ---------------------------------------------------------- |
| `metadata`        | Etapy potoku, częściowe wyniki | `message`, `expert_analyses`, `id`, `sessionId`            |
| `chunk`           | Tokeny odpowiedzi              | `text`                                                     |
| `final_metadata`  | Koniec generowania             | `final_answer`, `cited_sources`, `confidence_score`, …     |
| `error`           | Błąd krytyczny                 | `text`                                                     |

Hook mutacji: `frontend/src/hooks/useChatMutation.ts` — agreguje `currentMetadata` i zwraca `cited_sources` w wyniku.  
Aktualizacja UI: `frontend/src/components/Chat/index.tsx` — `onMetadata` i `onSuccess` zapisują `cited_sources` do stanu wiadomości.

### 2.3 Tryby czatu (`chat_mode`)

| Tryb        | Backend behavior                                      | Frontend flag          |
| ----------- | ----------------------------------------------------- | ---------------------- |
| `single`    | Etap 1 → 3 (bez debaty)                               | `isConsensusMode=false` |
| `moa`       | Etap 1 → 2 → 3 (debata + synteza)                     | `isConsensusMode=true`  |
| `consensus` | Jak MOA (alias w payloadzie)                          | `isConsensusMode=true`  |

---

## 🧠 3. ZASADY DZIAŁANIA — GŁÓWNE REGUŁY

### 3.1 Hierarchia Źródeł Prawdy

System działa według **ściśle określonej hierarchii wiarygodności**:

```text
🥇 POZIOM 1: DOKUMENT UŻYTKOWNIKA (<user_document>)
   → Źródło GŁÓWNE — jeśli użytkownik dostarczył dokument,
     analizujemy TEN dokument, nie ogólne przepisy.

🥈 POZIOM 2: KONTEKST PRAWNY RAG (<legal_context>)
   → Przepisy, orzecznictwo z bazy wiedzy Supabase.
   → WSPARCIE do interpretacji dokumentu użytkownika.

🥉 POZIOM 3: WIEDZA LLM (treningowa)
   → Używana TYLKO gdy brak źródeł z poz. 1 i 2.
   → Zawsze oznaczana jako [HIPOTEZA].
```text

### 3.2 Zasady Anti-Hallucynacji

```text
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
```text

### 3.3 Zasady Cytowania

Każde stwierdzenie prawne MUSI zawierać:

- **Nazwę aktu prawnego** (np. „Kodeks cywilny")
- **Numer artykułu, paragrafu, ustępu** (np. „Art. 415 KC")
- **Dosłowny cytat lub precyzyjną parafrazę** z kontekstu

Weryfikacja techniczna: `services/citation_guard.py` — `extract_citations`, `is_citation_verified`, `filter_unverified`.

### 3.4 Warstwa weryfikacji brzmienia (`cited_sources`)

Po zakończeniu syntezy backend buduje listę przypisów z pełnym tekstem do weryfikacji w UI.

**Backend:** `services/statute_excerpt_service.py` → `build_cited_sources_for_answer`

```text
final_answer (tekst odpowiedzi)
    │
    ▼
extract_citations()  ← citation_guard.py
    │
    ▼
Dla każdego art. / sygnatury:
    ├── _find_excerpt() — kolejność źródeł:
    │     1. legal_results (RAG prawny)
    │     2. legal_basis_text
    │     3. eli_results
    │     4. combined_context
    │     5. document_text (akta użytkownika)
    │     6. Supabase knowledge_base_legal (fallback)
    │     7. ELI Sejm API (fetch_eli_act_text)
    ├── is_citation_verified() — flaga verified
    └── SourceReference { ref_id, label, snippet, full_text, url, source_type }
    │
    ▼
Orzeczenia SAOS (gdy sygnatura w odpowiedzi):
    └── full_text z saos_results → source_type: "judgment"
    │
    ▼
final_metadata.cited_sources → Frontend
```

**Struktura `SourceReference`** (`frontend/src/types/chat.ts`):

| Pole          | Typ      | Opis                                              |
| ------------- | -------- | ------------------------------------------------- |
| `ref_id`      | string   | Np. `[1]`, `[2]` — numer przypisu                 |
| `label`       | string   | Np. `art. 77 § 1 KPA` lub `Wyrok (SAOS) — sygn. …` |
| `source_type` | string   | `law` \| `eli` \| `judgment` \| `document` \| `unverified` |
| `snippet`     | string   | Skrót (~320 znaków)                               |
| `full_text`   | string?  | Pełne brzmienie przepisu / orzeczenia             |
| `verified`    | boolean  | Czy cytat ma pokrycie w korpusie                  |
| `url`         | string?  | ISAP lub SAOS                                     |

**Frontend — wyświetlanie:**

| Komponent | Plik | Rola |
| --------- | ---- | ---- |
| `linkStatuteCitationsInMarkdown` | `utils/statuteCitationParse.ts` | Zamienia `art. X` / `sygn. …` na linki `#cite-N` |
| `CitationLinkWrapper` | `MessageBubble.tsx` | Link + stan otwarcia panelu |
| `InlineStatuteCitation` | `InlineStatuteCitation.tsx` | Ikona 📖, rozwijany panel pełnego tekstu |
| Lista przypisów | `MessageBubble.tsx` (sekcja dolna) | `<details>` „Pokaż pełne brzmienie" / „Pokaż pełną treść orzeczenia" |

**Ograniczenie (stan na 2026-06-26):** `cited_sources` są zapisywane w SQLite (`messages.cited_sources`, JSON) i odtwarzane przy ładowaniu sesji. Pełna migracja do Supabase Postgres — w roadmap (sekcja 16.1 / 18.3).

## 🔍 4. RAG (Retrieval-Augmented Generation) — HYBRYDOWY

Implementacja: `services/retrieval_service.py`, `services/retrieval/providers/`, `services/orchestrator_v2/context_builder.py`

### 4.1 Strategia wyszukiwania

```text
┌─────────────────────────────────────────────────────────┐
│              HYBRYDOWY PIPELINE RETRIEVAL                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  KROK 1: KEYWORD EXTRACTION (Zero koszt)                │
│  ├── Wzorzec: "Art. XXX" → szukaj w bazie              │
│  ├── Skróty: KPA, KC, KK, KPK, KSH → mapowanie         │
│  └── Priorytet: similarity = 0.95 (najwyższy)           │
│                                                         │
│  KROK 2: HYBRID SEARCH (Supabase RPC)                 │
│  ├── RPC v2: hybrid_search_legal_v2 / user_v2         │
│  ├── Legacy fallback: hybrid_search_legal / user       │
│  ├── Reranking: services/rerank_service.py             │
│  ├── Model: text-embedding-3-small (1536-dim)           │
│  └── Count / threshold: konfiguracja RetrievalService   │
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
```text

### 4.2 Parametry konfiguracyjne

| Parametr | Wartość (kod) | Opis |
| -------- | ------------- | ---- |
| `EMBEDDING_MODEL` | text-embedding-3-small | Model embeddingów OpenAI |
| `EMBEDDING_DIMENSIONS` | 1536 | Wymiar wektora |
| `settings.rag_match_threshold` | **0.35** | Próg podobieństwa w `RetrievalService.search_supabase` (domyślnie 0.5 w sygnaturze, V2 nadpisuje z config) |
| `settings.rag_match_count` | 5 | Docelowa liczba fragmentów po reranku |
| `settings.rerank_top_k` | 5 | Fragmenty prawne po reranku (heurystyka / Cohere) |
| `MAX_CONTEXT_CHARS` (legacy orchestrator) | 48 000 | Limit kontekstu w starym potoku |
| V2 `combined_full_text` cap | 120 000 | Przycinanie w `context_builder._compile_investigation_context` |

> **Uwaga historyczna:** starsza dokumentacja podawała `DEFAULT_MATCH_THRESHOLD = 0.05` — to był błąd opisu. W `services/retrieval_service.py` domyślna sygnatura to `0.5`; Orchestrator V2 używa `settings.rag_match_threshold = 0.35`.

---

## 🎯 5. ROUTING ZAPYTAŃ — QueryPlanner + fast path (V2)

W Orchestratorze V2 klasyfikacja intencji z legacy `moa/intent.py` jest zastąpiona przez:

1. **Heurystyka `is_fast_statutory_query`** (`services/pipeline/fast_path.py`) — zero kosztu
2. **QueryPlanner LLM** (`services/query_planner.py`) — ~200 tok JSON, gdy `feature_query_planner=True`
3. **`resolve_skip_debate`** (`services/orchestrator_v2/routing.py`) — decyzja o pominięciu debaty MOA

| Sygnał | Efekt |
| ------ | ----- |
| `chat_mode=single` | Pomija debatę ekspertów |
| `intent=article_explain` | Ścieżka uproszczona (definicje przepisów) |
| `estimated_complexity=low` + brak akt | Pomija debatę nawet w trybie MOA |
| Pełna analiza umowy / strategia | Debata MOA + synteza Sędziego |

Legacy intent classifier (GREETING / SMALL_TALK / LEGAL_QUERY) nadal istnieje w starym `services/orchestrator.py`, ale **produkcyjny endpoint `/chat` używa V2**.

---

## 🤖 6. MOA (Mixture of Agents)

Implementacja: `services/orchestrator_v2/debate_engine.py`, `services/orchestrator_v2/synthesis_engine.py`

### 6.1 Architektura konsylium

MOA to **architektura wielomodelowa** — jedno zapytanie trafia do N modeli jednocześnie, a jeden „sędzia" scala ich odpowiedzi w konsensus.

```text
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
     │  (różne      │ │  (różne      │ │  (różne      │
     │   modele)    │ │   modele)    │ │   modele)    │
     └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  JUDGE / SYNTH  │
                    │  aggregator_    │
                    │  model (≠ ekspert│
                    │  A w presetach) │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  FINAL ANSWER  │
                    └─────────────────┘
```text

### 6.2 Presety modeli (`moa/config.py` → `GET /models/presets`)

| Preset | Sędzia (`judge`) | Eksperci (`models`) | Uwaga |
| ------ | ---------------- | ------------------- | ----- |
| **Legal War Machine** | `deepseek/deepseek-r1` | R1, Claude 3.5 Sonnet, Gemini 2.5 Flash | Sędzia reasoning ≠ eksperci — dywersyfikacja zachowana |
| **LexMind Speed** | `openai/gpt-4o-mini` | GPT-4o Mini, Gemini 2.5 Flash Lite | Ekonomiczny |

Użytkownik może nadpisać `aggregator_model` i `selected_models` w payloadzie MOA. **Ryzyko:** jeśli frontend wybierze ten sam model na sędziego i eksperta, dywersyfikacja konsylium spada — zalecane różne modele dla `aggregator_model`.

### 6.3 Mechanizmy odporności (Resilience)

```text
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
```text

### 6.4 Zasady Sędziego (Judge)

Sędzia jest najwyższym autorytetem w konsylium. Jego obowiązki:

1. **RE-RANKING I AUDYT**: Konfrontuje każdą analizę z źródłami. Odrzuca fragmenty, które nie mają potwierdzenia w kontekście prawnym.
2. **ROZSTRZYGANIE SPRZECZNOŚCI**: Jeśli eksperci podają różne interpretacje — sędzia rozstrzyga na podstawie litery prawa.
3. **MINIMALIZACJA RYZYKA**: W przypadku niejasności — podaje najbardziej zachowawczą (bezpieczną) ścieżkę.
4. **AUDYT CYTOWAŃ**: Sprawdza, czy eksperci nie zmyślili przepisów (article hallucination check).

### 6.5 Struktura odpowiedzi sędziego

```text
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
```text

---

## 🎨 7. SYSTEM PROMPTÓW — HIERARCHICZNA STRUKTURA

### 7.1 Architektura trójwarstwowa

Każda odpowiedź LLM jest budowana hierarchicznie. Prompty pochodzą z **frontendu** (`useChatSettingsStore`) i są przekazywane w payloadzie jako `prompt_overrides`.

**Walidacja backend (2026-06-26):** `services/prompt_guard.py` — przycinanie do 32k znaków, strip markerów injection, sanityzacja w `LegacyPayloadAdapter.to_orchestrator_kwargs`. Pełne zarządzanie promptami po stronie serwera — planowane dla multi-tenant.

```text
┌─────────────────────────────────────────┐
│  1. ARCHITECT PROMPT                    │  ← store: architectPrompt
│  → Nadrzędna logika operacyjna          │     services/synthesis/prompts.py (fallbacki)
│  → Data Sovereignty: prawda z RAG       │
├─────────────────────────────────────────┤
│  2. SYSTEM ROLE (Osobowość)             │  ← store: unitSystemRoles[currentSystemRoleId]
│  → Navigator / Inquisitor / Draftsman   │
│  → Oracle / Grandmaster                 │
├─────────────────────────────────────────┤
│  3. TASK PROMPT (Instrukcja)            │  ← store: taskPrompts[currentTask]
│  → general | analysis | drafting |       │
│    research | strategy                  │
├─────────────────────────────────────────┤
│  4. EXPERT / JUDGE PROMPTS (MOA)        │  ← store: expertPromptsByModel, judgePrompt
│  → DebateEngine + SeniorAdvocateSynthesis│
│  → citation_guard (anti-hallucynacja)   │
└─────────────────────────────────────────┘
```text

### 7.2 Dostępne Role (SYSTEM_ROLES)

| Rola            | Identyfikator | Osobowość                                                    | Użycie                        |
| --------------- | ------------- | ------------------------------------------------------------ | ----------------------------- |
| **Navigator**   | `navigator`   | Diagnosta prawny — mapuje chaos na strukturę kodeksową       | Domyślna dla zapytań ogólnych |
| **Inquisitor**  | `inquisitor`  | Rewident kontraktowy — „niszczy" dokument w poszukiwaniu luk | Analiza dokumentów            |
| **Draftsman**   | `draftsman`   | Architekt tekstów — odporny na ataki procesowe               | Tworzenie pism                |
| **Oracle**      | `oracle`      | Analityk linii orzeczniczych — czyta wyroki, nie przepisy    | Badania orzecznictwa          |
| **Grandmaster** | `grandmaster` | Strateg procesowy — szach-mat w 3 ruchach                    | Planowanie strategii          |

### 7.3 Dostępne Zadania (TASK_PROMPTS)

| Zadanie                     | Identyfikator | Metodologia                                                                      | Użycie           |
| --------------------------- | ------------- | -------------------------------------------------------------------------------- | ---------------- |
| **Multi-Level Diagnosis**   | `general`     | Conflict Topology → Context Anchoring → Solution Path → Human Summary            | Domyślne         |
| **Adversarial Audit**       | `analysis`    | Structural Check → Abusive Clause Detection → Risk Heatmap → Hidden Traps        | Analiza umów     |
| **Bulletproof Drafting**    | `drafting`    | Formal Compliance → Logic Chaining → Strategic Placeholders → Final Polish       | Pisma procesowe  |
| **Jurisprudence Synthesis** | `research`    | Case Law Matrix → Precedent Analysis → Bias ID → Winning Argument                | Badania prawne   |
| **Strategic War Room**      | `strategy`    | Off/Def Posture → Evidence Inventory → Anticipatory Response → Tactical Timeline | Planowanie spraw |

---

## 📄 8. PRZETWARZANIE DOKUMENTÓW

### 8.1 Obsługiwane formaty

| Format     | Biblioteka  | Uwagi                                   |
| ---------- | ----------- | --------------------------------------- |
| **PDF**    | PyPDF2      | Ekstrakcja tekstu ze stron              |
| **DOCX**   | python-docx | Akapity dokumentu                       |
| **TXT**    | Natywnie    | UTF-8 z fallbackiem na Latin-1          |
| **Obrazy** | EasyOCR     | Polski + angielski, próg pewności > 50% |

### 8.2 Pipeline przetwarzania

```text
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
```text

### 8.3 Endpointy dokumentów

| Endpoint                  | Metoda | Opis                            |
| ------------------------- | ------ | ------------------------------- |
| `/upload-document`        | POST   | Upload pliku, ekstrakcja tekstu |
| `/upload-base64-document` | POST   | Upload base64 (z frontendu)     |
| `/analyze-document`       | POST   | Analiza tekstu dokumentu z RAG  |

---

## 💾 9. BAZA DANYCH — LOKALNA (SQLite)

### 9.1 Schemat

```textsql
sessions (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
)

messages (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL,        -- FK → sessions.id
    role            TEXT NOT NULL,         -- 'user' | 'assistant'
    content         TEXT NOT NULL,         -- szyfrowane (encrypt_text)
    sources         TEXT,                  -- CSV ref_id / etykiet źródeł RAG
    message_type    TEXT DEFAULT 'standard',  -- 'standard' | 'moa_consensus'
    reasoning       TEXT,                  -- JSON expert_analyses (MOA)
    eli_explanation TEXT,                  -- warstwa ELI
    ai_task         TEXT,
    created_at      DATETIME,
    updated_at      DATETIME,
    timestamp       DATETIME,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
)
-- cited_sources TEXT (JSON, szyfrowany) — pełne brzmienia przepisów

settings (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
)
```text

### 9.2 Operacje

| Operacja       | Funkcja                           | Opis                                              |
| -------------- | --------------------------------- | ------------------------------------------------- |
| Init DB        | `init_db()`                       | Tworzy tabele + migracja domyślnego system_prompt |
| Save Message   | `save_message()` / `save_chat_messages()` | Para user+assistant, reasoning, eli |
| Get Messages   | `get_messages()`                  | Historia z `cited_sources` (JSON) |
| Get Sessions   | `get_sessions()`                  | Lista sesji sortowana po dacie                    |
| Delete Session | `delete_session()`                | Usuwa sesję + kaskadowo wiadomości                |
| Settings       | `get_setting()` / `set_setting()` | CRUD klucz-wartość                                |

---

## 🔌 10. API ENDPOINTY — PODSUMOWANIE

| Endpoint                        | Metoda | Moduł              | Opis                              |
| ------------------------------- | ------ | ------------------ | --------------------------------- |
| `/ping`                         | GET    | routes/core.py     | Health check                      |
| `/models`, `/models/presets`    | GET    | routes/models.py   | Katalog modeli OpenRouter         |
| `/sessions`                     | GET    | routes/database.py | Lista sesji                       |
| `/sessions/{id}/messages`       | GET    | routes/database.py | Historia z `cited_sources` (JSON) |
| `/sessions/{id}`                | DELETE | routes/database.py | Usuń sesję                        |
| `/chat`                         | POST   | routes/chat_v2.py  | **Główny czat — SSE** (single + MOA) |
| `/documents/upload-document`    | POST   | routes/documents.py| Upload + ekstrakcja tekstu        |
| `/documents/draft-document`     | POST   | routes/documents.py| Generator pism                    |
| `/documents/analyze-document`   | POST   | routes/documents.py| Analiza dokumentu z RAG           |
| `/judgments/*`                  | GET    | routes/judgments.py| Wyszukiwanie SAOS (moduł Orzeczenia) |
| `/health/*`                     | GET    | routes/health.py   | Diagnostyka RAG / Supabase        |
| `/admin/*`                      | GET/POST | routes/admin.py  | Panel administracyjny             |

> **Uwaga:** Endpoint `/chat-consensus` został scalony z `POST /chat` — tryb MOA wybiera się polem `chat_mode` w body żądania.

---

## 🌐 11. INTEGRACJA SAOS (System Analizy Orzeczeń Sądowych)

### 11.1 Źródło danych

- **URL**: `https://www.saos.org.pl/api/search/judgments`
- **Typ**: Publiczne API, bez autoryzacji
- **Format**: JSON (textContent, judgmentDate, courtCases)

### 11.2 Parametry wyszukiwania

```textpython
params = {
    "pageSize": 4,              # max 4 orzeczenia na zapytanie
    "pageNumber": 0,
    "all": query,               # zapytanie użytkownika
    "sortingField": "JUDGMENT_DATE",
    "sortingDirection": "DESC"   # najnowsze pierwsze
}
```text

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

| Parametr                 | Wartość                 | Opis                                  |
| ------------------------ | ----------------------- | ------------------------------------- |
| `LLM_TEMPERATURE`        | 0.1                     | Niska temperatura = mniej halucynacji |
| `LLM_TIMEOUT`            | 120s                    | Timeout pojedynczego wywołania        |
| `GLOBAL_MOA_TIMEOUT`     | 135s                    | Twardy limit całego MOA               |
| `MAX_RETRIES`            | 3                       | Liczba powtórzeń przy błędzie         |
| `RETRY_BASE_DELAY`       | 1.0s                    | Bazowe opóźnienie (backoff)           |
| `RETRY_MAX_DELAY`        | 15.0s                   | Maksymalne opóźnienie                 |
| `RETRYABLE_STATUS_CODES` | 429, 500, 502, 503, 504 | Statusy do retry                      |

### 12.2 Embeddings

| Parametr                    | Wartość                 | Opis                 |
| --------------------------- | ----------------------- | -------------------- |
| `EMBEDDING_MODEL`           | text-embedding-3-small  | Model OpenAI         |
| `EMBEDDING_DIMENSIONS`      | 1536                    | Wymiar wektora       |
| `OPENROUTER_EMBEDDINGS_URL` | `{BASE_URL}/embeddings` | Endpoint embeddingów |

### 12.3 Retrieval

| Parametr | Wartość | Opis |
| -------- | ------- | ---- |
| `settings.rag_match_threshold` | 0.35 | Próg w V2 context builder |
| `settings.rag_match_count` | 5 | Docelowa liczba fragmentów |
| `settings.rerank_top_k` | 5 | Po reranku |
| `MAX_CONTEXT_CHARS` (legacy) | 48 000 | Stary orchestrator |

---

## 🖥️ 13. FRONTEND — STRUKTURA

### 13.1 Główne widoki (Tabs)

| Tab         | Komponent            | Opis                               |
| ----------- | -------------------- | ---------------------------------- |
| `chat`      | `Chat/index.tsx`     | Konsultacja AI (Single + MOA, SSE)  |
| `knowledge` | `KnowledgeView`      | Centralna Baza Wiedzy              |
| `drafter`   | `Drafter/index.tsx`  | Kreator Pism                       |
| `documents` | `DocumentsView`      | Dokumenty użytkownika              |
| `judgments` | `JudgmentsView`      | Orzeczenia SAOS                    |
| `settings`  | `SettingsView`       | Profil i ustawienia                |
| `admin`     | `AdminView`          | Panel administracyjny (admin only) |

### 13.2 Komponenty czatu — cytaty i weryfikacja

| Plik | Odpowiedzialność |
| ---- | ---------------- |
| `Chat/index.tsx` | Stan wiadomości, SSE (`onChunk`, `onMetadata`, `onSuccess`), zapis `cited_sources` |
| `MessageBubble.tsx` | Render Markdown, `CitationLinkWrapper`, lista przypisów, ELI, timeline |
| `InlineStatuteCitation.tsx` | Panel rozwijany z `full_text` (ikona 📖) |
| `utils/statuteCitationParse.ts` | `buildCiteLookup`, `linkStatuteCitationsInMarkdown` |
| `hooks/useChatMutation.ts` | POST /chat, parser SSE, agregacja metadanych |
| `index.css` (`.cite-inline-panel`) | Style panelu inline |

### 13.3 Stan aplikacji

| Store                  | Rola                                              |
| ---------------------- | ------------------------------------------------- |
| `useChatSettingsStore` | Ustawienia czatu (model, task, tab settings)      |
| `useOrchestratorStore` | Stan orchestratora modeli                         |
| `uiStore`              | Ogólny stan UI                                    |
| `ChatContext`          | Kontekst czatu (współdzielony przez ChatProvider) |

### 13.4 Auth

- **Dostawca**: Supabase Auth
- **Sesja**: `supabase.auth.getSession()` + `onAuthStateChange`
- **Role**: `profiles.role` (user / admin) — z Supabase
- **Guard**: Brak sesji → `LandingView` (strona powitalna)

---

## 📊 14. PRZEPŁYW DANYCH — PODSUMOWANIE

```text
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  USER INPUT                                                          │
│  └─→ [Frontend] Chat/index.tsx                                       │
│       │                                                              │
│       └─→ POST /chat (SSE)                                           │
│            │                                                         │
│            ├─→ [Orchestrator V2 Pipeline]                            │
│            │    ├─→ Context Builder (RAG legal/user + SAOS + ELI)     │
│            │    ├─→ Debate Engine (MOA, opcjonalnie)                  │
│            │    ├─→ Synthesis + citation_guard                        │
│            │    └─→ build_cited_sources_for_answer                    │
│            │                                                         │
│            ├─→ [SSE Stream]                                          │
│            │    ├─→ metadata (etapy, expert_analyses)                 │
│            │    ├─→ chunk (tokeny odpowiedzi)                         │
│            │    └─→ final_metadata (cited_sources, confidence, …)     │
│            │                                                         │
│            ├─→ [Database Save] SQLite (content, reasoning, eli)       │
│            │                                                         │
│            └─→ [Frontend UI]                                         │
│                 ├─→ MessageBubble + linki art./sygn.                  │
│                 └─→ InlineStatuteCitation (pełne brzmienie)          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```text

---

## 🔒 15. BEZPIECZEŃSTWO

| Aspekt | Implementacja |
| ------ | ------------- |
| **CORS** | Domyślnie localhost + regex LAN; produkcja: zmienna `CORS_ORIGINS` (lista po przecinku) w `api.py` |
| **Szyfrowanie SQLite** | `database.encrypt_text` — HMAC-SHA256 keystream + MAC, klucz 32 B w `cache/case_encryption.key` (nie AES-GCM, ale AEAD-style integrity) |
| **PII** | `services/pii_mask.py` przed wysyłką do LLM |
| **prompt_overrides** | `services/prompt_guard.py` — limit długości, strip injection |
| **API Keys** | Zmienne środowiskowe (.env) |
| **Anti-hallucynacja** | `citation_guard.py` + weryfikacja przed syntezą (częściowa) |
| **Timeouts** | LLM 120s, MOA global 135s (legacy) |
| **Auth** | Supabase Auth + role `profiles.role` |

---

## 📝 LEGENDA SKRÓTÓW

| Skrót           | Pełna nazwa / znaczenie               |
| --------------- | ------------------------------------- |
| MOA             | Mixture of Agents                     |
| RAG             | Retrieval-Augmented Generation        |
| SAOS            | System Analizy Orzeczeń Sądowych      |
| SSE             | Server-Sent Events (strumień czatu)   |
| cited_sources   | Przypisy z pełnym brzmieniem przepisów |
| ELI             | European Legislation Identifier (Sejm) |
| KPA      | Kodeks Postępowania Administracyjnego |
| KC       | Kodeks Cywilny                        |
| KK       | Kodeks Karny                          |
| KPK      | Kodeks Postępowania Karnego           |
| KSH      | Kodeks Spółek Handlowych              |
| LLM      | Large Language Model                  |
| RPC      | Remote Procedure Call                 |
| pgvector | Rozszerzenie PostgreSQL do wektorów   |

---

## 🚀 16. KIERUNKI ROZWOJU (ROADMAP)

Na podstawie analizy architektury oraz aktualnych trendów LLMOps, wyznaczono następujące priorytety rozwojowe:

### 16.1 Migracja relacyjna do Supabase PostgreSQL

- **Cel**: Eliminacja `database is locked`, RLS, ujednolicenie stosu z pgvector.
- **Implementacja**: Tabele `sessions`, `messages` (z `cited_sources JSONB`) w Supabase; stopniowe wygaszenie SQLite.

### 16.2 Persystencja `cited_sources` w SQLite

- **Status:** wdrożone lokalnie (kolumna `cited_sources` w `messages`).
- **Kolejny krok:** replikacja schematu w Postgres przy migracji.

### 16.3 Smart Caching (Embedding & Prompt Cache)

- **Cel**: Redukcja kosztów OpenAI API oraz skrócenie czasu odpowiedzi dla powtarzalnych zapytań.
- **Implementacja**:
  - Wdrożenie **Redis** lub **Upstash** jako warstwy cache dla wektorów embeddingów.
  - Zapytania o czyste teksty ustaw (np. "Art. 212 KK") będą serwowane z cache, omijając generowanie wektora przez OpenAI.

### 16.4 Zaawansowany Reranking

- **Cel**: Zmniejszenie "szumu" w kontekście prawnym i poprawa precyzji odpowiedzi (rozwiązanie problemu _Lost in the Middle_).
- **Implementacja**:
  - Dodanie kroku **Cohere Rerank** lub **BGE-Reranker** po wstępnym pobraniu 12-20 fragmentów.
  - Do modeli MOA trafiać będzie tylko 3-5 absolutnie najważniejszych fragmentów, co drastycznie zmniejszy zużycie tokenów.

### 16.5 Wizualizacja "Tactical Timeline" (Grandmaster)

- **Cel**: Automatyczne generowanie osi czasu wydarzeń na podstawie analizowanych dokumentów.
- **Implementacja**:
  - Rola **Grandmaster** będzie ekstrahować chronologię zdarzeń w formacie **Mermaid.js**.
  - Frontend wyrenderuje interaktywny wykres Gantta lub Timeline, pozwalający na wizualną weryfikację terminów zawitych i przedawnień.

### 16.6 Audyt i Monitoring "Sędziego"

- **Cel**: Doskonalenie promptów sędziego i eliminacja sprzeczności w konsylium.
- **Implementacja**:
  - Logowanie przypadków, w których sędzia (Judge) musiał odrzucić analizę eksperta lub rozstrzygnąć jawną sprzeczność.
  - Analiza tych logów pod kątem optymalizacji instrukcji systemowych dla analityków.

---

## 📈 17. OPTYMALIZACJA WYDAJNOŚCI I KOSZTÓW

| Metoda                  | Opis                                     | Zysk                                          |
| :---------------------- | :--------------------------------------- | :-------------------------------------------- |
| **SSE Streaming**       | Tokeny + final_metadata na żywo          | Lepsze UX, cited_sources po zakończeniu       |
| **Connection Pooling**  | Współdzielenie sesji HTTP w MOA          | Redukcja overheadu o ~200-500ms na model      |
| **Hybrid RPC v2**       | hybrid_search_*_v2 z fallbackiem legacy  | Lepsza jakość retrieval vs. czysty vector     |
| **Context Pruning**     | Usuwanie redundancji z pobranych tekstów | ~15-20% mniej tokenów wejściowych             |

| **Semantic Router V2** | QueryPlanner + fast_path → skip debaty MOA | Niższy koszt i latency przy prostych pytaniach |
| **Rerank top_k=5**     | Heurystyka / opcjonalnie Cohere API      | Mniej tokenów wejściowych, mniej „Lost in the Middle" |

---

## 🔬 18. ANALIZA LUK ARCHITEKTONICZNYCH I STATUS WDROŻEŃ

Poniższa tabela mapuje rekomendacje audytu architektonicznego na stan kodu (2026-06-26).

### 18.1 Dynamic Routing & Reranking

| Rekomendacja | Status | Implementacja |
| ------------ | ------ | ------------- |
| Semantic Router między intent a MOA | **Wdrożone (V2)** | `services/orchestrator_v2/routing.py`, `query_planner.py`, `pipeline/fast_path.py` — Etap 1b w `context_builder.py`; debata pomijana gdy `skip_debate=True` |
| Proste pytania → single path | **Wdrożone** | `chat_mode=single`, `is_fast_statutory_query`, `intent=article_explain`, `complexity=low` |
| Re-ranker 12→3–5 fragmentów | **Wdrożone** | `rerank_service.py`; `rerank_top_k=5`; Cohere opcjonalnie |
| Adaptacyjny cutoff debaty MOA | **Wdrożone** | `debate_gather.py` + `debate_slow_multiplier` / `debate_min_cutoff_ms` w `config.py` |
| BGE-M3 lokalny | **Planowane** | Wymaga hostingu modelu; obecnie heurystyka / Cohere |

### 18.2 Shift-Left Anti-Hallucination

| Rekomendacja | Status | Uwagi |
| ------------ | ------ | ----- |
| Constrained JSON z ekspertów | **Planowane** | Obecnie wolny tekst + `<thinking>` |
| Weryfikacja cytatów przed Sędzią | **Częściowo** | `_verify_hallucinations` audytuje ekspertów przed streamem; `build_cited_sources_for_answer` nadal po syntezie |
| citation_guard in-flight | **Częściowo** | `_verify_hallucinations` w `synthesis_engine.py` przed streamem; nie filtruje tez ekspertów |
| Blokada streamu przy halucynacji | **Brak** | SSE może zawierać niezweryfikowany tekst do momentu `final_metadata` |

**Kierunek:** przenieść ekstrakcję i weryfikację cytatów **przed** `synthesize_stream`, przekazać Sędziemu tylko zweryfikowane tezy (structured claims).

### 18.3 Stan i baza danych

| Rekomendacja | Status | Implementacja |
| ------------ | ------ | ------------- |
| Migracja SQLite → Supabase Postgres | **Planowane** | SQLite nadal dla sessions/messages; wektory już w Supabase |
| Persystencja `cited_sources` | **Wdrożone (SQLite)** | Kolumna `messages.cited_sources` (JSON szyfrowany); `save_chat_messages` + `get_messages` |
| RLS / współbieżność zapisu | **Planowane** | Ryzyko `database is locked` przy równoległym SSE — migracja do Postgres rozwiąże |

### 18.4 Suwerenność danych (RODO)

| Rekomendacja | Status | Uwagi |
| ------------ | ------ | ----- |
| Zero Data Retention (OpenRouter) | **Do weryfikacji** | Wymaga potwierdzenia polityki dostawcy / nagłówków API |
| Lokalne embeddingi (HerBERT / pl-ST) | **Planowane** | Obecnie `text-embedding-3-small` przez API |
| PII mask przed LLM | **Wdrożone** | `services/pii_mask.py` w context builder |

### 18.5 Priorytety biznesowe

| Priorytet | Działanie |
| --------- | --------- |
| **Niezawodność** | Migracja relacyjna do Supabase Postgres + RLS |
| **Koszty** | Semantic Router (✓) + Cohere rerank + ograniczenie kontekstu do 5 fragmentów |
| **Zaufanie prawne** | Shift-left citation verify przed syntezą + structured expert output |

---

## 📋 19. ODPOWIEDŹ NA AUDYT WEWNĘTRZNY (2026-06-26)

| # | Uwaga audytu | Status po korekcie |
| - | ------------ | ------------------ |
| 1 | `cited_sources` nie persystowane | **Naprawione** — kolumna SQLite + zapis/odczyt; dokumentacja zaktualizowana |
| 2 | Sędzia = Analityk A (ten sam model) | **Częściowo** — presety `moa/config.py` mają różnych sędziów; użytkownik może nadpisać — UI powinno ostrzegać |
| 3 | `prompt_overrides` bez walidacji | **Częściowo** — `prompt_guard.py` na backendzie |
| 4 | `MATCH_THRESHOLD = 0.05` | **Błąd dokumentacji** — kod używa 0.35–0.5; poprawione w sekcji 4.2 |
| 5 | CORS tylko localhost | **Częściowo** — `CORS_ORIGINS` env dla produkcji |
| 6 | AES-256 „deklaratywny" | **Wyjaśnione** — faktyczne szyfrowanie HMAC keystream w `encrypt_text`, nie marketing AES-GCM |
| 7 | Dualność SQLite + Supabase | **Udokumentowane** — migracja w roadmap 16.1 |
| 8 | Shift-left anti-hallucination | **Planowane** — sekcja 18.2 |

---

## 🎯 20. ODPOWIEDŹ NA AUDYT PRINCIPAL ENGINEER / CAO (2026-06-26)

Poniższa tabela reconciliuje rekomendacje audytu zewnętrznego z aktualnym stanem kodu po serii wdrożeń z sekcji 18–19.

### 20.1 MOA Pipeline — latency i FinOps

| Uwaga audytu | Stan w kodzie | Działanie |
| ------------ | ------------- | --------- |
| Saturacja okna kontekstowego (48k → 3×12k tokenów) | **Częściowo** | `rerank_top_k=5`, dynamiczny budżet znaków w `token_budget.py`; debata nadal dostaje pełny `combined_full_text` (ucięty per model) |
| Kaskadowy timeout 120s przy partial results | **Wdrożone** | `gather_experts_adaptive` w `debate_gather.py` — cutoff po medianie × `debate_slow_multiplier` (domyślnie 1.5), min `debate_min_cutoff_ms=12000`; timeout eksperta `debate_expert_timeout_sec=75` |
| Lost in the Middle (brak reranku) | **Częściowo** | `rerank_service.py` + `rerank_top_k=5`; Cohere gdy `COHERE_API_KEY` |

### 20.2 Anti-Hallucination — reaktywny vs proaktywny

| Uwaga audytu | Stan w kodzie | Działanie |
| ------------ | ------------- | --------- |
| Walidacja cytatów **po** streamie (Etap 4) | **Nadal częściowo** | `build_cited_sources_for_answer` w `pipeline.py` po syntezie; UI dostaje `[unverified]` w `final_metadata` |
| In-flight constrained decoding | **Brak** | Planowane — sekcja 18.2 |
| Weryfikacja przed Sędzią | **Częściowo** | `_verify_hallucinations` w `synthesis_engine.py` audytuje **opinie ekspertów** przed streamem; nie filtruje tokenów Sędziego w locie |

**Architektura obecna:**

```text
Eksperci → CitationGuard (pre-synth) → Sędzia stream SSE → build_cited_sources (post-hoc) → cited_sources w DB
```

### 20.3 Persystencja i SQLite

| Uwaga audytu | Stan w kodzie | Działanie |
| ------------ | ------------- | --------- |
| `cited_sources` tylko w React (F5) | **Naprawione** | Kolumna `messages.cited_sources` (JSON szyfrowany), zapis w `save_chat_messages`, odczyt w `get_messages` |
| Migracja SQLite → Supabase Postgres + JSONB | **Planowane** | Roadmap 16.1; DDL audytu (`cited_sources JSONB`) gotowy do migracji |
| `database is locked` przy równoległym SSE | **Ryzyko otwarte** | Do czasu migracji Postgres |

### 20.4 Intent Classification

| Uwaga audytu | Stan w kodzie | Działanie |
| ------------ | ------------- | --------- |
| False positive SMALL_TALK dla „Art 5" | **Naprawione (V2)** | Legacy `moa/intent.py` nieużywany; `is_legal_micro_query` w `fast_path.py` + `plan_query_zero_cost` w `query_planner.py` |
| Dwustopniowy router reguły → LLM | **Zastąpione** | V2: fast path (zero-cost) → QueryPlanner LLM → `resolve_skip_debate` |

### 20.5 RODO i suwerenność danych

| Uwaga audytu | Stan w kodzie | Działanie |
| ------------ | ------------- | --------- |
| Presidio PII masking | **Częściowo** | `services/pii_mask.py` (regex) w `context_builder`; Presidio — opcjonalna ewolucja |
| On-premise embedding (BGE-M3) | **Planowane** | Obecnie `text-embedding-3-small` |
| Zero Data Retention OpenRouter | **Do weryfikacji** | Polityka dostawcy / nagłówki API |

### 20.6 Priorytetyzacja sprintu (z audytu)

| Priorytet audytu | Status po wdrożeniach 2026-06-26 |
| ---------------- | -------------------------------- |
| 1. Postgres + `cited_sources` JSONB | SQLite JSON **✓**; Postgres **planowane** |
| 2. PII przed OpenRouter | **✓** (`pii_mask.py`) |
| 3. Reranker 12→4–5 chunków | **✓** (`rerank_top_k=5`) |
| 4. Adaptacyjny timeout debaty | **✓** (`debate_gather.py`) |
| 5. Shift-left citation verify | **Otwarte** |

---

_Dokumentacja aktualizowana dynamicznie na podstawie rozwoju systemu LexMind AI._
