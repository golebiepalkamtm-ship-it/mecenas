# AI Design Prompt: Nowoczesny Interfejs LexMind AI w Stylu Awwwards

---

## 📋 KONTEKST PROJEKTU

**Nazwa projektu:** LexMind AI — Asystent Prawny  
**Typ:** Web Application (SPA)  
**Cel:** Stworzenie interfejsu użytkownika łączącego zaawansowaną funkcjonalność prawniczą z estetyką nagradzanych stron Awwwards.

**Źródło funkcjonalności:** Dokumentacja `docs/PRZEPŁYW_INFORMACJI_I_ZASADY_DZIAŁANIA.md`

---

## 🎨 WIZJA ARTYSTYCZNA

### Styl Awwwards — Charakterystyka

Interfejs ma wyglądać jak strona nagradzana w konkursach Awwwards — profesjonalny, elegancki, z "wow factor", ale bez przytłaczania użytkownika.

### Kluczowe cechy wizualne:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESTETYKA AWWARDS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✦ MINIMALIZM PREMIUM                                           │
│    → Dużo przestrzeni (whitespace)                              │
│    → Ograniczona paleta kolorów                                 │
│    → Każdy element ma cel                                       │
│                                                                  │
│  ✦ TYPOGRAFIA HEROICZNA                                         │
│    → Duże, wyraziste nagłówki                                  │
│    → Subtelne contrasty wielkości                               │
│    → Profesjonalne kroje (Inter, SF Pro, system fonts)         │
│                                                                  │
│  ✦ SZKŁO I GŁĘBIA                                              │
│    → Glassmorphism z subtelnym blur                            │
│    → Wielowarstwowe tła (parallax depth)                       │
│    → Subtelne gradienty i plamy światła                        │
│                                                                  │
│  ✦ MIKRO-ANIMACJE                                              │
│    → Płynne ease-out transitions                               │
│    → Subtelne hover states                                      │
│    → Wprowadzanie elementów przez fade+slide                    │
│    → Ningowy loading state                                      │
│                                                                  │
│  ✦ KONTRAST SPECJALNY                                           │
│    → Złote/amber accent na czarnym tle                         │
│    → Białe elementy na szarych tłach                           │
│    → Efekt "połysku" na przyciskach                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ STRUKURA APLIKACJI

### Główne widoki (Tabs)

Na podstawie dokumentacji (`Rozdział 13.1`):

| Tab | Funkcjonalność | Opis |
|-----|---------------|------|
| **Chat** | Konsultacja AI | Single + MOA mode |
| **Knowledge** | Baza Wiedzy | Wyszukiwanie prawne |
| **Drafter** | Kreator Pism | Generator dokumentów |
| **Documents** | Dokumenty | Zarządzanie plikami |
| **Settings** | Profil | Ustawienia użytkownika |
| **Admin** | Panel Admina | (tylko admin) |

---

## 🎯 WYMAGANIA FUNKCJONALNE

### 1. QUICK INTELLIGENCE PANEL (Panel Konfiguracji)

Z dokumentacji (`Rozdział 2.2`):

```
Panel musi zawierać:

1️⃣ MASTER PROMPT SECTION
   - Textarea do konfiguracji architectPrompt
   - Input dla selectedSingleModel
   
2️⃣ TASK SELECTION (5 opcji)
   - Ogólne Wsparcie Prawne (general) → navigator
   - Analiza Dokumentacji (analysis) → inquisitor
   - Kreator Pism i Umów (drafting) → draftsman
   - Research Orzecznictwa (research) → oracle
   - Strategia Procesowa (strategy) → grandmaster
   
   Każda opcja:
   - Ikona reprezentująca zadanie
   - Kolor identyfikacyjny
   - Możliwość rozwinięcia konfiguracji (taskPrompt + taskModel)
   
3️⃣ ROLE CONFIGURATION (per task)
   - textarea dla unitSystemRoles[roleId]
   - input dla roleModels[roleId]
   
4️⃣ ASSISTENTS SELECTION
   - Lista modeli LLM
   - Toggle aktywacji (multi-select)
   - Ikony dostawców (Anthropic, OpenAI, Google)
   
5️⃣ DRAFTER ENGINE
   - Dedykowany model do generowania pism
   - Select z listy aktywnych modeli
   
6️⃣ JUDGE / VERIFIER
   - Model do syntezy końcowej w trybie konsylium
   - Sekcja "Tryb Konsylium Detekcji"
```

**Design wymagania:**
- Panel wysuwany z prawej (slide-in animation)
- Glassmorphism tło z blur
- Akordeonowe sekcje z smooth expand/collapse
- Ikony jako wyróżniki zadań
- Kolorowe akcenty per kategoria (złoty, amber, emerald, purple, rose)

---

### 2. CHAT VIEW (Główny widok czatu)

