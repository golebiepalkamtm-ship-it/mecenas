---
name: lexmind-architecture
description: Architektura, konwencje kodu i znane pułapki projektu LexMind (polski prawniczy system AI oparty o MoA/RAG, Supabase, OpenRouter). Użyj tego skilla zawsze, gdy Marcin pisze, reviewuje, debugguje lub projektuje kod dla LexMind — w tym moduły LegalContextBuilder, DebateEngine, BriefingEngine, pipeline MoA v2.5, system promptów eksperckich, Real-time Legal Basis Validator, pipeline CI/CD z LLM-as-a-Judge, oraz gdy pojawia się nazwa "LexMind" w jakimkolwiek kontekście technicznym.
---

# LexMind — architektura i konwencje

## Stack
- Backend: Python (multi-agent / Mixture-of-Agents)
- DB/wektory: Supabase (Postgres + pgvector)
- LLM: OpenRouter (routing modeli), architektura RAG
- Wzorzec: pipeline MoA (Mixture of Agents) v2.5

## Kluczowe moduły
- **LegalContextBuilder** — buduje kontekst prawny (RAG + ELI API + OCR). Znane problemy: silent error swallowing (wyjątki gubione bez logowania), zduplikowany OCR w niektórych ścieżkach.
- **DebateEngine** — silnik debaty między agentami (MoA). Uważać na konflikt structured output vs `json.loads` (model czasem zwraca output, który nie parsuje się 1:1 ze schematem — nie zakładać zgodności bez walidacji).
- **BriefingEngine** — generuje briefy/podsumowania na podstawie wyniku debaty.
- **Real-time Legal Basis Validator** — sidecar weryfikujący podstawy prawne w locie (zapobiega halucynowanym datom/przepisom).

## Zasady przy pisaniu/reviewowaniu kodu
1. **Nigdy nie połykaj wyjątków po cichu.** Każdy `except` musi logować i albo re-raise'ować, albo świadomie zwracać fallback z oznaczeniem degradacji jakości odpowiedzi.
2. **Structured output ≠ gwarancja poprawnego JSON.** Zawsze waliduj przed `json.loads`/parsowaniem schematu (np. `pydantic`), z jawną obsługą błędu parsowania i retry/fallback.
3. **Nazwy modeli** — sprawdzać aktualność nazw modeli OpenRouter przy każdej zmianie pipeline'u (były przypadki złamanych/nieaktualnych nazw powodujących ciche błędy 404/500).
4. **Hybrid search / ELI API** — obie integracje bywały punktem awarii (404, timeouty). Każde wywołanie zewnętrzne powinno mieć timeout + fallback do samego RAG bez ELI, zamiast twardego fail.
5. **Brak duplikacji OCR** — sprawdzić, czy dokument nie jest OCR'owany więcej niż raz w pipeline (był to źródło marnowania kosztów/tokenów).
6. **Daty i cytaty prawne muszą przechodzić przez walidator** (Real-time Legal Basis Validator) zanim trafią do finalnej odpowiedzi — model ma tendencję do halucynowania dat aktów prawnych.

## Taksonomia ról eksperckich (13 typów zadań)
LexMind rozdziela zapytania na wyspecjalizowane role eksperckie zamiast jednego ogólnego prompta. Przy dodawaniu nowego case'u (np. `narcotics_defense`) trzymaj się wzorca:
- Sekcja kwestionowania dowodów (forensic evidence challenge)
- Sekcja wykrywania prowokacji policyjnej (police provocation detection)
- Jawne odniesienia do precedensów (np. WSA/orzecznictwo) zamiast ogólników

## CI/CD i ewaluacja
- Pipeline ewaluacyjny oparty o **LLM-as-a-Judge** + **Golden Dataset** — każda zmiana w pipeline MoA powinna być porównywana względem golden dataset przed merge'em.
- Nowe case'y prawne (system prompty) powinny mieć dołączony minimalny zestaw testowych zapytań do golden dataset.

## Konwencja komunikacji przy tym projekcie
- Marcin oczekuje bezpośrednich, gotowych do wdrożenia fragmentów kodu — bez tłumaczenia oczywistości, bez moralizowania o "best practices" w oderwaniu od kontekstu.
- Jeśli fragment kodu dotyczy powyższych modułów, domyślnie sprawdzaj pod kątem punktów z sekcji "Zasady" powyżej, nawet jeśli Marcin o to explicite nie prosi.
- Gdy brakuje kontekstu (np. dokładna wersja pliku, nazwa modelu), zapytaj krótko o plik/fragment zamiast zgadywać implementację.
