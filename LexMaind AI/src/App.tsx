import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Library,
  Gavel,
  Terminal,
  Sparkles,
  Sun,
  Moon,
  ShieldAlert,
  LogOut,
  User,
  Cpu,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Import Modular Components
import { ChatView } from "./components/Chat";
import { KnowledgeView } from "./components/Knowledge";
import { PromptsView } from "./components/Prompts";
import { AuthView } from "./components/Auth";
import { AdminView } from "./components/Admin";
import { SettingsView } from "./components/Settings";
import { supabase } from "./utils/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { ChatProvider } from "./context/ChatContext";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = "chat" | "knowledge" | "prompts" | "admin" | "settings";

const NAV_ITEMS = [
  {
    id: "chat" as Tab,
    icon: Terminal,
    label: "Konsultacja AI",
    sublabel: "Neural Legal Advisor",
  },
  {
    id: "knowledge" as Tab,
    icon: Library,
    label: "Baza Wiedzy",
    sublabel: "Cognitive Archive",
  },
  {
    id: "prompts" as Tab,
    icon: Gavel,
    label: "Wzory Pism",
    sublabel: "Document Drafter",
  },
  {
    id: "settings" as Tab,
    icon: User,
    label: "Profil",
    sublabel: "Identity Settings",
  },
  {
    id: "admin" as Tab,
    icon: ShieldAlert,
    label: "Panel Kontrolny",
    sublabel: "System Access",
    adminOnly: true,
  },
];

const PRESTIGE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showNav, setShowNav] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("user");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (data) setUserRole(data.role);
    } catch (e) {
      console.error("Error fetching role");
    }
  };

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const handleSignOut = () => supabase.auth.signOut();

  if (authLoading)
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#01080e] overflow-hidden">
        <div className="absolute inset-0 aurora-bg opacity-30" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: PRESTIGE_EASE }}
          className="relative z-10 flex flex-col items-center gap-12"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-8 border border-gold-primary/20 rounded-full border-dashed"
            />
            <div className="w-24 h-24 rounded-[2rem] bg-gold-primary flex items-center justify-center shadow-[0_0_60px_rgba(175,142,59,0.4)] animate-glow-pulse">
              <Scale
                className="w-12 h-12 text-black"
                fill="currentColor"
                strokeWidth={1}
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.8em] text-gold-primary/80 shimmer-text">
              Initializing Prestige Core
            </h2>
            <div className="w-48 h-[1px] bg-white/10 relative overflow-hidden">
              <motion.div
                animate={{ x: [-200, 200] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-y-0 w-20 bg-gold-primary/60"
              />
            </div>
          </div>
        </motion.div>
      </div>
    );

  if (!session) return <AuthView />;

  const userEmail = session.user.email || "";
  const userInitials = userEmail.slice(0, 2).toUpperCase();

  return (
    <ChatProvider>
      <div
        className={cn(
          "flex h-screen w-screen bg-[#01080e] overflow-hidden relative selection:bg-gold-primary/30 selection:text-white font-inter text-white",
          theme === "light" && "light",
        )}
      >
        <div className="aurora-bg" />
        <div className="noise-overlay" />

        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(175,142,59,0.03)_0%,transparent_100%)] z-0" />

        <AnimatePresence>
          {showNav && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNav(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showNav && (
            <motion.nav
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 28 }}
              className="fixed lg:relative inset-y-0 left-0 w-[320px] lg:w-[340px] xl:w-[360px] flex flex-col z-50 bg-[#020a13]/40 backdrop-blur-3xl border-r border-white/5 shadow-[50px_0_100px_rgba(0,0,0,0.5)]"
            >
              <div className="absolute top-0 right-0 w-[1px] h-full bg-linear-to-b from-transparent via-gold-primary/20 to-transparent" />

              <div className="px-10 pt-14 pb-10">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-5 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gold-primary flex items-center justify-center shadow-gold transition-transform group-hover:rotate-6">
                    <Scale
                      className="w-8 h-8 text-black"
                      fill="currentColor"
                      strokeWidth={1}
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-gold-gradient leading-none">
                      LEXMIND
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/40">
                        Prestige Core Active
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar">
                <div className="px-4 mb-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/20">
                    Executive Console
                  </p>
                </div>

                {NAV_ITEMS.filter(
                  (item) => !item.adminOnly || userRole === "admin",
                ).map((item) => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    sublabel={item.sublabel}
                    active={activeTab === item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth < 1024) setShowNav(false);
                    }}
                    danger={item.id === "admin"}
                  />
                ))}
              </div>

              <div className="p-8 space-y-6">
                <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gold-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#01080e] border border-gold-primary/20 flex items-center justify-center">
                      <Cpu size={18} className="text-gold-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white tracking-wide uppercase">
                        GPT-4 Omni
                      </p>
                      <p className="text-[8px] font-bold text-emerald-500/80 uppercase tracking-widest mt-0.5">
                        Quantum Accurate
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-2">
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-gold-primary to-gold-deep flex items-center justify-center shadow-lg border border-white/10 shrink-0">
                    <span className="text-[13px] font-black text-black">
                      {userInitials}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white truncate uppercase tracking-wider">
                      {userEmail.split("@")[0]}
                    </p>
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em]">
                      {userRole}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSignOut}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <LogOut size={16} />
                  </motion.button>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

        <main className="flex-1 flex flex-col relative z-10 overflow-hidden min-w-0">
          <header className="h-24 xl:h-28 flex items-center px-8 xl:px-14 justify-between relative shrink-0">
            <div className="flex items-center gap-6 min-w-0">
              <AnimatePresence mode="wait">
                {!showNav && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onClick={() => setShowNav(true)}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gold-primary hover:bg-gold-primary hover:text-black transition-all"
                  >
                    <Menu size={20} />
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="flex flex-col min-w-0">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4"
                >
                  <h1 className="text-xl xl:text-3xl font-black uppercase tracking-tighter shimmer-text italic">
                    {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
                  </h1>
                  <div className="hidden sm:block h-px w-12 bg-gold-primary/30" />
                </motion.div>
                <p className="text-[9px] xl:text-[10px] font-black text-white/30 uppercase tracking-[0.5em] mt-1 italic">
                  {NAV_ITEMS.find((n) => n.id === activeTab)?.sublabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 xl:gap-6">
              <div className="hidden md:flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <ShieldCheck size={16} className="text-gold-primary" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                    Security
                  </span>
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                    Enforced
                  </span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-gold-primary transition-all"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </motion.button>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-12 h-12 rounded-2xl bg-gold-primary/20 border border-gold-primary/30 flex items-center justify-center cursor-pointer shadow-gold"
              >
                <Sparkles
                  size={20}
                  className="text-gold-primary"
                  fill="currentColor"
                />
              </motion.div>
            </div>

            <div className="absolute bottom-0 left-8 right-8 h-px bg-linear-to-r from-transparent via-white/5 to-transparent" />
          </header>

          <section className="flex-1 relative overflow-hidden px-8 pb-8 xl:px-12 xl:pb-12">
            <div className="w-full h-full glass-prestige rounded-[3rem] border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.6)] bg-[#020a13]/30">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.99, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.01, y: -10 }}
                  transition={{ duration: 0.5, ease: PRESTIGE_EASE }}
                  className="w-full h-full relative z-10"
                >
                  {activeTab === "chat" && <ChatView />}
                  {activeTab === "knowledge" && <KnowledgeView />}
                  {activeTab === "prompts" && <PromptsView />}
                  {activeTab === "settings" && <SettingsView />}
                  {activeTab === "admin" && <AdminView />}
                </motion.div>
              </AnimatePresence>

              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-gold-primary/5 blur-[120px] pointer-events-none rounded-full" />
            </div>
          </section>
        </main>
      </div>
    </ChatProvider>
  );
}

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  active: boolean;
  onClick: () => void;
  danger?: boolean;
}

