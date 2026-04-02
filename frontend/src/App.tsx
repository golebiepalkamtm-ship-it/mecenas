import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Library,
  FileText,
  FolderOpen,
  ChevronLeft,
  Settings,
  Scale,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  CreditCard,
  Bell,
  Cpu,
  LogOut,
} from "lucide-react";
import { useChatSettingsStore } from "./store/useChatSettingsStore";


import { ChatView } from "./components/Chat";
import { KnowledgeView } from "./components/Knowledge";
import { DocumentsView } from "./components/Documents";
import { LandingView } from "./components/Landing/LandingView";
import { AdminView } from "./components/Admin";
import { SettingsView } from "./components/Settings";
import { DrafterView } from "./components/Drafter";
import { supabase } from "./utils/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { ChatProvider } from "./context/ChatContext";
import { useOrchestratorSync } from "./hooks/useOrchestratorSync";
import { BrandLogo } from "./components/Shared/BrandLogo";

import { cn } from "./utils/cn";

type Tab =
  | "chat"
  | "consilium"
  | "knowledge"
  | "prompts"
  | "drafter"
  | "documents"
  | "admin"
  | "settings";

const NAV_ITEMS = [
  {
    id: "chat" as Tab,
    icon: Terminal,
    label: "Konsultacja AI",
    sublabel: "Jednolity System Wsparcia",
    color: "#06b6d4", // cyan
    colorRgb: "6,182,212",
  },
  {
    id: "knowledge" as Tab,
    icon: Library,
    label: "Centralna Baza Wiedzy",
    sublabel: "Archives",
    color: "#3b82f6", // blue
    colorRgb: "59,130,246",
  },
  {
    id: "drafter" as Tab,
    icon: FileText,
    label: "Kreator Pism",
    sublabel: "Master Drafter",
    color: "#a855f7", // purple
    colorRgb: "168,85,247",
  },
  {
    id: "documents" as Tab,
    icon: FolderOpen,
    label: "Dokumenty",
    sublabel: "Secure",
    color: "#f59e0b", // amber
    colorRgb: "245,158,11",
  },
  {
    id: "settings" as Tab,
    icon: Settings,
    label: "Profil",
    sublabel: "Identity",
    color: "#14b8a6", // teal
    colorRgb: "20,184,166",
  },
  {
    id: "admin" as Tab,
    icon: ShieldAlert,
    label: "Admin",
    sublabel: "System",
    color: "#ef4444", // red
    colorRgb: "239,68,68",
    adminOnly: true,
  },
];

