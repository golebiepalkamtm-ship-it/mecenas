# Analiza Repozytorium - LexMind AI

## Opis Projektu
**LexMind AI** to inteligentny system prawny oparty na sztucznej inteligencji, umożliwiający przetwarzanie dokumentów prawnych, wyszukiwanie informacji oraz interakcję w formie czatu. Nazwa projektu ("Mój Prawnik") wskazuje na polskie pochodzenie i fokus na prawo polskie.

## Architektura Techniczna

### Backend
- **Język programowania**: Python 3.7+
- **Framework**: FastAPI
- **Baza danych**: 
  - Główna: Supabase (PostgreSQL)
  - Lokalna: SQLite
- **Główne komponenty**:
  - API RESTowe z CORS
  - Przetwarzanie dokumentów
  - System RAG (Retrieval-Augmented Generation)
  - Chat z AI
  - Zarządzanie bazą wiedzy prawnej

### Frontend (na podstawie analizy build)
- **Technologie**: React + Vite + Tauri
- **Stylizacja**: TailwindCSS + DaisyUI
- **Aplikacja desktopowa**: Tauri (Windows/macOS/Linux)
- **Optymalizacja**: Terser minification, chunking

## Kluczowe Funkcjonalności

### 1. Przetwarzanie Dokumentów
- Upload plików prawnych
- Ekstrakcja tekstu z PDF i obrazów
- Indeksowanie wektorowe
- Deduplikacja automatyczna

### 2. System RAG
- Wyszukiwanie semantyczne w dokumentach prawnych
- Generowanie odpowiedzi opartych na kontekście
- Integracja z modelami AI (OpenRouter, Google Gemini)

### 3. Chat AI
- Interaktywny czat prawny
- Historia konwersacji
- Obsługa obrazów i dokumentów w czasie rzeczywistym

### 4. Zarządzanie Wiedzą
- Baza wiedzy prawnej (kodeksy, orzecznictwo)
- Dokumenty użytkownika
- Wektoryzacja i indeksowanie

## Struktura Katalogów
- `cache/`: Pliki cache (embeddings, baza danych)
- `tests/`: Rozszerzony zestaw testów jednostkowych i integracyjnych
- `__pycache__/`: Skompilowane pliki Python
- `.vscode/`: Konfiguracja VS Code
- Pliki główne: `api.py`, `vector_manager.py`, `build_index.py` itp.

## Technologie i Biblioteki
- **AI/ML**: OpenRouter API, Google Vision, embeddings
- **Bazy danych**: Supabase, SQLite
- **HTTP**: httpx (async)
- **Testowanie**: unittest, pytest
- **Optymalizacja**: Cache LRU, connection pooling, batch processing

## Proces Rozwoju
- **Testowanie**: Obszerne testy dla wszystkich komponentów
- **Optymalizacja**: AI Performance Optimizer dla przyspieszenia zapytań
- **Build**: Automatyczna optymalizacja dla produkcji
- **Ciągła integracja**: Sprawdzanie spójności indeksu przy starcie

## Status Projektu
- **Gotowość produkcyjna**: Tak (na podstawie analizy build)
- **Optymalizacja**: Zaawansowana (cache, parallel processing)
- **Skalowalność**: Dobra (Supabase, async operations)
- **Bezpieczeństwo**: CORS, autoryzacja Supabase

## Plany Rozwoju
Na podstawie analizy kodu i dokumentacji:
- Rozszerzenie funkcjonalności frontend
- Poprawa dokładności RAG
- Dodanie więcej źródeł prawnych
- Optymalizacja wydajności AI</content>
<parameter name="filePath">C:\Users\Marcin_Palka\moj prawnik\analiza_repozytorium.md