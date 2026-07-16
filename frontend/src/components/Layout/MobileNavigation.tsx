import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, Maximize2, Minimize2, Scale } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { cn } from "../../utils/cn";
import type { Tab } from "../../types/navigation";
import { realisticIconMap } from "./RealisticIcons";

interface NavItem {
  id: Tab;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  color: string;
  colorRgb: string;
  adminOnly?: boolean;
}
interface MobileNavigationProps {
  navItems: NavItem[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onLogout?: () => void | Promise<void>;
  onToggleFullscreen?: () => void | Promise<void>;
  isFullscreen?: boolean;
}

export function MobileNavigation({
  navItems,
  activeTab,
  onTabChange,
  onLogout,
  onToggleFullscreen,
  isFullscreen = false,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeItem = navItems.find((item) => item.id === activeTab);
  const mobileTopbarAccentStyle = {
    "--topbar-accent-rgb": activeItem?.colorRgb ?? "59, 130, 246",
  } as React.CSSProperties;

  const listVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { staggerChildren: 0.045, delayChildren: 0.1 },
    },
    exit: { opacity: 0, transition: { staggerChildren: 0.02, staggerDirection: -1 } },
  } as const;

  const itemVariants = {
    initial: { opacity: 0, y: 12, filter: "blur(2px)", scale: 0.97 },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, transition: { type: "spring", stiffness: 200, damping: 20 } },
    exit: { opacity: 0, y: 8, filter: "blur(2px)", scale: 0.97, transition: { duration: 0.2 } },
  } as const;

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* Mobile Header */}
      <header
        className="app-mobile-nav-header lg:hidden fixed z-50 h-16 flex items-center justify-between px-3 sm:px-4 backdrop-blur-xl rounded-xl shadow-[0_24px_60px_rgba(0,0,0,0.55)] max-w-[calc(100vw-1rem-var(--safe-left)-var(--safe-right))] overflow-hidden lex-view-grain"
        style={{
          top: "calc(var(--app-mobile-header-gap) + var(--safe-top))",
          left: "calc(var(--app-mobile-header-gap) + var(--safe-left))",
          right: "calc(var(--app-mobile-header-gap) + var(--safe-right))",
          background:
            "radial-gradient(90% 130% at 0% 0%, rgba(var(--topbar-accent-rgb),0.20) 0%, rgba(0,0,0,0) 60%), rgba(12,12,14,0.92)",
          border: "1px solid rgba(212,175,55,0.22)",
          boxShadow:
            "0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.6)",
          ...mobileTopbarAccentStyle,
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <motion.div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background:
                "linear-gradient(145deg, rgba(212,175,55,0.22) 0%, rgba(12,12,14,0.72) 60%, rgba(12,12,14,0.92) 100%)",
              borderTop: "1.5px solid rgba(240,204,90,0.85)",
              borderLeft: "1px   solid rgba(212,175,55,0.28)",
              borderRight: "0.5px solid rgba(212,175,55,0.08)",
              borderBottom: "1.5px solid rgba(0,0,0,0.70)",
              boxShadow: "0 10px 26px rgba(0,0,0,0.48), inset 0 1px 0 rgba(240,204,90,0.45)",
            }}
          >
            <Scale className="w-5 h-5 relative z-10 text-[#d4af37]" strokeWidth={1.5} />
          </motion.div>
          <div className="min-w-0 flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-white/50 truncate">
              LexMind
            </span>
            <span className="text-sm font-black tracking-tight text-white truncate">
              {activeItem?.label ?? "Menu"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleFullscreen && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => void onToggleFullscreen()}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white/70 hover:text-[rgb(212,175,55)] transition-[transform,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-2 focus-visible:ring-[rgba(var(--gold-rgb),0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              title={isFullscreen ? "Zamknij pełny ekran" : "Pełny ekran"}
            >
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </motion.button>
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(!isOpen)}
            className="w-10 h-10 rounded-lg flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[rgba(var(--gold-rgb),0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </motion.button>
        </div>

        <motion.div
          key={activeTab}
          initial={{ scaleX: 0.6, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.85 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
          className="absolute inset-x-3 bottom-2 h-px origin-left"
          style={{
            background:
              "linear-gradient(90deg, rgba(var(--topbar-accent-rgb),0.80) 0%, rgba(255,255,255,0.25) 42%, rgba(255,255,255,0.0) 100%)",
            boxShadow: "0 0 8px rgba(var(--topbar-accent-rgb), 0.4)",
          }}
        />
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "-110%", opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-110%", opacity: 0.98 }}
              transition={{ type: "spring", stiffness: 220, damping: 28, mass: 0.9 }}
              className="lg:hidden fixed bottom-2 w-[min(304px,calc(100vw-1rem))] z-45 flex flex-col rounded-3xl overflow-hidden shadow-[0_40px_90px_rgba(0,0,0,0.62)] border border-[rgba(255,255,255,0.10)] lex-view-grain"
              style={{
                top: "calc(var(--app-mobile-header-offset) + var(--safe-top))",
                left: "calc(var(--app-mobile-header-gap) + var(--safe-left))",
                background:
                  "radial-gradient(130% 90% at 0% 0%, rgba(var(--topbar-accent-rgb),0.18) 0%, rgba(0,0,0,0) 62%), linear-gradient(155deg, rgba(12,12,14,0.94) 0%, rgba(7,7,9,0.88) 60%, rgba(0,0,0,0.85) 100%)",
                ...mobileTopbarAccentStyle,
              }}
            >
              <div className="h-16 flex items-center px-5 border-b border-white/10">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/45">LexMind</p>
                  <p className="text-sm font-black tracking-tight text-white">Nawigacja</p>
                </div>
                <div
                  aria-hidden="true"
                  className="h-8 w-px"
                  style={{ background: "rgba(255,255,255,0.10)" }}
                />
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="ml-4 w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  aria-label="Zamknij menu"
                >
                  <X size={18} />
                </button>
              </div>

              <motion.div
                variants={listVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex-1 overflow-y-auto px-3 py-4 space-y-2"
              >
                {navItems.filter(i => i.id !== 'admin').map((item) => {
                  const Icon = realisticIconMap[item.id] || item.icon;
                  const active = activeTab === item.id;
                  const rgb = item.colorRgb;

                  return (
                    <motion.button
                      key={item.id}
                      variants={itemVariants}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onTabChange(item.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 rounded-2xl p-4 transition-[transform,background,box-shadow,border-color,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative border border-transparent focus-visible:ring-2 focus-visible:ring-[rgba(var(--gold-rgb),0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/30",
                      )}
                      style={{
                        ...(active
                          ? {
                            background:
                                `radial-gradient(85% 85% at 0% 0%, rgba(${rgb},0.22) 0%, rgba(0,0,0,0) 55%), ` +
                                `linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.30) 100%)`,
                            borderColor: `rgba(${rgb},0.35)`,
                            boxShadow: `0 18px 46px rgba(0,0,0,0.42), 0 0 22px rgba(${rgb},0.18), inset 0 1px 0 rgba(255,255,255,0.10)`,
                          }
                          : {
                            background: "rgba(255,255,255,0.03)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }),
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: active ? `rgba(${rgb},0.22)` : "rgba(255,255,255,0.04)",
                          boxShadow: active ? `0 0 0 1px rgba(${rgb},0.22) inset` : "0 0 0 1px rgba(255,255,255,0.06) inset",
                        }}
                      >
                        <Icon
                          className={cn(
                            "w-[18px] h-[18px] transition-all duration-300",
                            active
                              ? "opacity-100"
                              : "opacity-55 grayscale-[15%]"
                          )}
                          style={active ? { filter: `drop-shadow(0 0 4px rgba(${rgb}, 0.5))` } : undefined}
                        />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-bold uppercase tracking-wider" style={{ color: active ? "#fff" : "rgba(255,255,255,0.7)" }}>
                          {item.label}
                        </p>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] mt-0.5" style={{ color: active ? item.color : "rgba(255,255,255,0.3)" }}>
                          {item.sublabel}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>

              <div className="p-4 border-t border-white/10 space-y-2">
                {(() => {
                  const adminItem = navItems.find(i => i.id === 'admin');
                  if (!adminItem) return null;
                  const Icon = realisticIconMap['admin'] || adminItem.icon;
                  const active = activeTab === 'admin';
                  const rgb = adminItem.colorRgb;

                  return (
                    <motion.button
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onTabChange('admin');
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 p-3 rounded-2xl transition-[transform,background,box-shadow,border-color,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden border focus-visible:ring-2 focus-visible:ring-[rgba(var(--gold-rgb),0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/30",
                        active ? "bg-white/5 border-transparent" : "bg-white/5 border-white/10"
                      )}
                      style={active ? {
                        background:
                          `radial-gradient(85% 85% at 0% 0%, rgba(${rgb},0.22) 0%, rgba(0,0,0,0) 55%), ` +
                          `linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.30) 100%)`,
                        borderColor: `rgba(${rgb},0.35)`,
                        boxShadow: `0 18px 46px rgba(0,0,0,0.42), 0 0 22px rgba(${rgb},0.18), inset 0 1px 0 rgba(255,255,255,0.10)`,
                      } : {
                        borderColor: "rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={active ? {
                          background: `rgba(${rgb},0.22)`,
                        } : {
                          background: "rgba(255,255,255,0.04)",
                        }}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 transition-all duration-300",
                            active
                              ? "opacity-100"
                              : "opacity-55 grayscale-[15%]"
                          )}
                          style={active ? { filter: `drop-shadow(0 0 4px rgba(${rgb}, 0.5))` } : undefined}
                        />
                      </div>
                      <span className="text-[12px] font-black uppercase tracking-widest text-white/80">Panel Admina</span>
                    </motion.button>
                  );
                })()}

                <motion.button
                  variants={itemVariants}
                  initial="initial"
                  animate="animate"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => void handleLogout()}
                  className="w-full flex items-center gap-4 p-3 rounded-2xl text-red-500/70 bg-red-500/5 border border-red-500/12 hover:bg-red-500/10 hover:text-red-500 transition-[transform,background,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
                >
                  <div className="w-9 h-9 flex items-center justify-center">
                    <LogOut size={16} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest">Wyloguj</span>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