```
ELEMENTY:

┌────────────────────────────────────────────────────────┐
│ SIDEBAR (opcjonalny)                                  │
│ - Lista sesji                                         │
│ - New Chat button                                     │
│ - Session preview (title, date)                      │
│ - Delete session                                      │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ MAIN CHAT AREA                                        │
│ - Wiadomości użytkownika (wyrównanie prawe)          │
│ - Wiadomości AI (wyrównanie lewe)                     │
│ - Metadata (sources, timestamp)                      │
│ - Expert analyses (w trybie MOA)                     │
│ - Skeleton loading state                              │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ INPUT AREA                                            │
│ - Multi-line textarea (auto-expand)                   │
│ - Attachment button (drag & drop support)             │
│ - Send button (z animacją)                            │
│ - RAG toggle                                          │
│ - Library selection (modal)                          │
│ - OCR progress indicators                             │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ FLOATING CONTROLS                                     │
│ - Config button (prawa strona)                        │
│ - History toggle (lewa strona)                        │
│ - Status indicators (AI thinking, encryption)         │
└────────────────────────────────────────────────────────┘
```

**Design wymagania:**
- Message bubbles z subtelnym glow dla AI
- Smooth scroll z zachowaniem pozycji
- Typing indicator z "neural orb" animation
- Floating controls z glassmorphism
- Sidebar z smooth slide-in/out

---

### 3. LOADING STATES

```
WYMAGANE STANKI:

1️⃣ SINGLE MODE LOADING
   → Skeleton lines (animowane gradient)
   → Subtelne "Generowanie strategii procesowej..."
   
2️⃣ MOA LOADING
   → Fazy: "Baza Danych" → "Zespół Ekspertów" → "Synteza Końcowa"
   → Pulsujące kropki per faza
   → Progress indicator
```

---

### 4. WELCOME VIEW (Ekran powitalny)

```
ELEMENTY:

- Logo/Brand mark
- Główne hasło (headline)
- Subheadline (value proposition)
- Feature cards (3 kolumny):
  • Prywatność (Privacy shield icon)
  • Precyzja (Target icon)  
  • Szybkość (Zap icon)
- Quick action buttons
- Animated background (subtle particles/gradient)
```

---

## 🎨 SPECYFIKACJA KOLORYSTYCZNA

### Palette (z dokumentacji + Awwwards style)

```css
:root {
  /* PRIMARY ACCENT - Złoto/PREMIUM */
  --gold-primary: #d4af37;
  --gold-light: #f4e68d;
  --gold-dark: #a3831f;
  
  /* NEUTRAL BASE */
  --bg-dark: #0a0a0a;
  --bg-card: #1a1a1a;
  --bg-glass: rgba(255, 255, 255, 0.05);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-active: rgba(212, 175, 55, 0.3);
  
  /* TEXT */
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.4);
  
  /* STATUS COLORS */
  --emerald: #10b981;
  --rose: #f43f5e;
  --amber: #f59e0b;
  --purple: #a855f7;
  
  /* GRADIENTS */
  --glass-gradient: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
  --gold-gradient: linear-gradient(135deg, #d4af37 0%, #f4e68d 50%, #d4af37 100%);
}
```

---

## ✨ ANIMACJE I MIKRO-INTERAKCJE

### Transition Specifications

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Panel slide-in | translateX + fade | 400ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Message appear | fade + translateY | 300ms | ease-out |
| Button hover | scale + glow | 200ms | ease-out |
| Accordion | height + opacity | 300ms | ease-in-out |
| Skeleton pulse | opacity gradient | 1500ms | ease-in-out, infinite |
| Orb pulse | scale + opacity | 2000ms | ease-in-out, infinite |

### Wymagane efekty:

```
1️⃣ AURORA BACKGROUND
   → Subtelne, wolno poruszające się plamy światła
   → Złote/amber tonacje
   → Canvas/WebGL lub CSS gradients
   
2️⃣ GLASSMORPHISM CARDS
   → backdrop-filter: blur(20px)
   → Subtelny border gradient
   → Inner glow dla głębi
   
3️⃣ NEURAL ORB (loading)
   → Pulsująca kula z gradientem
   → Rotating gradient animation
   
4️⃣ BUTTON PRESS
   → Scale down (0.95) na click
   → Glow effect przy hover
   
5️⃣ TEXT REVEAL
   → Mask-based reveal dla nagłówków
   → Staggered letter animation (opcjonalnie)
```

---

## 📱 RESPONSYWNOŚĆ

### Breakpoints

```css
/* Mobile First */
--mobile: 320px - 767px
--tablet: 768px - 1023px  
--desktop: 1024px - 1439px
--wide: 1440px+
```

### Adaptacje:

| Viewport | Layout |
|----------|--------|
| Mobile | Bottom nav, full-width cards, stacked elements |
| Tablet | Side nav collapsible, 2-column grids |
| Desktop | Full sidebar, 3-column layouts, floating panels |
| Wide | Max-width container (1600px), centered |

---

## 🛠️ TECHNICZNE WYMAGANIA

### Stack technologiczny (z projektu):

- **Framework:** React + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS + custom CSS
- **Animacje:** Framer Motion (preferowane) lub CSS
- **Ikony:** Lucide React
- **Stan:** Zustand (z persist)
- **Backend:** Supabase (Auth, Functions)

### Wymagania wydajnościowe:

- Lighthouse score: 90+
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Smooth 60fps animations
- Lazy loading dla heavy components

---

## 🎯 STRUKTURA PROMPTÓW DLA AI (DLA DEWELOPERA)

### Do użycia z Claude/GPT przy kodowaniu:

```
STWÓRZ KOMPLETNY INTERFEJS ZGODNY Z:

1. ESTETYKA Awwwards - premium, glassmorphism, animations
2. FUNKCJONALNOŚĆ - z dokumentacji PRZEPŁYW_INFORMACJI
3. KOLORYSTYKA - złoty accent na ciemnym tle
4. ANIMACJE - Framer Motion, smooth transitions

KOMPOENTY DO STWORZENIA:
- QuickIntelligencePanel (slide-in panel)
- ChatView (main chat interface)
- MessageBubble (styled messages)
- ChatInput (multiline with attachments)
- ChatSidebar (sessions list)
- WelcomeView (landing state)
- FeatureCards (animated cards)
- LoadingStates (skeletons, orbs)

UŻYJ:
- Tailwind CSS dla styling
- Framer Motion dla animations
- Lucide React dla icons
- Zustand dla state management

PLIKI:
- components/Chat/index.tsx
- components/Chat/components/QuickIntelligencePanel.tsx
- components/Chat/components/ChatInput.tsx
- components/Chat/components/MessageBubble.tsx
- components/Chat/components/ChatSidebar.tsx
- components/Chat/components/WelcomeView.tsx
- store/useChatSettingsStore.ts (istniejący)
```

---

## 📝 PRZYKŁADOWE ELEMENTY DO STYLIZACJI

### QuickIntelligencePanel — Szczegóły

```tsx
// Task Options z kolorami (Rozdział 7.3 dokumentacji)
const TASK_OPTIONS = [
  { id: 'general', roleId: 'navigator', label: 'Ogólne Wsparcie Prawne', 
    icon: Library, color: 'text-amber-400', bg: 'bg-amber-400/10', 
    border: 'border-amber-400/40', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.2)]' },
  { id: 'analysis', roleId: 'inquisitor', label: 'Analiza Dokumentacji',
    icon: Target, color: 'text-gold-primary', bg: 'bg-gold-primary/10',
    border: 'border-gold-primary/40', glow: 'shadow-[0_0_20px_rgba(212,175,55,0.2)]' },
  { id: 'drafting', roleId: 'draftsman', label: 'Kreator Pism i Umów',
    icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/40', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.2)]' },
  { id: 'research', roleId: 'oracle', label: 'Research Orzecznictwa',
    icon: Search, color: 'text-purple-400', bg: 'bg-purple-400/10',
    border: 'border-purple-400/40', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.2)]' },
  { id: 'strategy', roleId: 'grandmaster', label: 'Strategia Procesowa',
    icon: Scale, color: 'text-rose-400', bg: 'bg-rose-400/10',
    border: 'border-rose-400/40', glow: 'shadow-[0_0_20px_rgba(251,113,133,0.2)]' }
];
```

### Glassmorphism Classes (Tailwind)

```css
.glass-prestige {
  @apply bg-white/5 backdrop-blur-xl border border-white/10;
}

.glass-prestige-gold {
  @apply bg-gold-primary/10 backdrop-blur-xl border border-gold-primary/20;
}

.glass-prestige-embossed {
  @apply bg-gradient-to-b from-white/10 to-transparent 
         backdrop-blur-xl border-t border-white/20 border-x border-white/5;
}
```

---

## 📋 CHECKLISTA DLA WYKONAWCY

### Przed rozpoczęciem kodowania:

- [ ] Przeczytać dokumentację `PRZEPŁYW_INFORMACJI_I_ZASADY_DZIAŁANIA.md`
- [ ] Zrozumieć strukturę `useChatSettingsStore`
- [ ] Zapoznać się z istniejącymi komponentami w `frontend/src/components/Chat/`
- [ ] Zidentyfikować elementy do restylingu vs nowe elementy

### Podczas kodowania:

- [ ] Stosować consistent naming convention
- [ ] Używać istniejących utils (cn, icons z Lucide)
- [ ] Zachować responsive breakpoints
- [ ] Implementować animations z Framer Motion
- [ ] Testować na różnych viewportach

### Po kodowaniu:

- [ ] Sprawdzić Lighthouse performance
- [ ] Zweryfikować dostępność (a11y)
- [ ] Przetestować edge cases (loading, empty states, errors)

---

## 🔗 REFERENCJE

### Awwwards inspiration:

- [awwwards.com](https://www.awwwards.com/)
- Styl: "SOTD" (Site of the Day) winners
- Search: "AI SaaS", "Dark mode dashboard", "Legal tech"

### Przydatne zasoby:

- [Glassmorphism CSS](https://glassmorphism.com/)
- [Neumorphism vs Glassmorphism](https://articles.io/neumorphism-vs-glassmorphism)
- [Smooth animations](https://www.framer.com/motion/)

---

*Prompt wygenerowany na podstawie dokumentacji LexMind AI — Awwwards Style Edition*