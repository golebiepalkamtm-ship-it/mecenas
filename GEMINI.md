# LexMind AI — Instrukcje Startowe Agenta & Mapa Pamięci

Witaj w projekcie **LexMind AI** (Kancelaria Pałka & Kaźmierczak). 

> ⚡ **ZASADA STARTU KAŻDEJ SESJI**:
> Zanim przystąpisz do realizacji zadania, wczytaj pliki z `.agent/memory/` **istotne dla tematu zapytania** użytkownika (selektywnie, nie wszystkie na raz).

---

## 🗺️ Mapa Pamięci Kontekstu (`.agent/memory/`)

| Plik pamięci | Zawartość i Przeznaczenie |
| :--- | :--- |
| [overview.md](file:///e:/moj%20prawnik/.agent/memory/overview.md) | Cel projektu, tech stack, uruchomienie lokalne, kluczowe komendy i testy. |
| [architecture.md](file:///e:/moj%20prawnik/.agent/memory/architecture.md) | Główne moduły, przepływ danych zapytania (Chat Pipeline), powiązania serwisów. |
| [conventions.md](file:///e:/moj%20prawnik/.agent/memory/conventions.md) | Standardy kodowania (FastAPI/Pydantic/React), zasada `strict_no_quote_guard`, bezpieczeństwo. |
| [decisions.md](file:///e:/moj%20prawnik/.agent/memory/decisions.md) | Ważne decyzje architektoniczne (ADR) z uzasadnieniem. |
| [known-issues.md](file:///e:/moj%20prawnik/.agent/memory/known-issues.md) | Znane problemy, dług techniczny, wrażliwe komponenty ("nie ruszać bez testów"). |
| [sessions.md](file:///e:/moj%20prawnik/.agent/memory/sessions.md) | Jednolinijkowy dziennik sesji (data + 1-2 zdania podsumowania). |

### 📂 Moduły Specjalistyczne (`.agent/memory/modules/`)
- [orchestrator-v2.md](file:///e:/moj%20prawnik/.agent/memory/modules/orchestrator-v2.md) — Orchestrator v2.5, potok MoA, debata modeli, weryfikacja i synteza.
- [retrieval-rag.md](file:///e:/moj%20prawnik/.agent/memory/modules/retrieval-rag.md) — Hybrid RAG, bazy ISAP/SAOS/CBOSA, Statute Excerpt i Citation Guard.
- [mcp-servers.md](file:///e:/moj%20prawnik/.agent/memory/modules/mcp-servers.md) — Master MCP Server (32 narzędzia prawne i systemowe).
- [sprawa-karna.md](file:///e:/moj%20prawnik/.agent/memory/modules/sprawa-karna.md) — Śledztwo PR Lubań (4327-0.Ds.517.2025), kwalifikacje, zarzuty i powiązania ze sprawą administracyjną.

---

## 📋 Obowiązkowe Zasady Pracy i Aktualizacji Pamięci

1. **Selektywne Wczytywanie**: Na początku sesji wczytaj tylko te pliki z `.agent/memory/`, które są bezpośrednio związane z aktualnym zadaniem.
2. **Autonomiczna Aktualizacja Pamięci**: Po każdym zrealizowanym zadaniu zaktualizuj właściwy plik:
   - Nowe decyzje techniczne → dopisz do `decisions.md`
   - Nowe wzorce / reguły → dopisz do `conventions.md`
   - Nowe problemy / dług techniczny → dopisz do `known-issues.md`
   - Zakończona sesja / zadanie → dodaj 1 linijkę do `sessions.md`
   - Krótko poinformuj użytkownika na koniec odpowiedzi, co zostało zanotowane w pamięci.
3. **Limit Rozmiaru & Podział Plików**:
   - Każdy plik pamięci ma być zwięzłą mapą (docelowo < 150 linii).
   - Gdy plik przekroczy ~150 linii lub dotyczy nowego złożonego modułu, zaproponuj utworzenie osobnego pliku w `.agent/memory/modules/<nazwa>.md`.
   - Gdy `sessions.md` przekroczy 50 wpisów, skompresuj wpisy starsze niż miesiąc w podsumowanie na początku pliku.
4. **Bezwzględna Ochrona Danych (Prywatność)**:
   - **NIGDY** nie zapisuj w plikach pamięci haseł, kluczy API, tokenów, loginów ani danych osobowych klientów.
