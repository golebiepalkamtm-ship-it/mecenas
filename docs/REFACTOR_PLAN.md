# Plan Refaktoryzacji I Implementacji

Ten dokument opisuje etapowy plan uporządkowania architektury projektu `moj prawnik` / LexMind. Celem jest zmniejszenie złożoności, ograniczenie ryzyka regresji oraz przygotowanie kodbase do dalszego rozwoju bez zatrzymywania bieżącej pracy nad produktem.

## 1. Cele

### Cele główne

- uprościć architekturę backendu i frontendu bez przepisywania wszystkiego od zera,
- ustalić jedno źródło prawdy dla orkiestracji czatu,
- ujednolicić kontrakt API między frontendem i backendem,
- zmniejszyć ryzyko regresji przez testy i smoke checki,
- uprościć konfigurację środowiska i uruchamianie projektu,
- przygotować repozytorium do pracy zespołowej i CI.

### Cele techniczne

- ograniczyć zależności między `services/orchestrator.py` i `services/orchestrator_v2/`,
- rozbić zbyt duże moduły, szczególnie `frontend/src/App.tsx` i `routes/documents.py`,
- ustabilizować krytyczne flow: chat SSE, retrieval, upload dokumentu, auth,
- uporządkować podział odpowiedzialności między SQLite, Supabase i cache.

## 2. Zakres

### W zakresie

- architektura backendu,
- architektura frontendu,
- kontrakty request/response,
- testy, CI i smoke testy,
- konfiguracja i uruchamianie lokalne,
- dokumentacja techniczna i operacyjna.

### Poza zakresem

- duży redesign UI,
- zmiana głównych funkcji produktu,
- pełna wymiana stosu technologicznego,
- migracja na inny backend, framework lub bazę danych.

## 3. Założenia

- refaktor jest etapowy i wdrażalny po każdym większym kroku,
- unikamy jednego dużego "big bangu",
- na początku dokładamy bezpieczeństwo w postaci testów i kontroli kontraktów,
- priorytet ma ścieżka: frontend chat -> `/chat` -> orchestrator -> retrieval -> SSE,
- najpierw upraszczamy miejsca o najwyższym ryzyku, dopiero później porządkujemy resztę.

## 4. Aktualne problemy

### Problem 1: Podwójna architektura orkiestracji

- aktywna ścieżka requestu korzysta z `process_user_request_stream_v2()` i `services/orchestrator_v2/*`,
- jednocześnie duża część helperów i logiki nadal żyje w `services/orchestrator.py`,
- to utrudnia rozwój, testowanie i lokalizowanie błędów.

### Problem 2: Zbyt luźny kontrakt czatu

- `ChatRequest` i adapter legacy dopuszczają bardzo szeroki payload,
- granica między kontraktem frontendowym a backendowym nie jest wystarczająco sztywna,
- zwiększa to ryzyko cichych regresji.

### Problem 3: Duże moduły o wielu odpowiedzialnościach

- `frontend/src/App.tsx` łączy bootstrap, auth, routing zakładek, layout i splash,
- `routes/documents.py` obsługuje upload, ekstrakcję, OCR, eksport, drafting i listing,
- takie pliki są drogie w utrzymaniu i testowaniu.

### Problem 4: Rozproszona konfiguracja

- współistnieją `LEXMIND_*`, `SUPABASE_*` i `VITE_*`,
- część mapowania dzieje się w skryptach startowych,
- konfiguracja jest poprawna, ale trudniejsza do zrozumienia i utrzymania.

### Problem 5: Za mało siatki bezpieczeństwa

- brak wystarczającej liczby testów integracyjnych dla najważniejszych przepływów,
- brak jednej, krótkiej checklisty smoke po uruchomieniu,
- ograniczona ochrona przed regresjami przy refaktorze.

## 5. Priorytety

### Priorytet P1

- testy integracyjne backendu dla krytycznych endpointów,
- docelowy kontrakt czatu i uporządkowanie payloadu,
- uporządkowanie relacji `orchestrator.py` vs `orchestrator_v2`,
- rozbicie `App.tsx`.

### Priorytet P2

- rozbicie `routes/documents.py`,
- uproszczenie warstwy retrieval i providerów,
- porządki konfiguracji środowiska,
- ujednolicenie persystencji i repository layer.

### Priorytet P3

