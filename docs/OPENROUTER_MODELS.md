# Dokumentacja: Logika i Frontend wyboru i działania modeli OpenRouter

## Spis treści

1. [Architektura ogólna](#1-architektura-ogólna)
2. [Konfiguracja backendu](#2-konfiguracja-backendu)
3. [Endpointy API](#3-endpointy-api)
4. [Pipeline MOA (Mixture of Agents)](#4-pipeline-moa)
5. [Frontend — stan i hooki](#5-frontend--stan-i-hooki)
6. [Frontend — komponenty UI](#6-frontend--komponenty-ui)
7. [Przepływ danych end-to-end](#7-przepływ-danych-end-to-end)
8. [Typy TypeScript](#8-typy-typescript)
9. [Retry i odporność](#9-retry-i-odporność)

---

## 1. Architektura ogólna

```mermaid
graph TD
    subgraph Frontend [FRONTEND - React]
        UI[UI Components]
        Store[Zustand Store]
        Query[TanStack Query]
    end

    subgraph Backend [BACKEND - FastAPI]
        Chat[/chat]
        Consensus[/chat-consensus]
        Draft[/draft-document]
    end

    UI --> Store
    UI --> Query
    Query -- POST --> Chat
    Query -- POST --> Consensus
    Store -- State --> UI
end
```

System działa w dwóch trybach:

- **Pojedynczy model** — jeden model odpowiada na pytanie
- **Konsensus (MOA)** — wiele modeli analizuje równolegle, sędzia syntetyzuje odpowiedź

---

## 2. Konfiguracja backendu

Plik: `moa/config.py`

| Stała | Wartość | Opis |
| :--- | :--- | :--- |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | Bazowy URL API OpenRouter |
| `OPENROUTER_EMBEDDINGS_URL` | `{BASE_URL}/embeddings` | Endpoint embeddings |
| `EMBEDDING_MODEL` | `openai/text-embedding-3-small` | Model do wektorowania |
| `LLM_TEMPERATURE` | `0.1` | Niska temperatura = mniej halucynacji |
| `LLM_TIMEOUT` | `120` s | Timeout na odpowiedź modelu |
| `MAX_RETRIES` | `3` | Maksymalna liczba prób |
| `DEFAULT_MATCH_COUNT` | `12` | Liczba fragmentów kontekstu |
| `MAX_CONTEXT_CHARS` | `48 000` | Limit znaków kontekstu (~12k tokenów) |

### Domyślne modele MOA (`moa/config.py:51-57`)

```python
DEFAULT_ANALYST_MODELS = [
    "anthropic/claude-3.5-sonnet",    # Najlepsza precyzja prawnicza
    "openai/gpt-4o",                  # Silna strukturyzacja
    "google/gemini-2.0-flash",        # Szybki, duży kontekst
]
DEFAULT_JUDGE_MODEL = "anthropic/claude-3.5-sonnet"
```

### Nagłówki autoryzacji

```python
OPENROUTER_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "HTTP-Referer": "http://127.0.0.1:8001",
    "X-Title": "LexMind AI",
    "Content-Type": "application/json",
}
```

Klucz API ładowany z `.env` → `OPENROUTER_API_KEY`.

---

## 3. Endpointy API

Plik: `api.py` (FastAPI, port 8001)

### `GET /models/all`

Zwraca **wszystkie** modele z OpenRouter z obliczonym polem `vision`.

**Logika detekcji vision** (`api.py:141-149`):

```python
vision_keywords = [
    'gpt-4o', 'gpt-4-turbo', 'gpt-4-vision',
    'claude-3', 'claude-3.5', 'claude-3.7',
    'gemini-1.5', 'gemini-2.0', 'gemini-2.5',
    'llava', 'vision', 'pixtral', 'qwen-vl', ...
]
has_vision = any(pattern in model_id.lower() for pattern in vision_keywords)
```

**Response shape:**

```json
[
  { "id": "google/gemini-2.0-flash", "name": "Gemini 2.0 Flash", "vision": true },
  { "id": "mistral/mistral-7b", "name": "Mistral 7B", "vision": false }
]
```

Fallback awaryjny: 4 modele hardcodowane gdy OpenRouter jest niedostępny.

### `GET /models/admin`

Jak `/models/all` + dodatkowe pola: `vision`, `free` (`:free` w id), `provider` (prefiks id), `enabled`.

### `GET /models/debug`

Statystyki: `total_models`, `vision_models`, `text_models`, przykłady.

### `POST /models/admin/toggle`

Stub do przełączania widoczności modeli (do implementacji z DB).

### `POST /chat` — tryb pojedynczy

```python
class ChatRequest(BaseModel):
    message: str
    model: str = "google/gemini-2.5-flash"
    history: list[Any] = []
    sessionId: Optional[str] = None
    attachments: list[Attachment] = []
    selected_models: Optional[list[str]] = None
    aggregator_model: Optional[str] = None
```

- Lazy-load agenta LangChain `ChatOpenAI` z `base_url="https://openrouter.ai/api/v1"`
- Pre-warming 3 modeli vision przy starcie (`api.py:71-78`)
- Fallback na inne pre-warmowane agenty przy błędzie
- Wsparcie załączników (obrazy → base64 → vision API)

### `POST /chat-consensus` — tryb konsensusu

Przekazuje `selected_models` jako `analyst_models` i `aggregator_model` jako `judge_model` do pipeline'u MOA.

---

## 4. Pipeline MOA

Plik: `moa/pipeline.py`

Trzyfazowy przepływ:

```text
FAZA 1: RETRIEVAL
  Zapytanie → embedding (OpenRouter) → Supabase pgvector → fragmenty kontekstu
  ↓
FAZA 2: ANALYSIS (równoległa)
  N modeli × asyncio.gather → N odpowiedzi analityków
  ↓
FAZA 3: SYNTHESIS
  Sędzia-agregator → krytyczna weryfikacja → finalna odpowiedź
```

### Typy danych (`moa/models.py`)

```python
@dataclass
class MOARequest:
    query: str
    session_id: Optional[str] = None
    analyst_models: Optional[list[str]] = None  # None → domyślne
    judge_model: Optional[str] = None           # None → domyślny
    match_count: int = 12
    match_threshold: float = 0.3

@dataclass
class AnalystResult:
    model_id: str
    response: str
    success: bool = True
    error: Optional[str] = None
    retries_used: int = 0
    latency_ms: float = 0.0

@dataclass
class MOAResult:
    final_answer: str
    judge_model: str
    analyst_results: list[AnalystResult]
    sources: list[str]
    total_context_chars: int
    retrieved_chunks_count: int
    pipeline_latency_ms: float
    success: bool = True
```

### Klient LLM (`moa/llm_agents.py:38`)

```python
_client = AsyncOpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
    timeout=120,
    default_headers={"HTTP-Referer": "...", "X-Title": "LexMind AI"},
)
```

### Retry (`moa/llm_agents.py:100`)

Exponential backoff z jitter dla statusów `{429, 500, 502, 503, 504}`, max 3 próby.

---

## 5. Frontend — stan i hooki

Plik: `frontend/src/store/uiStore.ts`

### Hook `useUIStore()`

**Kluczowy stan:**

| Stan | Typ | Domyślnie | Opis |
| :--- | :--- | :--- | :--- |
| `availableModels` | `Model[]` | 3 modele hardcodowane | Lista modeli z API |
| `selectedModel` | `string` | `"openai/gpt-4o"` | Aktywny model (tryb pojedynczy) |
| `selectedModels` | `string[]` | `[]` | Wybrane modele (tryb konsensusu) |
| `aggregatorModel` | `string` | `"google/gemini-2.0-flash"` | Model sędziego |

### `fetchModels()`

```text
GET http://localhost:8001/models/all
  → mapowanie na Model[] z { id, name, provider:"openrouter", vision }
  → setAvailableModels()
```

### Inicjalizacja

```typescript
useEffect(() => {
  fetchModels();
}, [fetchModels]);
```

---

## 6. Frontend — komponenty UI

### ModelSidebar — tryb pojedynczy

Plik: `frontend/src/components/Chat/components/ModelSidebar.tsx`

**Props:**

```typescript
interface ModelSidebarProps {
  showModels: boolean;
  setShowModels: (val: boolean) => void;
  availableModels: Model[];
  selectedModel: string;
  setSelectedModel: (val: string) => void;
  filterVendor: string;
  setFilterVendor: (val: string) => void;
  filterVision: boolean;
  setFilterVision: (val: boolean) => void;
}
```

**Funkcjonalności:**

- **Wyszukiwarka** — filtruje po nazwie i id modelu (300+ modeli)
- **Filtr vendorów** — badge buttons (GOOGLE, ANTHROPIC, OPENAI, META, MISTRAL, DEEPSEEK)
- **Filtr vision** — toggle pokazujący tylko modele z vision
- **Grupowanie** — modele grupowane po vendorze z expand/collapse

**Logika grupowania i filtrowania:**

```typescript
const groupedAndFilteredModels = useMemo(() => {
  const filtered = availableModels.filter((m) => {
    if (filterVision && !m.vision) return false;
    if (filterVendor !== "all") { /* vendor match */ }
    if (query) { /* name/id search */ }
    return true;
  });
  return filtered.reduce((acc, m) => {
    const vendor = extractVendor(m);
    if (!acc[vendor]) acc[vendor] = [];
    acc[vendor].push(m);
    return acc;
  }, {});
}, [availableModels, filterVision, filterVendor, searchQuery]);
```

### MultiModelPanel — tryb konsensusu

Plik: `frontend/src/components/Chat/components/MultiModelPanel.tsx`

**Props:**

```typescript
interface MultiModelPanelProps {
  showMultiModel: boolean;
  availableModels: Model[];
  selectedModels: string[];
  toggleModelSelection: (id: string) => void;
  aggregatorModel: string;
  setAggregatorModel: (val: string) => void;
  setShowMultiModel?: (val: boolean) => void;
}
```

**Presety szybkiego wyboru:**

| Preset | Modele | Sędzia | Cel |
| :--- | :--- | :--- | :--- |
| **Precyzja** | claude-3.5-sonnet, gpt-4o, gemini-2.0-flash | claude-3.5-sonnet | Maksymalna dokładność |
| **Ekonomiczny** | gpt-4o-mini, gemini-2.0-flash, claude-3-haiku | gpt-4o-mini | Niski koszt |
| **Maksymalny** | 5 modeli (claude + gpt + gemini + llama + deepseek) | claude-3.5-sonnet | Pełna analiza |

**Ograniczenia:**

- Maks. **10** modeli ekspertów
- Dropdown sędziego z dostępnych modeli

**Wizualizacja przepływu:** Experts → Synthesis → Verdict (podgląd w panelu)

### ChatView — routing

Plik: `frontend/src/components/Chat/index.tsx`

```typescript
const handleSend = () => {
  if (showMultiModel) {
    handleMultiModelSend();  // → POST /chat-consensus
  } else {
    sendMessage(input, attachments);  // → POST /chat
  }
};
```

### DrafterView

Plik: `frontend/src/components/Drafter/index.tsx`

- Używa `availableModels` z kontekstu
- Grid 6 pierwszych modeli non-vision
- Przekazuje wybrany model do backendu `draft-document`

---

## 7. Przepływ danych end-to-end

### Tryb pojedynczy

```text
1. Komponent montuje się → fetchModels()
2. GET /models/all → OpenRouter API → cache MODELS[]
3. Frontend mapuje na Model[] → setAvailableModels()
4. Użytkownik wybiera model w ModelSidebar → setSelectedModel(id)
5. POST /chat { message, model, attachments }
6. Backend: Call LLM (selected)
7. Odpowiedź → MessageBubble w UI
```

### Tryb konsensusu

```text
1. Użytkownik włącza MultiModelPanel
2. Wybiera preset lub ręcznie zaznacza modele (max 10)
3. Wybiera sędziego z dropdown
4. handleMultiModelSend() → POST /chat-consensus
5. Backend: MOARequest(selected_models, aggregator_model)
6. FAZA 1: Embedding → Supabase pgvector → kontekst
7. FAZA 2: N modeli × asyncio.gather → AnalystResult[]
8. FAZA 3: Sędzia → synthesize_judgment() → final_answer
9. MOAResult → JSON response → UI display
```

---

## 8. Typy TypeScript

Plik: `frontend/src/components/Chat/types.ts`

```typescript
interface Model {
  id: string;           // "google/gemini-2.0-flash"
  name: string;         // Nazwa wyświetlana
  active: boolean;
  provider: string;     // "openrouter"
  model_id?: string;
  vision?: boolean;     // Czy obsługuje obrazy
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  attachments?: Attachment[];
  consensus_used?: boolean;
  expert_analyses?: ExpertAnalysis[];
}
```

---

## 9. Retry i odporność

### Backend (Python)

`moa/llm_agents.py` — exponential backoff:

- Statusy: `{429, 500, 502, 503, 504}`
- Max retries: 3
- Delay: `base * 2^attempt + random_jitter`

### Frontend

- `fetchModels()` — catch + console.error
- `handleSend()` — catch → obsługa błędu w UI

---

## Supabase Edge Functions

Pozostałe funkcje krawędziowe (draftowanie):

### `draft-document`

- Embeddings + chat completions (ten sam schemat)
- Przyjmuje `model` z frontendu
- Używany przez komponent Drafter

---

## Suplement: kluczowe pliki

| Plik | Rola |
| :--- | :--- |
| `.env` | `OPENROUTER_API_KEY` |
| `moa/config.py` | Stałe konfiguracyjne, domyślne modele |
| `moa/models.py` | Dataclassy: MOARequest, MOAResult, AnalystResult |
| `moa/pipeline.py` | Orkiestrator: retrieval → analysis → synthesis |
| `moa/llm_agents.py` | Klient AsyncOpenAI → OpenRouter, retry |
| `moa/synthesizer.py` | Prompt i logika sędziego |
| `moa/retrieval.py` | Generowanie embeddingów + zapytanie do pgvector |
| `api.py` | FastAPI: endpointy models, chat, chat-consensus |
| `frontend/src/store/uiStore.ts` | Globalny stan interfejsu (Zustand) |
| `frontend/src/hooks/useChatMutation.ts` | TanStack Query mutation dla czatu |
| `frontend/src/components/Chat/types.ts` | Interfejsy TypeScript |
| `frontend/src/components/Chat/index.tsx` | ChatView — routing single/multi |
| `frontend/src/components/Chat/components/ChatInput.tsx` | Ujednolicony input z przełącznikiem MOA |
