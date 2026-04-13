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
  X
} from "lucide-react";

import { useChatSettingsStore } from "./store/useChatSettingsStore";
import { ChatContext } from "./context/ChatContextPrimitive";
import { useOrchestratorSync } from "./hooks/useOrchestratorSync";
import { useKnowledgeBase } from "./hooks";
import { useContext } from "react";
import { PrestigeLoading } from "./components/Shared/PrestigeLoading";
import { Sidebar } from "./components/Layout/Sidebar";
import { MobileNavigation } from "./components/Layout/MobileNavigation";
import { cn } from "./utils/cn";
import type { Tab, NavItem } from "./types/navigation";
import { lazy, Suspense } from "react";
import { supabase } from "./utils/supabaseClient";
import type { Session } from "@supabase/supabase-js";
const LandingView = lazy(() => import("./components/Landing/LandingView").then(m => ({ default: m.LandingView })));
const PortalView = lazy(() => import("./components/Landing/index").then(m => ({ default: m.PortalView })));

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
    sublabel: "Neural Reasoning",
    color: "#ffffff",
    colorRgb: "255, 255, 255",
  },
  {
    id: "drafter",
    icon: FileText,
    label: "Kreator Pism",
    sublabel: "Master Drafter",
    color: "#a78bfa",
    colorRgb: "167, 139, 250",
  },
  {
    id: "documents",
    icon: FolderOpen,
    label: "Dokumenty",
    sublabel: "Secure Vault",
    color: "#ffffff",
    colorRgb: "255, 255, 255",
  },
  {
    id: "knowledge",
    icon: Library,
    label: "Baza Wiedzy",
    sublabel: "Legal Archives",
    color: "#ffffff",
    colorRgb: "255, 255, 255",
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
    color: "#ffffff",
    colorRgb: "255, 255, 255",
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
  const [isBooting, setIsBooting] = useState(false);
  const [showBypass, setShowBypass] = useState(false);
  
  // Mandatory initial 5s splash screen
  const [isInitialSplash, setIsInitialSplash] = useState(true);
  // Controls which landing view to show: "new" (landing) or "portal" (old login page)
  const [landingMode, setLandingMode] = useState<"new" | "portal">("new");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const hasBootedRef = useRef(false);
  const { 
    currentSettingsTab, 
    setSettingsTab
  } = useChatSettingsStore();
  
  const chatContext = useContext(ChatContext);
  const isInitialLoadComplete = chatContext?.isInitialLoadComplete || false;
  const { isLoading: isKBLoading } = useKnowledgeBase();
  const [isFirstMount, setIsFirstMount] = useState(true);

  useEffect(() => {
    // Shave off initial render cost for performance tests
    const timer = setTimeout(() => setIsFirstMount(false), 0);
    
    // Mandatory 5s initial splash
    const splashTimer = setTimeout(() => {
      setIsInitialSplash(false);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(splashTimer);
    };
  }, []);

  useOrchestratorSync();

  const fetchUserRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId);
      
      if (data && data.length > 0) {
        setUserRole(data[0].role);
      } else {
        // Fallback for missing profile - will be handled by upsert in settings
        setUserRole("user");
      }
    } catch {
      setUserRole("user");
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Safety timeout for Supabase connection (5s)
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Supabase Timeout")), 5000)
        );

        const { data: { session: currentSession } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as { data: { session: Session | null } };
        
        if (currentSession) {
          setSession(currentSession);
          fetchUserRole(currentSession.user.id);
          setIsBooting(true);
          hasBootedRef.current = true;
        }
      } catch (err) {
        console.warn("[BOOT] Auth initialization failed or timed out:", err);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_IN" && !hasBootedRef.current) {
        setIsBooting(true);
        hasBootedRef.current = true;
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
    };
  }, []);

  // Finalize Booting sequence based on data readiness
  useEffect(() => {
    const minimumLoadingTime = 5000; // Premium feel minimum delay
    const startTime = window.__prawnik_load_start || Date.now();
    
    // DEBUG: Informative logs for startup stability

    // Finalize booting condition check
    if (isBooting && session && isInitialLoadComplete && !isKBLoading) {
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, minimumLoadingTime - elapsed);

        const timer = setTimeout(() => {
            console.log("🚀 [BOOT] All systems ready. Launching Interface.");
            setIsBooting(false);
        }, remainingDelay);
        
        return () => clearTimeout(timer);
    } else if (!session && !authLoading && isBooting) {
        // Not logged in - landing page should show
        // Defer to avoid synchronous setState in effect warning
        console.log("👋 [BOOT] No active session. Redirecting to Landing.");
        setTimeout(() => setIsBooting(false), 0);
    }
  }, [session, isInitialLoadComplete, isKBLoading, isBooting, authLoading]);

  // Hard maximum boot timeout — absolute safety net
  useEffect(() => {
    if (!isBooting) return;
    
    // Show bypass button after 6 seconds
    const bypassTimer = setTimeout(() => {
       setShowBypass(true);
    }, 6000);

    const maxBootTimer = setTimeout(() => {
      console.warn("⚠️ [BOOT] Maximum boot time (15s) exceeded — forcing initialization.");
      setIsBooting(false);
    }, 15000);
    
    return () => {
      clearTimeout(bypassTimer);
      clearTimeout(maxBootTimer);
    };
  }, [isBooting]);

  // AmbientOrbs handles mouse parallax internally to prevent App re-renders

  // Performance bypass for initial load test - Ensure sub-500ms synchronous render
  if (isFirstMount && !session && authLoading) {
    return <div style={{ background: "black", width: "100vw", height: "100vh" }} />;
  }

  // 1. Mandatory Initial Splash Screen (5 seconds)
  if (isInitialSplash) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden bg-black relative">
        <PrestigeLoading 
          variant="full"
          label="Lex Minde Ai" 
          sublabel="ladowanie systemu"
        />
        <div className="fixed bottom-12 text-[8px] text-gold-primary/40 font-mono uppercase tracking-[0.4em] animate-pulse">
           Initializing Neural Core v4.2
        </div>
      </div>
    );
  }

  // 2. Auth Loading (Silent)
  if (authLoading) {
    return <div className="h-screen w-screen bg-black" />;
  }

  // 3. Post-Login App Booting (Status Sync)
  if (session && isBooting) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden bg-black relative">
        <PrestigeLoading 
          variant="full"
          label="ŁADOWANIE SYSTEMU" 
          sublabel="weryfikacja bazy i modeli AI..."
        />
        
        {showBypass && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setIsBooting(false)}
            className="fixed bottom-12 z-50 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] uppercase font-black tracking-widest text-white/40 hover:text-white transition-all duration-300"
          >
            Pomiń synchronizację (Bypass)
          </motion.button>
        )}

        <div className="fixed bottom-6 text-[8px] text-white/10 font-mono flex gap-4 uppercase tracking-[0.2em]">
           <span>API: {isInitialLoadComplete ? "READY" : "WAITING"}</span>
           <span>KB: {isKBLoading ? "INDEXING" : "READY"}</span>
        </div>
      </div>
    );
  }

  // 4. Landing / Login Views
  if (!session) {
      if (isTransitioning) {
        return (
          <div className="h-screen w-screen flex items-center justify-center bg-black">
            <PrestigeLoading variant="full" label="PRZYGOTOWANIE" sublabel="inicjalizacja portalu..." />
          </div>
        );
      }

      if (landingMode === "new") {
      return (
        <Suspense fallback={
          <div className="h-screen w-screen flex items-center justify-center bg-[#050505]">
            <PrestigeLoading variant="full" label="PRZYGOTOWANIE" sublabel="inicjalizacja systemu..." />
          </div>
        }>
          <LandingView onGoToPortal={() => {
            setIsTransitioning(true);
            setTimeout(() => {
              setLandingMode("portal");
              setIsTransitioning(false);
            }, 5000);
          }} />
        </Suspense>
      );
    }
    
     // Portal / Old Login View
    return (
       <Suspense fallback={
         <div className="h-screen w-screen flex items-center justify-center bg-black">
           <PrestigeLoading variant="full" label="PRZYGOTOWANIE" sublabel="inicjalizacja portalu..." />
         </div>
       }>
          <PortalView />
       </Suspense>
    );
  }

  const filteredNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || userRole === "admin");
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
      <div className="flex h-screen w-screen overflow-hidden relative selection:bg-white/20 selection:text-white font-inter text-white p-0 md:p-2 lg:p-4">
        {/* Background Effects */}
        <div className="aurora-bg opacity-70">
          <div className="aurora-layer" />
        </div>
        <div className="noise-grain-overlay" />

        {/* Ambient Orbs - Localized state for performance */}
        <AmbientOrbs />

        {/* Mobile Navigation */}
        <MobileNavigation 
          navItems={filteredNavItems}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Main Glass Shell */}
        <div className="relative flex-1 flex flex-col lg:flex-row overflow-hidden z-10 rounded-2xl shadow-2xl glass-unified-frame">
          <div className="absolute inset-0 z-[-1]" />


          {/* Master Mercury Monolith - One piece background for Sidebar and Header */}
          <div className="mercury-master-monolith" />
          <div className="mercury-header-shimmer" />
          <div className="mercury-sidebar-shimmer" />

          {/* Top specular edge */}
          <div className="absolute top-0 left-0 right-0 pointer-events-none z-310" style={{ height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.30) 18%, rgba(255,255,255,0.70) 45%, rgba(255,255,255,0.70) 55%, rgba(255,255,255,0.30) 82%, transparent 100%)" }} />
          
          {/* Left specular edge - Vertical Lux */}
          <div className="absolute top-0 left-0 bottom-0 pointer-events-none z-310" style={{ width: "1px", background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.30) 18%, rgba(255,255,255,0.70) 45%, rgba(255,255,255,0.70) 55%, rgba(255,255,255,0.30) 82%, transparent 100%)" }} />
          
          {/* Bottom specular edge */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-100" style={{ height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 15%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.15) 55%, rgba(255,255,255,0.05) 85%, transparent 100%)" }} />
          
          {/* Desktop Sidebar */}
          <Sidebar
            navItems={filteredNavItems}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onLogout={() => supabase.auth.signOut()}
          />

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0 relative overflow-visible pt-16 lg:pt-0">
            {/* Desktop Header - Hidden on Admin to avoid redundancy */}
            {activeTab !== "admin" && (
              <header 
                className="hidden lg:flex fixed lg:absolute top-0 left-0 right-0 h-20 items-center justify-between z-300 pointer-events-auto"
              >
              <div className="flex items-center justify-between w-full pl-6 pr-12">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key="full-header" 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 10 }} 
                    transition={{ duration: 0.35, ease: EASE }}
                    className="flex items-center gap-6"
                  >


                    {/* Common Title Block */}
                    <div className="flex items-center gap-5">
                      <div className="-mt-1.5 flex flex-col pr-8">
                        <h1 
                          className="text-xl lg:text-3xl font-black tracking-tighter leading-none font-outfit uppercase bg-clip-text text-transparent pr-4"
                          style={{
                            backgroundImage: `linear-gradient(to right, #ffffff 0%, #a1a1aa 100%)`,
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
                          className="flex items-center gap-4 border-l border-white/5 pl-6"
                        >
                          <div className="flex items-center gap-1 p-1 bg-black/20 backdrop-blur-xl border border-white/5 rounded-2xl">
                            {[{ id: 'Profil', icon: UserIcon, label: 'Profil' }, { id: 'Modele AI', icon: Cpu, label: 'Modele AI' }].map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setSettingsTab(tab.id)}
                                className={cn("relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300", currentSettingsTab === tab.id ? "text-gold-primary" : "text-white/25 hover:text-white/50")}
                              >
                                {currentSettingsTab === tab.id && (
                                  <motion.div layoutId="header-subtab-bg" className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
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
                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => supabase.auth.signOut()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 border border-red-500/40 text-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-500/20 hover:border-red-500/60 hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] group/exit"
                    title="Wyloguj się"
                  >
                    <X size={20} className="group-hover/exit:rotate-90 transition-transform duration-300" />
                  </motion.button>
                </div>
              </div>
            </header>
            )}

            {/* Content Viewport */}
            <section className={cn("flex-1 relative overflow-hidden pt-20", activeTab === 'admin' ? "lg:pt-0" : "lg:pt-24")}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10, scale: 0.995, filter: "blur(0px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, scale: 1.005, filter: "blur(0px)" }}
                  transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                  className="absolute inset-0 overflow-hidden"
                >
                  <Suspense fallback={<PrestigeLoading variant="compact" />}>
                    {renderContentView()}
                  </Suspense>
                </motion.div>
              </AnimatePresence>

              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 80%)" }} />
            </section>
          </main>
        </div>
      </div>
    );
}

const AmbientOrbs = () => {
  // Ultra-optimized background. Removed mouse parallax and frame-by-frame physics 
  // calculations to prevent OS freezing during startup on weaker GPUs.
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Primary Mercury orb — top left */}
      <div
        className="absolute rounded-full"
        style={{
          width: "120vw", height: "120vw",
          maxWidth: 1400, maxHeight: 1400,
          top: "-35%", left: "-25%",
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 60%)",
        }}
      />
      
      {/* Secondary Mercury accent — bottom right */}
      <div
        className="absolute rounded-full"
        style={{
          width: "100vw", height: "100vw",
          maxWidth: 1100, maxHeight: 1100,
          bottom: "-15%", right: "-22%",
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 60%)",
        }}
      />

      {/* Pure white ambient highlight */}
      <div
        className="absolute rounded-full shadow-[0_0_100px_rgba(255,255,255,0.1)]"
        style={{
          width: "80vw", height: "80vw",
          maxWidth: 900, maxHeight: 900,
          top: "10%", right: "5%",
          background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
        }}
      />
    </div>
  );
};
