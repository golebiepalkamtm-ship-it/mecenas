import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Edit3, Check, Info, Plus, Trash2 } from "lucide-react";
import { useChatSettingsStore } from "../../store/useChatSettingsStore";
import { cn } from "../../utils/cn";
import {
  PROMPTS_SHELL,
  LibraryHero,
  LibraryStatPill,
  LibraryToolbar,
  LibraryTabRow,
  LibraryListBody,
  type LibraryTabItem,
} from "../Library/shared";
import { translatePromptKey } from "../../utils/promptLabels";

type PromptCategory = "roles" | "tasks" | "architect";

export function PromptsView() {
  const unitSystemRoles = useChatSettingsStore((s) => s.unitSystemRoles);
  const addSystemRolePrompt = useChatSettingsStore((s) => s.addSystemRolePrompt);
  const updateSystemRolePrompt = useChatSettingsStore((s) => s.updateSystemRolePrompt);
  const removeSystemRolePrompt = useChatSettingsStore((s) => s.removeSystemRolePrompt);
  const currentSystemRoleId = useChatSettingsStore((s) => s.currentSystemRoleId);
  const setCurrentSystemRoleId = useChatSettingsStore((s) => s.setCurrentSystemRoleId);
  const taskPrompts = useChatSettingsStore((s) => s.taskPrompts);
  const addTaskPrompt = useChatSettingsStore((s) => s.addTaskPrompt);
  const updateTaskPrompt = useChatSettingsStore((s) => s.updateTaskPrompt);
  const removeTaskPrompt = useChatSettingsStore((s) => s.removeTaskPrompt);
  const currentTask = useChatSettingsStore((s) => s.currentTask);
  const setCurrentTask = useChatSettingsStore((s) => s.setCurrentTask);
  const architectPrompt = useChatSettingsStore((s) => s.architectPrompt);
  const setArchitectPrompt = useChatSettingsStore((s) => s.setArchitectPrompt);
  const resetToDefaults = useChatSettingsStore((s) => s.resetToDefaults);

  const [activeCategory, setActiveCategory] = useState<PromptCategory>("architect");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [localContent, setLocalContent] = useState<string>("");
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [newPromptError, setNewPromptError] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const roleCount = Object.keys(unitSystemRoles).length;
  const taskCount = Object.keys(taskPrompts).length;

  const tabs: LibraryTabItem[] = [
    { id: "roles", label: "Eksperci", lexIcon: "judgments", count: roleCount },
    { id: "tasks", label: "Zadania AI", lexIcon: "shield", count: taskCount },
    { id: "architect", label: "Architekt", lexIcon: "prompts", count: 1 },
  ];

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

  const handleCategoryChange = (id: string) => {
    setActiveCategory(id as PromptCategory);
    setEditingKey(null);
    resetAddPromptForm();
  };

  const handleEdit = (key: string, content: string) => {
    setEditingKey(key);
    setLocalContent(content);
  };

  const handleSave = () => {
    if (!editingKey) return;
    if (activeCategory === "roles") {
      updateSystemRolePrompt(editingKey, localContent);
    } else if (activeCategory === "tasks") {
      updateTaskPrompt(editingKey, localContent);
    } else if (activeCategory === "architect") {
      setArchitectPrompt(localContent);
    }
    setEditingKey(null);
  };

  const handleSelectActive = (key: string) => {
    if (activeCategory === "roles") {
      setCurrentSystemRoleId(key);
    } else if (activeCategory === "tasks") {
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
      addSystemRolePrompt(makeUniqueKey(baseKey, unitSystemRoles), promptContent);
    } else {
      addTaskPrompt(makeUniqueKey(baseKey, taskPrompts), promptContent);
    }
    resetAddPromptForm();
  };

  const handleDeletePrompt = (key: string) => {
    if (activeCategory === "architect") return;
    if (activeCategory === "roles") {
      if (Object.keys(unitSystemRoles).length <= 1) return;
      if (!window.confirm(`Usunąć prompt roli "${key}"?`)) return;
      removeSystemRolePrompt(key);
    } else {
      if (Object.keys(taskPrompts).length <= 1) return;
      if (!window.confirm(`Usunąć prompt zadania "${key}"?`)) return;
      removeTaskPrompt(key);
    }
    if (editingKey === key) setEditingKey(null);
  };

  return (
    <div className="h-full w-full min-h-0 flex flex-col overflow-hidden px-4 sm:px-6 lg:px-8 pt-1 pb-3 sm:pb-4">
      <div className={PROMPTS_SHELL}>
        <LibraryHero
          variant="documents"
          ornament="Silnik · Instrukcje AI"
          title="Prompty"
          subtitle="Domyślnie LexMind v2 z backendu. Poniżej nadpisania ról, zadań i architekta — puste pola = bez zmian."
          badge={
            <>
              <LibraryStatPill label="Role" value={roleCount} />
              <LibraryStatPill label="Zadania" value={taskCount} />
            </>
          }
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Wyczyścić wszystkie zapisane prompty i przywrócić domyślny silnik LexMind?",
                  )
                ) {
                  resetToDefaults();
                }
              }}
              onMouseEnter={() => setHoveredAction('reset')}
              onMouseLeave={() => setHoveredAction(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl library-view-cell text-[9px] font-black uppercase tracking-widest text-black hover:border-library-accent/35 font-outfit"
            >
              Wyczyść prompty
            </button>
            <AnimatePresence>
              {hoveredAction === 'reset' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                >
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-600 mb-1">
                    Przywróć Ustawienia Fabryczne
                  </p>
                  <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider text-center">
                    Usuwa wszystkie niestandardowe prompty i ładuje domyślne.
                  </p>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px w-2 h-2 bg-white border-l border-t border-black/10 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </LibraryHero>

        <LibraryToolbar>
          <div className="flex flex-col gap-3">
            <LibraryTabRow tabs={tabs} activeId={activeCategory} onChange={handleCategoryChange} />

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2 max-w-xl rounded-xl library-view-accent-box px-3 py-2">
                <Info size={13} className="shrink-0 mt-0.5 text-gold-deep" />
                <p className="text-[10px] leading-relaxed text-black/65 font-outfit">
                  Zmiany działają w nowych wiadomościach. Aktywny prompt wybierz checkiem na karcie.
                </p>
              </div>
              {activeCategory !== "architect" && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingPrompt((prev) => !prev);
                      setNewPromptError(null);
                    }}
                    onMouseEnter={() => setHoveredAction('add')}
                    onMouseLeave={() => setHoveredAction(null)}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg library-view-cell text-[9px] font-black uppercase tracking-widest text-black hover:border-library-accent/35 font-outfit shrink-0"
                  >
                    <Plus size={12} />
                    {isAddingPrompt ? "Zamknij" : "Dodaj prompt"}
                  </button>
                  <AnimatePresence>
                    {hoveredAction === 'add' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        className="absolute top-full right-0 mt-2 w-48 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                      >
                        <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider text-center">
                          Utwórz nowy własny prompt
                        </p>
                        <div className="absolute bottom-full right-4 -mb-px w-2 h-2 bg-white border-l border-t border-black/10 rotate-45" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {activeCategory !== "architect" && isAddingPrompt && (
              <div className="p-3 rounded-xl library-view-panel space-y-2.5">
                <input
                  type="text"
                  value={newPromptName}
                  onChange={(e) => {
                    setNewPromptName(e.target.value);
                    setNewPromptError(null);
                  }}
                  placeholder="Nazwa nowego promptu"
                  className="w-full h-10 library-view-cell px-3 text-[11px] font-semibold text-black placeholder:text-black/35 outline-none focus:border-library-accent/45"
                />
                <textarea
                  value={newPromptContent}
                  onChange={(e) => {
                    setNewPromptContent(e.target.value);
                    setNewPromptError(null);
                  }}
                  placeholder="Treść nowego promptu"
                  className="w-full h-24 library-view-cell px-3 py-2 text-[11px] font-mono text-black placeholder:text-black/35 outline-none focus:border-library-accent/45 resize-none"
                />
                {newPromptError && (
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                    {newPromptError}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetAddPromptForm}
                    className="h-9 px-4 rounded-lg library-view-cell text-[9px] font-black uppercase tracking-widest text-black/60 hover:text-black font-outfit"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    onClick={handleCreatePrompt}
                    className="h-9 px-5 rounded-lg lex-btn-primary text-[9px] font-black uppercase tracking-widest font-outfit"
                  >
                    Dodaj
                  </button>
                </div>
              </div>
            )}
          </div>
        </LibraryToolbar>

        <section className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <LibraryListBody>
            {activeCategory === "roles" &&
              Object.entries(unitSystemRoles).map(([key, prompt], idx) => (
                <PromptCard
                  key={key}
                  index={idx}
                  title={translatePromptKey(key)}
                  content={prompt}
                  isActive={currentSystemRoleId === key}
                  canDelete={roleCount > 1}
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

            {activeCategory === "tasks" &&
              Object.entries(taskPrompts).map(([key, prompt], idx) => (
                <PromptCard
                  key={key}
                  index={idx}
                  title={translatePromptKey(key)}
                  content={prompt}
                  isActive={currentTask === key}
                  canDelete={taskCount > 1}
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

            {activeCategory === "architect" && (
              <PromptCard
                index={0}
                title="GŁÓWNY ARCHITEKT"
                content={architectPrompt}
                isActive
                canDelete={false}
                onSelect={() => {}}
                isEditing={editingKey === "architect"}
                localContent={localContent}
                setLocalContent={setLocalContent}
                onEdit={() => handleEdit("architect", architectPrompt)}
                onSave={handleSave}
                onCancel={() => setEditingKey(null)}
              />
            )}
          </LibraryListBody>
        </section>
      </div>
    </div>
  );
}

interface PromptCardProps {
  index: number;
  title: string;
  content: string;
  isActive: boolean;
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
  index,
  title,
  content,
  isActive,
  canDelete,
  onDelete,
  onSelect,
  isEditing,
  localContent,
  setLocalContent,
  onEdit,
  onSave,
  onCancel,
}: PromptCardProps) {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "library-view-panel transition-all duration-300",
        isActive && "ring-2 ring-library-accent/30 bg-library-accent/5",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-black/6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <button
              type="button"
              onClick={onSelect}
              onMouseEnter={() => setHoveredButton('select')}
              onMouseLeave={() => setHoveredButton(null)}
              className={cn(
                "w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0",
                isActive
                  ? "bg-gold-primary text-black scale-105 shadow-[0_0_12px_rgba(212,175,55,0.35)]"
                  : "library-view-cell text-transparent hover:text-gold-primary/50",
              )}
            >
              <Check size={12} strokeWidth={isActive ? 3 : 2} />
            </button>
            <AnimatePresence>
              {hoveredButton === 'select' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, x: -5 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: -5 }}
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-32 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                >
                  <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider text-center">
                    {isActive ? "Obecnie Aktywny" : "Ustaw jako aktywny"}
                  </p>
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white border-l border-b border-black/10 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <h3
            className={cn(
              "font-black tracking-wide text-sm uppercase font-outfit truncate",
              isActive ? "text-black" : "text-black/70",
            )}
          >
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="h-8 px-3 rounded-lg library-view-cell text-[9px] font-black uppercase tracking-widest text-black/55 hover:text-black font-outfit"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={onSave}
                className="h-8 px-4 rounded-lg lex-btn-primary text-[9px] font-black uppercase tracking-widest font-outfit inline-flex items-center gap-1.5"
              >
                <Save size={12} /> Zapisz
              </button>
            </>
          ) : (
            <>
              {canDelete && onDelete && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={onDelete}
                    onMouseEnter={() => setHoveredButton('delete')}
                    onMouseLeave={() => setHoveredButton(null)}
                    className="p-2 rounded-lg library-view-cell text-black/45 hover:text-red-600 hover:border-red-500/25 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                  <AnimatePresence>
                    {hoveredButton === 'delete' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, x: 5 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 5 }}
                        className="absolute right-full top-1/2 -translate-y-1/2 mr-3 w-32 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                      >
                        <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider text-center">
                          Usuń ten prompt
                        </p>
                        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white border-r border-t border-black/10 rotate-45" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={onEdit}
                  onMouseEnter={() => setHoveredButton('edit')}
                  onMouseLeave={() => setHoveredButton(null)}
                  className="p-2 rounded-lg library-view-cell text-black/50 hover:border-library-accent/35 hover:text-black transition-all"
                >
                  <Edit3 size={14} />
                </button>
                <AnimatePresence>
                  {hoveredButton === 'edit' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, x: 5 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: 5 }}
                      className="absolute right-full top-1/2 -translate-y-1/2 mr-3 w-32 p-3 bg-white border border-black/10 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] text-left z-9999 pointer-events-none text-black"
                    >
                      <p className="text-[8px] leading-relaxed text-black/60 font-bold uppercase tracking-wider text-center">
                        Edytuj treść
                      </p>
                      <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white border-r border-t border-black/10 rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="p-4">
        {isEditing ? (
          <textarea
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            className="w-full h-48 library-view-cell p-4 text-xs font-mono text-black outline-none focus:border-library-accent/45 resize-none custom-scrollbar leading-relaxed"
          />
        ) : (
          <div className="text-xs font-mono text-black/75 leading-relaxed max-h-32 overflow-hidden relative">
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-white/70 to-transparent pointer-events-none" />
            <div className="whitespace-pre-wrap">{content}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
