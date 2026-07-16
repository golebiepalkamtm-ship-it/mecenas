---
name: lexmind-context
description: Pełny kontekst projektu LexMind — architektura, system prompty/role eksperckie, znane bugi i decyzje projektowe w jednym miejscu. Użyj tego skilla jako pierwszego punktu odniesienia przy każdej rozmowie o LexMind, gdy zadanie łączy kilka obszarów naraz (np. zmiana kodu ma wpływ na prompt, albo decyzja architektoniczna wpływa na ewaluację) — zamiast żonglować osobnymi skillami architektury i promptów.
---

# LexMind — pełny kontekst projektu

LexMind to polski prawniczy system AI oparty o architekturę multi-agent (Mixture of Agents) z RAG, Supabase i OpenRouter.

Ten skill spina dwa bardziej szczegółowe skille:
- **lexmind-architecture** — stack, moduły (LegalContextBuilder, DebateEngine, BriefingEngine, Real-time Legal Basis Validator), znane pułapki kodowe, CI/CD.
- **lexmind-prompts** — projektowanie system promptów i ról eksperckich, wzorzec case'ów prawnych, zasady pisania promptów.

Jeśli zadanie dotyczy wyłącznie kodu/infrastruktury → czytaj `lexmind-architecture`.
Jeśli zadanie dotyczy wyłącznie promptów/ról eksperckich → czytaj `lexmind-prompts`.
Jeśli zadanie łączy oba obszary (np. zmiana schematu structured output wymaga jednoczesnej zmiany promptu i kodu DebateEngine) — czytaj oba i traktuj jako jedną spójną zmianę, bo w LexMind prompt i kod parsujący jego output są ściśle sprzężone.

## Decyzje projektowe do pamiętania
- Pipeline MoA jest w wersji v2.5 — po drodze były naprawiane: złamane nazwy modeli, zdublowany OCR, 404 w hybrid search, błędy ELI API, halucynowane daty. Nowe zmiany nie powinny cofać tych napraw.
- Wprowadzono koncept **Real-time Legal Basis Validator** jako sidecar — to osobna warstwa walidacji, nie zamiennik dobrego promptu.
- Ewaluacja pipeline'u opiera się o **LLM-as-a-Judge + Golden Dataset** w CI/CD — każda istotna zmiana (kod lub prompt) powinna dorzucać przypadki testowe do Golden Dataset.
- Taksonomia 13 typów zadań/ról eksperckich jest fundamentem routingu zapytań — nowe funkcje powinny wpasowywać się w tę taksonomię, a nie tworzyć równoległy system klasyfikacji.

## Konwencja pracy z Marcinem nad LexMind
- Bezpośredni, gotowy do wdrożenia output — kod i prompty w finalnej formie, bez tłumaczenia oczywistości.
- Gdy brakuje konkretnego pliku/fragmentu do zmiany — krótkie pytanie o plik, zamiast zgadywania implementacji.
- Domyślnie sprawdzaj zgodność z ustalonymi wzorcami (sekcje powyżej i w skillach szczegółowych) nawet bez wyraźnej prośby.
