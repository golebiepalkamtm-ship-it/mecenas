import { useState } from "react";
import { Save, Edit3, Shield, Target, BrainCircuit, Check, Info, Plus, Trash2 } from "lucide-react";
import { useChatSettingsStore } from "../../store/useChatSettingsStore";
import { cn } from "../../utils/cn";
import { API_BASE } from "../../config";

type PromptCategory = 'roles' | 'tasks' | 'architect';

const PROMPT_NEON_COLORS = [
  "#22d3ee",
  "#a855f7",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#3b82f6",
] as const;

const categorySeed: Record<PromptCategory, number> = {
  roles: 17,
  tasks: 41,
  architect: 73,
};

const PROMPT_TRANSLATIONS: Record<string, string> = {
  // Roles
  'defender': 'Obrońca',
  'proceduralist': 'Specjalista Proceduralny',
  'constitutionalist': 'Konstytucjonalista',
  'negotiator': 'Negocjator/Mediator',
  'evidencecracker': 'Analityk Dowodowy',
  'inquisitor': 'Inkwizytor (Analityk)',
  'oracle': 'Wyrocznia Prawna',
  'draftsman': 'Redaktor Pism',
  'grandmaster': 'Strateg/Arcymistrz',
  'prosecutor': 'Prokurator',
  'investigator': 'Śledczy',
  'forensic_expert': 'Biegły Sądowy',
  'hard_judge': 'Główny Analityk Śledczy',
  'sentencing_expert': 'Ekspert ds. Wyroków',
  'navigator': 'Nawigator',
  
  // Tasks
  'general': 'Diagnoza Ogólna',
  'analysis': 'Analiza Dokumentów',
  'drafting': 'Redagowanie Pism',
  'research': 'Badania i Orzecznictwo',
  'strategy': 'Plan Strategiczny',
  'criminal_defense': 'Obrona Karna',
  'rights_defense': 'Ochrona Praw',
  'document_attack': 'Atak na Dokument',
  'emergency_relief': 'Tryb Ratunkowy',
  'charge_building': 'Budowanie Zarzutów',
  'indictment_review': 'Rewizja Aktu Oskarżenia',
  'sentencing_argument': 'Argumentacja ds. Kary',
  'warrant_application': 'Wniosek o Areszt',
  
  // Presets
  'defense': 'OBRONA',
  'prosecution': 'OSKARŻENIE'
};

function translatePromptKey(key: string): string {
  const lowerKey = key.toLowerCase();
  return PROMPT_TRANSLATIONS[lowerKey] || key.toUpperCase();
}

function getPromptNeonColor(key: string, category: PromptCategory): string {
  let hash = categorySeed[category];
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PROMPT_NEON_COLORS[hash % PROMPT_NEON_COLORS.length];
}

