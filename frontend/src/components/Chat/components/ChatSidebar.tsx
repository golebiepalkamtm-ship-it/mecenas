import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, MessageSquare, Trash2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Clock, SortAsc } from "lucide-react";
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

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.updated_at || a.created_at || 0).getTime() - new Date(b.updated_at || b.created_at || 0).getTime();
      if (sortBy === 'az') return (a.title || 'Nowa Sprawa').localeCompare(b.title || 'Nowa Sprawa');
      return 0;
    });
  }, [sessions, sortBy]);
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
            initial={{ marginLeft: -320, opacity: 0 }}
            animate={{ marginLeft: 0, opacity: 1 }}
            exit={{ marginLeft: -320, opacity: 0 }}
            transition={{ 
              type: "tween",
              duration: 0.35,
              ease: [0.25, 1, 0.5, 1],
            }}
            className="fixed lg:relative left-0 top-[80px] lg:top-0 bottom-0 lg:h-full w-[320px] max-w-full glass-steel-monolith rounded-none z-10000 shadow-none border-t border-white/5 pointer-events-auto flex flex-col overflow-hidden"
          >
            {/* Liquid Metal handles the look via utility classes */}

            {/* Dynamic Header Glow (Unified) - REMOVED FOR STEEL LOOK */}

            {/* HEADER: TITLE + SWITCHER (Unified Structure) */}
            <div className="px-6 py-6 pt-6 lg:pt-6 border-b border-white/10 relative z-10 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl glass-prestige-gold flex items-center justify-center shadow-lg">
                    <History size={18} className="text-gold-primary" />
                  </div>
                  <div>
                    <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-white italic font-outfit">Historia</h3>
                    <p className="text-[7px] text-white/50 font-bold uppercase tracking-widest leading-none mt-1">Archiwum Spraw</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-red-500/5 border border-red-500/20 text-red-500/40 hover:text-red-500 hover:bg-red-500/15 hover:border-red-500/40 group/close"
                >
                  <X size={16} className="group-hover/close:rotate-90 transition-transform duration-500" />
                </button>
              </div>

              {/* ACTION: NOWA KONSULTACJA (Moved back to Top) */}
              <div className="mb-4">
                <button 
                  onClick={() => {
                    newChat();
                    if (window.innerWidth < 1024) setShowHistory(false);
                  }}
                  className="w-full py-3 rounded-xl glass-liquid-convex text-black font-black uppercase tracking-[0.4em] text-[10px] hover:scale-[1.02] transition-all shadow-xl"
                >
                  <span className="-mt-0.5 block">Nowa Konsultacja</span>
                </button>
              </div>

              {/* ── SORTING SWITCHER ── */}
               <div className="grid grid-cols-3 p-1 bg-black/40 border border-white/5 rounded-xl relative shadow-inner">
                  <motion.div 
                    layoutId="sort-bg-v3"
                    className="absolute inset-1.5 w-[calc(33.33%-6px)] h-[calc(100%-12px)] rounded-xl bg-[#d4af37]/30 shadow-xl shadow-[#d4af37]/10 z-0"
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
                        onClick={() => setSortBy(opt.id as 'newest' | 'oldest' | 'az')}
                        className={cn(
                          "relative z-10 flex items-center justify-center gap-2 py-2 transition-all outline-none",
                          sortBy === opt.id ? "text-black font-black" : "text-black/30 font-bold"
                        )}
                    >
                      {opt.icon}
                      <span className="text-[9px] uppercase tracking-widest">{opt.label}</span>
                    </button>
                  ))}
               </div>
            </div>

            {/* MAIN SCROLLABLE AREA (Unified Spacing) */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-3 py-4 relative z-10 custom-scrollbar pb-40">
              <AnimatePresence mode="popLayout">
                {sortedSessions.map((s: Session, i: number) => {
                  const themes = [
                    { name: 'red',    color: 'text-red-500',      border: 'border-red-500/40',      bg: 'bg-red-500',      glow: 'shadow-red-500/30' },
                    { name: 'platinum', color: 'text-white/90', border: 'border-white/40', bg: 'bg-white/10', glow: 'shadow-white/20' },
                    { name: 'gold',   color: 'text-gold-primary', border: 'border-gold-primary/40', bg: 'bg-gold-primary', glow: 'shadow-gold-primary/30' },
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
                            "group relative flex items-center gap-4 p-4 cursor-pointer rounded-xl transition-all glass-liquid-convex",
                            isActive
                              ? `scale-[1.02] z-10 shadow-2xl`
                              : "opacity-70 hover:opacity-100",
                          )}
                          style={isActive ? { 
                            backgroundColor: theme.bg.replace('bg-', '') === 'white/10' ? 'rgba(255,255,255,0.8)' : theme.bg.replace('bg-', ''),
                            background: theme.name === 'platinum' ? 'white' : theme.bg.replace('bg-', ''),
                            boxShadow: `0 10px 30px -5px rgba(var(--${theme.name}-rgb, 0,0,0), 0.5), inset 0 0 10px rgba(255,255,255,0.3)`
                          } : {}}
                        >
                          {/* Boxed Icon (Themed Selection) */}
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-500 relative z-10",
                            isActive 
                              ? `bg-black/20 text-white shadow-lg` 
                              : `bg-black/10 text-black/30 group-hover:text-black/60`
                          )}>
                            <MessageSquare size={18} strokeWidth={isActive ? 4 : 2} />
                          </div>

                          <div className="flex-1 min-w-0 relative z-10">
                            <h4 className={cn(
                              "text-[11px] font-black uppercase tracking-wider mb-1 truncate transition-colors",
                              "text-black"
                            )}>
                              {s.title || "Nowa Sprawa"}
                            </h4>
                            <p className={cn(
                              "text-[8px] font-bold uppercase tracking-widest leading-none truncate",
                              "text-black/40"
                            )}>
                              {new Date(s.updated_at || s.created_at || 0).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit' })} • {theme.name.toUpperCase()}
                            </p>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSession(s.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-black/20 hover:text-red-600 rounded-xl transition-all shrink-0"
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
