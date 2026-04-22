// LexMind App v1.1.0 - Refactored
import { useState, useEffect, useRef, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Library,
  Settings,
  Sparkles,
  ShieldAlert,
  User as UserIcon,
  Cpu,
  LogOut,
  Gavel,
  FileText,
  FolderOpen,
} from "lucide-react";

import { useChatSettingsStore } from "./store/useChatSettingsStore";
import { useOrchestratorSync } from "./hooks/useOrchestratorSync";
import { ModernLoading } from "./components/Shared/ModernLoading";

import { Sidebar } from "./components/Layout/Sidebar";
import { MobileNavigation } from "./components/Layout/MobileNavigation";
import { cn } from "./utils/cn";
import type { Tab, NavItem } from "./types/navigation";
import { lazy, Suspense, memo } from "react";
import { supabase } from "./utils/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { ChatProvider } from "./context/ChatContext";

const MemoizedModernLoading = memo(ModernLoading);
const ChatView = lazy(() => import("./components/Chat").then(m => ({ default: m.ChatView })));
const KnowledgeView = lazy(() => import("./components/Knowledge").then(m => ({ default: m.KnowledgeView })));
const JudgmentsView = lazy(() => import("./components/Judgments").then(m => ({ default: m.JudgmentsView })));
const PromptsView = lazy(() => import("./components/Prompts").then(m => ({ default: m.PromptsView })));
const SettingsView = lazy(() => import("./components/Settings").then(m => ({ default: m.SettingsView })));
const AdminView = lazy(() => import("./components/Admin").then(m => ({ default: m.AdminView })));
const DrafterView = lazy(() => import("./components/Drafter").then(m => ({ default: m.DrafterView })));
const DocumentsView = lazy(() => import("./components/Documents").then(m => ({ default: m.DocumentsView })));
const LandingView = lazy(() => import("./components/Landing/LandingView").then(m => ({ default: m.LandingView })));

const PortalView = lazy(() => import("./components/Landing/PortalView").then(m => ({ default: m.PortalView })));

