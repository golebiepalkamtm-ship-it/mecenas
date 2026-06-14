# Separacja Kontekstowa - Fix Bezpieczeństwa

## Problem
System miesza dane z bazy prywatnej (user) z bazą ogólną (legal), co w przypadku pracy prawnika/asystenta prawnego jest błędem krytycznym, bo może prowadzić do "wycieku" faktów z innych spraw do aktualnej odpowiedzi.

## Rozwiązanie
Wprowadzono separację kontekstową na trzech poziomach:

### 1. Moduł Retrieval (moa/retrieval.py)
- **Domyślnie**: Search query idzie wyłącznie do tabeli `knowledge_base_legal`
- **Parametr `include_user_db`**: Nowy parametr (domyślnie `False`) kontroluje dostęp do `knowledge_base_user`
- **Logika**: 
  - Vector search: szuka w user DB tylko gdy `include_user_db=True` lub `table="knowledge_base_user"`
  - Keyword search: ta sama logika dla wyszukiwania po słowach kluczowych
- **Bezpieczeństwo**: Zapobiega automatycznemu mieszaniu danych z obu baz

### 2. Klasyfikator Intencji (moa/intent.py)
- **Wykrywanie słów kluczowych**: System automatycznie wykrywa frazy wskazujące na potrzebę przeszukania bazy user:
  - "sprawdź w moich notatkach"
  - "szukaj w moich plikach"
  - "moje dokumenty"
  - "w mojej bazie"
  - "w moich notatkach"
  - "przeszukaj moje notatki/pliki"
- **Zwracana wartość**: Funkcja `classify_intent` teraz zwraca krotkę `(Intent, include_user_db)`
- **Tryb analityczny**: Gdy użytkownik przesyła dokument (trigger: `has_docs=True`), system ustawia `include_user_db=False` (tylko OCR aktualnego pliku, bez przeszukiwania całej bazy prywatnej)

### 3. Warstwa Serwisowa (services/chat_service.py, routes/chat.py)
- **Przekazywanie flagi**: Parametr `include_user_db` jest przekazywany przez cały pipeline:
  - `routes/chat.py` → `services/chat_service.py` → `moa/retrieval.py`
- **Endpointy**:
  - `/chat`: Respektuje flagę z intent classifier
  - `/chat-consensus`: Respektuje flagę z intent classifier
  - `/draft-document`: Domyślnie `include_user_db=False` (tylko baza legal)
  - `/analyze-document`: Domyślnie `include_user_db=False` (tylko baza legal)
- **MOA Pipeline**: Zawsze `include_user_db=False` (konsylium ekspertów działa tylko na bazie legal)

## Scenariusze Użycia

### Scenariusz 1: Zwykłe pytanie prawne
```
Użytkownik: "Co to jest art. 212 kk?"
System: include_user_db=False → szuka tylko w knowledge_base_legal
```

### Scenariusz 2: Pytanie z wyraźną prośbą o przeszukanie bazy user
```
Użytkownik: "Sprawdź w moich notatkach informacje o art. 212 kk"
System: include_user_db=True → szuka w knowledge_base_legal + knowledge_base_user
```

### Scenariusz 3: Pytanie z załącznikiem
```
Użytkownik: [Przesłano PDF] "Co to jest art. 212 kk?"
System: include_user_db=False → szuka tylko w knowledge_base_legal + OCR załącznika
```

### Scenariusz 4: Konsylium ekspertów (MOA)
```
Użytkownik: "Analizuj sprawę karną" (tryb konsylium)
System: include_user_db=False → zawsze tylko knowledge_base_legal
```

## Testy
Wszystkie testy przeszły pomyślnie:
- ✅ Zwykłe pytania prawne → `include_user_db=False`
- ✅ Pytania ze słowami kluczowymi → `include_user_db=True`
- ✅ Pytania z załącznikami → `include_user_db=False`

## Wpływ na Bezpieczeństwo
- **Wyciek danych**: Zablokowany - system domyślnie nie miesza danych z różnych spraw
- **Izolacja kontekstu**: Zapewniona - każda sprawa ma oddzielony kontekst
- **Kontrola użytkownika**: Użytkownik musi jawnie poprosić o przeszukanie swojej bazy (słowa kluczowe)
- **Minimalizm**: Zmiany są minimalne i nie wpływają na wydajność

## Pliki Zmodyfikowane
1. `moa/retrieval.py` - Logika wyszukiwania z separacją baz
2. `moa/intent.py` - Wykrywanie słów kluczowych i zwracanie flagi
3. `services/chat_service.py` - Przekazywanie parametru include_user_db
4. `routes/chat.py` - Integracja z endpointami
5. `moa/pipeline.py` - Jawnie ustawione include_user_db=False dla MOA

## Data Wdrożenia
2026-04-16
