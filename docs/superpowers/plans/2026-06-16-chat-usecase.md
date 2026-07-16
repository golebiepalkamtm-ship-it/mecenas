# Chat Use-Case (SSE Stream) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wydzielić cienką warstwę `application/chat/*` tak, żeby `routes/chat_v2.py` wołał use-case zamiast bezpośrednio `services/orchestrator_v2/service.py`, bez zmiany kontraktu SSE.

**Architecture:** `routes/chat_v2.py` mapuje request → parametry i wywołuje `ChatStreamUseCase.execute(...)`. Use-case deleguje do `orchestrator_v2_service.process_user_request_stream_v2(...)` i zwraca stream eventów 1:1.

**Tech Stack:** FastAPI, SSE, Python async generators, pytest

---

## Files (docelowe zmiany)

**Create**
- `e:/moj prawnik/application/__init__.py`
- `e:/moj prawnik/application/chat/__init__.py`
- `e:/moj prawnik/application/chat/types.py`
- `e:/moj prawnik/application/chat/use_case.py`

**Modify**
- `e:/moj prawnik/routes/chat_v2.py`
- `e:/moj prawnik/tests/test_etap1_api_guards.py`

---

### Task 1: Dodać szkielety `application/chat/*` (bez zmian w runtime)

**Files:**
- Create: `e:/moj prawnik/application/__init__.py`
- Create: `e:/moj prawnik/application/chat/__init__.py`
- Create: `e:/moj prawnik/application/chat/types.py`

- [ ] **Step 1: Dodać puste pakiety `application`**

Create `e:/moj prawnik/application/__init__.py`:

```python
from __future__ import annotations
```

Create `e:/moj prawnik/application/chat/__init__.py`:

```python
from __future__ import annotations
```

- [ ] **Step 2: Dodać typ wejścia use-case**

Create `e:/moj prawnik/application/chat/types.py`:

```python
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class ChatStreamInput:
    user_query: str
    attachments: Any = None
    selected_model: Optional[str] = None
    selected_models: Any = None
    aggregator_model: Optional[str] = None
    use_saos: bool = True
    use_eli: bool = True
    use_rag_legal: bool = True
    use_rag_user: Optional[bool] = None
    act_terms: Any = None
    architect_prompt: Optional[str] = None
    system_role_prompt: Optional[str] = None
    expert_roles: Any = None
    expert_role_prompts: Any = None
    role_catalog: Any = None
    current_task: Optional[str] = None
    task_prompt: Optional[str] = None
    chat_mode: Optional[str] = None
    response_mode: Optional[str] = None
    process_side: Optional[str] = None
    judge_system_prompt: Optional[str] = None
    model_latencies: Any = None
    document_text: Optional[str] = None
    chat_history: Any = None
    session_id: str = ""
```

- [ ] **Step 3: Zweryfikować, że import działa**

Run:

```powershell
$env:PYTHONDONTWRITEBYTECODE='1'; python -m py_compile "e:\moj prawnik\application\chat\types.py"
```

Expected: exit code 0

- [ ] **Step 4: (Opcjonalnie) Commit**

Jeśli użytkownik poprosi o commit:

```bash
git add application/__init__.py application/chat/__init__.py application/chat/types.py
git commit -m "refactor(chat): add application chat types"
```

---

### Task 2: Dodać `ChatStreamUseCase` delegujący do `orchestrator_v2_service`

**Files:**
- Create: `e:/moj prawnik/application/chat/use_case.py`

- [ ] **Step 1: Napisać minimalny use-case**

Create `e:/moj prawnik/application/chat/use_case.py`:

```python
from __future__ import annotations

from typing import Any, AsyncGenerator, Dict

from application.chat.types import ChatStreamInput
from services.orchestrator_v2.service import orchestrator_v2_service


class ChatStreamUseCase:
    async def execute(self, params: ChatStreamInput) -> AsyncGenerator[Dict[str, Any], None]:
        async for chunk in orchestrator_v2_service.process_user_request_stream_v2(
            user_query=params.user_query,
            attachments=params.attachments,
            selected_model=params.selected_model,
            selected_models=params.selected_models,
            aggregator_model=params.aggregator_model,
            use_saos=params.use_saos,
            use_eli=params.use_eli,
            use_rag_legal=params.use_rag_legal,
            use_rag_user=params.use_rag_user,
            act_terms=params.act_terms,
            architect_prompt=params.architect_prompt,
            system_role_prompt=params.system_role_prompt,
            expert_roles=params.expert_roles,
            expert_role_prompts=params.expert_role_prompts,
            role_catalog=params.role_catalog,
            current_task=params.current_task,
            task_prompt=params.task_prompt,
            chat_mode=params.chat_mode,
            response_mode=params.response_mode,
            process_side=params.process_side,
            judge_system_prompt=params.judge_system_prompt,
            model_latencies=params.model_latencies,
            document_text=params.document_text,
            chat_history=params.chat_history,
            session_id=params.session_id,
        ):
            yield chunk


chat_stream_use_case = ChatStreamUseCase()
```

- [ ] **Step 2: Zweryfikować py_compile**

Run:

```powershell
$env:PYTHONDONTWRITEBYTECODE='1'; python -m py_compile "e:\moj prawnik\application\chat\use_case.py"
```

Expected: exit code 0

- [ ] **Step 3: (Opcjonalnie) Commit**

