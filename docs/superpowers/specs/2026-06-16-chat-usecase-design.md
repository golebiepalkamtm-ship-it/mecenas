# Design: Etap 4 — Use-case dla czatu (stream SSE)

Data: 2026-06-16  
Temat: wydzielenie warstwy `application` dla głównej ścieżki czatu bez zmiany API

## Cel

- Zmniejszyć coupling `routes/*` do szczegółów pipeline.
- Ustalić jedno, testowalne wejście do strumienia czatu w warstwie use-case.
- Przygotować repo pod Etap 4 (podział HTTP vs application vs services/infra) bez “big bang”.

## Zakres

W zakresie:
- dodanie `application/chat/*` jako cienkiej warstwy nad istniejącym pipeline V2,
- przepięcie `routes/chat_v2.py` na use-case,
- korekta testów, żeby mockować use-case zamiast patchować głębokie symbole w `services/*`.

Poza zakresem:
- zmiana kontraktu request/response,
- zmiana zachowania pipeline (logika LLM, retrieval, debate, synthesis),
- przenoszenie całego `services/orchestrator_v2/*` do `application` w tej iteracji.

## Kontekst architektury (stan “as-is”)

- `routes/chat_v2.py` obsługuje HTTP/SSE i uruchamia V2 stream przez `services/orchestrator_v2/service.py`.
- `services/orchestrator.py` jest redukowany do adaptera zgodności (legacy), a docelowy silnik to `services/orchestrator_v2/*`.

## Podejścia

### A. Cienki use-case nad V2 (rekomendowane)

Tworzymy `ChatStreamUseCase`, który:
- przyjmuje jawne parametry wejściowe (typowany “input params”),
- uruchamia istniejące `orchestrator_v2_service.process_user_request_stream_v2(...)`,
- zwraca `AsyncGenerator[dict, None]` (bez zmian kontraktu eventów na tym etapie).

Zalety:
- mały zakres zmian, niski risk,
- mocne obniżenie coupling w `routes`,
- prosty test seam (mock use-case).

Wady:
- jeszcze nie przenosi logiki do `application`, tylko wprowadza granicę.

### B. Pełna migracja czatu do `application/` od razu

Zalety: “docelowo” szybciej.  
Wady: duże ryzyko, dużo zmian naraz.

### C. Bez `application`, tylko kolejne facady w `services/`

Zalety: minimalne zmiany.  
Wady: brak realnej granicy warstw, dług techniczny zostaje.

## Docelowa struktura (to-be)

Nowe pliki:
- `application/__init__.py`
- `application/chat/__init__.py`
- `application/chat/types.py`
- `application/chat/use_case.py`

### `application/chat/types.py`

- `ChatStreamInput` (np. dataclass/TypedDict) zbierający parametry, które dziś przechodzą przez route.
- Dopuszczalne: w pierwszym kroku przechowywać pola jako `Any` tam, gdzie kontrakt jeszcze nie jest ustabilizowany, ale utrzymać jawne nazwy.

### `application/chat/use_case.py`

- `ChatStreamUseCase.execute(input: ChatStreamInput) -> AsyncGenerator[dict, None]`
- Wewnątrz: delegacja do `orchestrator_v2_service.process_user_request_stream_v2(...)`.

## Zmiany w `routes/chat_v2.py`

- Route staje się adapterem:
  - waliduje i mapuje request → `ChatStreamInput`,
  - uruchamia `ChatStreamUseCase.execute(...)`,
  - streamuje eventy 1:1 do odpowiedzi SSE (jak dziś).

## Testy

- Zamiast monkeypatch na `routes.chat_v2.orchestrator_v2_service.process_user_request_stream_v2`,
  testy powinny patchować `ChatStreamUseCase.execute` (lub fabrykę use-case), bo to jest nowa granica.

## Kryteria akceptacji

- Brak zmian w API/kontrakcie SSE na zewnątrz.
- `routes/chat_v2.py` nie importuje bezpośrednio `services/orchestrator_v2/service.py`.
- Testy przechodzą (`pytest`) oraz `py_compile` dla zmienionych modułów.

## Ryzyka i mitigacje

- Ryzyko: przypadkowe rozjechanie parametrów przekazywanych do pipeline.
  - Mitigacja: utrzymać 1:1 mapowanie pól, testować mockiem streamu i porównać minimalny zestaw eventów.

## Plan wdrożenia (high-level)

- Dodać `application/chat/*`.
- Przepiąć `routes/chat_v2.py` na use-case.
- Przepiąć testy na nowy seam.
- Zweryfikować `pytest` i `py_compile`.
