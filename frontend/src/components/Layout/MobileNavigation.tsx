import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, Scale } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { cn } from "../../utils/cn";
import type { Tab } from "../../types/navigation";

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
}

export function MobileNavigation({ navItems, activeTab, onTabChange }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-2 left-2 right-2 z-50 h-16 flex items-center justify-between px-4 backdrop-blur-xl bg-[rgba(12,48,52,0.95)] border border-[rgba(167,243,208,0.4)] rounded-lg shadow-2xl">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(145deg, rgba(167,243,208,0.18) 0%, rgba(12,48,52,0.72) 100%)",
              borderTop:    "1.5px solid rgba(167,243,208,0.85)",
              borderLeft:   "1px   solid rgba(167,243,208,0.28)",
              borderRight:  "0.5px solid rgba(167,243,208,0.08)",
              borderBottom: "1.5px solid rgba(0,0,0,0.70)",
              boxShadow:    "0 4px 16px rgba(0,0,0,0.50), inset 0 1px 0 rgba(167,243,208,0.45)",
            }}
          >
            <Scale className="w-4 h-4" style={{ color: "#a7f3d0" }} strokeWidth={1.5} />
          </motion.div>
          <span className="font-bold text-sm">LexMind</span>
        </div>
        
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </motion.button>
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
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="lg:hidden fixed top-2 left-2 bottom-2 w-[280px] z-45 glass-liquid-shell flex flex-col rounded-[32px] overflow-hidden shadow-2xl"
          >
            <div className="h-16 flex items-center px-5 border-b border-white/10">
              <span className="font-bold">Menu</span>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">

              {navItems.filter(i => i.id !== 'admin').map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                const rgb = item.colorRgb;

                return (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onTabChange(item.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 rounded-2xl p-4 transition-all relative",
                    )}
                    style={active ? {
                      background: `linear-gradient(145deg, rgba(${rgb},0.15) 0%, rgba(4,2,2,0.60) 100%)`,
                      borderTop:    `1.5px solid rgba(${rgb},0.80)`,
                      borderLeft:   `1px   solid rgba(${rgb},0.28)`,
                    } : {}}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={active ? {
                        background: `rgba(${rgb},0.22)`,
                        color: item.color,
                      } : {
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.32)",
                      }}
                    >
                      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
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
            </div>

            <div className="p-4 border-t border-white/10 space-y-2">
              {/* Admin item move */}
              {navItems.find(i => i.id === 'admin') && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onTabChange('admin');
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-2xl transition-all relative overflow-hidden",
                    activeTab === 'admin' ? "bg-red-950/20 border-red-500/30" : "bg-white/5 border-white/10"
                  )}
                  style={activeTab === 'admin' ? {
                    borderTop: '1.5px solid rgba(153,27,27,0.8)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(153,27,27,0.3)'
                  } : {}}
                >
                   <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ color: '#991b1b', background: 'rgba(153,27,27,0.12)' }}>
                      {React.createElement(navItems.find(i => i.id === 'admin')!.icon, { size: 16 })}
                   </div>
                   <span className="text-[12px] font-black uppercase tracking-widest text-white/80">Panel Admina</span>
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => supabase.auth.signOut()}
                className="w-full flex items-center gap-4 p-3 rounded-2xl text-red-500/60 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:text-red-500 transition-all"
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