Jeśli użytkownik poprosi o commit:

```bash
git add application/chat/use_case.py
git commit -m "refactor(chat): add ChatStreamUseCase"
```

---

### Task 3: Przepiąć `routes/chat_v2.py` na use-case

**Files:**
- Modify: `e:/moj prawnik/routes/chat_v2.py`

- [ ] **Step 1: Zmienić import route**

W `e:/moj prawnik/routes/chat_v2.py` zamienić:

```python
from services.orchestrator_v2.service import orchestrator_v2_service
```

na:

```python
from application.chat.types import ChatStreamInput
from application.chat.use_case import chat_stream_use_case
```

- [ ] **Step 2: Zbudować `ChatStreamInput` i użyć `chat_stream_use_case.execute(...)`**

W `event_generator()` zamienić pętlę:

```python
async for chunk in orchestrator_v2_service.process_user_request_stream_v2(
    ...
):
    ...
```

na:

```python
params = ChatStreamInput(
    user_query=effective_message,
    attachments=resolved.attachments,
    selected_model=resolved.selected_model,
    selected_models=resolved.selected_models,
    aggregator_model=resolved.aggregator_model,
    use_saos=resolved.use_saos,
    use_eli=resolved.use_eli,
    use_rag_legal=resolved.use_rag_legal,
    use_rag_user=resolved.use_rag_user,
    act_terms=resolved.act_terms,
    architect_prompt=resolved.architect_prompt,
    system_role_prompt=resolved.system_role_prompt,
    expert_roles=resolved.expert_roles,
    expert_role_prompts=resolved.expert_role_prompts,
    role_catalog=resolved.role_catalog,
    current_task=resolved.current_task,
    task_prompt=resolved.task_prompt,
    chat_mode=resolved.chat_mode,
    response_mode=resolved.response_mode,
    process_side=resolved.side,
    judge_system_prompt=resolved.judge_system_prompt,
    model_latencies=resolved.model_latencies,
    document_text=resolved.document_text,
    chat_history=resolved.chat_history,
    session_id=session_id,
)

async for chunk in chat_stream_use_case.execute(params):
    ...
```

- [ ] **Step 3: Zweryfikować, że route nie importuje już `orchestrator_v2_service`**

Run:

```powershell
python - << 'PY'
import routes.chat_v2 as m
src = open(m.__file__, 'r', encoding='utf-8').read()
assert 'orchestrator_v2_service' not in src
print('OK')
PY
```

Expected: prints `OK`

- [ ] **Step 4: Zweryfikować py_compile**

Run:

```powershell
$env:PYTHONDONTWRITEBYTECODE='1'; python -m py_compile "e:\moj prawnik\routes\chat_v2.py"
```

Expected: exit code 0

- [ ] **Step 5: (Opcjonalnie) Commit**

Jeśli użytkownik poprosi o commit:

```bash
git add routes/chat_v2.py
git commit -m "refactor(chat): route uses application use-case"
```

---

### Task 4: Przepiąć test SSE na mockowanie use-case

**Files:**
- Modify: `e:/moj prawnik/tests/test_etap1_api_guards.py`

- [ ] **Step 1: Zmienić monkeypatch target**

W `test_chat_endpoint_streams_sse_events` zamienić:

```python
monkeypatch.setattr(
    "routes.chat_v2.orchestrator_v2_service.process_user_request_stream_v2",
    fake_stream,
)
```

na:

```python
monkeypatch.setattr(
    "routes.chat_v2.chat_stream_use_case.execute",
    lambda params: fake_stream(**{"user_query": params.user_query, "session_id": params.session_id}),
)
```

Następnie zmienić `fake_stream` na przyjmujące `user_query` i `session_id` z przekazanego słownika, np.:

```python
async def fake_stream(**kwargs):
    assert kwargs["user_query"] == "Pytanie testowe"
    assert kwargs["session_id"] == "sess-123"
    ...
```

- [ ] **Step 2: Uruchomić pojedynczy test**

Run:

```powershell
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'; python -m pytest -q "e:\moj prawnik\tests\test_etap1_api_guards.py::test_chat_endpoint_streams_sse_events"
```

Expected: PASS

- [ ] **Step 3: Uruchomić pełny pytest**

Run:

```powershell
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'; python -m pytest -q
```

Expected: PASS

- [ ] **Step 4: (Opcjonalnie) Commit**

Jeśli użytkownik poprosi o commit:

```bash
git add tests/test_etap1_api_guards.py
git commit -m "test(chat): patch ChatStreamUseCase seam"
```

---

### Task 5: Aktualizacja planu refaktoru (Etap 4)

**Files:**
- Modify: `e:/moj prawnik/docs/REFACTOR_PLAN.md`

- [ ] **Step 1: Dopisać notatkę postępu**

Dodać punkt w “Notatka postępu” o wprowadzeniu `application/chat` i przepięciu route/testów.

- [ ] **Step 2: (Opcjonalnie) Commit**

Jeśli użytkownik poprosi o commit:

```bash
git add docs/REFACTOR_PLAN.md
git commit -m "docs: note application chat use-case progress"
```

---

## Self-review planu

- [ ] Każdy element specu ma odpowiadający task (use-case, przepięcie route, przepięcie testu).
- [ ] Brak “TODO/TBD” i brak niedookreślonych kroków.
- [ ] Wszystkie ścieżki plików są jawne i zgodne z repo.
