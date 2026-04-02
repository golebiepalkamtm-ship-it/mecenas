import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ChatSettingMode = 'single' | 'consensus' | 'moa';

interface ChatSettingsState {
  // Panel visibility
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  toggleOpen: () => void;

  // Mode
  mode: ChatSettingMode;
  setMode: (mode: ChatSettingMode) => void;

  // Single model selection
  selectedSingleModel: string;
  setSelectedSingleModel: (modelId: string) => void;

  // Consensus (MOA) selection
  selectedExperts: string[];
  toggleExpert: (modelId: string) => void;
  setExperts: (modelIds: string[]) => void;
  selectedJudge: string;
  setSelectedJudge: (modelId: string) => void;

  // Favorites (Max 20)
  favoriteModels: string[];
  setFavoriteModels: (modelIds: string[]) => void;
  toggleFavorite: (modelId: string) => void;

  // Active Models in the right panel
  activeModels: string[];
  setActiveModels: (modelIds: string[]) => void;
  toggleActiveModel: (modelId: string) => void;

  // Hierarchical Prompt System
  architectPrompt: string;
  setArchitectPrompt: (prompt: string) => void;

  currentSystemRoleId: string;
  setCurrentSystemRoleId: (id: string) => void;
  unitSystemRoles: Record<string, string>;
  updateSystemRolePrompt: (id: string, prompt: string) => void;

  currentTask: string;
  setCurrentTask: (task: string) => void;
  taskPrompts: Record<string, string>;
  updateTaskPrompt: (taskId: string, prompt: string) => void;

  // Settings Tab Navigation
  currentSettingsTab: string;
  setSettingsTab: (tab: string) => void;

  // History visibility
  showHistory: boolean;
  setShowHistory: (val: boolean) => void;

  drafterModel: string;
  setDrafterModel: (model: string) => void;

  // Reset
  resetToDefaults: () => void;
}