export function PromptsView() {
  console.log('[PromptsView] Rendering...');

  const unitSystemRoles = useChatSettingsStore(s => s.unitSystemRoles);
  const addSystemRolePrompt = useChatSettingsStore(s => s.addSystemRolePrompt);
  const updateSystemRolePrompt = useChatSettingsStore(s => s.updateSystemRolePrompt);
  const removeSystemRolePrompt = useChatSettingsStore(s => s.removeSystemRolePrompt);
  const currentSystemRoleId = useChatSettingsStore(s => s.currentSystemRoleId);
  const setCurrentSystemRoleId = useChatSettingsStore(s => s.setCurrentSystemRoleId);
  const taskPrompts = useChatSettingsStore(s => s.taskPrompts);
  const addTaskPrompt = useChatSettingsStore(s => s.addTaskPrompt);
  const updateTaskPrompt = useChatSettingsStore(s => s.updateTaskPrompt);
  const removeTaskPrompt = useChatSettingsStore(s => s.removeTaskPrompt);
  const currentTask = useChatSettingsStore(s => s.currentTask);
  const setCurrentTask = useChatSettingsStore(s => s.setCurrentTask);
  const architectPrompt = useChatSettingsStore(s => s.architectPrompt);
  const setArchitectPrompt = useChatSettingsStore(s => s.setArchitectPrompt);
  const activePromptPresetId = useChatSettingsStore(s => s.activePromptPresetId);
  const applyPromptPreset = useChatSettingsStore(s => s.applyPromptPreset);

  const [activeCategory, setActiveCategory] = useState<PromptCategory>('roles');
  
  // Local state for editing to prevent lag
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [localContent, setLocalContent] = useState<string>("");
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [newPromptError, setNewPromptError] = useState<string | null>(null);

  const [isLoadingPreset, setIsLoadingPreset] = useState(false);

  const normalizePromptKey = (value: string): string => {
    return value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  const makeUniqueKey = (baseKey: string, existing: Record<string, string>): string => {
    if (!existing[baseKey]) return baseKey;

    let index = 2;
    let candidate = `${baseKey}_${index}`;
    while (existing[candidate]) {
      index += 1;
      candidate = `${baseKey}_${index}`;
    }
    return candidate;
  };

  const resetAddPromptForm = () => {
    setIsAddingPrompt(false);
    setNewPromptName("");
    setNewPromptContent("");
    setNewPromptError(null);
  };

  const loadPreset = async (presetId: 'defense' | 'prosecution') => {
    setIsLoadingPreset(true);
    try {
      const res = await fetch(`${API_BASE}/api/prompts/presets`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const preset = data?.[presetId];
      if (!preset) throw new Error(`Zestaw '${presetId}' nie został znaleziony`);

      // Use centralized applyPromptPreset action
      applyPromptPreset(presetId, preset);
    } finally {
      setIsLoadingPreset(false);
    }
  };

  const categories = [
    { id: 'roles', label: 'Eksperci (Role)', icon: Target, count: Object.keys(unitSystemRoles).length, color: 'text-black/75', rgb: '20,20,20' },
    { id: 'tasks', label: 'Zadania AI', icon: Shield, count: Object.keys(taskPrompts).length, color: 'text-black/75', rgb: '20,20,20' },
    { id: 'architect', label: 'System (Master)', icon: BrainCircuit, count: 1, color: 'text-black/75', rgb: '20,20,20' }
  ];

  const handleEdit = (key: string, content: string) => {
    setEditingKey(key);
    setLocalContent(content);
  };

  const handleSave = () => {
    if (!editingKey) return;
    
    if (activeCategory === 'roles') {
      updateSystemRolePrompt(editingKey, localContent);
    } else if (activeCategory === 'tasks') {
      updateTaskPrompt(editingKey, localContent);
    } else if (activeCategory === 'architect') {
      setArchitectPrompt(localContent);
    }
    
    setEditingKey(null);
  };

  const handleSelectActive = (key: string) => {
    if (activeCategory === 'roles') {
      setCurrentSystemRoleId(key);
    } else if (activeCategory === 'tasks') {
      setCurrentTask(key);
    }
  };

  const handleCreatePrompt = () => {
    if (activeCategory === "architect") return;

    const displayName = newPromptName.trim();
    const promptContent = newPromptContent.trim();

    if (!displayName) {
      setNewPromptError("Podaj nazwę promptu.");
      return;
    }
    if (!promptContent) {
      setNewPromptError("Podaj treść promptu.");
      return;
    }

    const baseKey = normalizePromptKey(displayName);
    if (!baseKey) {
      setNewPromptError("Nazwa zawiera niedozwolone znaki. Użyj liter i cyfr.");
      return;
    }

    if (activeCategory === "roles") {
      const finalKey = makeUniqueKey(baseKey, unitSystemRoles);
      addSystemRolePrompt(finalKey, promptContent);
    } else {
      const finalKey = makeUniqueKey(baseKey, taskPrompts);
      addTaskPrompt(finalKey, promptContent);
    }

    resetAddPromptForm();
  };

  const handleDeletePrompt = (key: string) => {
    if (activeCategory === "architect") return;

    if (activeCategory === "roles") {
      if (Object.keys(unitSystemRoles).length <= 1) return;
      const confirmed = window.confirm(`Usunąć prompt roli "${key}"?`);
      if (!confirmed) return;
      removeSystemRolePrompt(key);
    } else {
      if (Object.keys(taskPrompts).length <= 1) return;
      const confirmed = window.confirm(`Usunąć prompt zadania "${key}"?`);
      if (!confirmed) return;
      removeTaskPrompt(key);
    }

    if (editingKey === key) {
      setEditingKey(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 lg:p-10 pt-[100px] lg:pt-[120px] bg-transparent relative overflow-hidden text-black">
      <div className="absolute inset-0 noise-overlay opacity-20 pointer-events-none" />
      {/* Header */}
      {/* Preset Controls */}
      <div className="flex items-center justify-end gap-3 mb-6 shrink-0">
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-black/45 mr-auto">Zestawy Strategiczne</label>
          <button
            onClick={() => loadPreset('defense')}
            disabled={isLoadingPreset}
            className={cn(
              "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all glass-liquid-convex",
              activePromptPresetId === 'defense' ? "text-black scale-105 shadow-2xl" : "text-black/60 hover:text-black",
              isLoadingPreset ? "opacity-60 cursor-not-allowed" : ""
            )}
            title="Załaduj zestaw OBRONY (DREAM DEFENSE TEAM)"
          >
            Obrona
          </button>
          <button
            onClick={() => loadPreset('prosecution')}
            disabled={isLoadingPreset}
            className={cn(
              "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all glass-liquid-convex",
              activePromptPresetId === 'prosecution' ? "text-black scale-105 shadow-2xl" : "text-black/60 hover:text-black",
              isLoadingPreset ? "opacity-60 cursor-not-allowed" : ""
            )}
            title="Załaduj zestaw OSKARŻENIA (PROSECUTION MACHINE)"
          >
            Oskarżenie
          </button>
                  <div className={cn(
            "px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all",
            activePromptPresetId 
              ? cn(
                  "bg-black/4 text-black",
                  activePromptPresetId === 'defense' ? "border-[#064e3b]/35" : "border-red-500/35"
                )
              : "border-black/10 bg-black/3 text-black/50"
          )}>
            {activePromptPresetId ? translatePromptKey(activePromptPresetId) : "BRAK PRESETU"}
          </div>
        </div>


      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left Nav */}
        <div className="w-full lg:w-72 flex flex-col gap-2 shrink-0">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as PromptCategory);
                  setEditingKey(null);
                  resetAddPromptForm();
                }}
                className={cn(
                  "w-full text-left flex items-center justify-between p-4 rounded-xl transition-all duration-300 relative overflow-hidden group glass-liquid-convex",
                  activeCategory === cat.id 
                    ? "scale-105 z-10 shadow-2xl"
                    : "opacity-60 hover:opacity-100"
               )}
             >
               <div className="flex items-center gap-3 relative z-10">
                  <cat.icon size={18} className={activeCategory === cat.id ? cat.color : "text-black/45"} />
                  <span className={cn("font-black text-[11px] uppercase tracking-widest text-black", activeCategory === cat.id ? "" : "opacity-40")}>{cat.label}</span>
                </div>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-lg font-black z-10", activeCategory === cat.id ? "bg-black/10 text-black" : "bg-black/10 text-black/60")}>{cat.count}</span>
              </button>
            ))}

            <div className="mt-auto p-4 rounded-lg bg-gold-primary/5 border border-gold-primary/10">
               <div className="flex items-start gap-2 text-black/75">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed text-black/70">
                    Modyfikacja promptów natychmiastowo zmienia zachowanie wybranego asystenta w nowych wiadomościach. 
                    Wybieraj gotowe opcje lub dostosuj je do specyfiki swojej kancelarii.
                  </p>
               </div>
            </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col min-h-0 bg-white/20 rounded-lg border border-black/10 p-2 lg:p-4 overflow-hidden relative">
          <div className="relative z-10 mb-3 p-3 rounded-xl border border-black/10 bg-white/35 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-black/70">
                {activeCategory === "roles"
                  ? "Prompty ról ekspertów"
                  : activeCategory === "tasks"
                    ? "Prompty zadań AI"
                    : "Prompt głównego architekta"}
              </div>
              {activeCategory !== "architect" && (
                <button
                  onClick={() => {
                    setIsAddingPrompt((prev) => !prev);
                    setNewPromptError(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-liquid-convex text-[10px] font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02]"
                >
                  <Plus size={12} />
                  {isAddingPrompt ? "Zamknij" : "Dodaj prompt"}
                </button>
              )}
            </div>

            {activeCategory !== "architect" && isAddingPrompt && (
              <div className="mt-3 p-3 rounded-xl border border-black/10 bg-white/40 space-y-2.5">
                <input
                  type="text"
                  value={newPromptName}
                  onChange={(e) => {
                    setNewPromptName(e.target.value);
                    setNewPromptError(null);
                  }}
                  placeholder="Nazwa nowego promptu"
                  className="w-full h-10 rounded-lg border border-black/15 bg-white/60 px-3 text-[11px] font-semibold text-black placeholder:text-black/35 focus:outline-none focus:ring-1 focus:ring-gold-primary/40"
                />
                <textarea
                  value={newPromptContent}
                  onChange={(e) => {
                    setNewPromptContent(e.target.value);
                    setNewPromptError(null);
                  }}
                  placeholder="Treść nowego promptu"
                  className="w-full h-24 rounded-lg border border-black/15 bg-white/60 px-3 py-2 text-[11px] font-mono text-black placeholder:text-black/35 focus:outline-none focus:ring-1 focus:ring-gold-primary/40 resize-none"
                />
                {newPromptError && (
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">{newPromptError}</p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={resetAddPromptForm}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-black/60 hover:text-black transition-colors"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleCreatePrompt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-liquid-convex text-[10px] font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02]"
                  >
                    <Plus size={12} />
                    Dodaj
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
              {activeCategory === 'roles' && Object.entries(unitSystemRoles).map(([key, prompt]) => (
                  <PromptCard 
                    key={key} title={translatePromptKey(key)} content={prompt} 
                    promptKey={key}
                    isActive={currentSystemRoleId === key}
                    accentColor={getPromptNeonColor(key, 'roles')}
                    canDelete={Object.keys(unitSystemRoles).length > 1}
                    onDelete={() => handleDeletePrompt(key)}
                    onSelect={() => handleSelectActive(key)}
                    isEditing={editingKey === key}
                    localContent={localContent}
                    setLocalContent={setLocalContent}
                  onEdit={() => handleEdit(key, prompt)}
                  onSave={handleSave}
                  onCancel={() => setEditingKey(null)}
                />
             ))}

              {activeCategory === 'tasks' && Object.entries(taskPrompts).map(([key, prompt]) => (
                  <PromptCard 
                    key={key} title={translatePromptKey(key)} content={prompt} 
                    promptKey={key}
                    isActive={currentTask === key}
                    accentColor={getPromptNeonColor(key, 'tasks')}
                    canDelete={Object.keys(taskPrompts).length > 1}
                    onDelete={() => handleDeletePrompt(key)}
                    onSelect={() => handleSelectActive(key)}
                    isEditing={editingKey === key}
                    localContent={localContent}
                    setLocalContent={setLocalContent}
                  onEdit={() => handleEdit(key, prompt)}
                  onSave={handleSave}
                  onCancel={() => setEditingKey(null)}
                />
             ))}

               {activeCategory === 'architect' && (
                  <PromptCard 
                    key="architect" title="GŁÓWNY ARCHITEKT" content={architectPrompt} 
                    promptKey="architect"
                    isActive={true}
                    accentColor={getPromptNeonColor('architect', 'architect')}
                    canDelete={false}
                    onSelect={() => {}} // Architect is always active
                    isEditing={editingKey === 'architect'}
                    localContent={localContent}
                    setLocalContent={setLocalContent}
                  onEdit={() => handleEdit('architect', architectPrompt)}
                  onSave={handleSave}
                  onCancel={() => setEditingKey(null)}
                />
             )}
          </div>
        </div>

      </div>
    </div>
  );
}

interface PromptCardProps {
  promptKey: string;
  title: string;
  content: string;
  isActive: boolean;
  accentColor: string;
  canDelete: boolean;
  onDelete?: () => void;
  onSelect: () => void;
  isEditing: boolean;
  localContent: string;
  setLocalContent: (val: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

function PromptCard({ 
  promptKey, title, content, isActive, accentColor, canDelete, onDelete, onSelect, 
  isEditing, localContent, setLocalContent, onEdit, onSave, onCancel 
}: PromptCardProps) {
  const activeContainerStyle = isActive
    ? {
        borderColor: `${accentColor}90`,
        backgroundImage:
          "linear-gradient(155deg, rgba(255,255,255,0.74) 0%, rgba(255,255,255,0.45) 55%, rgba(0,0,0,0.03) 100%)",
        boxShadow: `0 0 0 1px ${accentColor}55 inset, 0 0 24px ${accentColor}55, 0 16px 36px -18px ${accentColor}cc`,
      }
    : undefined;

  const activeToggleStyle = isActive
    ? {
        backgroundColor: accentColor,
        backgroundImage:
          "linear-gradient(145deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.14) 55%, rgba(0,0,0,0.16) 100%)",
        boxShadow: `0 0 16px ${accentColor}cc, 0 0 30px ${accentColor}88, inset 0 1px 0 rgba(255,255,255,0.9)`,
      }
    : undefined;

  return (
    <div className={cn(
      "relative flex flex-col rounded-lg border transition-all duration-300",
      isActive 
        ? "border-gold-primary/30 bg-gold-primary/5" 
        : "border-black/10 bg-black/4 hover:bg-black/6"
    )} style={activeContainerStyle}>
       <div className="flex items-center justify-between p-4 border-b border-black/10">
          <div className="flex items-center gap-3">
              <button 
                onClick={onSelect}
                className={cn(
                  "w-5 h-5 rounded-lg flex items-center justify-center transition-all",
                  isActive
                    ? "text-black scale-105"
                    : "bg-black/10 border border-black/15 hover:border-gold-primary/50 text-transparent hover:text-gold-primary/50"
                 )}
                style={activeToggleStyle}
                title={isActive ? "Aktywny" : "Ustaw jako aktywny"}
              >
                <Check size={12} strokeWidth={isActive ? 3 : 2} />
              </button>
              <h3 className={cn("font-black tracking-wide text-sm", isActive ? "text-black" : "text-black/70")}>{title}</h3>
          </div>
           <div className="flex items-center gap-2">
              {isEditing ? (
                  <>
                   <button onClick={onCancel} className="px-3 py-1.5 text-[10px] font-bold text-black/50 hover:text-black transition-colors uppercase tracking-wider">Anuluj</button>
                   <button onClick={onSave} className="flex items-center gap-1.5 px-4 py-1.5 glass-liquid-convex rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xl hover:scale-105 transition-all text-black">
                      <Save size={12} /> Zapisz
                   </button>
                  </>
              ) : (
                  <>
                    {canDelete && onDelete && (
                      <button
                        onClick={onDelete}
                        className="p-2 rounded-lg bg-black/3 hover:bg-red-500/10 text-black/45 hover:text-red-600 transition-all"
                        title={`Usuń prompt ${promptKey}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <button 
                      onClick={onEdit} 
                      className="p-2 rounded-lg bg-black/3 hover:bg-gold-primary/15 text-black/50 hover:text-black transition-all"
                      title="Edytuj prompt"
                    >
                       <Edit3 size={14} />
                    </button>
                  </>
              )}
           </div>
       </div>
       <div className="p-4">
          {isEditing ? (
            <textarea
              value={localContent}
              onChange={e => setLocalContent(e.target.value)}
              className="w-full h-48 bg-white/55 border border-gold-primary/30 rounded-lg p-4 text-xs font-mono text-black focus:outline-none focus:ring-1 focus:ring-gold-primary/50 resize-none custom-scrollbar leading-relaxed"
              style={{ caretColor: "#d4af37" }}
            />
          ) : (
            <div className="text-xs font-mono text-black leading-relaxed max-h-32 overflow-hidden relative">
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-white/50 to-transparent pointer-events-none" />
              <div className="whitespace-pre-wrap">{content}</div>
            </div>
          )}
       </div>
    </div>
  );
}
