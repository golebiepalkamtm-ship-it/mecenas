# Architektura systemu wyboru modeli AI — LexMind

**Data:** 2026-03-28  
**Zakres:** Wszystkie otwarte pliki w edytorze

---

## 1. Mapa zależności między plikami

```
run_prawnik_ui.bat
├── FastAPI backend :8001 (api.py)
└── Vite frontend :3000

frontend/src/
├── store/
│   ├── useChatSettingsStore.ts    ← Store #1 (localStorage "lexmind-chat-settings")
│   └── useOrchestratorStore.ts    ← Store #2 (localStorage "lexmind-orchestrator")
├── hooks/
│   └── useChatMutation.ts         ← Odczytuje Store #1, wysyła do backendu
├── context/
│   └── useSharedChat.ts           ← React Context (ChatProvider)
├── components/
│   ├── Chat/
│   │   ├── index.tsx              ← Główny widok czatu, renderuje QuickIntelligencePanel
│   │   ├── components/
│   │   │   ├── ChatInput.tsx      ← Input + przyciski (odczytuje Store #1)
│   │   │   ├── QuickIntelligencePanel.tsx  ← Panel prawy (odczytuje Store #1)
│   │   │   ├── ModelConfigurator.tsx       ← MARTWY KOD (540 linii)
│   │   │   └── TopIntelligenceSwitcher.tsx ← NIE ISTNIEJE (404)
│   │   ├── constants.ts           ← BRAND_MAP, DEFAULT_AGGREGATOR
│   │   └── types.ts               ← Message, Model, Attachment
│   ├── Drafter/
│   │   └── index.tsx              ← Kreator pism (używa useSharedChat + Supabase)
│   ├── Settings/
│   │   ├── index.tsx              ← Strona ustawień (ładuje profile z Supabase)
│   │   ├── components/
│   │   │   └── AIModelsSection.tsx ← MARTWY KOD (nie renderowany w Settings)
│   │   └── types.ts               ← Profile, SettingsViewProps
│   └── ModelOrchestrator/
│       └── ModelOrchestrator.tsx   ← Renderowany w Settings → "Modele AI" (używa Store #2)
```

---

## 2. Dwa niezależne store'y Zustand

### Store #1: `useChatSettingsStore` — "Chat Settings"

| Właściwość | Typ | Default | Limit | Używane przez |
|---|---|---|---|---|
| `isOpen` | `boolean` | `false` | — | Chat/index, ChatInput, QuickIntelligencePanel |
| `mode` | `'single' \| 'consensus'` | `'single'` | — | Chat/index, ChatInput, useChatMutation |
| `selectedSingleModel` | `string` | `'openai/gpt-4o'` | 1 | useChatMutation (fallback) |
| `selectedExperts[]` | `string[]` | 3 modele | max 10 | useChatMutation (fallback) |
| `selectedJudge` | `string` | `'anthropic/claude-3.5-sonnet'` | 1 | useChatMutation (fallback) |
| `favoriteModels[]` | `string[]` | 3 modele | max 20 | QuickIntelligencePanel, AIModelsSection |
| `activeModels[]` | `string[]` | `['openai/gpt-4o']` | **brak** | QuickIntelligencePanel, useChatMutation |
| `currentTask` | `string` | `'General Legal Advice'` | — | QuickIntelligencePanel, useChatMutation |

Persist: `localStorage["lexmind-chat-settings"]` wersja 3.

### Store #2: `useOrchestratorStore` — "Orchestrator"

| Właściwość | Typ | Default | Limit | Używane przez |
|---|---|---|---|---|
| `mode` | `'single' \| 'moa'` | `'single'` | — | ModelOrchestrator |
| `singleModelId` | `string` | `'openai/gpt-4o'` | 1 | ModelOrchestrator |
| `moaExpertIds[]` | `string[]` | 3 modele | max 10 | ModelOrchestrator |
| `moaJudgeId` | `string` | `'anthropic/claude-3.5-sonnet'` | 1 | ModelOrchestrator |
| `activePresetId` | `string \| null` | `null` | — | ModelOrchestrator |
| `recentModelIds[]` | `string[]` | `[]` | max 10 | ModelOrchestrator |
| `searchQuery` | `string` | `''` | — | ModelOrchestrator (niepersistowany) |
| `filterTag` | `ModelTag \| 'all'` | `'all'` | — | ModelOrchestrator (niepersistowany) |
| `filterVendor` | `string` | `'all'` | — | ModelOrchestrator (niepersistowany) |

Persist: `localStorage["lexmind-orchestrator"]` wersja 1.

### Problem: Brak synchronizacji między store'ami

```
Store #1 (Chat)                    Store #2 (Orchestrator)
─────────────────                  ──────────────────────
selectedSingleModel  ←──────────→  singleModelId       BRAK SYNC
selectedExperts[]    ←──────────→  moaExpertIds[]       BRAK SYNC
selectedJudge        ←──────────→  moaJudgeId           BRAK SYNC
mode:'consensus'     ←──────────→  mode:'moa'           BRAK SYNC (inne wartości)
```

