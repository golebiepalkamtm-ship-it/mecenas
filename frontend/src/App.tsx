// LexMind App v1.1.0 - Refactored
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Library,
  FileText,
  FolderOpen,
  Settings,
  Sparkles,
  ShieldAlert,
  User as UserIcon,
  Cpu,
  PanelRight,
  History,
} from "lucide-react";

import { useChatSettingsStore } from "./store/useChatSettingsStore";
import { ChatProvider } from "./context/ChatContext";
import { useOrchestratorSync } from "./hooks/useOrchestratorSync";
import { PrestigeLoading } from "./components/Shared/PrestigeLoading";
import { Sidebar } from "./components/Layout/Sidebar";
import { MobileNavigation } from "./components/Layout/MobileNavigation";
import { cn } from "./utils/cn";
import type { Tab, NavItem } from "./types/navigation";
import { lazy, Suspense } from "react";
import { supabase } from "./utils/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { LandingView } from "./components/Landing/LandingView";

const ChatView = lazy(() => import("./components/Chat").then(m => ({ default: m.ChatView })));
const KnowledgeView = lazy(() => import("./components/Knowledge").then(m => ({ default: m.KnowledgeView })));
const DocumentsView = lazy(() => import("./components/Documents").then(m => ({ default: m.DocumentsView })));
const SettingsView = lazy(() => import("./components/Settings").then(m => ({ default: m.SettingsView })));
const DrafterView = lazy(() => import("./components/Drafter").then(m => ({ default: m.DrafterView })));
const PromptsView = lazy(() => import("./components/Prompts").then(m => ({ default: m.PromptsView })));
const AdminView = lazy(() => import("./components/Admin").then(m => ({ default: m.AdminView })));

