import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, MessageSquare, Trash2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Clock, SortAsc, SortDesc } from "lucide-react";
import type { Session } from "../types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatSidebarProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  sessions: Session[];
  sessionId: string;
  switchSession: (id: string) => void;
  removeSession: (id: string) => void;
  newChat: () => void;
}

export function ChatSidebar({
  showHistory,
  setShowHistory,
  sessions,
  sessionId,
  switchSession,
  removeSession,
  newChat,
}: ChatSidebarProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az'>('newest');

  const sortedSessions = [...sessions].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    if (sortBy === 'oldest') return new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime();
    if (sortBy === 'az') return (a.title || 'Nowa Sprawa').localeCompare(b.title || 'Nowa Sprawa');
    return 0;
  });
  return (
    <>
      {/* Sessions Sidebar Overlay Background */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHistory(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sessions Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 100, 
              damping: 28,
              mass: 1.2,
              restDelta: 0.001
            }}
            className="fixed lg:relative inset-y-0 left-0 w-[320px] max-w-full h-full glass-prestige-gold rounded-3xl flex flex-col shrink-0 overflow-hidden z-50 transition-all shadow-2xl"
          >
            
            {/* Top specular highlight */}
            <div className="absolute top-0 left-0 right-0 h-1/4 pointer-events-none z-0 rounded-t-3xl" style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)'
            }} />

            {/* Dynamic Header Glow (Unified) */}
            <div className="absolute top-0 left-0 w-full h-32 blur-[80px] pointer-events-none bg-gold-primary opacity-20 z-0" />

            {/* HEADER: TITLE + SWITCHER (Unified Structure) */}
            <div className="px-6 py-6 border-b border-white/10 relative z-10 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl glass-prestige-gold flex items-center justify-center shadow-lg">
                    <History size={18} className="text-gold-primary" />
                  </div>
                  <div>
                    <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-white italic font-outfit">Historia</h3>
                    <p className="text-[7px] text-white/30 font-bold uppercase tracking-widest leading-none mt-1">Archiwum Spraw</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all border border-white/5 hover:border-red-500/40 group/close"
                >
                  <X size={18} className="group-hover/close:rotate-90 transition-transform" />
                </button>
              </div>

              {/* ── SORTING SWITCHER ── */}
               <div className="grid grid-cols-3 p-1.5 bg-black/40 border border-white/5 rounded-2xl relative shadow-inner">
                  <motion.div 
                    layoutId="sort-bg-v3"
                    className="absolute inset-1.5 w-[calc(33.33%-6px)] h-[calc(100%-12px)] rounded-xl bg-gold-primary/20 shadow-xl shadow-gold-primary/10 z-0"
                    animate={{ x: sortBy === 'newest' ? 0 : sortBy === 'oldest' ? '100%' : '200%' }}
                    transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
                  />
                  {[
                    { id: 'newest', icon: <Clock size={12} />, label: 'Czas' },
                    { id: 'oldest', icon: <Clock size={12} className="rotate-180" />, label: 'Stare' },
                    { id: 'az',     icon: <SortAsc size={12} />, label: 'A-Z' },
                  ].map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => setSortBy(opt.id as any)}
                        className={cn(
                          "relative z-10 flex items-center justify-center gap-2 py-2 transition-all outline-none",
                          sortBy === opt.id ? "text-gold-primary font-extrabold" : "text-white/20 font-bold"
                        )}
                    >
                      {opt.icon}
                      <span className="text-[9px] uppercase tracking-widest">{opt.label}</span>
                    </button>
                  ))}
               </div>
            </div>

            {/* MAIN SCROLLABLE AREA (Unified Spacing) */}
            <div className="flex-1 overflow-y-auto px-6 space-y-3 py-4 custom-scrollbar relative z-10 pb-32">
              <AnimatePresence mode="popLayout">
                {sortedSessions.map((s: Session, i: number) => {
                  const themes = [
                    { name: 'red',    color: 'text-red-500',      border: 'border-red-500/40',      bg: 'bg-red-500',      glow: 'shadow-red-500/30' },
                    { name: 'green',  color: 'text-emerald-500',  border: 'border-emerald-500/40',  bg: 'bg-emerald-500',  glow: 'shadow-emerald-500/30' },
                    { name: 'blue',   color: 'text-blue-500',     border: 'border-blue-500/40',     bg: 'bg-blue-500',     glow: 'shadow-blue-500/30' },
                    { name: 'purple', color: 'text-purple-500',   border: 'border-purple-500/40',   bg: 'bg-purple-500',   glow: 'shadow-purple-500/30' },
                    { name: 'amber',  color: 'text-amber-500',    border: 'border-amber-500/40',    bg: 'bg-amber-500',    glow: 'shadow-amber-500/30' },
                  ];
                  const theme = themes[i % themes.length];
                  const isActive = sessionId === s.id;

                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: i * 0.05,
                        type: "spring",
                        stiffness: 80,
                        damping: 24,
                        mass: 1.1
                      }}
                    >
                        <div
                          onClick={() => {
                            switchSession(s.id);
                            if (window.innerWidth < 1024) setShowHistory(false);
                          }}
                          className={cn(
                            "group relative flex items-center gap-4 p-4 cursor-pointer rounded-2xl transition-all border",
                            isActive
                              ? `glass-prestige-gold ${theme.border} ${theme.glow} scale-[1.02] z-10`
                              : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 opacity-70 hover:opacity-100",
                          )}
                        >
                          {/* Boxed Icon (Themed Selection) */}
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500",
                            isActive 
                              ? `${theme.bg} text-black shadow-lg` 
                              : `bg-white/5 text-white/40 group-hover:text-white/60`
                          )}>
                            <MessageSquare size={18} strokeWidth={isActive ? 3 : 2} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className={cn(
                              "text-[11px] font-black uppercase tracking-wider mb-1 truncate transition-colors",
                              isActive ? theme.color : "text-white"
                            )}>
                              {s.title || "Nowa Sprawa"}
                            </h4>
                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest leading-none truncate">
                              {new Date(s.updated_at || s.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit' })} • {theme.name.toUpperCase()}
                            </p>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSession(s.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-white/20 hover:text-red-500 rounded-xl transition-all shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {sessions.length === 0 && (
                <div className="px-6 py-10 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    Brak zapisanych sesji
                  </p>
                </div>
              )}
            </div>

            {/* FOOTER: THE BIG BUTTON (Unified - Text Black for Contrast) */}
            <div className="absolute bottom-0 left-0 w-full p-6 bg-linear-to-t from-[#0a0a0c] via-[#0a0a0c]/90 to-transparent z-50">
              <button 
                onClick={() => {
                  newChat();
                  if (window.innerWidth < 1024) setShowHistory(false);
                }}
                className="w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] transition-all hover:scale-[1.02] active:scale-[0.98] border shadow-[0_20px_50px_rgba(0,0,0,0.6)] font-outfit glass-prestige-gold text-black border-gold-primary/50"
              >
                <span className="-mt-1 block">Nowa Konsultacja</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
