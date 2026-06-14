# Analiza logiki wyboru modeli AI — Nieprawidłowości

**Data:** 2026-03-28  
**Zakres:** Frontend (Zustand store, panel QuickIntelligencePanel, ModelConfigurator, useChatMutation, Chat/index) + Backend (api.py, api_consensus.py, moa/models.py)

---

## 1. Architektura stanu (Zustand Store)

**Plik:** `frontend/src/store/useChatSettingsStore.ts`

Store zarządza dwoma równoległymi systemami wyboru modeli:

| Właściwość | Przeznaczenie | Limit | Źródło defaultu |
|---|---|---|---|
| `mode` | `'single' \| 'consensus'` | — | `'single'` |
| `selectedSingleModel` | Pojedynczy model | 1 | `'openai/gpt-4o'` |
| `selectedExperts[]` | Eksperci konsylium (stary) | max 10 (slice) | `['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-2.0-flash-001']` |
| `selectedJudge` | Sędzia konsylium (stary) | 1 | `'anthropic/claude-3.5-sonnet'` |
| `favoriteModels[]` | Ulubione modele (nowy) | max 20 (slice) | `['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash-001']` |
| `activeModels[]` | Aktywne w panelu (nowy) | **brak limitu** | `['openai/gpt-4o']` |
| `currentTask` | Cel konsultacji | — | `'General Legal Advice'` |

Persist: `localStorage` pod kluczem `'lexmind-chat-settings'`, wersja 3.

---

## 2. Przepływ renderowania

### 2.1. Prawy panel

**Plik:** `frontend/src/components/Chat/index.tsx:294-306`

```tsx
{isOpen && (
  <motion.div ...>
    <QuickIntelligencePanel />  // ← JEDYNY panel renderowany
  </motion.div>
)}
```

**`ModelConfigurator.tsx`** (540 linii, `SingleModeView` + `ConsensusModeView`) **NIE jest nigdzie renderowany** — martwy kod.

### 2.2. Przycisk toggle panelu

**Plik:** `frontend/src/components/Chat/index.tsx:165-180`

Przycisk po prawej stronie pokazuje ikonę `Network` (konsylium) lub `Cpu` (pojedynczy) na podstawie `mode === 'consensus'`. Kliknięcie przełącza `isOpen`.

### 2.3. ChatInput

**Plik:** `frontend/src/components/Chat/components/ChatInput.tsx:40-41`

```tsx
const { mode, toggleOpen, isOpen } = useChatSettingsStore();
const isConsensus = mode === 'consensus';
```

Używane do zmiany placeholdera i koloru przycisku. **Nie uwzględnia `activeModels.length > 1`.**

---

## 3. Logika decyzyjna w `useChatMutation`

**Plik:** `frontend/src/hooks/useChatMutation.ts:42-45`

```tsx
const isConsensusMode = mode === 'consensus' || activeModels.length > 1;
const experts = activeModels.length > 0 ? activeModels : selectedExperts;
const judge = activeModels.length > 0 ? activeModels[0] : selectedJudge;
```

### Payload wysyłany do backendu (linie 54-64):

```tsx
const endpoint = isConsensusMode ? '/chat-consensus' : '/chat';
const payload = {
  message, history, sessionId, attachments,
  model: isConsensusMode ? judge : (activeModels[0] || selectedSingleModel),
  selected_models: isConsensusMode ? experts : undefined,
  aggregator_model: isConsensusMode ? judge : undefined,
  task: currentTask,  // ← WYSYŁANE, ale backend ignoruje
};
```

---

## 4. Backend — endpointy

### 4.1. `/chat` — `api.py:229-294`

Oczekuje `ChatRequest`:

```python
class ChatRequest(BaseModel):
    message: str
    history: list[Any] = []
    model: str = "anthropic/claude-3.5-sonnet"
    sessionId: Optional[str] = None
    attachments: list[Attachment] = []
    use_full_history: bool = False
    selected_models: Optional[list[str]] = None
    aggregator_model: Optional[str] = None
```

**Brak pola `task`** — backend ignoruje `currentTask` wysyłany przez frontend.

### 4.2. `/chat-consensus` — `api.py:297-333`

Tworzy `MOARequest`:

