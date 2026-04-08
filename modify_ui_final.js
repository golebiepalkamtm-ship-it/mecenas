const fs = require('fs');

const panelPath = 'c:\\Users\\Marcin_Palka\\moj prawnik\\frontend\\src\\components\\Chat\\components\\QuickIntelligencePanel.tsx';
let content = fs.readFileSync(panelPath, 'utf8');

// Update icons
content = content.replace(
  '  Terminal\n} from \'lucide-react\';',
  '  Terminal,\n  Shield,\n  Sword,\n  Gavel,\n  FileWarning,\n  Siren,\n  Eye,\n  CheckCircle2,\n  Zap\n} from \'lucide-react\';'
);

// Inject renderTaskButton logic
const taskSelectionStart = '  const handleTaskSelection = (task: typeof TASK_OPTIONS[0]) => {';
const renderTaskButton = `  const renderTaskButton = (task: typeof TASK_OPTIONS[0]) => {
    const isActive = currentTask === task.id;
    return (
      <div key={task.id} className="relative w-full flex flex-col gap-1">
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleTaskSelection(task)}
          className={cn(
            "group flex items-center gap-4 p-3 rounded-2xl border transition-all text-left relative overflow-hidden w-full cursor-pointer outline-none active:scale-[0.98]",
            isActive 
              ? cn(task.bg, task.border, task.glow, "shadow-2xl border-t-white/30 backdrop-blur-xl bg-white/5") 
              : "bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10"
          )}
        >
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border relative z-10 transition-all duration-500",
            isActive 
              ? cn(task.color.replace('text-', 'bg-'), "border-white/40 text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]") 
              : "bg-black/40 border-white/10 text-white/40 group-hover:text-white/60"
          )}>
            <task.icon size={16} strokeWidth={isActive ? 2.5 : 1.5} />
          </div>
          <div className="flex flex-col relative z-20">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-[0.1em] transition-colors leading-none", 
              isActive ? "text-white" : "text-white/60 group-hover:text-white/90"
            )}>
              {task.label}
            </span>
            <span className="text-[7.5px] font-bold text-white/20 mt-1 uppercase tracking-widest group-hover:text-white/30 transition-colors">
              Role: {task.roleId.toUpperCase()}
            </span>
          </div>
          {isActive && (
            <div className="ml-auto relative z-10 flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingConfigForTask(editingConfigForTask === task.id ? null : task.id);
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-white/10 border border-white/20 hover:bg-white/20"
              >
                <Settings2 size={12} className="text-white" />
              </button>
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 backdrop-blur-md">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
            </div>
          )}
          {/* Liquid Glass Highlight */}
          {isActive && (
            <div className="absolute inset-0 bg-linear-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
          )}
          {isActive && (
            <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
          )}
        </div>
        
        <AnimatePresence>
          {isActive && editingConfigForTask === task.id && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pb-1 px-0.5">
              <div className="mt-1 p-4 bg-black/60 border border-white/10 rounded-2xl space-y-4 shadow-2xl backdrop-blur-2xl">
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-gold-primary animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                   <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/80">Konfiguracja Agentów</span>
                 </div>
                 <div className="space-y-4 pt-1">
                   <div className="relative">
                     <div className="absolute -top-2 left-3 px-2 bg-[#0c0c0e] text-[7px] font-black text-white/40 uppercase tracking-[0.3em] z-10">Prompt Zadania</div>
                     <textarea 
                        value={taskPrompts[task.id] || ""}
                        onChange={e => updateTaskPrompt(task.id, e.target.value)}
                        className="w-full h-24 bg-white/2 border border-white/5 rounded-xl p-3 text-white/90 font-mono text-[9px] focus:border-gold-primary/30 focus:bg-white/5 outline-none transition-all scrollbar-hide resize-none"
                     />
                   </div>
                   <div className="relative">
                     <div className="absolute -top-2 left-3 px-2 bg-[#0c0c0e] text-[7px] font-black text-white/40 uppercase tracking-[0.3em] z-10">Model Dedykowany</div>
                     <input 
                        value={taskModels[task.id] || ""}
                        onChange={e => updateTaskModel(task.id, e.target.value)}
                        placeholder="np. gpt-4o"
                        className="w-full bg-white/2 border border-white/5 rounded-xl px-3 py-2 text-white/90 text-[10px] focus:border-gold-primary/30 focus:bg-white/5 outline-none transition-all"
                     />
                   </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

`;

content = content.replace(taskSelectionStart, renderTaskButton + taskSelectionStart);