const E: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("user");
  const [collapsed, setCollapsed] = useState(false);
  const { currentSettingsTab, setSettingsTab } = useChatSettingsStore();
  useOrchestratorSync();

  const fetchRole = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();
      if (data) setUserRole(data.role);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) fetchRole(s.user.id);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Loading screen ── */
  if (authLoading)
    return (
      <div className="h-screen w-screen flex items-center justify-center overflow-hidden">
        <div className="aurora-bg" />
        <div className="noise-overlay" />
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: E }}
          className="relative z-10 flex flex-col items-center gap-14"
        >
          {/* Logo */}
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-10 rounded-full"
              style={{ border: "1px dashed rgba(212,175,55,0.18)" }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-5 rounded-full"
              style={{ border: "1px solid rgba(212,175,55,0.08)" }}
            />
            <div
              className="w-24 h-24 rounded-4xl flex items-center justify-center animate-glow-pulse"
              style={{
                background:
                  "linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(6,14,8,0.7) 100%)",
                borderTop: "1px solid rgba(255,255,255,0.6)",
                borderLeft: "1px solid rgba(255,255,255,0.2)",
                borderRight: "1px solid rgba(255,255,255,0.05)",
                borderBottom: "1px solid rgba(0,0,0,0.7)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 60px rgba(255,255,255,0.05)",
              }}
            >
              <Scale className="w-11 h-11 text-white" strokeWidth={1.5} />
            </div>
          </div>

          {/* Label */}
          <div className="flex flex-col items-center gap-4">
            <h1 className="shimmer-text text-[11px] font-black uppercase tracking-[1em]">
              Initializing Prestige Core
            </h1>
            <div
              className="w-52 h-px relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-y-0 w-1/3"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );

  if (!session) return <LandingView />;

  const userEmail = session.user.email || "";
  const userInitials = userEmail.slice(0, 2).toUpperCase();
  const navItems = NAV_ITEMS.filter(
    (i) => !i.adminOnly || userRole === "admin",
  );

  return (
    <ChatProvider>
      {/* ── Scene background ── */}
      <div className="flex h-screen w-screen overflow-hidden relative selection:bg-white/20 selection:text-white font-inter text-white p-3 lg:p-5 xl:p-7">
        <div className="aurora-bg">
          <div className="aurora-layer" />
        </div>
        <div className="noise-overlay" />

        {/* ambient orb cluster */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className="orb orb-gold"
            style={{
              width: 700,
              height: 700,
              top: "-15%",
              left: "-8%",
              opacity: 0.6,
            }}
          />
          <div
            className="orb orb-gold"
            style={{
              width: 500,
              height: 500,
              bottom: "-15%",
              right: "-10%",
              opacity: 0.2,
            }}
          />
          <div
            className="orb orb-gold"
            style={{
              width: 350,
              height: 350,
              bottom: "15%",
              left: "35%",
              opacity: 0.3,
            }}
          />
        </div>

        {/* ════════════════════════════════════════
            UNIFIED GLASS SHELL
            ════════════════════════════════════════ */}
        <div
          className="relative w-full h-full flex overflow-hidden z-10 glass-prestige rounded-[2.5rem]"
          style={{ background: "var(--glass-bg)" }}
        >
          {/* Top specular edge sweep */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none z-100"
            style={{
              height: "1px",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 25%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.6) 75%, transparent 100%)",
            }}
          />

          {/* Upper reflection layer */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none z-50 rounded-t-[2.5rem]"
            style={{
              height: "38%",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.015) 50%, rgba(255,255,255,0) 100%)",
            }}
          />

          {/* ── SIDEBAR ── */}
          <motion.nav
            animate={{ width: collapsed ? 80 : 300 }}
            transition={{ type: "spring", stiffness: 240, damping: 30 }}
            className="hidden lg:flex flex-col shrink-0 relative z-20"
            style={{ borderRight: "1px solid rgba(255,255,255,0.055)" }}
          >
            {/* Logo zone */}
            <div
              className="h-20 flex items-center justify-between px-5 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.045)" }}
            >
              <motion.div className="flex items-center gap-3 overflow-hidden min-w-0">
                {/* Logo mark */}
                 <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(2, 10, 19,0.7) 100%)",
                    borderTop: "1px solid rgba(255,255,255,0.6)",
                    borderLeft: "1px solid rgba(255,255,255,0.2)",
                    borderRight: "1px solid rgba(255,255,255,0.05)",
                    borderBottom: "1px solid rgba(0,0,0,0.7)",
                    boxShadow:
                      "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4), 0 0 20px rgba(255,255,255,0.05)",
                  }}
                >
                  <Scale className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      className="min-w-0"
                    >
                      <div className="flex items-center min-w-[120px]">
                        <BrandLogo size={13} className="scale-[0.8] origin-left" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-white/25">
                          Prestige Core
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Collapse toggle */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setCollapsed(!collapsed)}
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.3)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.7)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.3)")
                }
              >
                <ChevronLeft
                  size={14}
                  style={{
                    transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.4s",
                  }}
                />
              </motion.button>
            </div>

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
              {navItems.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  active={activeTab === item.id}
                  collapsed={collapsed}
                  onClick={() => setActiveTab(item.id)}
                />
              ))}
            </div>

            {/* User footer */}
            <div
              className="p-4 shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.045)" }}
            >
              <div
                className="flex items-center gap-3 p-2 rounded-2xl"
                style={{ background: "var(--glass-bg)" }}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(212,175,55,0.18) 0%, rgba(2, 10, 19,0.65) 100%)",
                    borderTop: "1px solid rgba(212,175,55,0.75)",
                    borderLeft: "1px solid rgba(212,175,55,0.25)",
                    borderRight: "1px solid rgba(212,175,55,0.07)",
                    borderBottom: "1px solid rgba(0,0,0,0.65)",
                    boxShadow:
                      "inset 0 1px 0 rgba(212,175,55,0.5), 0 4px 12px rgba(0,0,0,0.45)",
                  }}
                >
                  <span className="text-[10px] font-black text-[#d4af37]">
                    {userInitials}
                  </span>
                </div>

                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-[10px] font-bold text-white/70 truncate uppercase tracking-wider">
                        {userEmail.split("@")[0]}
                      </p>
                      <p className="text-[7px] font-bold text-white/25 uppercase tracking-[0.2em]">
                        {userRole}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </motion.nav>

          {/* ── MAIN CONTENT ── */}
          <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
            {/* Top bar */}
            <header
              className="h-20 shrink-0 flex items-center justify-between px-8 lg:px-10 relative z-50"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.045)" }}
            >
              {/* Page title / Sub-nav */}
              <div className="flex items-center gap-10">
                <AnimatePresence mode="wait">
                  {activeTab !== "settings" ? (
                    <motion.div
                      key="title"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25, ease: E }}
                    >
                      <h1 className="text-lg lg:text-xl font-black tracking-tight italic leading-none font-outfit">
                        {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
                      </h1>
                      <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.45em] mt-1.5 font-outfit">
                        {NAV_ITEMS.find((n) => n.id === activeTab)?.sublabel}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sub-nav"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25, ease: E }}
                      className="flex items-center gap-4"
                    >
                       <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-white/5 bg-white/5 shadow-inner">
                        <ShieldCheck size={11} className="text-emerald-400" />
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                          AES-256 Active
                        </span>
                       </div>

                       <div className="w-px h-6 bg-white/10 self-center" />

                       <div className="flex items-center gap-1 p-1 bg-black/20 backdrop-blur-xl border border-white/5 rounded-2xl">
                          {[
                            { id: 'Profil', icon: UserIcon, label: 'Profil' },
                            { id: 'Modele AI', icon: Cpu, label: 'Modele AI' },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setSettingsTab(tab.id)}
                              className={cn(
                                "relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300",
                                currentSettingsTab === tab.id ? "text-gold-primary" : "text-white/25 hover:text-white/50"
                              )}
                            >
                              {currentSettingsTab === tab.id && (
                                <motion.div 
                                  layoutId="header-subtab-bg"
                                  className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl shadow-inner"
                                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                              )}
                              <tab.icon size={12} className="relative z-10" />
                              <span className="relative z-10 text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                            </button>
                          ))}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-6">
                {/* Security badge (Always visible or in sequence) */}
                {activeTab !== "settings" && (
                  <div
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-white/5 bg-black/20"
                  >
                    <ShieldCheck size={11} className="text-emerald-400" />
                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                      AES-256 Active
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {/* Logout Button (Requested to move to top bar) */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => supabase.auth.signOut()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-400/5 transition-all border border-transparent hover:border-red-400/20"
                  >
                    <LogOut size={12} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Wyloguj</span>
                  </motion.button>

                  <div className="w-px h-4 bg-white/5 mx-1" />

                  {/* Sparkle button */}
                  <motion.button
                    whileHover={{ scale: 1.08, rotate: 5 }}
                    whileTap={{ scale: 0.94 }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background:
                        "linear-gradient(145deg, rgba(212,175,55,0.18) 0%, rgba(2, 10, 19,0.65) 100%)",
                      borderTop: "1px solid rgba(249,226,157,0.8)",
                      borderLeft: "1px solid rgba(212,175,55,0.28)",
                      borderRight: "1px solid rgba(212,175,55,0.08)",
                      borderBottom: "1px solid rgba(0,0,0,0.6)",
                      boxShadow:
                        "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.55)",
                    }}
                  >
                    <Sparkles
                      size={14}
                      style={{ color: "#d4af37" }}
                      fill="currentColor"
                    />
                  </motion.button>
                </div>
              </div>
            </header>

            {/* Content viewport */}
            <section className="flex-1 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 overflow-hidden"
                >
                  {activeTab === "chat" && <ChatView onNavigate={setActiveTab} />}
                  {activeTab === "knowledge" && <KnowledgeView />}
                  {activeTab === "drafter" && <DrafterView />}
                  {activeTab === "documents" && <DocumentsView />}
                  {activeTab === "settings" && <SettingsView />}
                  {activeTab === "admin" && <AdminView />}
                </motion.div>
              </AnimatePresence>

              {/* Inner ambient glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,175,55,0.04) 0%, transparent 70%)",
                }}
              />
            </section>
          </main>
        </div>
      </div>
    </ChatProvider>
  );
}

/* ════════════════════════════════════
   NAV ITEM
   ════════════════════════════════════ */
interface NavItemProps {
  item: {
    id: Tab;
    icon: React.ElementType;
    label: string;
    sublabel: string;
    color: string;
    colorRgb: string;
    adminOnly?: boolean;
  };
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}

function NavItem({ item, active, collapsed, onClick }: NavItemProps) {
  const Icon = item.icon;
  const c = item.color;
  const rgb = item.colorRgb;

  const activeStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, rgba(${rgb},0.12) 0%, rgba(4,2,2,0.5) 100%)`,
    borderTop: `1px solid rgba(${rgb},0.65)`,
    borderLeft: `1px solid rgba(${rgb},0.22)`,
    borderRight: `1px solid rgba(${rgb},0.06)`,
    borderBottom: "1px solid rgba(0,0,0,0.5)",
    boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 24px rgba(${rgb},0.1), inset 0 1px 0 rgba(${rgb},0.5)`,
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center rounded-2xl transition-all relative overflow-hidden",
        collapsed ? "justify-center p-3" : "gap-3 px-4 py-3.5",
      )}
      style={
        active
          ? activeStyle
          : { background: "transparent", border: "1px solid transparent" }
      }
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255,255,255,0.035)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "transparent";
        }
      }}
    >
      {/* Active indicator bar */}
      {active && !collapsed && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute left-0 inset-y-3.5 w-[2px] rounded-r-full"
          style={{ background: c }}
          transition={{ 
            type: "spring" as const, 
            stiffness: 100, 
            damping: 28,
            mass: 1.2,
            restDelta: 0.001
          }}
        />
      )}

      {/* Icon */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
        style={
          active
            ? {
                background: `rgba(${rgb},0.2)`,
                color: c,
                boxShadow: `inset 0 1px 0 rgba(${rgb},0.4), 0 0 12px rgba(${rgb},0.15)`,
              }
            : {
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.35)",
              }
        }
      >
        <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
      </div>

      {/* Label */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="text-left flex-1 min-w-0"
          >
            <p
              className="text-[11px] font-black uppercase tracking-wider leading-none font-outfit"
              style={{ color: active ? "#fff" : "rgba(255,255,255,0.5)" }}
            >
              {item.label}
            </p>
            <p
              className="text-[7px] font-bold uppercase tracking-[0.2em] mt-1 font-outfit"
              style={{
                color: active
                  ? `rgba(${rgb},0.65)`
                  : "rgba(255,255,255,0.2)",
              }}
            >
              {item.sublabel}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
