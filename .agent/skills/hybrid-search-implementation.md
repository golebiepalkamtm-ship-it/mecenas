# Wyszukiwanie Hybrydowe (Polish Hybrid RAG) - Wdrożenie i Specyfikacja

Poniższy plik stanowi techniczną dokumentację wdrożeniową dla potoku wyszukiwania hybrydowego (pgvector + FTS + RRF) z lematyzacją języka polskiego dla systemu LexMind AI.

## 🛑 Krytyczne Założenia i Wymagania Domenowe
1. **Lematyzacja języka polskiego**: Użycie słownika i konfiguracji `'polish'` w wyszukiwaniu pełnotekstowym PostgreSQL (FTS) zamiast `'english'`. Wspiera poprawną fleksję (np. "umowa", "umowie", "umów").
2. **Filtrowanie metadanych**: Integracja z systemem orkiestracji (Etap 6) wspierająca precyzyjne dopasowanie plików poprzez klucz `act_terms` (`filename`).
3. **Algorytm RRF (Reciprocal Rank Fusion)**: Połączenie wyników wektorowych (pgvector) i tekstowych (FTS) bezpośrednio w bazie za pomocą wzoru:
   $$RRF\_Score = \frac{W_{vector}}{k + Rank_{vector}} + \frac{1 - W_{vector}}{k + Rank_{keyword}}$$
4. **Odporność na błędy i Fallback**: W przypadku braku migracji w bazie lub problemów z zapytaniem tekstowym, system automatycznie degraduje się do czystego wyszukiwania wektorowego (pure-vector).

---

## 🛠️ Krok 1: Migracja Bazy Danych (SQL)
Skrypt migracyjny został utworzony w lokalizacji [20260518_hybrid_search.sql](file:///e:/moj%20prawnik/supabase/migrations/20260518_hybrid_search.sql). Tworzy on:
* Indeksy wyrazowe GIN dla lematyzacji języka polskiego:
  ```sql
  CREATE INDEX IF NOT EXISTS knowledge_base_legal_fts_polish_idx 
  ON knowledge_base_legal USING gin (to_tsvector('polish', content));
  ```
* Funkcje RPC `hybrid_search_legal` oraz `hybrid_search_user` realizujące zaawansowane wyszukiwanie hybrydowe z RRF.

---

## 💻 Krok 2: Kod Integracyjny (Python)
Implementacja została zintegrowana z plikiem [services/retrieval_service.py](file:///e:/moj%20prawnik/services/retrieval_service.py) poprzez:
1. **Klasę `PostgresHybridSearch`**: Uniwersalny interfejs obsługujący zarówno zapytania bezpośrednie SQL (`asyncpg.Pool`), jak i żądania API Supabase HTTP REST/RPC.
2. **Rozszerzenie `retrieval_service.search_supabase`**:
   * Automatyczna identyfikacja trybu hybrydowego.
   * Bezpieczne połączenie z RPC `hybrid_search_legal` lub `hybrid_search_user`.
   * Wbudowana funkcja auto-degradacji (fallback) na wypadek braku zainstalowanych procedur składowanych w bazie Supabase.

---

## 🚀 Krok 3: Orkiestracja RAG
Etap 6 w pliku [services/orchestrator.py](file:///e:/moj%20prawnik/services/orchestrator.py) automatycznie korzysta z nowego potoku hybrydowego:
```python
# Wywołanie transparentne w Etapie 6:
legal_res = await retrieval_service.search_supabase(keywords, table_name="knowledge_base_legal", act_terms=act_terms)
```

Wszystkie testy integracyjne przebiegają pomyślnie! Środowisko zachowuje pełną odporność i stabilność.