function SidebarItem({
  icon: Icon,
  label,
  sublabel,
  active,
  onClick,
  danger,
}: SidebarItemProps) {
  return (
    <motion.button
      whileHover={{ x: 6 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full group relative flex flex-col px-6 py-5 rounded-[2rem] transition-all duration-500 overflow-hidden",
        active
          ? "bg-white/[0.04] border border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.2)]"
          : "hover:bg-white/[0.02] border border-transparent",
        danger && !active && "hover:bg-red-500/5",
      )}
    >
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="active-pill"
            className={cn(
              "absolute left-0 inset-y-4 w-1 rounded-r-full",
              danger ? "bg-red-500" : "bg-gold-primary",
            )}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-5 relative z-10">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
            active
              ? danger
                ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                : "bg-gold-primary text-black shadow-gold"
              : "bg-white/5 text-white/30 group-hover:bg-white/10",
            !active &&
              danger &&
              "group-hover:text-red-400 group-hover:bg-red-500/10",
          )}
        >
          <Icon size={18} strokeWidth={active ? 2 : 1.5} />
        </div>
        <div className="text-left">
          <p
            className={cn(
              "text-[12px] font-black uppercase tracking-wider transition-colors duration-300",
              active ? "text-white" : "text-white/40 group-hover:text-white",
              !active && danger && "group-hover:text-red-400",
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "text-[8px] font-bold uppercase tracking-[0.3em] mt-1 transition-colors duration-300",
              active
                ? danger
                  ? "text-red-400/80"
                  : "text-gold-primary/80"
                : "text-white/10 group-hover:text-white/30",
            )}
          >
            {sublabel}
          </p>
        </div>
      </div>

      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
    </motion.button>
  );
}
