import { motion, AnimatePresence } from "framer-motion";
import { History, X, MessageSquare, Trash2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
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
}

export function ChatSidebar({
  showHistory,
  setShowHistory,
  sessions,
  sessionId,
  switchSession,
  removeSession,
}: ChatSidebarProps) {
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
            className="fixed lg:relative inset-y-0 left-0 w-[280px] h-full glass-prestige-embossed lg:rounded-3xl flex flex-col shrink-0 overflow-hidden z-50 border-t-[2px] border-t-white/90 border-x border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
          >
            {/* Ambient Glows */}
            <div className="absolute top-0 left-0 w-48 h-48 bg-gold-primary/5 blur-[80px] pointer-events-none" />
            
            {/* Top specular highlight */}
            <div className="absolute top-0 left-0 right-0 h-1/4 pointer-events-none z-0 rounded-t-3xl" style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)'
            }} />

            <div className="px-6 py-6 border-b border-white/5 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl glass-prestige-gold flex items-center justify-center shadow-lg border-t border-white/20">
                  <History size={20} className="text-gold-primary" />
                </div>
                <div>
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-white/90 italic leading-none">Historia</h3>
                  <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest mt-1.5 whitespace-nowrap">Archiwum Spraw</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20 shadow-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1 py-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {sessions.map(
                  (s: Session, i: number) => (
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
                          "group relative flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl transition-all duration-200",
                          sessionId === s.id
                            ? "glass-prestige-gold shadow-sm"
                            : "glass-prestige opacity-70 hover:opacity-100",
                        )}
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                          <MessageSquare
                            size={12}
                            className={cn(
                              "shrink-0",
                              sessionId === s.id
                                ? "text-gold"
                                : "text-white/40 group-hover:text-white",
                            )}
                          />
                          <span className="text-[11px] font-bold truncate">
                            {s.title || "Nowa Sprawa"}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSession(s.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-lg transition-all shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </motion.div>
                  ),
                )}
              </AnimatePresence>
              {sessions.length === 0 && (
                <div className="px-6 py-10 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    Brak zapisanych sesji
                  </p>
                </div>
              )}
            </div>

            <div className="px-3 py-2.5 border-t border-white/5">
              <div className="px-3 py-2 rounded-xl glass-prestige-gold">
                <p className="text-[8px] font-black uppercase tracking-widest text-gold-primary/60 text-center">
                  Archiwum Adwokackie
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