```python
moa_req = MOARequest(
    query=request.message,
    session_id=sid,
    analyst_models=request.selected_models,
    judge_model=request.aggregator_model,
)
```

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
```

**Brak pola `task`** — pipeline MOA nie dostosowuje promptu do typu zadania.

---

## 5. Lista nieprawidłowości

### KRYTYCZNE

#### 5.1. Rozbieżność `isConsensusMode` między komponentami

| Komponent | Warunek consensus | Plik |
|---|---|---|
| `Chat/index.tsx:46` | `mode === 'consensus'` | Wizualny loading |
| `ChatInput.tsx:41` | `mode === 'consensus'` | Placeholder, kolor |
| `useChatMutation.ts:43` | `mode === 'consensus' \|\| activeModels.length > 1` | Rzeczywisty endpoint |

**Skutek:** Użytkownik z `mode='single'` ale 2+ aktywnymi modelami zobaczy loading "Analiza prawna w toku..." podczas gdy backend wykona konsylium MOA. UI nie informuje o zmianie trybu.

#### 5.2. Pole `task` jest ignorowane przez backend

Frontend (`useChatMutation.ts:63`) wysyła `task: currentTask` w każdym requestcie. Backend (`api.py:47-55`, `ChatRequest`) **nie ma tego pola** — Pydantic odrzuca je domyślnie (extra fields ignored). Pipeline MOA (`moa/models.py`) również nie posiada pola `task`.

**Skutek:** Wybór celu konsultacji (Ogólne Wsparcie, Analiza Dokumentacji, Pisanie Pism, Research, Strategia) w panelu nie ma żadnego wpływu na zachowanie backendu. Cała sekcja "Cel Konsultacji" w `QuickIntelligencePanel` jest dekoracyjna.

#### 5.3. Brak limitu `activeModels`

| Pole | Limit | Mechanizm |
|---|---|---|
| `selectedExperts` | max 10 | `.slice(0, 10)` w `toggleExpert` |
| `favoriteModels` | max 20 | `.slice(0, 20)` w `toggleFavorite` |
| `activeModels` | **brak** | Brak `slice` w `toggleActiveModel` |

**Skutek:** Użytkownik może zaznaczyć 300+ modeli jako aktywne. Każdy request do `/chat-consensus` wyśle wszystkie do backendu, powodując gigantyczne koszty i timeouty.

### WAŻNE

#### 5.4. Niespójność wartości `currentTask`

| Źródło | Wartości |
|---|---|
| Store default | `'General Legal Advice'` (angielski, pełna fraza) |
| `QuickIntelligencePanel` | `'general'`, `'analysis'`, `'drafting'`, `'research'`, `'strategy'` (ID-y) |

**Skutek:** Po pierwszym ładowaniu (przed interakcją z panelem) store ma wartość `'General Legal Advice'`. Po kliknięciu w panel zmienia się na `'general'`. Gdyby backend obsługiwał `task`, otrzymałby nieprzewidywalny format.

#### 5.5. Brak synchronizacji `favoriteModels` między localStorage a Supabase

- `AIModelsSection` (`Settings`) zapisuje `favoriteModels` do profilu Supabase: `onUpdateProfile({ favorite_models: favoriteModels })`
- Store (`useChatSettingsStore`) persistuje tylko do `localStorage`
- **Brak mechanizmu ładowania** `favorite_models` z profilu przy starcie aplikacji

**Skutek:** Po zmianie urządzenia/przeglądarki użytkownik straci listę ulubionych modeli mimo zapisu do profilu.

#### 5.6. Niespójny loading UI

**Plik:** `frontend/src/components/Chat/index.tsx:216-250`

```tsx
{isConsensusMode ? (
  // "Konsylium MOA — Analiza w toku..." + fazy
) : (
  // "Analiza prawna w toku..." + proste paski
)}
```

`isConsensusMode` w tym miejscu to `mode === 'consensus'` (linia 46). Nie uwzględnia auto-konsensusu z `useChatMutation`.

#### 5.7. `DEFAULT_AGGREGATOR` — nieużywana stała

**Plik:** `frontend/src/components/Chat/constants.ts:30`

```tsx
export const DEFAULT_AGGREGATOR = "google/gemini-2.5-flash";
```

Nigdzie nieimportowana. `useChatMutation` ustawia sędziego jako `activeModels[0]` lub `selectedJudge`, nie korzystając z tej stałej.

### UMIARKOWANE

#### 5.8. Martwy kod — `ModelConfigurator.tsx`

540 linii kodu z `SingleModeView` i `ConsensusModeView`. Komponent eksportowany, ale nigdzie nie importowany ani renderowany. `QuickIntelligencePanel` całkowicie go zastąpił.

#### 5.9. Duplikacja `ChatRequest` w dwóch plikach

| Plik | Pola różniące się |
|---|---|
| `api.py:47` | `selected_models: Optional[list[str]] = None` |
| `api_consensus.py:84` | `selected_models: Optional[list[str]] = []` (default pusta lista) |

Niespójne domyślne wartości. `api.py` ma też `aggregator_model`, którego `api_consensus.py` nie posiada.

#### 5.10. `api_consensus.py` — hardcoded aggregator

**Plik:** `api_consensus.py:201`

```python
aggregator_model = "openai/gpt-4o-mini"
```

Wartość `aggregator_model` z requestu jest ignorowana. Niezależnie od tego co frontend wyśle, sędzią zawsze będzie `gpt-4o-mini`.

#### 5.11. Konflikty portów

| Serwer | Port | Używany przez frontend? |
|---|---|---|
| `api.py` | 8001 | Tak (`useConfig.ts`, `useChatMutation.ts`) |
| `api_consensus.py` | 8002 | Nie — testy |

Frontend komunikuje się wyłącznie z portem 8001. `/chat-consensus` na 8001 deleguje do MOA pipeline z `moa/`. Samodzielny `api_consensus.py` na 8002 jest nieużywany przez frontend.

#### 5.12. Czyszczenie `activeModels` vs `selectedExperts`

W `QuickIntelligencePanel` przycisk "Odznacz Wszystkie" czyści `activeModels`. W `ModelConfigurator` przycisk "Wyczyść" czyści `selectedExperts`. Te dwa systemy nie są zsynchronizowane — wyczyszczenie jednego nie wpływa na drugie.

---

## 6. Schemat przepływu danych

```
┌─────────────────────────────────────────────────────────────┐
│  SETTINGS (AIModelsSection)                                 │
│  → toggleFavorite() → store.favoriteModels[]                │
│  → onSave → Supabase profile.favorite_models                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STORE (useChatSettingsStore) — localStorage                │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ Stary system      │  │ Nowy system (QuickIntelligence)  │ │
│  │ mode: single/     │  │ favoriteModels[]  (max 20)      │ │
│  │   consensus       │  │ activeModels[]    (bez limitu!)  │ │
│  │ selectedSingle    │  │ currentTask       (ID-y)        │ │
│  │ selectedExperts[] │  │                                  │ │
│  │ selectedJudge     │  │                                  │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  useChatMutation.ts                                         │
│  isConsensus = mode=='consensus' || activeModels.length > 1 │
│  experts = activeModels || selectedExperts                  │
│  judge = activeModels[0] || selectedJudge                   │
│  → POST /chat-consensus  lub  POST /chat                    │
│     { model, selected_models, aggregator_model, task }      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (api.py :8001)                                     │
│  ChatRequest — pole `task` ignorowane (brak w modelu)       │
│  /chat → single LLM call                                    │
│  /chat-consensus → MOA pipeline (moa/)                      │
│    MOARequest — pole `task` nie istnieje                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Rekomendacje napraw

