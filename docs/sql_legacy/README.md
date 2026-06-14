# Legacy SQL (archiwum)

Pliki przeniesione z root `migrations/` — **nie stosować na produkcji** bez weryfikacji.

Kanoniczne migracje: [`supabase/migrations/`](../../supabase/migrations/).

| Plik | Opis |
|------|------|
| `fix_embedding_and_add_fts.sql` | Wczesna migracja embedding 1024 + FTS na `knowledge_base` |
| `split_knowledge_base_tables.sql` | Podział na tabele legal/user |
| `update_match_knowledge_legal_filter.sql` | Aktualizacja funkcji match |

Nowe zmiany schematu dodawaj wyłącznie w `supabase/migrations/` i stosuj przez Supabase CLI (`supabase db push`) lub SQL Editor.
