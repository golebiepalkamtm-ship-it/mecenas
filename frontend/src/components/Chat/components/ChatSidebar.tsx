import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Clock, SortAsc, Square, CheckSquare } from "lucide-react";
import { cn } from "../../../utils/cn";
import { LexIcon } from "../../Layout/LexIcon";
import { CHAT_SIDE_PANEL_LEFT } from "../../Library/shared";
import type { Session } from "../types";

const SESSION_ACCENTS = [
  { color: "#ef4444", ring: "ring-red-500/25", idle: "border-red-500/15 hover:border-red-500/30" },
  { color: "#a855f7", ring: "ring-purple-500/25", idle: "border-purple-500/15 hover:border-purple-500/30" },
  { color: "#f59e0b", ring: "ring-amber-500/25", idle: "border-amber-500/15 hover:border-amber-500/30" },
] as const;

interface ChatSidebarProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  sessions: Session[];
  sessionId: string;
  switchSession: (id: string) => void;
  removeSession: (id: string) => void;
  removeSessions: (ids: string[]) => Promise<void>;
  newChat: () => void;
}

export function ChatSidebar({
  showHistory,
  setShowHistory,
  sessions,
  sessionId,
  switchSession,
  removeSession,
  removeSessions,
  newChat,
}: ChatSidebarProps) {
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az">("newest");
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (sortBy === "newest")
        return (
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime()
        );
      if (sortBy === "oldest")
        return (
          new Date(a.updated_at || a.created_at || 0).getTime() -
          new Date(b.updated_at || b.created_at || 0).getTime()
        );
      if (sortBy === "az")
        return (a.title || "Nowa Sprawa").localeCompare(b.title || "Nowa Sprawa");
      return 0;
    });
  }, [sessions, sortBy]);

  useEffect(() => {
    setSelectedForDelete((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (sessions.some((session) => session.id === id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [sessions]);

  const allSelected = sortedSessions.length > 0 && selectedForDelete.size === sortedSessions.length;
  const selectedCount = selectedForDelete.size;

  const toggleSessionSelection = (id: string) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedForDelete(new Set());
      return;
    }
    setSelectedForDelete(new Set(sortedSessions.map((session) => session.id)));
  };

  const removeSelectedSessions = async () => {
    if (selectedCount === 0) return;
    const confirmed = window.confirm(
      `Czy na pewno chcesz usunąć ${selectedCount} zaznaczonych sesji? Wszystkie wiadomości zostaną utracone.`,
    );
    if (!confirmed) return;
    await removeSessions(Array.from(selectedForDelete));
    setSelectedForDelete(new Set());
  };

  return (
    <>
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

      <AnimatePresence>
        {showHistory && (
          <motion.aside
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            className={CHAT_SIDE_PANEL_LEFT}
          >
            <div className="shrink-0 px-5 py-5 border-b border-black/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl glass-prestige flex items-center justify-center shadow-lg">
                    <LexIcon name="history" size={18} />
                  </div>
                  <div>
                    <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-black italic font-outfit">
                      Historia
                    </h3>
                    <p className="text-[7px] text-black/60 font-bold uppercase tracking-widest">
                      Archiwum spraw
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-red-500/5 border border-red-500/20 text-red-500/40 hover:text-red-500 hover:bg-red-500/15"
                  aria-label="Zamknij panel historii"
                  title="Zamknij panel historii"
                >
                  <X size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  newChat();
                  if (window.innerWidth < 1024) setShowHistory(false);
                }}
                className="prestige-panel-action w-full py-3 rounded-xl text-black text-[10px] font-black uppercase tracking-widest mb-4"
              >
                <span className="-mt-1 block">Nowa konsultacja</span>
              </button>

              <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-black/5 border border-black/10 rounded-2xl">
                {[
                  { id: "newest" as const, icon: <Clock size={11} />, label: "Czas" },
                  { id: "oldest" as const, icon: <Clock size={11} className="rotate-180" />, label: "Stare" },
                  { id: "az" as const, icon: <SortAsc size={11} />, label: "A-Z" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSortBy(opt.id)}
                    className={cn(
                      "flex items-center justify-center gap-1 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all",
                      sortBy === opt.id
                        ? "bg-gold-primary/30 text-black shadow-sm"
                        : "text-black/40 hover:text-black/70",
                    )}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5 p-1.5 bg-black/5 border border-black/10 rounded-2xl">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-black/55 hover:text-black hover:bg-black/5"
                >
                  {allSelected ? <CheckSquare size={11} /> : <Square size={11} />}
                  <span>{allSelected ? "Odznacz wszystko" : "Zaznacz wszystko"}</span>
                </button>
                <button
                  type="button"
                  onClick={removeSelectedSessions}
                  disabled={selectedCount === 0}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all",
                    selectedCount === 0
                      ? "text-black/25 bg-black/5 cursor-not-allowed"
                      : "text-red-600 hover:text-red-700 bg-red-500/10 hover:bg-red-500/15",
                  )}
                >
                  <Trash2 size={11} />
                  <span>{selectedCount > 0 ? `Usuń (${selectedCount})` : "Usuń zaznaczone"}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2.5 custom-scrollbar">
              <AnimatePresence initial={false}>
                {sortedSessions.map((s: Session, i: number) => {
                  const isActive = sessionId === s.id;
                  const accent = SESSION_ACCENTS[i % SESSION_ACCENTS.length];
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          switchSession(s.id);
                          if (window.innerWidth < 1024) setShowHistory(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            switchSession(s.id);
                          }
                        }}
                        className={cn(
                          "group flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-500 glass-liquid-convex border",
                          isActive ? cn("scale-[1.02] ring-2", accent.ring) : cn("opacity-70 hover:opacity-100", accent.idle),
                        )}
                        style={
                          isActive
                            ? {
                                backgroundColor: accent.color,
                                backgroundImage:
                                  "linear-gradient(145deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.12) 100%)",
                                boxShadow: `0 16px 32px -8px ${accent.color}66, inset 0 2px 4px rgba(255,255,255,0.75)`,
                              }
                            : undefined
                        }
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                            isActive
                              ? "bg-black/10 border-black/10 text-black"
                              : "bg-black/5 border-black/5 text-black/30",
                          )}
                        >
                          <LexIcon name="messages" size={16} />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSessionSelection(s.id);
                          }}
                          className={cn(
                            "p-1.5 rounded-lg shrink-0 transition-colors",
                            selectedForDelete.has(s.id)
                              ? "text-red-600 bg-red-500/10"
                              : "text-black/25 hover:text-black/60 hover:bg-black/5",
                          )}
                          title="Zaznacz do usunięcia"
                        >
                          {selectedForDelete.has(s.id) ? <CheckSquare size={13} /> : <Square size={13} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-[10px] font-black uppercase tracking-wider truncate text-black">
                            {s.title || "Nowa sprawa"}
                          </h4>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-black/45 mt-0.5">
                            {new Date(s.updated_at || s.created_at || 0).toLocaleDateString("pl-PL")}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSession(s.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-black/30 hover:text-red-600 shrink-0"
                          aria-label="Usuń sesję"
                          title="Usuń sesję"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {sessions.length === 0 && (
                <div className="py-10 text-center glass-liquid-convex rounded-2xl px-4 border border-black/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                    Brak zapisanych sesji
                  </p>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