- porządki w historycznych artefaktach i dokumentacji,
- pełne CI z buildami i smoke testami,
- dodatkowe porządki DevEx.

## 6. Plan Etapowy

## Etap 0. Przygotowanie

### Cel

Ustalić źródło prawdy, zakres i kolejność prac.

### Zadania

- spisać aktywne ścieżki runtime backendu i frontendu,
- oznaczyć moduły jako:
  - aktywne,
  - przejściowe,
  - historyczne,
- potwierdzić decyzję architektoniczną:
  - `services/orchestrator_v2/` jest docelowym silnikiem,
  - `services/orchestrator.py` przechodzi do roli adaptera przejściowego,
- przygotować checklistę regresji manualnej dla każdej iteracji.

### Rezultat

- jasna decyzja architektoniczna,
- brak niejednoznaczności co do kierunku refaktoru.

## Etap 1. Siatka Bezpieczeństwa

### Cel

Zabezpieczyć krytyczne flow przed regresjami.

### Zadania backend

- dodać test integracyjny dla `POST /chat` ze streamem SSE,
- dodać test integracyjny dla `POST /documents/upload-document`,
- dodać test integracyjny dla `GET /health/hybrid-search`,
- dodać test dla fallbacku retrievalu, gdy RPC Supabase jest niedostępne.

### Zadania frontend

- dodać test jednostkowy dla `buildChatPayload()`,
- dodać test parsera SSE,
- dodać test dla podstawowych transformacji metadanych czatu.

### Zadania wspólne

- ograniczyć `print()` i przejść na spójne logowanie loggerem,
- dodać prosty zestaw smoke testów uruchamianych lokalnie.

### Rezultat

- krytyczne ścieżki mają minimalną ochronę testową,
- można bezpieczniej przejść do refaktoru architektury.

## Etap 2. Kontrakt Czasu Rzeczywistego I API Czatu

### Cel

Ujednolicić request i response dla ścieżki czatu.

### Zadania

- zdefiniować docelowy model requestu czatu,
- zdefiniować jawny model eventów SSE:
  - `metadata`,
  - `chunk`,
  - `final_metadata`,
  - `error`,
- ograniczyć użycie luźnych `dict[str, Any]` tam, gdzie to możliwe,
- rozpisać mapowanie:
  - `frontend field -> backend field -> orchestrator param`,
- zostawić adapter legacy tylko jako warstwę przejściową.

### Rezultat

- jeden kanoniczny kontrakt czatu,
- łatwiejsze testowanie i refaktor kolejnych warstw.

## Etap 3. Uporządkowanie Orkiestracji

### Cel

Zostawić jeden docelowy silnik wykonania.

### Zadania

- utrzymać `services/orchestrator_v2/` jako target,
- przenieść helpery potrzebne V2 z `services/orchestrator.py` do mniejszych modułów,
- wydzielić osobne moduły dla:
  - formatowania historii,
  - rozwiązywania modeli,
  - budowania promptów,
  - maskowania prywatności,
  - polityki cytowań,
- usunąć zależności, w których V2 musi wołać legacy helpery przez duży serwis,
- po stabilizacji oznaczyć martwą logikę legacy do usunięcia.

### Rezultat

- jeden główny pipeline,
- prostsze zależności,
- niższy koszt utrzymania.

## Etap 4. Rozdział Warstw Backendu

### Cel

Czytelniej oddzielić HTTP od logiki use case i infrastruktury.

### Docelowy podział

- `routes/` - warstwa HTTP,
- `application/` - use case'y,
- `services/infra/` lub analogiczne moduły integracyjne,
- `domain/` - reguły i modele domenowe.

### Zadania

- zacząć od najważniejszych obszarów:
  - chat,
  - documents,
  - retrieval,
  - admin auth,
- przenosić logikę etapami bez dużej reorganizacji całego repo naraz.

### Rezultat

- czytelniejsze granice odpowiedzialności,
- mniejsze routery,
- mniej sprzężeń.

## Etap 5. Refaktor Modułu Dokumentów

### Cel

Rozbić `routes/documents.py` na mniejsze, testowalne części.

### Zadania

- wydzielić moduły:
  - `documents_upload`,
  - `documents_indexing`,
  - `documents_export`,
  - `documents_drafting`,
  - `documents_library`,
- wydzielić współdzielone komponenty:
  - walidacja plików,
  - ekstrakcja tekstu,
  - OCR,
  - background indexing,
  - naming i sanitization,
