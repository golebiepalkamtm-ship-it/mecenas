# LexMind — Pełny Kontekst Projektu i Konwencja Pracy

## O projekcie
LexMind to polski prawniczy system AI oparty o architekturę multi-agent (Mixture of Agents) z RAG, Supabase i OpenRouter.

## Powiązane dokumentacje i skille (Architektura vs Prompty)
W zależności od obszaru zadania, kieruj się odpowiednimi zasobami w repozytorium:
- **Architektura / Kod / Infrastruktura (`lexmind-architecture`)**: stack, moduły (`LegalContextBuilder`, `DebateEngine`, `BriefingEngine`, `Real-time Legal Basis Validator`), znane pułapki kodowe, CI/CD. Główne pliki odniesienia: `docs/CODE_WIKI_PL.md`, `docs/ARCHITECTURE_INFORMATION_FLOW.md`, `services/orchestrator_v2/`.
- **Prompty / Role eksperckie (`lexmind-prompts`)**: projektowanie system promptów i ról eksperckich, wzorzec case'ów prawnych, zasady pisania promptów. Główne pliki odniesienia: `docs/LEXMIND_ANALIZA_PROMPTOW.md`, katalog `prompts/`.
- **Zadania łączące oba obszary**: np. zmiana schematu structured output wymaga jednoczesnej zmiany promptu i kodu `DebateEngine`. Czytaj oba obszary i traktuj jako jedną spójną zmianę — w LexMind prompt i kod parsujący jego output są ściśle sprzężone.

## KRYTYCZNE DECYZJE PROJEKTOWE DO PAMIĘTANIA
1. **Pipeline MoA jest w wersji v2.5** — po drodze były naprawiane: złamane nazwy modeli, zdublowany OCR, 404 w hybrid search, błędy ELI API, halucynowane daty. **Nowe zmiany nie mogą cofać tych napraw.**
2. **Real-time Legal Basis Validator jako sidecar** — to osobna warstwa walidacji, nie zamiennik dobrego promptu.
3. **Ewaluacja pipeline'u**: opiera się o LLM-as-a-Judge + Golden Dataset w CI/CD. Każda istotna zmiana (kod lub prompt) powinna dorzucać przypadki testowe do Golden Dataset.
4. **Taksonomia 13 typów zadań/ról eksperckich**: jest fundamentem routingu zapytań. Nowe funkcje muszą wpasowywać się w tę taksonomię, a nie tworzyć równoległy system klasyfikacji.
5. **UI/UX (Awwwards Design)**: priorytetem jest najwyższa jakość wizualna (nowoczesny, mega efektowny wygląd, mikrointerakcje, nowoczesna typografia, glassmorphism, płynne animacje).

## Konwencja pracy z Marcinem nad LexMind
- **Bezpośredni, gotowy do wdrożenia output** — podawaj kod i prompty w finalnej formie, bez tłumaczenia oczywistości i zbędnego wstępu.
- **Brak zgadywania implementacji** — gdy brakuje konkretnego pliku lub fragmentu do zmiany, zadaj krótkie, precyzyjne pytanie o plik zamiast zgadywać w ciemno.
- **Weryfikacja wzorców** — domyślnie sprawdzaj zgodność z ustalonymi wzorcami (architektury, promptów i reguł projektu) nawet bez wyraźnej prośby.
- **Autonomia i efektywność** — podejmuj najlepsze decyzje samodzielnie i systematycznie zbliżaj projekt do perfekcyjnego wdrożenia.
