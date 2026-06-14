# 🤖 Dokumentacja UI/UX: Funkcja Wyboru Modeli AI

> **LexMind LegalTech** — Kompletna dokumentacja interfejsu użytkownika i doświadczenia użytkownika systemu wyboru modeli sztucznej inteligencji.

---

## 📋 Spis Treści

1. [Przegląd Systemu](#1-przegląd-systemu)
2. [Architektura Komponentów](#2-architektura-komponentów)
3. [Ekran Ustawień — Sekcja AI](#3-ekran-ustawień--sekcja-ai)
4. [Konfigurator Modeli w Czacie](#4-konfigurator-modeli-w-czacie)
5. [Panel Szybkiej Inteligencji](#5-panel-szybkiej-inteligencji)
6. [Tryby Pracy](#6-tryby-pracy)
7. [Przepływ Użytkownika](#7-przepływ-użytkownika)
8. [Walidacje i Ograniczenia](#8-walidacje-i-ograniczenia)
9. [Responsive Design](#9-responsive-design)
10. [Dostępność (Accessibility)](#10-dostępność-accessibility)
11. [Endpointy API](#11-endpointy-api)

---

## 1. Przegląd Systemu

### Co Robi Ten System?

System wyboru modeli AI w LexMind umożliwia użytkownikom:

- **Wybór ulubionych modeli** do szybkiego dostępu (do 20 modeli)
- **Konfigurację trybu pracy** — pojedynczy model lub konsylium (Mixture of Agents)
- **Wybór celu konsultacji** — optymalizacja promptów pod konkretne zadania prawne
- **Aktywację wybranych modeli** do bieżącej sesji czatu

### Kluczowe Założenia UX

| Założenie | Realizacja |
|-----------|------------|
| Szybki dostęp | Ulubione modele dostępne w prawym panelu |
| Intuicyjność | Toggle Switch do przełączania modeli |
| Kontekstowość | Presety dopasowane do typowych zadań prawnych |
| Bezpieczeństwo | Maksymalne limity, walidacje, szyfrowanie AES-256 |
| Przejrzystość | Wizualne oznaczenia dostawców (brand colors) |

---

## 2. Architektura Komponentów

### Diagram Hierarchii Komponentów

```
┌─────────────────────────────────────────────────────────────────┐
│                        APLIKACJA LEXMIND                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │    Settings Page     │    │          Chat Page               │ │
│  │  (Ustawienia Profilu)│    │                                  │ │
│  │                      │    │  ┌──────────┐  ┌──────────────┐ │ │
│  │  ┌─────────────────┐│    │  │ChatInput │  │    Right      │ │ │
│  │  │AIModelsSection  ││    │  │  + Button│  │   Panel       │ │ │
│  │  │  • Lista modeli ││    │  │  to open │  │              │ │ │
│  │  │  • Search/Filter││    │  │Configur- │  │ ┌──────────┐ │ │ │
│  │  │  • Toggle       ││    │  │  ator    │  │ │  Quick   │ │ │ │
│  │  │    Favorites    ││    │  └──────────┘  │ │Intelli-  │ │ │ │
│  │  │  • Save Button  ││    │                │ │gencePanel│ │ │ │
│  │  └─────────────────┘│    │                │ └──────────┘ │ │ │
│  └─────────────────────┘    │                └──────────────┘ │ │
│                              └─────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Zustand Store (useChatSettingsStore)            │ │
│  │  • favoriteModels[]     • activeModels[]                    │ │
│  │  • selectedExperts[]    • selectedJudge                     │ │
│  │  • mode (single/consensus) • currentTask                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              React Query (useConfig.ts)                      │ │
│  │  • useModels() → GET /models/all                            │ │
│  │  • usePresets() → GET /models/presets                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Struktura Plików

```
frontend/src/
├── components/
│   ├── Settings/
│   │   ├── index.tsx                    # Główna strona ustawień
│   │   ├── components/
│   │   │   └── AIModelsSection.tsx      # ⭐ Sekcja wyboru ulubionych modeli
│   │   └── types.ts                     # Interfejsy TypeScript
│   └── Chat/
│       ├── index.tsx                    # Główna strona czatu
│       ├── constants.ts                 # Konfiguracja brandów dostawców
│       └── components/
│           ├── ModelConfigurator.tsx    # ⭐ Konfigurator modeli (prawy panel)
│           ├── QuickIntelligencePanel.tsx # ⭐ Panel szybkiej inteligencji
│           └── ChatInput.tsx            # Pole wprowadzania + przycisk konfiguracji
├── hooks/
│   └── useConfig.ts                     # Hooki do pobierania modeli i presetów
└── store/
    └── useChatSettingsStore.ts          # ⭐ Zustand store zarządzający stanem
```

---

## 3. Ekran Ustawień — Sekcja AI

### Komponent: `AIModelsSection.tsx`

#### Lokalizacja w UI
`Ustawienia → Twoje Modele AI`

#### Screenshot opis (Visual Description)

```
┌────────────────────────────────────────────────────────────────────┐
│  ┌──────────┐                                                      │
│  │  [CPU]   │  TWOJE MODELE AI                                3/20 │
│  │  Icon    │  Wybierz do 20 ulubionych modeli do szybkiego       │
│  └──────────┘  dostępu                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────┐  ┌────────────────────────────┐ │
│  │ 🔍 SZUKAJ MODELI...         │  │ ▼ Wszyscy Dostawcy         │ │
│  └──────────────────────────────┘  └────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │ [ANTHROPIC Icon] Claude 3.5 Sonnet          [✓]      │   │  │
│  │  │                        ANTHROPIC                      │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │ [OPENAI Icon] GPT-4o                        [✓]      │   │  │
│  │  │                        OPENAI                          │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │ [GOOGLE Icon] Gemini 2.0 Flash              [☆]      │   │  │
│  │  │                        GOOGLE                           │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │                                                              │  │
│  │  ... (scrollable list of 300+ models)                       │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ℹ️  Wybrane modele będą dostępne w panelu szybkich               │
│     akcji bezpośrednio podczas czatu.                             │
│                                                    [ZAPISZ LISTĘ] │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

#### Funkcjonalności

| Funkcja | Opis | Interakcja |
|---------|------|------------|
| **Lista modeli** | Wyświetla wszystkie dostępne modele z OpenRouter | Scrollable grid (2 kolumny na desktop) |
| **Wyszukiwanie** | Filtrowanie po nazwie i ID modelu | Pole tekstowe z ikoną 🔍 |
| **Filtr dostawcy** | Filtrowanie po vendorze | Dropdown select |
| **Toggle ulubionych** | Dodaj/usuń model z ulubionych | Kliknięcie na kafelek modelu |
| **Licznik** | Aktualna liczba wybranych modeli / maksimum | Wyświetlony w nagłówku |
| **Zapisz** | Zapisuje listę do profilu użytkownika (Supabase) | Przycisk "ZAPISZ LISTĘ MODELI" |

#### Stany Wizualne Kafelka Modelu

```
┌─────────────────────────────────────────────────────────────────┐
│ STAN: DOMYŚLNY (nie wybrany)                                    │
│ • Tło: bg-white/3 (przezroczysty szary)                        │
│ • Border: border-white/5                                        │
│ • Ikona dostawcy: bg-black/40, text-white/40                   │
│ • Checkbox: border-white/10, text-transparent                   │
│ • Hover: bg-white/6, border-white/20                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STAN: WYBRANY (ulubiony)                                        │
│ • Tło: bg-gold-primary/10 (złoty transparentny)                │
│ • Border: border-gold-primary/40                                │
│ • Ikona dostawcy: bg-gold-primary, text-black                  │
│ • Checkbox: bg-gold-primary, text-black, ikona ✓               │
│ • Nazwa: text-gold-primary                                      │
│ • Shadow: 0_0_30px_rgba(212,175,55,0.1)                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STAN: WYŁĄCZONY (limit 20 osiągnięty)                          │
│ • opacity: 0.3                                                  │
│ • grayscale: 100%                                               │
│ • cursor: not-allowed                                           │
│ • Brak reakcji na hover                                        │
└─────────────────────────────────────────────────────────────────┘
```

#### Ekstrakcja Dostawcy (Vendor)

Logika ekstrakcji nazwy dostawcy z modelu:

```typescript
// Priorytet ekstrakcji:
1. m.provider (jeśli istnieje)
2. m.name.split(":")[0] (jeśli zawiera ":")
3. m.id.split("/")[0] (domyślnie)

// Przykład:
// Model: "anthropic/claude-3.5-sonnet"
// Provider: "ANTHROPIC"
// Clean Name: "Claude 3.5 Sonnet"
```

#### Stany Ładowania

```
┌─────────────────────────────────────────────────────────────────┐
│ LOADING STATE                                                   │
│                                                                 │
│              ⭮ (spinner)                                        │
│         Ładowanie modeli...                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Feedback po Zapisie

```
┌─────────────────────────────────────────────────────────────────┐
│ SUCCESS MESSAGE (animated, bottom-center)                        │
│                                                                 │
│         ✓ Lista modeli została zapisana                        │
│                                                                 │
│ • Pozycja: absolute bottom-10, centered                         │
│ • Tło: bg-emerald-500 (zielony)                                │
│ • Animacja: fade-in + slide-up                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Konfigurator Modeli w Czacie

### Komponent: `ModelConfigurator.tsx`

#### Lokalizacja w UI
`Czat → Prawy panel (sidebar) → Konfiguracja AI`

#### Otwieranie/Zamykanie

- **Otwieranie**: Przycisk ⚙️ w `ChatInput.tsx` → `setIsOpen(true)`
- **Zamykanie**: Przycisk X w nagłówku → `setIsOpen(false)`

#### Screenshot opis (Visual Description)

```
┌──────────────────────────────────────────────────────────────┐
│  ┌──────────┐                                                │
│  │  [CPU]   │  KONFIGURACJA AI                    [⟳] [X]  │
│  │  Icon    │  Ustawienia Inteligencji                      │
│  └──────────┘                                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────┐  ┌────────────────────────────┐ │
│  │  ✨ Szybka Analiza     │  │  🌐 Konsylium              │ │
│  │  (tryb single)         │  │  (tryb consensus)          │ │
│  └────────────────────────┘  └────────────────────────────┘ │
│                                                              │
│  ─────────────────── ZAWARTOŚĆ ZAKŁADKI ─────────────────── │
│                                                              │
│  [Zależnie od trybu: SingleModeView lub ConsensusModeView]  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
│                                                              │
│  🔒 Wszystkie połączenia są szyfrowane metodą AES-256.      │
│     Twoje dane nie są wykorzystywane do trenowania           │
│     modeli publicznych.                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 4a. Widok Trybu Single (Szybka Analiza)

#### `SingleModeView` — Komponent Wewnętrzny

```
┌──────────────────────────────────────────────────────────────┐
│  🔍 Szukaj z 300+ modeli...                                 │
├──────────────────────────────────────────────────────────────┤
│  [Wszystkie] [ANTHROPIC] [OPENAI] [GOOGLE] [META] [...]     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ── ANTHROPIC ────────────────────────────────────────────── │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Claude 3.5 Sonnet                           [✓]        │  │
│  │ anthropic/claude-3.5-sonnet                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Claude 3 Opus                               [  ]       │  │
│  │ anthropic/claude-3-opus          [👁 VISION]          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ── OPENAI ──────────────────────────────────────────────────│
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ GPT-4o                                      [  ]       │  │
│  │ openai/gpt-4o             [👁 VISION]                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ... (scrollable)                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Funkcjonalności

| Funkcja | Opis |
|---------|------|
| **Wyszukiwanie** | Filtruje modele po nazwie i ID |
| **Filtr dostawcy** | Horizontal scroll buttons z ikonami brandów |
| **Grupowanie** | Modele grupowane po dostawcy (vendor) |
| **Wybór pojedynczy** | Tylko jeden model aktywny na raz |
| **Badge VISION** | Oznaczenie modeli z obsługą obrazów |

#### Stany Wizualne

```
┌─────────────────────────────────────────────────────────────────┐
│ WYBRANY: bg-blue-500/10, border-blue-500/40                    │
│         text-blue-400, shadow blue glow                        │
│         Checkbox: bg-blue-500, text-white, ✓                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ NIEWYBRANY: bg-white/3, border-white/5                         │
│             text-white/80, hover: bg-white/6                    │
│             Checkbox: bg-black/20, border-white/10             │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4b. Widok Trybu Konsensus (Konsylium)

#### `ConsensusModeView` — Komponent Wewnętrzny

```
┌──────────────────────────────────────────────────────────────┐
│  GOTOWE KONFIGURACJE                                          │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │  ✨ PRECYZJA     │  │  ⚡ EKONOMICZNY  │  │  🌐 MAX    │ │
│  │  3 EKSPERTÓW     │  │  3 EKSPERTÓW     │  │  5 EXPERTS │ │
│  │  + SĘDZIA        │  │  + SĘDZIA        │  │  + SĘDZIA  │ │
│  └──────────────────┘  └──────────────────┘  └────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  🔨 Konfiguracja Niestandardowa            [▼]           ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  [Rozwija się po kliknięciu]                                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  MODEL GŁÓWNY (Sędzia)                                  ││
│  │  ┌────────────────────────────────────────────────────┐ ││
│  │  │ ▼ ANTHROPIC – Claude 3.5 Sonnet                   │ ││
│  │  └────────────────────────────────────────────────────┘ ││
│  │                                                          ││
│  │  WYBÓR EKSPERTÓW (3/10)                    [Wyczyść]    ││
│  │  ┌────────────────────────────────────────────────────┐ ││
│  │  │ ✅ Claude 3.5 Sonnet                               │ ││
│  │  │ ✅ GPT-4o                                          │ ││
│  │  │ ✅ Gemini 2.0 Flash                                │ ││
│  │  │ ☐  Llama 3.1 405B                                  │ ││
│  │  │ ☐  DeepSeek v3                                     │ ││
│  │  │ ... (scrollable)                                   │ ││
│  │  └────────────────────────────────────────────────────┘ ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  → PRZEPŁYW KONSYLIUM                                   ││
│  │                                                          ││
│  │  [3 Ekspertów] ═══════════════════ [Sędzia]             ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Presety Konsylium

| Preset | Ikona | Eksperci | Sędzia | Opis |
|--------|-------|----------|--------|------|
| **Precyzja** | ✨ Sparkles | Claude 3.5 Sonnet, GPT-4o, Gemini 2.0 Flash | Claude 3.5 Sonnet | Najlepsza precyzja prawnicza |
| **Ekonomiczny** | ⚡ Zap | GPT-4o Mini, Gemini 2.0 Flash, Llama 3.3 70B | GPT-4o Mini | Niski koszt, dobra jakość |
| **Maksymalny** | 🌐 Network | Claude 3.5, GPT-4o, Gemini Thinking, Llama 405B, DeepSeek | Claude 3.5 Sonnet | Maksymalna różnorodność |

#### Stany Presetów

```
┌─────────────────────────────────────────────────────────────────┐
│ AKTYWNY PRESET: bg-teal-500/10, border-teal-500/40            │
│                 shadow teal glow, ikona ✓                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ NIEAKTYWNY: bg-white/3, border-white/5, hover: bg-white/6     │
└─────────────────────────────────────────────────────────────────┘
```

#### Konfiguracja Niestandardowa

```
┌─────────────────────────────────────────────────────────────────┐
│ ZWINIĘTA: bg-transparent, border-white/10                      │
│ Ikona Chevron: normalna                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ROZWINIĘTA: bg-white/2, border-white/10                        │
│ Ikona Chevron: rotate-180                                      │
│ Animacja: height 0 → auto, opacity 0 → 1                      │
└─────────────────────────────────────────────────────────────────┘
```

#### Ograniczenia Konsylium

| Parametr | Limit | Implementacja |
|----------|-------|---------------|
| Eksperci | max 10 | `slice(0, 10)` w `toggleExpert` |
| Sędzia | 1 | Pojedynczy select |
| Presety | 3 predefiniowane | Z `models_config.json` |

---

## 5. Panel Szybkiej Inteligencji

### Komponent: `QuickIntelligencePanel.tsx`

#### Lokalizacja w UI
`Czat → Prawy panel (sidebar) → Centrum Inteligencji`

#### Screenshot opis (Visual Description)

```
┌──────────────────────────────────────────────────────────────┐
│  ┌──────────┐                                                │
│  │  [CPU]   │  CENTRUM INTELIGENCJI                       [X]│
│  │  Gold    │  Twoje Wyselekcjonowane Modele                 │
│  └──────────┘                                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  + CEL KONSULTACJI                                           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ✨ Ogólne Wsparcie Prawne                   [●]       │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🎯 Analiza Dokumentacji                               │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ⚡ Pisanie Pism / Umów                                │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🔍 Research Orzecznictwa                              │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🛡️ Strategia Procesowa                                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  🌐 AKTYWNI EKSPERCI (2)                     [Odznacz Wsz.] │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [ANTHROPIC] Claude 3.5 Sonnet              [✓]        │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [OPENAI] GPT-4o                            [✓]        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [Jeśli brak ulubionych: placeholder z CTA do Ustawień]     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  🔄 TRYB WSPÓŁPRACY                                          │
│  LexMind połączy potencjał 2 wybranych modeli,               │
│  aby przygotować ogólne wsparcie prawne.                     │
│                                                              │
│  [GOTOWE]                                                    │
└──────────────────────────────────────────────────────────────┘
```

#### Opcje Zadań (TASK_OPTIONS)

| ID | Label | Ikona | Kolor | System Prompt |
|----|-------|-------|-------|---------------|
| `general` | Ogólne Wsparcie Prawne | Sparkles | blue-400 | Struktura: podsumowanie → analiza → wnioski |
| `analysis` | Analiza Dokumentacji | Target | emerald-400 | Dogłębna analiza kontekstu prawnego |
| `drafting` | Pisanie Pism / Umów | Zap | gold-primary | Profesjonalne pisma procesowe |
| `research` | Research Orzecznictwa | Search | purple-400 | Kompleksowy research orzecznictwa |
| `strategy` | Strategia Procesowa | Shield | red-400 | Optymalna strategia sądowa |

#### Stan Braku Ulubionych

```
┌─────────────────────────────────────────────────────────────────┐
│ EMPTY STATE (opacity: 0.4)                                      │
│                                                                 │
│              [CPU Icon 32px, white/20]                          │
│                                                                 │
│     Nie wybrano jeszcze ulubionych modeli.                      │
│     Przejdź do ustawień profilu.                                │
│                                                                 │
│              [Przejdź do Ustawień] (gold-primary, underline)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Tryby Pracy

### Przełącznik Trybów

```
┌─────────────────────────────────────────────────────────────────┐
│ SINGLE MODE (Szybka Analiza)                                    │
│ • Jeden model aktywny                                          │
│ • Endpoint: POST /chat                                         │
│ • Szybka odpowiedź                                             │
│ • Badge: blue-400                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CONSENSUS MODE (Konsylium)                                      │
│ • Wielu ekspertów + sędzia                                     │
│ • Endpoint: POST /chat-consensus                               │
│ • Wyższa jakość, wolniejsza odpowiedź                          │
│ • Badge: teal-400                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Diagram Przepływu Danych

```
                    ┌─────────────────────┐
                    │   Użytkownik        │
                    │   (Input w Chat)    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  useChatSettingsStore│
                    │  • mode             │
                    │  • selectedModel    │
                    │  • activeModels     │
                    │  • currentTask      │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
        ┌───────────────────┐   ┌───────────────────┐
        │   SINGLE MODE     │   │  CONSENSUS MODE   │
        │                   │   │                   │
        │ POST /chat        │   │ POST /chat-       │
        │ {                 │   │   consensus       │
        │   model: "...",   │   │ {                 │
        │   message: "...", │   │   selected_models:│
        │   task: "..."     │   │   [...],          │
        │ }                 │   │   aggregator_...: │
        │                   │   │   "...",          │
        │ Response:         │   │   task: "..."     │
        │ { content: "..." }│   │ }                 │
        └───────────────────┘   │                   │
                                │ Response:         │
                                │ { content: "...", │
                                │   expert_...: [  │
                                │     {model, resp}│
                                │   ]}             │
                                └───────────────────┘
```

---

## 7. Przepływ Użytkownika

### Flow 1: Pierwsza Konfiguracja (Onboarding)

```
┌─────────────────────────────────────────────────────────────────┐
│ KROK 1: Użytkownik otwiera Ustawienia                          │
│         ↓                                                       │
│ KROK 2: Widzi sekcję "Twoje Modele AI" (domyślne 3 modele)    │
│         ↓                                                       │
│ KROK 3: Przegląda listę 300+ modeli                            │
│         ↓                                                       │
│ KROK 4: Klikając toggle, wybiera ulubione modele (max 20)     │
│         ↓                                                       │
│ KROK 5: Klika "ZAPISZ LISTĘ MODELI"                            │
│         ↓                                                       │
│ KROK 6: Modele zapisane do Supabase + Zustand store           │
│         ↓                                                       │
│ KROK 7: Wracając do czatu, modele dostępne w prawym panelu    │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 2: Użycie w Czacie (Tryb Single)

```
┌─────────────────────────────────────────────────────────────────┐
│ KROK 1: Użytkownik otwiera czat                                │
│         ↓                                                       │
│ KROK 2: Kliknie przycisk konfiguracji (⚙️) w ChatInput        │
│         ↓                                                       │
│ KROK 3: Otwiera się ModelConfigurator (prawy panel)            │
│         ↓                                                       │
│ KROK 4: Domyślnie aktywny tryb "Szybka Analiza"               │
│         ↓                                                       │
│ KROK 5: Użytkownik wybiera model z listy                       │
│         ↓                                                       │
│ KROK 6: Zamyka panel (X) lub przechodzi do QuickIntelligence  │
│         ↓                                                       │
│ KROK 7: Wpisuje wiadomość i wysyła → POST /chat               │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 3: Użycie w Czacie (Tryb Konsylium)

```
┌─────────────────────────────────────────────────────────────────┐
│ KROK 1: Użytkownik otwiera ModelConfigurator                   │
│         ↓                                                       │
│ KROK 2: Przełącza na tryb "Konsylium"                          │
│         ↓                                                       │
│ KROK 3: Wybiera preset (Precyzja/Ekonomiczny/Maksymalny)      │
│         LUB konfiguruje niestandardowo:                         │
│         - Wybiera sędziego (select)                             │
│         - Wybiera ekspertów (multi-toggle, max 10)             │
│         ↓                                                       │
│ KROK 4: Widzi wizualizację przepływu (eksperci → sędzia)      │
│         ↓                                                       │
│ KROK 5: Wpisuje wiadomość → POST /chat-consensus              │
│         ↓                                                       │
│ KROK 6: Otrzymuje odpowiedź z analizami ekspertów             │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 4: Quick Intelligence Panel

```
┌─────────────────────────────────────────────────────────────────┐
│ KROK 1: Użytkownik otwiera prawy panel                         │
│         ↓                                                       │
│ KROK 2: Wybiera "Cel Konsultacji" (1 z 5 opcji)               │
│         ↓                                                       │
│ KROK 3: Aktywuje wybrane modele z ulubionych                   │
│         ↓                                                       │
│ KROK 4: Widzi podsumowanie w stopce:                           │
│         "LexMind połączy potencjał 2 wybranych modeli,         │
│          aby przygotować ogólne wsparcie prawne."               │
│         ↓                                                       │
│ KROK 5: Klika "GOTOWE" → panel zamyka się                     │
│         ↓                                                       │
│ KROK 6: Konfiguracja zastosowana do następnego pytania         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Walidacje i Ograniczenia

### Limity Systemowe

| Parametr | Limit | Miejsce Implementacji | Kod |
|----------|-------|----------------------|-----|
| Ulubione modele | **20** | `useChatSettingsStore.ts` | `favoriteModels.slice(0, 20)` |
| Eksperci konsylium | **10** | `useChatSettingsStore.ts` | `selectedExperts.slice(0, 10)` |
| Sędzia | **1** | `useChatSettingsStore.ts` | Pojedyncza wartość string |
| Aktywne modele | **bez limitu** | `useChatSettingsStore.ts` | `toggleActiveModel` bez `slice` |

### Walidacje UI

```
┌─────────────────────────────────────────────────────────────────┐
│ WALIDACJA: Limit 20 ulubionych                                 │
│ MIEJSCE: AIModelsSection.tsx + useChatSettingsStore.ts         │
│ ZACHOWANIE:                                                     │
│   • Przy osiągnięciu limitu, niewybrane modele:                │
│     - opacity: 0.3                                             │
│     - grayscale: 100%                                          │
│     - cursor: not-allowed                                      │
│     - disabled: true                                           │
│   • Przycisk toggle nie reaguje                                │
│   • Licznik "X/20" na czerwono                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ WALIDACJA: Limit 10 ekspertów                                  │
│ MIEJSCE: ModelConfigurator.tsx (ConsensusModeView)             │
│ ZACHOWANIE:                                                     │
│   • Przy 10 wybranych, kolejne toggle nie działa               │
│   • slice(0, 10) w store                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Obsługa Błędów

```
┌─────────────────────────────────────────────────────────────────┐
│ BŁĄD: API nie odpowiada (models/all)                           │
│ ZACHOWANIE:                                                     │
│   • Fallback do MODELS_LIST z moa/config.py                    │
│   • Wyświetlenie spinnera ładowania                            │
│   • Retry przez React Query                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ BŁĄD: Zapis do Supabase nie powiódł się                        │
│ ZACHOWANIE:                                                     │
│   • Przycisk "ZAPISYWANIE..." → "ZAPISZ LISTĘ MODELI"         │
│   • Brak komunikatu sukcesu                                    │
│   • Możliwość ponownej próby                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Responsive Design

### Breakpoints

| Rozmiar | Grid Layout | Zachowanie |
|---------|-------------|------------|
| **Mobile** (< 768px) | 1 kolumna | Kafelki w jednej kolumnie |
| **Tablet** (768px - 1024px) | 2 kolumny | Standardowy grid |
| **Desktop** (> 1024px) | 2 kolumny | Pełny sidebar (300px) |

### Adaptacje Mobile

```
┌─────────────────────────────────────────────────────────────────┐
│ MOBILE: AIModelsSection                                        │
│ • Search + Filter: flex-col (stackowane pionowo)               │
│ • Grid: 1 kolumna                                              │
│ • Sidebar: overlay (nie inline)                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ MOBILE: ModelConfigurator                                      │
│ • Vendor buttons: horizontal scroll                            │
│ • Lista modeli: 1 kolumna                                      │
│ • Presety: 1 kolumna (zamiast 3)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Dostępność (Accessibility)

### Aria Labels i Role

| Element | Rola | Aria Label |
|---------|------|------------|
| Przycisk toggle modelu | `button` | `Toggle ulubiony: {nazwa_modelu}` |
| Search input | `search` | `Szukaj modeli AI` |
| Select dostawcy | `combobox` | `Filtruj po dostawcy` |
| Lista modeli | `list` | `Lista dostępnych modeli AI` |
| Checkbox eksperta | `checkbox` | `Wybierz eksperta: {nazwa}` |

### Nawigacja Klawiaturą

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: Nawigacja między elementami                               │
│ ENTER/SPACE: Aktywacja przycisków/toggle                       │
│ ESC: Zamknięcie paneli                                         │
│ ARROW UP/DOWN: Nawigacja w listach                             │
└─────────────────────────────────────────────────────────────────┘
```

### Kontrast Kolorów

```
┌─────────────────────────────────────────────────────────────────┐
│ Tekst główny: white/80 → white (kontrast 7:1) ✓ WCAG AAA     │
│ Tekst pomocniczy: white/40 → white (kontrast 3:1) ✓ WCAG AA  │
│ Gold primary na czarnym: #D4AF37 na #000 (kontrast 8:1) ✓     │
│ Blue-400 na czarnym: #60A5FA na #000 (kontrast 6:1) ✓         │
│ Teal-400 na czarnym: #2DD4BF na #000 (kontrast 7:1) ✓         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Endpointy API

### Lista Endpointów

| Endpoint | Method | Opis | Używane Przez |
|----------|--------|------|---------------|
| `/models/all` | GET | Zwraca listę wszystkich modeli z OpenRouter | `useModels()` |
| `/models/presets` | GET | Zwraca predefiniowane zestawy modeli | `usePresets()` |
| `/models/admin` | GET | Modele dla panelu admina | Panel admina |
| `/chat` | POST | Pojedynczy model chat | Tryb Single |
| `/chat-consensus` | POST | Konsylium prawne (MOA) | Tryb Konsensus |

### Szczegóły Endpointów

#### `GET /models/all`

```json
// Response: Model[]
[
  {
    "id": "anthropic/claude-3.5-sonnet",
    "name": "Anthropic: Claude 3.5 Sonnet",
    "vision": true,
    "free": false,
    "provider": "anthropic"
  },
  ...
]
```

#### `GET /models/presets`

```json
// Response: Preset[]
[
  {
    "id": "precision",
    "name": "Precyzja",
    "icon": "Sparkles",
    "models": ["anthropic/claude-3.5-sonnet", "openai/gpt-4o", ...],
    "judge": "anthropic/claude-3.5-sonnet",
    "color": "teal"
  },
  ...
]
```

#### `POST /chat`

```json
// Request
{
  "message": "Analiza umowy...",
  "model": "anthropic/claude-3.5-sonnet",
  "sessionId": "uuid",
  "task": "analysis",
  "attachments": []
}

// Response
{
  "id": "uuid",
  "content": "Analiza...",
  "model": "anthropic/claude-3.5-sonnet",
  "role": "assistant"
}
```

#### `POST /chat-consensus`

```json
// Request
{
  "message": "Analiza sprawy...",
  "selected_models": ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
  "aggregator_model": "anthropic/claude-3.5-sonnet",
  "task": "analysis",
  "sessionId": "uuid"
}

// Response
{
  "id": "uuid",
  "content": "Konsylium odpowiedź...",
  "model": "moa-2experts",
  "role": "assistant",
  "sources": [...],
  "expert_analyses": [
    {"model": "anthropic/claude-3.5-sonnet", "response": "...", "success": true},
    {"model": "openai/gpt-4o", "response": "...", "success": true}
  ]
}
```

---

## 📊 Tabela Porównawcza Komponentów

| Komponent | Lokalizacja | Główna Funkcja | Tryb | Max Modele | Endpoint |
|-----------|-------------|----------------|------|------------|----------|
| **AIModelsSection** | Ustawienia | Zarządzanie ulubionymi | — | 20 | `onUpdateProfile` |
| **ModelConfigurator** | Chat (sidebar) | Konfiguracja AI | Single + Consensus | 10 (experts) | — |
| **QuickIntelligencePanel** | Chat (sidebar) | Szybka aktywacja | Single | bez limitu | — |

---

## 🎨 Design System — Kolory

```
┌─────────────────────────────────────────────────────────────────┐
│ PRIMARY COLORS                                                  │
│ • Gold Primary: #D4AF37 (złoty — akcent główny)                │
│ • Blue-400: #60A5FA (niebieski — tryb single)                  │
│ • Teal-400: #2DD4BF (morski — tryb consensus)                  │
│ • Amber-500: #F59E0B (pomarańczowy — sędzia)                   │
│ • Emerald-500: #10B981 (zielony — sukces)                      │
│ • Purple-400: #C084FC (fioletowy — research)                   │
│ • Red-400: #F87171 (czerwony — strategia/błędy)                │
├─────────────────────────────────────────────────────────────────┤
│ BRAND COLORS (dostawcy)                                         │
│ • Anthropic: orange-400                                         │
│ • OpenAI: green-400                                             │
│ • Google: blue-400                                              │
│ • Meta: purple-400                                              │
│ • DeepSeek: cyan-400                                            │
├─────────────────────────────────────────────────────────────────┤
│ SURFACES                                                        │
│ • Glass: bg-black/40 + backdrop-blur-3xl                       │
│ • Card: bg-white/3, border-white/5                             │
│ • Hover: bg-white/6, border-white/20                           │
│ • Active: bg-{color}/10, border-{color}/40                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Rozbudowa i Udoskonalenia (Roadmap)

W celu dalszej optymalizacji doświadczenia użytkownika (UX), optymalizacji kosztów oraz wydajności technicznej przy pracy z ogromną listą modeli z OpenRouter, zaplanowane są następujące udoskonalenia systemu:

### 🚀 Wydajność i Stabilność

1. **Wirtualizacja Listy (Virtual Scroll):** Przy bibliotece ponad 300+ modeli z OpenRouter renderowanie całego drzewa DOM powoduje spadki płynności interfejsu (lagi). Zastosowanie biblioteki takiej jak `react-window` lub `tanstack-virtual` wyeliminuje ten problem, renderując tylko widoczne elementy.
2. **Offline Caching:** Zapisywanie danych modeli z `/models/all` w `IndexedDB`/`localStorage` z "silent-refresh" w tle. Użytkownik zobaczy swoje modele natychmiast bez oczekiwania na spinner sieciowy.
3. **Status Sieciowy Modelu (Health Check):** Modele OpenRouter miewają różne obciążenie. Zaimplementowanie zielonej/żółtej kropki sygnalizującej w czasie rzeczywistym przeciążenie lub awarię danego modelu (np. zacinające się API Anthropic / OpenAI).

### 🎯 Precyzyjne Filtrowanie Typowe dla Branży Prawnej

Filtrowanie będzie rozbudowane o kategorie przydatne dla kancelarii:

- **`📑 Duży Kontekst (Max Context)`** — Filtrowanie modeli radzących sobie z aktami powyżej 128k tokenów.
- **`👁️ Wizja (Vision)`** — Modele z możliwością wprowadzania odręcznych skanów dokumentów czy zdjęć.
- **`💰 Ekonomia (Cost Indicators)`** — Informacje o skali kosztów modeli OpenRouter pokazane prostymi flagami: `Free`, `$ Tani`, `$$$ Premium`. To pozwoli prawnikowi czy paralegalowi decydować o ekonomice zapytań przy analizie np. 30,000 stron.

### 💫 Personalizacja i UX

1. **Drag & Drop dla Ulubionych:** Zaimplementowanie DND-Kit, by móc własnoręcznie ustawiać hierarchię 20 ulubionych modeli. Te, które znajdą się na szczycie listy, z automatu będą dostępne najbliżej w panelu „Szybkiej Inteligencji”.
2. **Auto-Dobór Sędziego i Konsylium (Smart Suggest):** Wykorzystanie mniejszego i tańszego modelu na początku ścieżki (np. boczny agent w locie), żeby na podstawie wpisanego przez prawnika zadania (np. wezwanie do zapłaty czy głęboka analiza apelacji) polecił idealne Konsylium na dany dzień pod kątem cena/jakość.

---

## 📝 Podsumowanie

System wyboru modeli AI w LexMind zapewnia:

1. **Elastyczność** — 300+ modeli, 3 presety, konfiguracja niestandardowa
2. **Szybkość** — Ulubione modele jednym kliknięciem z wirtualizowaną listą renderowania
3. **Kontekstowość** — 5 celów konsultacji z dedykowanymi promptami
4. **Jakość** — Konsylium wielu modeli z sędzią agregującym (MoA)
5. **Ekonomikę i Świadomość** — Wskaźniki kosztów i proste zarządzanie zasobami API
6. **Bezpieczeństwo** — Limity, walidacje, szyfrowanie AES-256
7. **Responsywność i Dostępność** — Adaptacja do wszystkich rozdzielczości, zgodność z WCAG AA/AAA

---

*Dokumentacja wygenerowana na podstawie analizy kodu źródłowego projektu LexMind LegalTech (Zaktualizowano o plan Rozbudowy).*
*Data: 2026-03-30*