- ujednolicić modele odpowiedzi endpointów dokumentowych.

### Rezultat

- prostsza logika dokumentów,
- łatwiejsze testy,
- mniej ryzykownych zmian w jednym dużym pliku.

## Etap 6. Refaktor Retrieval I Integracji

### Cel

Ujednolicić warstwę źródeł prawnych i wyszukiwania.

### Zadania

- wydzielić adaptery:
  - `SupabaseKnowledgeRepository`,
  - `SaosProvider`,
  - `EliProvider`,
- przenieść fallbacki i cache bliżej warstwy integracyjnej,
- ujednolicić kształt wyników źródeł:
  - `source`,
  - `title`,
  - `content`,
  - `score`,
  - `metadata`,
- ograniczyć logikę transportową w usługach domenowych.

### Rezultat

- prostsza diagnostyka problemów retrievalu,
- lepsza wymienialność providerów,
- mniejsze rozproszenie odpowiedzialności.

## Etap 7. Konfiguracja I Środowisko

### Cel

Uprościć konfigurację i zmniejszyć liczbę ukrytych zależności.

### Zadania

- przyjąć jasną zasadę:
  - backend czyta `LEXMIND_*` i klucze integracyjne,
  - frontend czyta tylko `VITE_*`,
- ograniczyć ukryte mapowania w skryptach do minimum przejściowego,
- dodać walidację konfiguracji przy starcie backendu,
- uporządkować profile instalacji:
  - `core`,
  - `ocr`,
  - `dev`,
- opisać minimalną i rozszerzoną konfigurację.

### Rezultat

- łatwiejszy onboarding,
- mniej błędów środowiskowych,
- prostsze uruchamianie.

## Etap 8. Refaktor Frontendu

### Cel

Rozbić zbyt duży shell aplikacji i uprościć zarządzanie stanem.

### Status

- rozpoczęto przez wydzielenie `useAuthBootstrap` z `frontend/src/App.tsx`,
- wydzielono `AppPhaseRouter`, `WorkspaceShell` i `Topbar`,
- wydzielono konfigurację nawigacji i renderer zawartości workspace z `App.tsx`,
- kolejnym większym krokiem pozostaje dalsze rozbijanie shella oraz podział `useChatSettingsStore`.

### Zadania

- rozbić `frontend/src/App.tsx` na:
  - `AuthBootstrap`,
  - `PhaseRouter`,
  - `WorkspaceShell`,
  - `Topbar`,
  - `NavigationShell`,
- zmniejszyć zakres `useAppStore`,
- rozdzielić `useChatSettingsStore` na mniejsze store'y:
  - modele,
  - prompty,
  - retrieval,
  - ustawienia UI,
- dodać wspólnego klienta API zamiast rozproszonych `fetch()`.

### Rezultat

- prostszy entrypoint frontendu,
- mniejsze store'y,
- łatwiejsze testowanie i rozwój.

## Etap 9. Nawigacja I URL Routing

### Cel

Poprawić nawigację, debugowanie i deep-linking.

### Zadania

- rozważyć router URL dla głównych sekcji aplikacji,
- zostawić Zustand dla ustawień i stanu sesyjnego, ale nie jako jedyny mechanizm nawigacji,
- dodać deep-linking dla:
  - chat,
  - documents,
  - judgments,
  - admin.

### Rezultat

- lepsze debugowanie,
- prostsze testy E2E,
- czytelniejsze zachowanie aplikacji w przeglądarce.

## Etap 10. Persystencja I Źródła Prawdy

### Cel

Jasno określić odpowiedzialność SQLite, Supabase i cache.

### Zadania

- opisać co jest:
  - źródłem prawdy,
  - cache,
  - magazynem pomocniczym,
- dodać wersjonowanie schematu SQLite,
- wydzielić repository layer dla:
  - sessions,
  - messages,
  - profiles,
  - investigation state,
- ograniczyć bezpośredni dostęp routerów do szczegółów DB.

### Rezultat

- prostsze utrzymanie persystencji,
- mniej ukrytych zależności,
- łatwiejsze migracje.

## Etap 11. CI, DevEx I Dokumentacja

### Cel

Zamknąć refaktor w spójny proces jakościowy.

### Zadania

