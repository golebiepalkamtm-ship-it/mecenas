// LexMind App v1.1.0 - Refactored
import { useState, useEffect, useRef, type CSSProperties } from "react";
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
  X,
  LogOut,
  Gavel,
} from "lucide-react";

import { useChatSettingsStore } from "./store/useChatSettingsStore";
import { ChatContext } from "./context/ChatContextPrimitive";
import { useOrchestratorSync } from "./hooks/useOrchestratorSync";
import { useKnowledgeBase } from "./hooks";
import { useContext } from "react";
import { ModernLoading } from "./components/Shared/ModernLoading";
import { PrestigeLoading } from "./components/Shared/PrestigeLoading";

import { Sidebar } from "./components/Layout/Sidebar";
import { MobileNavigation } from "./components/Layout/MobileNavigation";
import { cn } from "./utils/cn";
import type { Tab, NavItem } from "./types/navigation";
import { lazy, Suspense } from "react";
import { supabase } from "./utils/supabaseClient";
import type { Session } from "@supabase/supabase-js";
const LandingView = lazy(() =>
  import("./components/Landing/LandingView").then((m) => ({
    sublabel: "Secure Vault",
    color: "#06b6d4",
    colorRgb: "6, 182, 212",
  },
  {
    id: "knowledge",
    icon: Library,
    label: "Baza Wiedzy",
    sublabel: "Legal Archives",
    color: "#10b981",
    colorRgb: "16, 185, 129",
  },
  {
    id: "judgments",
    icon: Gavel,
    label: "Orzecznictwo",
    sublabel: "Legal Precedents",
    color: "#fbbf24",
    colorRgb: "251, 191, 36",
  },
  {
    id: "prompts",
    icon: Sparkles,
    label: "Prompty",
    sublabel: "AI Instructions",
    color: "#fb7185",
    colorRgb: "251, 113, 133",
  },
  {
    id: "settings",
    icon: Settings,
    label: "Profil",
    sublabel: "Identity",
    color: "#94a3b8",
    colorRgb: "148, 163, 184",
  },
  {
    id: "admin",
    icon: ShieldAlert,
    label: "Admin",
    sublabel: "System Core",
    color: "#ef4444",
    colorRgb: "239, 68, 68",
    adminOnly: true,
  },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("user");
  
  // Phase of the application routing: splash (5s) -> landing -> login -> app
  // If user is already logged in, we go directly splash -> app
  const [appPhase, setAppPhase] = useState<"splash" | "landing" | "login" | "app">("splash");
  const [splashProgress, setSplashProgress] = useState(0);

  const { currentSettingsTab, setSettingsTab } = useChatSettingsStore();
  const chatContext = useContext(ChatContext);
  useOrchestratorSync();
  const [isFirstMount, setIsFirstMount] = useState(true);

  // Optimization: Render dummy frame first to allow visual feedback instantly
  useEffect(() => {
    const timer = setTimeout(() => setIsFirstMount(false), 0);
    return () => clearTimeout(timer);
  }, []);

  const fetchUserRole = async (userId: string) => {
    console.log(`[APP] ${new Date().toISOString()} Fetching user role for ${userId}...`);
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000),
      );
      const rolePromise = supabase.from("profiles").select("role").eq("id", userId);
      const response = (await Promise.race([rolePromise, timeoutPromise])) as {
        data: { role: string }[] | null;
      };
      
      if (response.data && response.data.length > 0) {
        setUserRole(response.data[0].role);
      } else {
        setUserRole("user");
      }
    } catch (err) {
      setUserRole("user");
    }
  };

  // 1. Initialize Auth and Session checking
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!isMounted) return;
          console.log(`[AUTH] Event: ${event}`, newSession?.user?.id);
          setSession(newSession);
          if (newSession) {
            fetchUserRole(newSession.user.id);
            // If we are waiting in landing or login, transition to app
            setAppPhase(prev => (prev === "login" || prev === "landing") ? "app" : prev);
          } else {
            // Logged out
            setAppPhase(prev => (prev === "app") ? "login" : prev);
          }
          setAuthLoading(false);
        });
        subscription = data.subscription;

        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (isMounted) {
          if (currentSession) {
            setSession(currentSession);
            fetchUserRole(currentSession.user.id);
          }
          setAuthLoading(false);
        }
      } catch (err) {
        console.warn("[AUTH] Initial session check failed:", err);
        if (isMounted) setAuthLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // 2. Control the 5-second Splash Screen phase
  useEffect(() => {
    if (appPhase !== "splash") return;

    const splashDuration = 5000; // 5 seconds mandatory
    const startTime = Date.now();

    // Animate progress smoothly
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / splashDuration) * 100);
      setSplashProgress(progress);
    }, 50);

    // Conclude splash and determine next phase
    const timer = setTimeout(() => {
      clearInterval(interval);
      setSplashProgress(100);
      
      const decideAndTransition = () => {
        if (session) {
          setAppPhase("app");
        } else {
          setAppPhase("landing");
        }
      };

      if (!authLoading) {
        decideAndTransition();
      } else {
        // If auth checking took more than 5 seconds, wait up to 1 more second, then fallback to landing
        setTimeout(() => {
          setAppPhase(session ? "app" : "landing");
        }, 1000);
      }
    }, splashDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [appPhase, session, authLoading]);

  // For initial mount dummy return to trigger TTI faster
  if (isFirstMount) {
    return <div style={{ background: "black", width: "100%", height: "100vh" }} aria-hidden="true" />;
  }

  // --- RENDER VIEWS BASED ON PHASE ---

  // PHASE 1: SPLASH LOADER
  if (appPhase === "splash") {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black relative">
        <ModernLoading />
        {/* Optional Progress Display */}
        <div className="absolute bottom-[20%] w-64 h-1 bg-white/10 rounded-full overflow-hidden">
           <motion.div 
              className="h-full bg-white transition-all duration-75 ease-linear"
              style={{ width: `${splashProgress}%` }}
           />
        </div>
      </div>
    );
  }

  // PHASE 2: LANDING PAGE
  if (appPhase === "landing") {
    return (
      <Suspense fallback={<div className="h-screen w-screen bg-[#050505]" />}>
        {/* Przejście do logowania: onGoToPortal zmienia fazę na login */}
        <LandingView
          onGoToPortal={() => setAppPhase("login")}
          onStartTrial={() => setAppPhase("login")}
        />
      </Suspense>
    );
  }

  // PHASE 3: LOGIN / PORTAL
  if (appPhase === "login") {
    return (
      <Suspense fallback={<div className="h-screen w-screen bg-black flex justify-center items-center"><PrestigeLoading label="AUTORYZACJA" progress={100} /></div>}>
        <PortalView onBack={() => setAppPhase("landing")} />
      </Suspense>
    );
  }

  // PHASE 4: MAIN APP
  const filteredNavItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || userRole === "admin",
  );
  const activeNavItem = NAV_ITEMS.find((n) => n.id === activeTab);
  const topbarAccentStyle = {
    "--topbar-accent-rgb": activeNavItem?.colorRgb ?? "59, 130, 246",
  } as CSSProperties;

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
      case "judgments": return <JudgmentsView />;
      case "settings": return <SettingsView />;
      case "admin": return <AdminView />;
      default: return <ChatView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div
      className="flex h-screen w-full overflow-hidden relative font-inter text-[#1c1c1e] p-0 md:p-2 lg:p-4"
      style={{
        background: "linear-gradient(135deg, #e5e5e7 0%, #ceced1 100%)", // Light gray background
      }}
    >
      <AmbientOrbs />

      <MobileNavigation
        navItems={filteredNavItems}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Main Liquid Superglassmorphism Container (Win 98 + Platinum Glass) */}
      <div
        className="relative flex-1 flex flex-col lg:flex-row overflow-hidden z-10 transition-all duration-500"
        style={{
          background: "linear-gradient(135deg, rgba(235,235,240,0.65) 0%, rgba(205,205,210,0.85) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          // Windows 98 / Brutalist inspired borders integrated with glass
          borderTop: "2px solid rgba(255, 255, 255, 0.9)",
          borderLeft: "2px solid rgba(255, 255, 255, 0.9)",
          borderRight: "2px solid rgba(0, 0, 0, 0.2)",
          borderBottom: "2px solid rgba(0, 0, 0, 0.2)",
          borderRadius: "12px",
          // Inner glow + deep shadow for liquid volume
          boxShadow: "inset 3px 3px 6px rgba(255,255,255,0.7), inset -3px -3px 6px rgba(0,0,0,0.05), 0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <div className="absolute inset-0 z-[-1]" />

        {/* Master Mercury Monolith - Inner decoration */}
        <div className="mercury-master-monolith">
          <div className="mercury-l-gradient opacity-50" />
          <div className="mercury-top-beam opacity-50" />
          <div className="mercury-left-beam opacity-50" />
          <div className="liquid-caustics opacity-40 mix-blend-overlay" />
        </div>
        <div className="mercury-corner-flare" />

        {/* Desktop Sidebar */}
        <Sidebar
          navItems={filteredNavItems}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onLogout={() => supabase.auth.signOut()}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 relative overflow-visible pt-16 lg:pt-0 z-20">
          {/* Desktop Header */}
          <header className="hidden lg:flex absolute top-0 left-0 right-0 h-20 items-center justify-between z-[400] pointer-events-auto">
              <div className="flex items-center justify-between w-full pl-0 pr-12">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="full-header"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-6"
                  >
                    <div className="flex items-center gap-5">
                      <div className="-mt-1 flex flex-col app-topbar-heading-shift" style={topbarAccentStyle}>
                        <h1 className="app-topbar-title text-2xl lg:text-3xl font-black tracking-[-0.04em] leading-none font-outfit uppercase">
                          {activeNavItem?.label}
                        </h1>
                        <p className="app-topbar-subtitle text-[9px] font-black uppercase tracking-[0.34em] mt-2 font-outfit">
                          {activeNavItem?.sublabel} • Neural Node
                        </p>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {activeTab === "settings" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className="flex items-center gap-4 border-l border-black/10 pl-6"
                        >
                          <div className="flex items-center gap-1.5 p-1 bg-black/[0.04] border border-black/10 rounded-2xl shadow-inner">
                            {[{ id: 'Profil', icon: UserIcon, label: 'Profil' }, { id: 'Modele AI', icon: Cpu, label: 'Modele AI' }].map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setSettingsTab(tab.id)}
                                className={cn("relative flex items-center gap-2 px-5 py-2 rounded-xl transition-all duration-500", currentSettingsTab === tab.id ? "text-black" : "text-black/40 hover:text-black/70")}
                              >
                                {currentSettingsTab === tab.id && (
                                  <motion.div layoutId="header-subtab-bg" className="absolute inset-0 bg-white/60 border border-white/80 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.05)]" transition={{ type: 'spring', bounce: 0.1, duration: 0.6 }} />
                                )}
                                <tab.icon size={11} className="relative z-10 -mt-0.5" />
                                <span className="relative z-10 text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </AnimatePresence>

                <div className="flex items-center gap-6">
                  <div className="h-8 w-px bg-black/10" />
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 border border-white/60 shadow-sm text-black/40 hover:text-red-500 hover:bg-white/40 transition-all duration-300 group"
                    title="Wyloguj się"
                  >
                    <LogOut size={16} strokeWidth={2} className="group-hover:translate-x-0.5 transition-transform duration-500" />
                  </button>
                </div>
              </div>
          </header>

          {/* Application Workspace Viewport */}
          <section
            className="flex-1 relative overflow-hidden pt-20 lg:pt-20"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 1.005 }}
                transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                className="relative w-full h-full"
              >
                <Suspense
                  fallback={
                    <div className="flex-1 w-full h-full flex justify-center items-center">
                       <PrestigeLoading label="Ładowanie modułu" progress={0} />
                    </div>
                  }
                >
                  {renderContentView()}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </section>
        </main>
      </div>
    </div>
  );
}

const AmbientOrbs = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      <div
        className="absolute rounded-full"
        style={{
          width: "120vw",
          height: "120vw",
          maxWidth: 1400,
          maxHeight: 1400,
          top: "-35%",
          left: "-25%",
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "100vw",
          height: "100vw",
          maxWidth: 1100,
          maxHeight: 1100,
          bottom: "-15%",
          right: "-22%",
          background: "radial-gradient(circle, rgba(230, 230, 250, 0.4) 0%, transparent 60%)",
        }}
      />
    </div>
  );
};