const NAV_ITEMS: NavItem[] = [
  {
    id: "chat",
    icon: Terminal,
    label: "Czat",
    sublabel: "Silnik Neuronowy",
    color: "#3b82f6",
    colorRgb: "59, 130, 246",
  },
  {
    id: "drafter",
    icon: FileText,
    label: "Kreator Pism",
    sublabel: "Generator Dokumentów",
    color: "#8b5cf6",
    colorRgb: "139, 92, 246",
  },
  {
    id: "judgments",
    icon: Gavel,
    label: "Orzecznictwo",
    sublabel: "Precedensy Prawne",
    color: "#fbbf24",
    colorRgb: "251, 191, 36",
  },
  {
    id: "documents",
    icon: FolderOpen,
    label: "Dokumentacja",
    sublabel: "Twoje Dokumenty",
    color: "#f59e0b",
    colorRgb: "245, 158, 11",
  },
  {
    id: "prompts",
    icon: Sparkles,
    label: "Prompty",
    sublabel: "Instrukcje AI",
    color: "#fb7185",
    colorRgb: "251, 113, 133",
  },
  {
    id: "knowledge",
    icon: Library,
    label: "Baza Wiedzy",
    sublabel: "Archiwa Prawne",
    color: "#10b981",
    colorRgb: "16, 185, 129",
  },
  {
    id: "settings",
    icon: Settings,
    label: "Profil",
    sublabel: "Tożsamość",
    color: "#94a3b8",
    colorRgb: "148, 163, 184",
  },
  {
    id: "admin",
    icon: ShieldAlert,
    label: "Admin",
    sublabel: "Rdzeń Systemu",
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
  
  // Phase of the application routing: splash (5s) -> landing -> portal -> login -> app
  // If user is already logged in, we go directly splash -> app
  const [appPhase, setAppPhase] = useState<"splash" | "landing" | "portal" | "login" | "wait-auth" | "app">("splash");

  const currentSettingsTab = useChatSettingsStore(s => s.currentSettingsTab);
  const setSettingsTab = useChatSettingsStore(s => s.setSettingsTab);
  useOrchestratorSync();
  const [isFirstMount, setIsFirstMount] = useState(true);
  const fetchedUserIds = useRef<Set<string>>(new Set());

  const authInitStarted = useRef(false);
  const isInitialRendering = useRef(true);

  // Performance monitoring disabled - causing recursive blocking overhead
  // Re-enable only if needed for debugging specific issues

  // Optimization: Render dummy frame first to allow visual feedback instantly
  useEffect(() => {
    if (isInitialRendering.current) {
        if (!performance.getEntriesByName("APP_BOOT").length) {
          performance.mark("APP_BOOT");
          console.log(`[APP] v1.0.3 Boot started at ${new Date().toISOString()}`);
        }
        isInitialRendering.current = false;
    }
    const timer = setTimeout(() => setIsFirstMount(false), 0);
    return () => clearTimeout(timer);
  }, []);

  const fetchUserRole = async (userId: string) => {
    if (fetchedUserIds.current.has(userId)) return;
    fetchedUserIds.current.add(userId);

    console.log('[AUTH] Fetching user role from database for:', userId);
    try {
      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );

      const queryPromise = supabase.from("profiles").select("role").eq("id", userId).single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      console.log('[AUTH] User role query result:', { error, data });
      if (!error && data) {
        setUserRole(data.role);
      } else {
        console.log('[AUTH] Using default role "user" due to error or no data');
        setUserRole("user");
      }
    } catch (err) {
      console.log('[AUTH] Exception in fetchUserRole:', err);
      setUserRole("user");
    }
  };

  const applyResolvedSession = (resolvedSession: Session | null) => {
    setSession(resolvedSession);
    setAuthLoading(false);

    if (resolvedSession) {
      console.log('[AUTH] Applying resolved session for:', resolvedSession.user.id);
      void fetchUserRole(resolvedSession.user.id);
      return;
    }

    setUserRole("user");
  };

  // 1. Initialize Auth and Session checking
  useEffect(() => {
    if (authInitStarted.current) return;
    authInitStarted.current = true;

    console.log('[AUTH] Starting auth initialization...');
    let subscription: { unsubscribe: () => void } | null = null;
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('[AUTH] Setting up onAuthStateChange listener...');
        const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (!isMounted) return;
          console.log(`[AUTH] Event: ${event}`, newSession?.user?.id);
          applyResolvedSession(newSession);
        });
        subscription = data.subscription;
        console.log('[AUTH] Auth state change listener registered');

        console.log('[AUTH] Getting current session...');
        const sessionTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        );
        const sessionPromise = supabase.auth.getSession();
        const { data: { session: currentSession } } = await Promise.race([sessionPromise, sessionTimeout]);
        console.log('[AUTH] Current session retrieved:', currentSession ? 'has session' : 'no session');

        if (isMounted) {
          applyResolvedSession(currentSession);
          console.log('[AUTH] Auth initialization complete');
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

  // Failsafe: never stay on wait-auth forever if Supabase stalls.
  useEffect(() => {
    if (appPhase !== "wait-auth" || !authLoading) return;

    const timer = setTimeout(() => {
      console.warn("[AUTH] wait-auth timeout reached, forcing authLoading=false");
      setAuthLoading(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [appPhase, authLoading]);

  // 2. Control the Splash Screen phase
  useEffect(() => {
    if (appPhase !== "splash") return;

    const splashDuration = 2500;
    
    const timer = setTimeout(() => {
        performance.mark("splash-end");
        const bootEntry = performance.getEntriesByName("APP_BOOT")[0];
        if (bootEntry) {
          const measureName = `splash-v1.0.4-${Date.now()}`;
          performance.measure(measureName, "APP_BOOT", "splash-end");
          const measure = performance.getEntriesByName(measureName)[0];
          console.log(`[PERF] Splash total duration: ${measure?.duration.toFixed(2)}ms`);
        }
        
        // TRANSITION BUFFER: Instead of jumping directly to 'app', we go to a brief black screen 
        // to let the main thread process any pending tasks (lazily load chat components etc)
        const nextPhase = session ? "app" : "landing";
        
        // Prefetch ChatView just before transitioning to app
        if (nextPhase === "app") {
          import("./components/Chat").catch(() => {});
        }
        
        if (!authLoading) {
           if (nextPhase === "app") {
             setTimeout(() => setAppPhase("app"), 150);
           } else {
             setAppPhase(nextPhase);
           }
        } else {
           setAppPhase("wait-auth");
        }
    }, splashDuration);

    return () => clearTimeout(timer);
  }, [appPhase, session, authLoading]);

  // Transition to app when auth completes (handles case when splash ends before auth or wait-auth phase)
  useEffect(() => {
    if ((appPhase === "landing" || appPhase === "wait-auth") && !authLoading) {
      if (session) {
        // TRANSITION BUFFER: Prefetch ChatView before transitioning to give the browser time to fetch chunks
        import("./components/Chat").catch(() => {});
        setTimeout(() => setAppPhase("app"), 150);
      } else if (appPhase === "wait-auth") {
        // If they were stuck waiting but have no session, send them to landing on next tick
        setTimeout(() => setAppPhase("landing"), 0);
      }
    }
  }, [appPhase, session, authLoading]);

  // For initial mount dummy return to trigger TTI faster 
  // and we also use it for brief blackout during heavy app mount
  if (isFirstMount) {
    return <div style={{ background: "black", width: "100%", height: "100vh" }} aria-hidden="true" />;
  }

  // --- RENDER VIEWS BASED ON PHASE ---

  // PHASE 1: SPLASH LOADER
  if (appPhase === "splash") {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black relative">
        <MemoizedModernLoading />
        <SplashProgressBar duration={2500} />
      </div>
    );
  }

  // PHASE 2: LANDING PAGE
  if (appPhase === "landing") {
    return (
      <Suspense fallback={<div className="h-screen w-screen bg-[#050505]" />}>
        <LandingView onGoToPortal={() => setAppPhase("portal")} onStartTrial={() => setAppPhase("portal")} />
      </Suspense>
    );
  }

  // PHASE 2.5: PORTAL PAGE (old login with neural network)
  if (appPhase === "portal") {
    return (
      <Suspense fallback={<div className="h-screen w-screen bg-[#050505]" />}>
        <PortalView 
          onBack={() => setAppPhase("landing")} 
          onLoginSuccess={() => {
            // TRANSITION BUFFER: Prevent synchronous unmount of PortalView & mount of ChatView
            // Request the bundle, and transition to 'app' on the next few frames to avoid main thread saturation
            import("./components/Chat").catch(() => {});
            setTimeout(() => setAppPhase("app"), 150);
          }} 
        />
      </Suspense>
    );
  }

  // PHASE 2.7: WAIT-AUTH (splash ended but supabase hasn't resolved session yet)
  if (appPhase === "wait-auth") {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black relative">
        <MemoizedModernLoading />
      </div>
    );
  }

  // PHASE 3: MAIN APP
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
    try {
      switch (activeTab) {
        case "chat": return <ChatView onNavigate={setActiveTab} />;
        case "knowledge": return <KnowledgeView />;
        case "prompts": return <PromptsView />;
        case "judgments": return <JudgmentsView />;
        case "drafter": return <DrafterView />;
        case "documents": return <DocumentsView />;
        case "settings": return <SettingsView />;
        case "admin": return <AdminView />;
        default: return <ChatView onNavigate={setActiveTab} />;
      }
    } catch (error) {
      console.error('[renderContentView] Error rendering tab:', activeTab, error);
      return <div className="flex-1 flex items-center justify-center text-red-500">Błąd ładowania zakładki: {activeTab}</div>;
    }
  };

  return (
    <ChatProvider>
    <div
      className="flex h-screen w-full overflow-hidden relative font-inter text-accent p-0 md:p-2 lg:p-4"
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
          background: "linear-gradient(135deg, rgba(235,235,240,0.85) 0%, rgba(210,210,215,0.95) 100%)",
          // backdropFilter removed for performance (was blur(12px))
          // WebkitBackdropFilter removed for performance (was blur(12px))
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
          <div className="liquid-caustics opacity-20" />
        </div>
        <div className="mercury-corner-flare" />

        {/* Desktop Sidebar */}
        <Sidebar
          navItems={filteredNavItems}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onLogout={() => supabase.auth.signOut()}
          userRole={userRole}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 relative overflow-visible pt-16 lg:pt-0 z-20">
          {/* Desktop Header */}
          <header className="hidden lg:flex absolute top-0 left-0 right-0 h-20 items-center justify-between z-400 pointer-events-auto bg-gray-900/80">
              <div className="flex items-center justify-between w-full pl-8 pr-12">
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
                          <div className="flex items-center gap-1.5 p-1 bg-black/4 border border-black/10 rounded-2xl shadow-inner">
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
                       <motion.div
                         animate={{ rotate: 360 }}
                         transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                         className="w-8 h-8 border-2 border-white/20 border-t-white/50 rounded-full"
                       />
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
    </ChatProvider>
  );
}

const AmbientOrbs = memo(() => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40"
      aria-hidden="true"
    >
      <div
        className="absolute rounded-full"
        style={{
          width: "80vw",
          height: "80vw",
          maxWidth: 1000,
          maxHeight: 1000,
          top: "-20%",
          left: "-15%",
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "70vw",
          height: "70vw",
          maxWidth: 800,
          maxHeight: 800,
          bottom: "-10%",
          right: "-10%",
          background: "radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)",
        }}
      />
    </div>
  );
});

const SplashProgressBar = ({ duration }: { duration: number }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const val = Math.min((elapsed / duration) * 100, 100);
      setProgress(val);
      if (val >= 100) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className="absolute bottom-[20%] w-64 h-1 bg-white/10 rounded-full overflow-hidden">
       <motion.div 
          className="h-full bg-white transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
       />
    </div>
  );
};