- dodać CI uruchamiające:
  - lint backendu,
  - lint frontendu,
  - testy backendu,
  - testy frontendu,
  - build frontendu,
  - smoke backendu,
- dodać checklistę release,
- uporządkować dokumentację techniczną,
- dodać ADR-y dla kluczowych decyzji architektonicznych.

### Rezultat

- proces jakościowy wspiera dalszy rozwój,
- łatwiejszy onboarding i utrzymanie.

## 7. Sugerowana Kolejność Wdrożenia

### Wariant optymalny

- tydzień 1: Etap 0 i Etap 1,
- tydzień 2: Etap 2 i Etap 3,
- tydzień 3: Etap 4 i Etap 5,
- tydzień 4: Etap 6 i Etap 7,
- tydzień 5: Etap 8 i Etap 9,
- tydzień 6: Etap 10 i Etap 11.

### Wariant realistyczny dla małego zespołu

- 8-10 tygodni,
- z wdrażaniem etapami po małych PR-ach,
- bez równoczesnego refaktoru wszystkich warstw naraz.

## 8. Definition Of Done

Refaktor uznajemy za zakończony, gdy:

- istnieje jeden aktywny pipeline orkiestracji,
- istnieje jeden kanoniczny kontrakt czatu,
- `App.tsx` jest rozbite na mniejsze moduły,
- krytyczne flow mają testy integracyjne i smoke testy,
- konfiguracja środowiska jest uproszczona i opisana,
- CI uruchamia lint, testy i smoke,
- dokumentacja techniczna wskazuje jedną kanoniczną architekturę.

## 9. Ryzyka

### Ryzyko 1

- rozjechanie streamu SSE między frontendem a backendem.

### Ryzyko 2

- ciche regresje retrievalu po zmianie fallbacków, providerów i kontraktów źródeł.

### Ryzyko 3

- złamanie auth flow przy rozbijaniu `App.tsx`.

### Ryzyko 4

- wzrost kosztu refaktoru, jeśli zabraknie jasnego etapu przejściowego dla legacy.

### Minimalizacja ryzyk

- każdy etap kończy się działającą aplikacją,
- każdy etap ma checklistę regresji manualnej,
- najpierw testy i kontrakty, dopiero potem większe przenoszenie logiki.

## 10. Checklista Wykonawcza

### Etap 0

- [ ] Potwierdzić docelową architekturę orkiestracji
- [ ] Oznaczyć moduły aktywne, przejściowe i historyczne
- [ ] Spisać checklistę regresji manualnej

### Etap 1

- [x] Dodać test SSE dla `/chat`
- [x] Dodać test uploadu dokumentu
- [x] Dodać test health hybrydowego wyszukiwania
- [x] Dodać test fallbacku retrievalu
- [x] Dodać test `buildChatPayload()`
- [x] Dodać test parsera SSE
- [ ] Ujednolicić logowanie

### Etap 2

- [~] Zdefiniować docelowy request czatu
- [~] Zdefiniować wszystkie eventy SSE
- [~] Ograniczyć luźne `dict[str, Any]`
- [x] Spisać mapowanie pól frontend-backend

### Etap 3

- [~] Przenieść helpery potrzebne V2 z legacy orchestratora
- [~] Ograniczyć zależności V2 -> legacy
- [ ] Oznaczyć martwą logikę legacy do usunięcia

### Etap 4

- [ ] Wydzielić use case'y dla chat
- [~] Wydzielić use case'y dla documents
- [~] Wydzielić use case'y dla retrieval
- [ ] Wydzielić use case'y dla admin auth

### Etap 5

- [ ] Rozbić `routes/documents.py`
- [ ] Wydzielić walidację plików i ekstrakcję
- [ ] Ujednolicić modele odpowiedzi dokumentów

### Etap 6

- [~] Wydzielić adapter Supabase
- [~] Wydzielić provider SAOS
- [~] Wydzielić provider ELI
- [ ] Ujednolicić kształt wyników źródeł

### Etap 7

- [x] Uprościć zasady zmiennych środowiskowych
- [x] Dodać walidację configu przy starcie
- [x] Rozdzielić profile instalacji
- [x] Uzupełnić dokumentację środowiskową

### Etap 8

- [~] Rozbić `App.tsx`
- [x] Ograniczyć zakres `useAppStore`
- [~] Podzielić `useChatSettingsStore`
- [x] Dodać wspólnego klienta API

### Notatka postępu