`OrchestratorStore` ma metodę `syncToLegacy()` (linia 106-113) ale **nigdzie nie jest wywoływana**. Store #1 nie ma dostępu do Store #2. Użytkownik zmieniający modele w Settings (ModelOrchestrator) nie zmienia modeli używanych w czacie.

---

## 3. Trzy niezależne systemy wyboru modeli

### System A: QuickIntelligencePanel (Chat → prawy panel)

- **Store:** `useChatSettingsStore` (Store #1)
- **Logika:** Ulubione modele → zaznacz aktywne → wybierz cel zadania
- **Backend:** `useChatMutation` → POST `/chat` lub `/chat-consensus`
- **Problem:** Pole `task` ignorowane przez backend

### System B: ModelOrchestrator (Settings → "Modele AI")

- **Store:** `useOrchestratorStore` (Store #2)
- **Logika:** Tryb single/moa → wybierz model/ekspertów/sędziego → presety MOA
- **Backend:** **Brak integracji** — `syncToLegacy()` nigdzie nie wywoływana
- **Problem:** Wybory zapisane tutaj nie wpływają na czat

### System C: Drafter (Chat → panel dolny / pełny widok)

- **Store:** `useSharedChat` (React Context) — odczytuje `availableModels`, `selectedModel`
- **Logika:** Własny selektor modeli (pierwsze 6 bez vision)
- **Backend:** Supabase Edge Function `draft-document` (nie FastAPI)
- **Problem:** Zupełnie inny kanał komunikacji niż System A

### Konflikt: Trzy niezależne źródła prawdy

```
┌─────────────────────┐     ┌──────────────────────┐     ┌───────────────────┐
│ QuickIntelligence   │     │ ModelOrchestrator    │     │ Drafter           │
│ Panel (Chat)        │     │ (Settings)           │     │ (Chat overlay)    │
│                     │     │                      │     │                   │
│ Store #1            │     │ Store #2             │     │ useSharedChat     │
│ activeModels[]      │     │ singleModelId        │     │ selectedModel     │
│ selectedExperts[]   │     │ moaExpertIds[]       │     │ availableModels   │
│ favoriteModels[]    │     │ moaJudgeId           │     │                   │
│ currentTask         │     │                      │     │                   │
└─────────┬───────────┘     └──────────┬───────────┘     └─────────┬─────────┘
          │                            │                           │
          ▼                            ▼                           ▼
    POST /chat                  BRAK INTEGRACJI           Supabase Edge Fn
    POST /chat-consensus        (syncToLegacy nie         draft-document
                                  wywoływana)
```

---

## 4. Backend — endpointy i ich zgodność z frontendem

### 4.1. `POST /chat` — `api.py:229`

```
Oczekuje:  ChatRequest { message, history, model, sessionId, attachments }
Frontend:  { message, history, sessionId, attachments, model, task }
                                                       ^^^^    ^^^^
                                                       OK    NIE OBSŁUGIWANE
```

`task` jest wysyłane ale Pydantic ignoruje extra fields (domyślnie `extra='ignore'`).

### 4.2. `POST /chat-consensus` — `api.py:297`

```
Oczekuje:  ChatRequest { message, history, model, sessionId, attachments,
                         selected_models, aggregator_model }
Frontend:  { message, history, sessionId, attachments, model,
             selected_models, aggregator_model, task }
                                                     ^^^^
                                                   NIE OBSŁUGIWANE
```

Backend tworzy `MOARequest` z `analyst_models` i `judge_model`. Pole `task` nie jest przekazywane dalej.

### 4.3. `MOARequest` — `moa/models.py:14-21`

```python
@dataclass
class MOARequest:
    query: str
    session_id: Optional[str] = None
    analyst_models: Optional[list[str]] = None
    judge_model: Optional[str] = None
    match_count: int = 12
    match_threshold: float = 0.3
    # BRAK: task
```

### 4.4. Supabase Edge Function `draft-document`

Wywoływany przez `Drafter/index.tsx:79-95`. Przesyła:
- `system_prompt` — z `DRAFTING_PROMPTS[selectedPrompt].prompt`
- `user_instructions` — tekst z pola instrukcji
- `structured_data` — `{ sender, recipient, placeDate }` (opcjonalne)
- `model` — z własnego selektora Draftera
- `history` — ostatnie 10 wiadomości z czatu

---

## 5. Startup — `run_prawnik_ui.bat`

```
1. Weryfikacja .venv (tworzy jeśli brak)
2. Zabija procesy na portach 8001 i 3000
3. Start backend: uvicorn api:app --host 0.0.0.0 --port 8001
4. Sprawdza node_modules (npm install jeśli brak)
5. Otwiera http://localhost:3000
6. Start frontend: npm run dev -- --port 3000 --strictPort --force
```

**Problem:** Nie uruchamia `api_consensus.py` na porcie 8002 — ale frontend i tak nie korzysta z portu 8002. Samodzielny `api_consensus.py` jest nieużywany.

---

## 6. Martwy kod

| Plik | Linie | Status | Powód |
|---|---|---|---|
| `ModelConfigurator.tsx` | 540 | **MARTWY** | Nie importowany nigdzie. QuickIntelligencePanel go zastąpił |
| `AIModelsSection.tsx` | 202 | **MARTWY** | Settings/index.tsx renderuje `ModelOrchestrator` zamiast niego |
| `TopIntelligenceSwitcher.tsx` | — | **NIE ISTNIEJE** | Importowany w otwartych tabach ale plik nie istnieje (404) |
| `DEFAULT_AGGREGATOR` | 1 linia | **MARTWY** | Export z constants.ts, nigdzie nie importowany |
| `useOrchestratorStore.syncToLegacy()` | 8 linii | **NIE WYWOŁYWANA** | Metoda istnieje ale nikt jej nie wywołuje |

---

## 7. Niespójności `currentTask`

| Źródło | Format | Wartości |
|---|---|---|
| Store #1 default | Pełna fraza angielska | `'General Legal Advice'` |
| QuickIntelligencePanel | ID polskie | `'general'`, `'analysis'`, `'drafting'`, `'research'`, `'strategy'` |
| Backend | — | Pole nieobsługiwane |

Po pierwszym ładowaniu strony (przed otwarciem panelu) store ma `'General Legal Advice'`. Po interakcji z panelem zmienia się na `'general'`. Gdyby backend obsługiwał `task`, otrzymałby nieprzewidywalny format.

---

## 8. Ścieżka danych — pełny przepływ wiadomości

```
Użytkownik pisze w ChatInput.tsx
         │
         ▼
Chat/index.tsx → handleSend()
  - konwertuje załączniki na base64
  - dodaje wiadomość użytkownika lokalnie
  - wywołuje chatMutation.mutate()
         │
         ▼
useChatMutation.ts
  - odczytuje: mode, selectedSingleModel, selectedExperts,
               selectedJudge, activeModels, currentTask
  - oblicza isConsensusMode = mode=='consensus' || activeModels.length > 1
  - buduje payload: { model, selected_models, aggregator_model, task }
  - POST /chat lub /chat-consensus
         │
         ▼
api.py (FastAPI :8001)
  /chat → single LLM call via OpenRouter
  /chat-consensus → MOA pipeline (moa/)
    - Retrieval: Supabase pgvector (16 polskich kodeksów)
    - Analysis: N analityków równolegle (OpenRouter)
    - Synthesis: Sędzia-agregator (krytyczna synteza)
         │
         ▼
Response → Chat/index.tsx onSuccess
  - dodaje wiadomość asystenta lokalnie
  - consensus_used: isConsensusMode (z Chat/index, nie z hooka)
  - expert_analyses: z response (tylko consensus)
```

---

## 9. Zestawienie nieprawidłowości

| # | Priorytet | Plik | Opis |
|---|---|---|---|
| 1 | KRYTYCZNA | `useChatSettingsStore` | Brak limitu `activeModels` — brak `.slice()` w `toggleActiveModel` |
| 2 | KRYTYCZNA | `useChatMutation` + `api.py` | `task` wysyłane ale ignorowane przez backend |
| 3 | KRYTYCZNA | `Chat/index` vs `useChatMutation` | Rozbieżność `isConsensusMode` — UI nie odzwierciedla rzeczywistego trybu |
| 4 | KRYTYCZNA | Store #1 vs Store #2 | Brak synchronizacji — dwa store'y z danymi modeli bez połączenia |
| 5 | WAŻNA | `useChatSettingsStore` | Niespójne defaulty `currentTask` (angielski vs ID-y) |
| 6 | WAŻNA | `Settings/index.tsx:36` | Brak importu `useChatSettingsStore` — błąd runtime |
| 7 | WAŻNA | `QuickIntelligencePanel` | Brak sync favorites localStorage ↔ Supabase |
| 8 | WAŻNA | `Chat/index` (loading UI) | Loading nie odzwierciedla auto-konsensusu |
| 9 | UMIARKOWANA | `ModelConfigurator.tsx` | 540 linii martwego kodu |
| 10 | UMIARKOWANA | `AIModelsSection.tsx` | 202 linii martwego kodu |
| 11 | UMIARKOWANA | `constants.ts:30` | `DEFAULT_AGGREGATOR` nie używana |
| 12 | UMIARKOWANA | `useOrchestratorStore` | `syncToLegacy()` nie wywoływana |
| 13 | UMIARKOWANA | `TopIntelligenceSwitcher.tsx` | Plik nie istnieje (404) |
| 14 | UMIARKOWANA | `Drafter/index.tsx:46` | Default model `'google/gemini-2.1-flash'` — może nie istnieć na OpenRouter |
| 15 | UMIARKOWANA | `api_consensus.py` | Samodzielny serwer na :8002 nieużywany przez frontend |