// Segment the TASKS
const oldGrid = `<div className="grid grid-cols-1 gap-2 pt-2">
                  {TASK_OPTIONS.map((task) => {
                    const isActive = currentTask === task.id;
                    return (
                      <div key={task.id} className="relative w-full flex flex-col gap-1">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleTaskSelection(task)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTaskSelection(task); }}
                          className={cn(
                            "group flex items-center gap-4 p-4 rounded-2xl border transition-all text-left relative overflow-hidden w-full cursor-pointer outline-none",
                            isActive ? cn(task.bg, task.border, task.glow, "shadow-xl border-t-white/30") : "bg-white/3 border-white/5 hover:bg-white/6 hover:border-white/10 focus:border-white/20"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border relative z-10 transition-all",
                            isActive ? cn(task.color.replace('text-', 'bg-'), "border-white/40 text-black shadow-lg") : "bg-black/40 border-white/10 text-white/40"
                          )}>
                            <task.icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                          </div>
                          <div className="flex flex-col relative z-10 -mt-1">
                            <span className={cn("text-[11px] font-black uppercase tracking-widest transition-colors", isActive ? task.color : "text-white/70")}>
                              {task.label}
                            </span>
                          </div>
                          {isActive && (
                            <div className="ml-auto relative z-10 flex items-center gap-3">
                              <button
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingConfigForTask(editingConfigForTask === task.id ? null : task.id);
                                 }}
                                 className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-110",
                                    editingConfigForTask === task.id ? "text-gold-primary border-gold-primary/30" : "text-white/40"
                                 )}
                                 title="Konfiguruj prompty i modele dla tego zadania"
                              >
                                 <Settings2 size={12} />
                              </button>
                              <motion.div layoutId="task-indicator" className="relative z-10">
                                <Check size={14} className={task.color} />
                              </motion.div>
                            </div>
                          )}
                        </div>
                        
                        <AnimatePresence>
                            {isActive && editingConfigForTask === task.id && (
                               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden pb-1">
                                  <div className="p-4 bg-black/50 border border-white/5 rounded-2xl space-y-5 shadow-inner">
                                     
                                     {/* Konfiguracja Zadania (Funkcji) */}
                                     <div>
                                       <div className="flex items-center gap-2 mb-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                          <label className="text-[10px] font-black uppercase text-white/70 tracking-widest leading-none">Funkcja: {task.label}</label>
                                       </div>
                                       <textarea 
                                          value={taskPrompts[task.id] || ""}
                                          onChange={e => updateTaskPrompt(task.id, e.target.value)}
                                          className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-white/80 font-mono text-[10px] mb-2 focus:border-gold-primary/50 focus:outline-none resize-y"
                                          placeholder="Prompt zadania..."
                                       />
                                       <input 
                                          value={taskModels[task.id] || ""}
                                          onChange={e => updateTaskModel(task.id, e.target.value)}
                                          placeholder="Wymuś model (zostaw puste by użyć asystentów)"
                                          className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white/80 text-xs focus:border-gold-primary/50 focus:outline-none"
                                       />
                                     </div>

                                     {/* Konfiguracja Roli (Eksperta) */}
                                     <div className="pt-4 border-t border-white/10">
                                       <div className="flex items-center gap-2 mb-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-gold-primary/50" />
                                          <label className="text-[10px] font-black uppercase text-white/70 tracking-widest leading-none">Ekspert: {task.roleId}</label>
                                       </div>
                                       <textarea 
                                          value={unitSystemRoles[task.roleId] || ""}
                                          onChange={updateSystemRolePrompt.bind(null, task.roleId)}
                                          className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-white/80 font-mono text-[10px] mb-2 focus:border-gold-primary/50 focus:outline-none resize-y"
                                          placeholder="Prompt eksperta..."
                                       />
                                       <input 
                                          value={roleModels[task.roleId] || ""}
                                          onChange={e => updateRoleModel(task.roleId, e.target.value)}
                                          placeholder="Wymuś model dla eksperta (zostaw puste by użyć asystentów)"
                                          className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white/80 text-xs focus:border-gold-primary/50 focus:outline-none"
                                       />
                                     </div>

                                  </div>
                               </motion.div>
                            )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>`;

// Since I just modified it in a previous step, I need to be careful with the match.
// Let's use a simpler marker that I know exists.

const newGrid = `
                {/* DYNAMIC SEGMENTED TASKS */}
                <div className="space-y-6">
                  {/* DREAM DEFENSE TEAM */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20">
                         <Shield size={12} className="text-blue-400" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-blue-400 truncate drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">Dream Defense Team</span>
                      <div className="h-px flex-1 bg-linear-to-r from-blue-500/0 via-blue-500/30 to-blue-500/0" />
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {TASK_OPTIONS.slice(0, 9).map((task) => renderTaskButton(task))}
                    </div>
                  </div>

                  {/* PROSECUTION MACHINE */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-3 px-1">
                      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-500/10 border border-slate-500/20">
                         <Gavel size={12} className="text-slate-400" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 truncate drop-shadow-[0_0_10px_rgba(148,163,184,0.3)]">Prosecution Machine</span>
                      <div className="h-px flex-1 bg-linear-to-r from-slate-500/0 via-slate-500/30 to-slate-500/0" />
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {TASK_OPTIONS.slice(9).map((task) => renderTaskButton(task))}
                    </div>
                  </div>
                </div>`;

content = content.replace(/<div className="grid grid-cols-1 gap-2 pt-2">[\s\S]*?{TASK_OPTIONS\.map[\s\S]*?<\/div>/, newGrid);

fs.writeFileSync(panelPath, content);
console.log("UI updated successfully.");