- wydzielono `useAuthBootstrap`,
- wydzielono `AppPhaseRouter`,
- wydzielono `WorkspaceShell`,
- wydzielono `Topbar`,
- wydzielono `navigationConfig` dla głównej nawigacji,
- wydzielono `WorkspaceContentView` z animacją i lazy-renderingiem aktywnej zakładki,
- usunięto `useAppStore` i przeniesiono stan aplikacji do lokalnego `useState` w `App.tsx`,
- wydzielono wspólne typy `AppPhase` / `UserRole` do `frontend/src/types/app.ts`,
- rozbito implementację `useChatSettingsStore` na slice'y domenowe: UI, modele, prompty, retrieval i performance,
- zachowano publiczne API `useChatSettingsStore`, więc refaktor nie wymagał przepisywania wszystkich konsumentów,
- ograniczono część szerokich subskrypcji store'a przez przejście wybranych komponentów i hooków na selektory z `useShallow`,
- dodano domenowe hooki selektorów nad `useChatSettingsStore`, żeby widoki nie zależały bezpośrednio od pełnego kształtu store'a,
- uproszczono `App.tsx` do roli koordynatora faz i zawartości widoku,
- w frontendzie wprowadzono jawne typy eventów SSE jako część przygotowania Etapu 2,
- wydzielono backendowy schemat `schemas/chat_request.py` dla kanonicznego requestu `/chat`,
- dopisano `docs/CHAT_CONTRACT_MAPPING.md` z mapowaniem pól `frontend -> backend -> orchestrator`,
- dodano test backendowy dla zagnieżdżonego payloadu `/chat` i aliasu `sessionId`,
- ograniczono luźne typy requestu `/chat` przez jawne modele załączników i historii wiadomości,
- wydzielono helper budujący `final_metadata` z `routes/chat_v2.py` do `schemas/chat_stream.py`,
- wydzielono `services/orchestrator_v2/history_formatter.py` i usunięto zależność `context_builder.py` od całego `OrchestratorService`,
- dodano test jednostkowy dla formattera historii w `orchestrator_v2`,
- w frontendzie dodano wspólnego klienta API i zweryfikowano `npm run build` oraz `npm test` po integracji.
- w retrieval wydzielono niskopoziomowych providerów SAOS i ELI oraz lekki adapter Supabase RPC,
- uproszczono `search_supabase()` przez przeniesienie konfiguracji hybrid RPC, budowy payloadu i retry po zawężeniach do `services/retrieval/providers/supabase_provider.py`,
- dodano testy jednostkowe dla helperów Supabase, w tym kolejności retry przy pustych wynikach hybrydowych.
- dodano typowany kontrakt wyników retrievalu (`RetrievalItem`) i centralną normalizację rekordów w `services/retrieval/types.py`.
- ujednolicono kanoniczne helpery pól retrievalu (`title`, `source`, `score`, `source_type`) i przepięto na nie część konsumentów (`rerank`, `context_packer`, `citation_guard`, `statute_excerpt_service`, walidatory).
- wydzielono współdzielone `services/model_resolution.py` oraz `services/llm_gateway.py` i przepięto na nie trial pipeline oraz część debaty zamiast bezpośrednich wywołań `orchestrator._resolve_model_id` i `orchestrator._call_with_fallback`.
- usunięto bezpośrednie importy pomocniczych symboli z `services.orchestrator` w warstwie syntezy przez przejście na moduły źródłowe (`llm_client`, `observability`).
- odcięto `services/retrieval/context_builder.py` od zależności na `OrchestratorService` (stałe, keyword fallback, LLM fallback, rerank, PII, history block, legal basis block) przez wydzielenie małych helperów (`query_keywords`, `history_blocks`, `legal_basis_blocks`, `rerank_facade`).
- odcięto `services/debate/debate_manager.py` od prywatnych helperów legacy orkiestratora (role block, kontekst chunków, cross-exam, pojednanie) przez wydzielenie modułów: `expert_roles`, `expert_context`, `services/debate/cross_exam.py`, `services/debate/reconciliation.py`.
- wydzielono `services/orchestrator_v2/service.py` i przepięto `routes/chat_v2.py` na bezpośrednie użycie serwisu V2 zamiast `services.orchestrator.orchestrator`; sam legacy orchestrator został zredukowany do delegacji zgodności.
- dalsze helpery w `services/orchestrator.py` zostały zamienione na cienkie delegacje do nowych modułów, a `ContextBuilder()` i `DebateManager()` przestały wymagać przekazywania `self`.
- odpięto `services/synthesis/synthesis_engine.py` od `self.orch.*` przez wydzielenie `services/synthesis/prompts.py`, `services/synthesis/repair.py` oraz wspólnego `services/async_utils.py`; synteza korzysta teraz bezpośrednio z `llm_gateway`, `CitationGuard` i `retrieval_service`.
- uproszczono sam `services/orchestrator.py`: fallback LLM został przepięty na współdzielone `services/llm_gateway.py`, zniknął prywatny stan `_llm`, a `SynthesisEngine` jest już uruchamiany bez przekazywania instancji legacy orkiestratora.
- wydzielono `services/expert_prompts.py` dla aktywnych guardów/buildera promptów eksperckich i usunięto z `services/orchestrator.py` martwy `_build_expert_prompt()` oraz nieużywany blok stałych promptowych, co dalej redukuje rolę legacy modułu do adaptera przepływu.
- usunięto z `services/orchestrator.py` kolejną porcję martwych delegacji i osieroconych helperów (role/context/debate/rerank/keyword fallback, asymetryczne legal-basis, helper świąt), a po cięciu nadal przechodzi `py_compile` i pełny `pytest`.
- dalsze odchudzanie legacy adaptera: wrappery `_resolve_model_id`, `_mask_pii`, `_build_query_for_retrieval`, `_hallucination_block_threshold` zostały zastąpione bezpośrednimi wywołaniami, a logikę historii czatu, COI i adresata wydzielono do `services/chat_history.py`, `services/coi_guard.py` i `services/client_addressee.py`.
- Etap 4 (start): wydzielono `application/chat/*` (use-case streamu), przepięto `routes/chat_v2.py` na `ChatStreamUseCase`, a test SSE przepięto na mockowanie use-case zamiast głębokich symboli `services/*`.
- Etap 4: rozpoczęto `application/retrieval/*` przez dodanie `LegalRetrievalUseCase`, przepięto pierwszy seam w `routes/documents.py` (`/analyze-document`) z bezpośredniego `retrieval_service.search_supabase(...)` na `legal_retrieval_use_case.search_legal(...)`, a test integracyjny został przepięty na mockowanie use-case zamiast infrastruktury.
- Etap 4: rozpoczęto `application/documents/*` przez dodanie `AnalyzeDocumentUseCase`, a `routes/documents.py` deleguje już endpoint `/analyze-document` do warstwy `application`; nowy test integracyjny pilnuje seamu route -> use-case, a wcześniejszy test retrievalu został przepięty na nowego właściciela logiki.
- Etap 4: kolejne ciężkie flow dokumentowe zostały wyjęte z routera do `application/documents/*` - `DraftDocumentUseCase` przejął `/draft-document`, a `UploadDocumentUseCase` przejął `/upload-document` wraz z ekstrakcją tekstu i background indexingiem; router zachowuje kontrakt HTTP, a testy integracyjne pilnują seamów route -> use-case.
- Etap 4: dalsze odchudzanie `routes/documents.py` - do `application/documents/*` przeniesiono także `SaveDraftUseCase` dla `/save-draft` oraz `IndexSavedFileUseCase` dla `/index-saved-file/{filename}`, dzięki czemu router traci kolejne kawałki logiki zapisu i indeksowania.

### Etap 9

- [ ] Wprowadzić routing URL dla głównych ekranów
- [ ] Dodać deep-linking

### Etap 10

- [ ] Opisać źródła prawdy danych
- [ ] Dodać wersjonowanie SQLite
- [ ] Wydzielić repository layer

### Etap 11

- [ ] Dodać CI dla lint/test/build/smoke
- [ ] Dodać checklistę release
- [ ] Uporządkować dokumentację i ADR-y

## 11. Pierwsze 3 Zadania Do Zrobienia Od Razu

Jeśli refaktor zaczyna się teraz, rekomendowana kolejność startowa to:

1. dodać test integracyjny SSE dla `/chat`,
2. rozpisać docelowy kontrakt payloadu i `final_metadata`,
3. wyciąć z `frontend/src/App.tsx` moduł `AuthBootstrap`.

To daje najlepszy balans między bezpieczeństwem, wartością i kosztem wdrożenia.