const DEFAULTS = {
  mode: 'single' as ChatSettingMode,
  selectedSingleModel: '', // No default model
  selectedExperts: [],
  selectedJudge: '', // No default judge - user must choose
  favoriteModels: [],
  activeModels: [],
  
  // Master Prompt
  architectPrompt: `[CORE_LOGIC_OVERRIDE]
Jesteś Meta-Ekspertem Prawa LexMind. Twój proces myślowy jest nadrzędny wobec wszystkich agentów. Operujesz na danych z <legal_context>.

[OPERATIONAL_DIRECTIVES]
- Data Sovereignty: Prawda obiektywna pochodzi TYLKO z bazy RAG. Każde stwierdzenie niepoparte artykułem z <legal_context> musi być oznaczone jako [HIPOTEZA].
- Persona Adaptation:
    - Obywatel: Empatia, dekonstrukcja żargonu (ELI5), jasna ścieżka pomocy.
    - Biznes: Analiza ryzyka (P&L), pragmatyka, brak zbędnych przymiotników.
    - Pro: Rigor prawny, doktryna, łacińskie paremie, precyzyjne odniesienia do ustępów i punktów.
- Verification Layer: Zanim wygenerujesz odpowiedź, wykonaj wewnętrzny "Self-Correction Loop": "Czy ta interpretacja nie narusza hierarchii aktów prawnych?".
- Safety Buffer: Nigdy nie obiecuj 100% wygranej. Operuj prawdopodobieństwem i stopniem ryzyka.`,

  currentSystemRoleId: 'navigator',
  unitSystemRoles: {
    navigator: `[SYSTEM_ROLE: THE NAVIGATOR]
Jesteś Wielowymiarowym Diagnostą Prawnym. Twoim zadaniem jest mapowanie chaosu informacyjnego użytkownika na sztywną strukturę kodeksową. Twoja osobowość to połączenie spokoju chirurga z precyzją analityka danych. Nie oceniasz – kategoryzujesz i wskazujesz drogę wyjścia.`,
    inquisitor: `[SYSTEM_ROLE: THE INQUISITOR]
Jesteś Starszym Rewidentem Kontraktowym. Twoją misją jest 'zniszczenie' dokumentu w celu znalezienia w nim każdej mikroskopijnej nieszczelności. Działaj w paradygmacie Adversarial Thinking. Twoim sukcesem jest znalezienie ryzyka, którego nikt inny nie zauważył.`,
    draftsman: `[SYSTEM_ROLE: THE DRAFTSMAN]
Jesteś Elitarnym Architektem Tekstów Prawnych. Piszesz teksty, które są odporne na ataki procesowe. Twoja stylistyka jest surowa, profesjonalna i skrajnie logiczna. Każde zdanie musi być sformułowane tak, aby sąd nie miał wątpliwości co do intencji autora.`,
    oracle: `[SYSTEM_ROLE: THE ORACLE]
Jesteś Głównym Analitykiem Linii Orzeczniczych. Nie czytasz przepisów – czytasz wyroki. Rozumiesz niuanse między 'może' a 'powinien' w interpretacji sądów. Twoim zadaniem jest przewidzenie wyroku na podstawie statystyki orzeczniczej z dostarczonego kontekstu.`,
    grandmaster: `[SYSTEM_ROLE: THE GRANDMASTER]
Jesteś Szefem Strategii Procesowej. Twoim polem bitwy jest sala sądowa i urząd. Jesteś makiaweliczny w planowaniu, ale zawsze działasz w granicach etyki. Widzisz słabości przeciwnika zanim on je dostrzeże. Twoja strategia to szach-mat w 3 ruchach.`
  },

  currentTask: 'general',
  taskPrompts: {
    general: `[TASK: MULTI-LEVEL_LEGAL_DIAGNOSIS]
1. Conflict Topology: Zidentyfikuj strony sporu i ich pozycję prawną (np. konsument vs przedsiębiorca).
2. Context Anchoring: Wyciągnij z <legal_context> kluczowe definicje legalne mające zastosowanie w sprawie.
3. The Solution Path: Skonstruuj 'Drzewo Decyzyjne': 'Jeśli zrobisz X, stanie się Y. Jeśli wybierzesz Z, ryzykujesz W'.
4. Human-Centric Summary: Zakończ sekcją 'Co to oznacza dla Ciebie w prostych słowach?'.`,
    analysis: `[TASK: ADVERSARIAL_DOCUMENT_AUDIT]
1. Structural Integrity Check: Sprawdź, czy dokument posiada wszystkie klauzule niezbędne dla swojej natury (essentialia negotii).
2. Abusive Clause Detection: Przeskanuj pod kątem klauzul niedozwolonych (rejestr UOKiK) i naruszeń równowagi stron.
3. Risk Heatmap: Stwórz tabelę: [Klauzula] | [Ryzyko] | [Skala 1-10] | [Proponowana Kontr-Klauzula].
4. Hidden Traps: Wskaż terminy dorozumiane i pułapki terminowe (np. milcząca zgoda).`,
    drafting: `[TASK: BULLETPROOF_DRAFTING]
1. Formal Compliance: Zastosuj rygorystyczny format właściwy dla danego pisma (np. art. 126 KPC).
2. Logic Chaining: Buduj argumentację: Podstawa Prawna -> Stan Faktyczny -> Subsumcja (Połączenie).
3. Strategic Placeholders: Użyj [[DYNAMIC_FIELDS]] dla danych wrażliwych z jasną instrukcją: 'TUTAJ WPISZ DATĘ OTRZYMANIA WYPOWIEDZENIA'.
4. Final Polish: Sprawdź spójność terminologiczną (czy 'Sprzedawca' nie stał się nagle 'Zbywcą').`,
    research: `[TASK: JURISPRUDENCE_SYNTHESIS]
1. Case Law Matrix: Porównaj wyroki z <legal_context>. Znajdź punkty wspólne i rozbieżności.
2. Precedent Analysis: Wskaż na uchwały mające moc zasady prawnej.
3. Judicial Bias Identification: Określ, jak sądy zazwyczaj interpretują niejasności w tym konkretnym typie spraw.
4. The Winning Argument: Wyizoluj jeden argument, który w 90% przypadków przekonuje sędziego/organ w tym temacie.`,
    strategy: `[TASK: STRATEGIC_WAR_ROOM_PLAN]
1. Offensive/Defensive Posture: Określ, czy w tej sprawie atakujemy (inicjatywa), czy budujemy twierdzę (obrona).
2. Evidence Inventory: Zrób listę dowodów 'Must-Have' na podstawie ciężaru dowodu (art. 6 k.c. lub art. 74 KPK).
3. Anticipatory Response: Napisz 3 najbardziej prawdopodobne argumenty przeciwnika i przygotuj na nie natychmiastowe 'Zarzuty' (np. zarzut przedawnienia, zarzut potrącenia).
4. Tactical Timeline: Rozpisz harmonogram od wezwania do przedsądowego, aż po ewentualną apelację.`
  }
};