| # | Priorytet | Nieprawidłowość | Zalecana naprawa |
|---|---|---|---|
| 1 | KRYTYCZNA | Brak limitu `activeModels` | Dodać `.slice(0, 10)` w `toggleActiveModel` |
| 2 | KRYTYCZNA | `task` ignorowany przez backend | Dodać pole `task` do `ChatRequest` + `MOARequest`, wykorzystać w promptach |
| 3 | KRYTYCZNA | Rozbieżność `isConsensusMode` | Ujednolicić: `Chat/index.tsx` i `ChatInput` powinny czytać z hooka, nie z store'a bezpośrednio |
| 4 | WAŻNA | Niespójne `currentTask` defaulty | Zmienić store default na `'general'` |
| 5 | WAŻNA | Brak sync favorites z Supabase | Dodać useEffect ładowujący `profile.favorite_models` do store przy starcie |
| 6 | WAŻNA | Niespójny loading UI | Przenieść logikę `isConsensusMode` do store lub hooka |
| 7 | UMIARKOWANA | Martwy `ModelConfigurator.tsx` | Usunąć plik |
| 8 | UMIARKOWANA | `DEFAULT_AGGREGATOR` nieużywany | Usunąć lub użyć jako fallback w `useChatMutation` |
| 9 | UMIARKOWANA | Duplikacja `ChatRequest` | Ujednolicić do jednego modelu |
| 10 | UMIARKOWANA | Hardcoded aggregator w `api_consensus.py` | Usunąć plik (frontend używa `api.py:8001`) |