const NAV_ITEMS: NavItem[] = [
  {
    id: "chat",
    icon: Terminal,
    label: "Konsultacja AI",
    sublabel: "Jednolity System Wsparcia",
    color: "#d4af37", // Gold
    colorRgb: "212,175,55",
  },
  {
    id: "drafter",
    icon: FileText,
    label: "Kreator Pism",
    sublabel: "Master Drafter",
    color: "#b8860b", // Dark Goldenrod (Brass)
    colorRgb: "184,134,11",
  },
  {
    id: "prompts",
    icon: Sparkles,
    label: "Prompty",
    sublabel: "AI Instructions",
    color: "#fbbf24", // Amber (Goldish)
    colorRgb: "251,191,36",
  },
  {
    id: "documents",
    icon: FolderOpen,
    label: "Dokumenty",
    sublabel: "Secure storage",
    color: "#e5e4e2", // Platinum/Silver
    colorRgb: "229,228,226",
  },
  {
    id: "knowledge",
    icon: Library,
    label: "Centralna Baza Wiedzy",
    sublabel: "Archives",
    color: "#cd7f32", // Bronze
    colorRgb: "205,127,50",
  },
  {
    id: "admin",
    icon: ShieldAlert,
    label: "Admin",
    sublabel: "System",
    color: "#991b1b", // Prestige Dark Red
    colorRgb: "153,27,27",
    adminOnly: true,
  },
  {
    id: "settings",
    icon: Settings,
    label: "Profil",
    sublabel: "Identity",
    color: "#f0cc5a", // Soft Gold
    colorRgb: "240,204,90",
  },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("user");
  const [isBooting, setIsBooting] = useState(false);
  const hasBootedRef = useRef(false);
  const { 
    currentSettingsTab, 
    setSettingsTab,
    isOpen,
    activePromptPresetId,
    toggleOpen,
    showHistory,
    setShowHistory
  } = useChatSettingsStore();
  
  useOrchestratorSync();

  const fetchUserRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      
      if (data) setUserRole(data.role);
    } catch {
      // Silent fail - default to user role
    }
  };

  useEffect(() => {
    let bootTimeout: ReturnType<typeof setTimeout>;
    const startTime = Date.now();

    const initializeSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const elapsed = Date.now() - startTime;
      const minimumLoadingTime = 5000;
      const remainingDelay = Math.max(0, minimumLoadingTime - elapsed);

      setTimeout(() => {
        if (currentSession) {
          setSession(currentSession);
          fetchUserRole(currentSession.user.id);
          setIsBooting(true);
          hasBootedRef.current = true;
          
          bootTimeout = setTimeout(() => {
            setIsBooting(false);
          }, 5000);
        }
        setAuthLoading(false);
      }, remainingDelay);
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_IN" && !hasBootedRef.current) {
        setIsBooting(true);
        hasBootedRef.current = true;
        bootTimeout = setTimeout(() => setIsBooting(false), 5000);
      }

      if (event === "SIGNED_OUT") {
        setIsBooting(false);
        hasBootedRef.current = false;
        setSession(null);
      }

      if (newSession) {
        setSession(newSession);
        fetchUserRole(newSession.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (bootTimeout) clearTimeout(bootTimeout);
    };
  }, []);

  // AmbientOrbs handles mouse parallax internally to prevent App re-renders

  // Loading states
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden bg-black">
        <PrestigeLoading />
      </div>
    );
  }

  if (!session || isBooting) {
    return <LandingView />;
  }

  const userEmail = session.user.email || "";
  const filteredNavItems = NAV_ITEMS.filter(item => !item.adminOnly || userRole === "admin");
  const activeNavItem = NAV_ITEMS.find(n => n.id === activeTab);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const renderContentView = () => {
    switch (activeTab) {
      case "chat": return <ChatView onNavigate={setActiveTab} />;
      case "knowledge": return <KnowledgeView />;
      case "drafter": return <DrafterView />;
      case "prompts": return <PromptsView />;
      case "documents": return <DocumentsView />;
      case "settings": return <SettingsView />;
      case "admin": return <AdminView />;
      default: return <ChatView onNavigate={setActiveTab} />;
    }
  };

  return (
    <ChatProvider>
      <div className="flex h-screen w-screen overflow-hidden relative selection:bg-gold-primary/30 selection:text-white font-inter text-white p-0 md:p-2 lg:p-4">
        {/* Background Effects */}
        <div className="aurora-bg aurora-bright opacity-70">
          <div className="aurora-layer" />
        </div>
        <div className="noise-overlay opacity-4" />

        {/* Ambient Orbs - Localized state for performance */}
        <AmbientOrbs />

        {/* Mobile Navigation */}
        <MobileNavigation 
          navItems={filteredNavItems}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Main Glass Shell */}
        <div className="relative flex-1 flex flex-col lg:flex-row overflow-hidden z-10 rounded-2xl shadow-2xl glass-liquid-shell">
          <div className="absolute inset-0 z-[-1]" />

          {/* Top specular edge */}
          <div className="absolute top-0 left-0 right-0 pointer-events-none z-100" style={{ height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.50) 18%, rgba(255,255,255,1.00) 45%, rgba(255,255,255,1.00) 55%, rgba(255,255,255,0.50) 82%, transparent 100%)" }} />
          
          {/* Desktop Sidebar */}
          <Sidebar
            navItems={filteredNavItems}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            userEmail={userEmail}
            onLogout={() => supabase.auth.signOut()}
          />

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden pt-16 lg:pt-0">
            {/* Desktop Header */}
            <header className="hidden lg:flex h-20 shrink-0 items-center justify-between px-6 xl:px-10 relative z-50" style={{ borderBottom: "1px solid rgba(255,255,255,0.055)", background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)" }}>
              <AnimatePresence mode="wait">
                  <motion.div 
                    key="full-header" 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 10 }} 
                    transition={{ duration: 0.35, ease: EASE }}
                    className="flex items-center gap-6"
                  >
                    {/* History Toggle Button */}
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setShowHistory(!showHistory)}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 relative overflow-hidden group",
                        showHistory 
                          ? "shadow-[0_0_20px_rgba(255,255,255,0.08)] border-white/20" 
                          : "border-white/5 hover:border-white/10"
                      )}
                      style={{
                        background: showHistory 
                          ? "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(3,8,18,0.8) 100%)"
                          : "linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(2,10,19,0.7) 100%)",
                        border: "1.1px solid"
                      }}
                    >
                      <History 
                        size={16} 
                        className={cn("transition-colors duration-300", showHistory ? "text-white" : "text-white/25 group-hover:text-white/50")} 
                      />
                    </motion.button>

                    {/* Common Title Block */}
                  <div className="flex items-center gap-5">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        background: `linear-gradient(145deg, rgba(${activeNavItem?.colorRgb}, 0.15) 0%, rgba(3,8,18,0.7) 100%)`,
                        borderTop:    `1.5px solid rgba(${activeNavItem?.colorRgb}, 0.85)`,
                        borderLeft:   `1px   solid rgba(255,255,255,0.12)`,
                        borderBottom: `1.5px solid rgba(0,0,0,0.60)`,
                        boxShadow: `0 8px 24px rgba(0,0,0,0.40), 0 0 20px rgba(${activeNavItem?.colorRgb}, 0.12)`,
                      }}
                    >
                      {activeNavItem && <activeNavItem.icon size={20} style={{ color: activeNavItem.color }} strokeWidth={2} />}
                    </div>
                    
                    <div className="-mt-1.5 flex flex-col pr-8">
                      <h1 
                        className="text-xl lg:text-3xl font-black tracking-tight italic leading-none font-outfit uppercase bg-clip-text text-transparent pr-4"
                        style={{
                          backgroundImage: `linear-gradient(to right, #ffffff 15%, ${activeNavItem?.color} 100%)`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent"
                        }}
                      >
                        {activeNavItem?.label}
                      </h1>
                      <p className="text-[9px] font-bold text-white/22 uppercase tracking-[0.4em] mt-2 font-outfit">{activeNavItem?.sublabel}</p>
                    </div>
                  </div>

                  {/* Contextual Sub-Navigation or Status */}
                  <AnimatePresence mode="wait">
                    {activeTab === "settings" && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.98 }} 
                        transition={{ duration: 0.25, ease: EASE }} 
                        className="flex items-center gap-4 border-l border-white/5 pl-8"
                      >
                        <div className="flex items-center gap-1 p-1 bg-black/20 backdrop-blur-xl border border-white/5 rounded-2xl">
                          {[{ id: 'Profil', icon: UserIcon, label: 'Profil' }, { id: 'Modele AI', icon: Cpu, label: 'Modele AI' }].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setSettingsTab(tab.id)}
                              className={cn("relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300", currentSettingsTab === tab.id ? "text-gold-primary" : "text-white/25 hover:text-white/50")}
                            >
                              {currentSettingsTab === tab.id && (
                                <motion.div layoutId="header-subtab-bg" className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl shadow-inner" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
                              )}
                              <tab.icon size={12} className="relative z-10 -mt-1" />
                              <span className="relative z-10 text-[9px] font-black uppercase tracking-widest -mt-1">{tab.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center gap-6">
                
                {/* Identity Mode Selector (Case Type) */}
                <div className="flex items-center bg-black/40 backdrop-blur-md border border-white/5 p-1 rounded-xl shadow-inner">
                  <button
                    onClick={() => {}} // Integration pending global role switch
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all duration-300",
                      activePromptPresetId === "defense" 
                        ? "bg-gold-primary/15 text-gold-primary border border-gold-primary/30 shadow-[0_0_15px_rgba(212,175,55,0.15)]" 
                        : "text-white/30 hover:text-white/60 border border-transparent"
                    )}
                  >
                    Obrońca
                  </button>
                  <button
                    onClick={() => {}} // Integration pending global role switch
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all duration-300",
                      activePromptPresetId === "prosecution" 
                        ? "bg-white/10 text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                        : "text-white/30 hover:text-white/60 border border-transparent"
                    )}
                  >
                    Oskarżyciel
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-px h-8 bg-white/5 mx-1" />
                  
                  {/* Quick Intelligence Panel Toggle */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={toggleOpen}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 relative overflow-hidden group",
                      isOpen 
                        ? "shadow-[0_0_20px_rgba(212,175,55,0.3)] border-gold-primary/60" 
                        : "border-white/10 hover:border-white/20"
                    )}
                    style={{
                      background: isOpen 
                        ? "linear-gradient(145deg, rgba(212,175,55,0.25) 0%, rgba(3,8,18,0.8) 100%)"
                        : "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(2,10,19,0.7) 100%)",
                      border: "1.2px solid"
                    }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={isOpen ? "open" : "closed"}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <PanelRight 
                          size={16} 
                          className={cn("transition-colors duration-300", isOpen ? "text-gold-primary" : "text-white/40 group-hover:text-white/70")} 
                          strokeWidth={isOpen ? 2.5 : 2}
                        />
                      </motion.div>
                    </AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        layoutId="panel-active-glow"
                        className="absolute inset-0 bg-gold-primary/5 animate-pulse pointer-events-none"
                      />
                    )}
                  </motion.button>

                  <motion.button whileHover={{ scale: 1.08, rotate: 5 }} whileTap={{ scale: 0.94 }} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(145deg, rgba(212,175,55,0.18) 0%, rgba(2, 10, 19,0.65) 100%)", borderTop: "1px solid rgba(249,226,157,0.8)", borderLeft: "1px solid rgba(212,175,55,0.28)", borderRight: "1px solid rgba(212,175,55,0.08)", borderBottom: "1px solid rgba(0,0,0,0.6)", boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.55)" }}>
                    <Sparkles size={16} style={{ color: "#d4af37" }} fill="currentColor" />
                  </motion.button>
                </div>
              </div>
            </header>

            {/* Content Viewport */}
            <section className="flex-1 relative overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10, scale: 0.995, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, scale: 1.005, filter: "blur(4px)" }}
                  transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                  className="absolute inset-0 overflow-hidden"
                >
                  <Suspense fallback={<PrestigeLoading />}>
                    {renderContentView()}
                  </Suspense>
                </motion.div>
              </AnimatePresence>

              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,175,55,0.06) 0%, transparent 80%)" }} />
            </section>
          </main>
        </div>
      </div>
    </ChatProvider>
  );
}
const AmbientOrbs = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 40,
        y: (e.clientY / window.innerHeight - 0.5) * 40
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <motion.div
        className="orb orb-gold"
        animate={{ x: mousePos.x, y: mousePos.y, scale: [1, 1.05, 1] }}
        transition={{ 
          duration: 10, 
          repeat: Infinity, 
          ease: "easeInOut",
          x: { type: "spring", stiffness: 20, damping: 20 },
          y: { type: "spring", stiffness: 20, damping: 20 }
        }}
        style={{ width: 1200, height: 1200, top: "-30%", left: "-20%", opacity: 0.95 }}
      />
      <motion.div
        className="orb orb-gold"
        animate={{ x: -mousePos.x * 1.5, y: -mousePos.y * 1.5, scale: [1, 1.1, 1] }}
        transition={{ 
          duration: 12, 
          repeat: Infinity, 
          ease: "easeInOut",
          x: { type: "spring", stiffness: 15, damping: 25 },
          y: { type: "spring", stiffness: 15, damping: 25 }
        }}
        style={{ width: 1000, height: 1000, bottom: "-10%", right: "-20%", opacity: 0.75 }}
      />
      <motion.div
        className="orb orb-gold"
        animate={{ x: mousePos.x * 2, y: -mousePos.y * 2 }}
        transition={{ type: "spring", stiffness: 10, damping: 30 }}
        style={{ width: 800, height: 800, top: "10%", right: "5%", opacity: 0.55 }}
      />
    </div>
  );
};