// Removed aggressive force clear to allow persistence

export const useChatSettingsStore = create<ChatSettingsState>()(
  persist(
    (set) => ({
      isOpen: true,
      setIsOpen: (isOpen) => set({ isOpen }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

      currentSettingsTab: 'Profil',
      setSettingsTab: (currentSettingsTab) => set({ currentSettingsTab }),

      mode: DEFAULTS.mode,
      setMode: (mode) => set({ mode }),

      selectedSingleModel: DEFAULTS.selectedSingleModel,
      setSelectedSingleModel: (selectedSingleModel) => set({ selectedSingleModel }),

      selectedExperts: [...DEFAULTS.selectedExperts],
      toggleExpert: (id) => set((state) => ({
        selectedExperts: state.selectedExperts.includes(id)
          ? state.selectedExperts.filter((m) => m !== id)
          : [...state.selectedExperts, id].slice(0, 10)
      })),
      setExperts: (selectedExperts) => set({ selectedExperts: selectedExperts.slice(0, 10) }),

      selectedJudge: DEFAULTS.selectedJudge,
      setSelectedJudge: (selectedJudge) => set({ selectedJudge }),

      favoriteModels: [...DEFAULTS.favoriteModels],
      setFavoriteModels: (favoriteModels) => set({ favoriteModels: favoriteModels.slice(0, 20) }),
      toggleFavorite: (id) => set((state) => ({
        favoriteModels: state.favoriteModels.includes(id)
          ? state.favoriteModels.filter(m => m !== id)
          : [...state.favoriteModels, id].slice(0, 20)
      })),

      activeModels: [], // FORCE EMPTY - no defaults
      setActiveModels: (activeModels) => set({ activeModels }),
      toggleActiveModel: (id) => set((state) => ({
        activeModels: state.activeModels.includes(id)
          ? state.activeModels.filter(m => m !== id)
          : [...state.activeModels, id]
      })),

      // Prompts Hierarchy
      architectPrompt: DEFAULTS.architectPrompt,
      setArchitectPrompt: (architectPrompt) => set({ architectPrompt }),

      currentSystemRoleId: DEFAULTS.currentSystemRoleId,
      setCurrentSystemRoleId: (currentSystemRoleId) => set({ currentSystemRoleId }),
      unitSystemRoles: { ...DEFAULTS.unitSystemRoles },
      updateSystemRolePrompt: (id, prompt) => set((state) => ({
        unitSystemRoles: { ...state.unitSystemRoles, [id]: prompt }
      })),

      currentTask: DEFAULTS.currentTask,
      setCurrentTask: (currentTask) => set({ currentTask }),
      taskPrompts: { ...DEFAULTS.taskPrompts },
      updateTaskPrompt: (taskId, prompt) => set((state) => ({
        taskPrompts: { ...state.taskPrompts, [taskId]: prompt }
      })),

      showHistory: true, // Show by default
      setShowHistory: (showHistory) => set({ showHistory }),

      drafterModel: "google/gemini-2.0-flash-exp",
      setDrafterModel: (drafterModel) => set({ drafterModel }),

      resetToDefaults: () => set({
        mode: DEFAULTS.mode,
        selectedSingleModel: DEFAULTS.selectedSingleModel,
        selectedExperts: [...DEFAULTS.selectedExperts],
        selectedJudge: DEFAULTS.selectedJudge,
        favoriteModels: [...DEFAULTS.favoriteModels],
        activeModels: [], // FORCE EMPTY
        architectPrompt: DEFAULTS.architectPrompt,
        currentSystemRoleId: DEFAULTS.currentSystemRoleId,
        unitSystemRoles: { ...DEFAULTS.unitSystemRoles },
        currentTask: DEFAULTS.currentTask,
        taskPrompts: { ...DEFAULTS.taskPrompts },
      }),
    }),
    {
      name: 'lexmind-chat-persistent-settings-v11', 
      version: 11
    }
  )
);
