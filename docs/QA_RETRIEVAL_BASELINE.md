# QA — baseline retrieval LexMind

Zestaw testów do porównania przed/po wdrożeniu roadmapy. Zapisuj `pipeline_latency_ms` z `final_metadata` SSE.

## Scenariusze

| ID | Wejście | Oczekiwany Etap 6 | Fast path |
|----|--------|-------------------|-----------|
| T1 | „Co znaczy art. 58 KPA?” bez załącznika | legal>0 lub ELI>0 | tak |
| T2 | Pytanie + PDF 20+ stron (sprawa admin.) | legal>0, **user>0**, SAOS opcj. | nie |
| T3 | Odwołanie + skan doręczenia | user>0, procedural block | nie |
| T4 | „KPC art. 13” krótkie | ELI lub legal | tak |
| T5 | Drugie pytanie w tej samej sesji z historią | cache hit możliwy | zależy |

## Metryki do zapisu

```
request_id, scenario_id, legal_n, user_n, saos_n, eli_n,
rerank_method, stage6_ms, total_ms, unverified_cites, confidence_score,
hybrid_rpc_warning (tak/nie)
```

## Kryteria sukcesu (Faza 1)

- T2: `user_n > 0` w >80% prób z załącznikiem
- Brak warningu hybrid RPC 404 po migracji SQL
- Etap 6: Δ latency < +2 s vs baseline
- Tryb draft: `synthesis_blocked=true` gdy ≥1 niezweryfikowany cytat (jeśli w odpowiedzi ekspertów)

## Notatki z pierwszego pomiaru

_(Uzupełnij po pierwszym przebiegu na stagingu.)_

| Data | T1 | T2 user_n | hybrid warning |
|------|-----|-----------|----------------|
| — | — | — | — |
