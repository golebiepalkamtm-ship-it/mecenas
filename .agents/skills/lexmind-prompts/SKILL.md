---
name: lexmind-prompts
description: Projektowanie i edycja system promptów oraz ról eksperckich w LexMind (polski prawniczy system AI, architektura MoA/debate). Użyj tego skilla zawsze, gdy Marcin tworzy nowy "case" prawny (np. narcotics_defense), edytuje prompty ekspertów, pracuje nad DebateEngine, taksonomią 13 typów zadań, lub gdy pojawia się temat system promptów w kontekście LexMind.
---

# LexMind — system prompty i role eksperckie

## Model działania
LexMind nie używa jednego generycznego prompta. Zapytanie jest klasyfikowane do jednej z wyspecjalizowanych ról eksperckich (taksonomia 13 typów zadań), a odpowiedź powstaje w architekturze MoA (Mixture of Agents) — wiele "ekspertów" + DebateEngine, który konfrontuje ich stanowiska, + BriefingEngine, który syntetyzuje finalny brief.

## Struktura promptu case'owego (wzorzec)
Każdy nowy case prawny (np. `narcotics_defense`) powinien zawierać:
1. **Definicję roli i zakresu** — jaki typ sprawy, jaka gałąź prawa, jaki cel (obrona/oskarżenie/analiza neutralna).
2. **Sekcję kwestionowania dowodów** (forensic evidence challenge) — checklist typowych błędów proceduralnych/dowodowych specyficznych dla danego typu sprawy.
3. **Sekcję wykrywania nadużyć proceduralnych** (np. police provocation detection dla spraw narkotykowych) — jawne kryteria rozpoznawania wzorca, nie ogólnikowe "sprawdź czy było nadużycie".
4. **Wymóg odniesień do orzecznictwa/precedensów** — nakaz cytowania konkretnych sygnatur (np. WSA, NSA) zamiast ogólnych stwierdzeń o "utrwalonej linii orzeczniczej".
5. **Format wyjścia zgodny ze schematem** używanym przez DebateEngine/BriefingEngine (structured output) — jeśli dodajesz nowy case, sprawdź zgodność z istniejącym schematem zamiast tworzyć nowy.

## Zasady pisania promptów w LexMind
- Prompty mają być w języku polskim, precyzyjne terminologicznie (nazewnictwo zgodne z polskim prawem — kodeksy, nazwy instytucji, nazwy środków odwoławczych).
- Unikaj ogólników typu "przeanalizuj sprawę rzetelnie" — zastępuj je konkretnymi krokami/checklistami, bo są weryfikowalne przez CI/CD (LLM-as-a-Judge + Golden Dataset).
- Każdy nowy/zmieniony prompt powinien mieć minimalny zestaw przykładowych zapytań dorzucony do Golden Dataset, żeby dało się go ocenić przed merge'em.
- Jeśli prompt ma wpływać na DebateEngine (wielu agentów debatujących), pamiętaj o konflikcie structured output vs `json.loads` — prompt musi wymuszać format, który faktycznie parsuje się bez błędów walidacji schematu.
- Real-time Legal Basis Validator działa jako sidecar — prompty nie powinny "polegać" na tym, że model sam nie zhalucynuje daty/przepisu; validator to osobna warstwa, ale prompt i tak powinien wymuszać podawanie źródła podstawy prawnej.

## Konwencja komunikacji
- Marcin pisze prompty bezpośrednio pod konkretny typ sprawy — nie proponuj ogólnych szablonów "uniwersalnych dla każdego prawnika", tylko dopasowuj do konkretnego case'u i jego specyfiki proceduralnej.
- Gotowy prompt dostarczaj od razu w finalnej, wdrożeniowej formie (bez dopytywania o rzeczy, które można rozsądnie założyć na podstawie typu sprawy).
