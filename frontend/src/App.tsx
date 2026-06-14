// LexMind App v4.1.0
import { useState, useEffect, useRef, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Maximize2, Minimize2 } from "lucide-react";
import { ProfileMenuTabs } from "./components/Settings/components/ProfileMenuTabs";
import type { SettingsTabId } from "./components/Settings/settingsTabs";

import { useChatSettingsStore } from "./store/useChatSettingsStore";
import { useViewportDensity } from "./hooks/useViewportDensity";
import { LexMindLoader } from "./components/Shared/LexMindLoader";
import "./components/Shared/splash-screen.css";

import { Sidebar } from "./components/Layout/Sidebar";
import { MobileNavigation } from "./components/Layout/MobileNavigation";
import type { Tab, NavItem } from "./types/navigation";
import {
  ChatIcon,
  DrafterIcon,
  JudgmentsIcon,
  TrialRoomIcon,
  DocumentsIcon,
  PromptsIcon,
  KnowledgeIcon,
  ProfilIcon,
  AdminIcon,
} from "./components/Layout/RealisticIcons";
import { lazy, Suspense, memo } from "react";
import { supabase } from "./utils/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { ChatProvider } from "./context/ChatContext";
import { useFavoriteModelsSync } from "./hooks/useFavoriteModelsSync";

const MemoizedLexMindLoader = memo(LexMindLoader);
const ChatView = lazy(() => import("./components/Chat").then(m => ({ default: m.ChatView })));
const KnowledgeView = lazy(() => import("./components/Knowledge").then(m => ({ default: m.KnowledgeView })));
const JudgmentsView = lazy(() => import("./components/Judgments").then(m => ({ default: m.JudgmentsView })));
const PromptsView = lazy(() => import("./components/Prompts").then(m => ({ default: m.PromptsView })));
const SettingsView = lazy(() => import("./components/Settings").then(m => ({ default: m.SettingsView })));
const AdminView = lazy(() => import("./components/Admin").then(m => ({ default: m.AdminView })));
const DrafterView = lazy(() => import("./components/Drafter").then(m => ({ default: m.DrafterView })));
const DocumentsView = lazy(() => import("./components/Documents").then(m => ({ default: m.DocumentsView })));
const TrialRoomView = lazy(() => import("./components/TrialRoom").then(m => ({ default: m.TrialRoomView })));
const LandingView = lazy(() => import("./components/Landing/LandingView").then(m => ({ default: m.LandingView })));

const PortalView = lazy(() => import("./components/Landing/PortalView").then(m => ({ default: m.PortalView })));

const NAV_ITEMS: NavItem[] = [
  {
    id: "chat",
    icon: ChatIcon,
    label: "Czat",
    sublabel: "Silnik Neuronowy",
    color: "#0284c7",
    colorRgb: "2, 132, 199",
  },
  {
    id: "trial",
    icon: TrialRoomIcon,
    label: "Sala rozprawy",
    sublabel: "Symulacja procesu",
    color: "#eab308",
    colorRgb: "234, 179, 8",
  },
  {
    id: "drafter",
    icon: DrafterIcon,
    label: "Kreator Pism",
    sublabel: "Generator Dokumentów",
    color: "#f97316",
    colorRgb: "249, 115, 22",
  },
  {
    id: "judgments",
    icon: JudgmentsIcon,
    label: "Orzecznictwo",
    sublabel: "Precedensy Prawne",
    color: "#dc2626",
    colorRgb: "220, 38, 38",
  },
  {
    id: "documents",
    icon: DocumentsIcon,
    label: "Dokumentacja",
    sublabel: "Twoje Dokumenty",
    color: "#fbbf24",
    colorRgb: "251, 191, 36",
  },
  {
    id: "prompts",
    icon: PromptsIcon,
    label: "Prompty",
    sublabel: "Instrukcje AI",
    color: "#8b5cf6",
    colorRgb: "139, 92, 246",
  },
  {
    id: "knowledge",
    icon: KnowledgeIcon,
    label: "Baza Wiedzy",
    sublabel: "Archiwa Prawne",
    color: "#059669",
    colorRgb: "5, 150, 105",
  },

  {
    id: "settings",
    icon: ProfilIcon,
    label: "Profil",
    sublabel: "Tożsamość",
    color: "#475569",
    colorRgb: "71, 85, 105",
  },
  {
    id: "admin",
    icon: AdminIcon,
    label: "Admin",
    sublabel: "Rdzeń Systemu",
    color: "#1d4ed8",
    colorRgb: "29, 78, 216",
    adminOnly: true,
  },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("user");

  useFavoriteModelsSync(session?.user?.id);

  // Phase of the application routing: splash (5s) -> landing -> portal -> login -> app
  // If user is already logged in, we go directly splash -> app
  const [appPhase, setAppPhase] = useState<"splash" | "landing" | "portal" | "login" | "wait-auth" | "app">("splash");

  const currentSettingsTab = useChatSettingsStore(s => s.currentSettingsTab);
  const setSettingsTab = useChatSettingsStore(s => s.setSettingsTab);
  useViewportDensity();
  const [isFirstMount, setIsFirstMount] = useState(true);
  const fetchedUserIds = useRef<Set<string>>(new Set());
  const roleFetchInFlight = useRef<Set<string>>(new Set());

  const authInitStarted = useRef(false);
  const isInitialRendering = useRef(true);
  const waitAuthEnteredAt = useRef<number>(0);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

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
    if (roleFetchInFlight.current.has(userId)) return;
    roleFetchInFlight.current.add(userId);

    console.log('[AUTH] Fetching user role from database for:', userId);
    try {
      const normalizeRole = (rawRole: unknown) => {
        const role = typeof rawRole === "string" ? rawRole.trim().toLowerCase() : "";
        if (role === "admin" || role === "superadmin") return "admin";
        return "user";
      };

      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );

      const queryPromise = supabase.from("profiles").select("role").eq("id", userId).single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      console.log('[AUTH] User role query result:', { error, data });
      if (!error && data) {
        setUserRole(normalizeRole(data.role));
        fetchedUserIds.current.add(userId);
      } else {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        const metaRole = userErr ? null : (userData.user?.app_metadata?.role ?? userData.user?.user_metadata?.role ?? null);
        const normalized = normalizeRole(metaRole);
        if (normalized === "admin") {
          console.log('[AUTH] Using role from auth metadata:', metaRole);
          setUserRole("admin");
          fetchedUserIds.current.add(userId);
        } else {
          console.log('[AUTH] Using default role "user" due to error or no data');
          setUserRole("user");
        }
      }
    } catch (err) {
      console.log('[AUTH] Exception in fetchUserRole:', err);
      setUserRole("user");
    } finally {
      roleFetchInFlight.current.delete(userId);
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

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (localErr) {
        console.warn("[AUTH] Logout failed (global + local):", err, localErr);
      }
    } finally {
      fetchedUserIds.current.clear();
      roleFetchInFlight.current.clear();
      applyResolvedSession(null);
      setTimeout(() => setAppPhase("landing"), 0);
    }
  };

  const toggleFullscreen = async () => {
    try {
      const root = document.documentElement;
      if (!document.fullscreenElement) {
        if (root && typeof root.requestFullscreen === "function") {
          await root.requestFullscreen();
        }
      } else if (typeof document.exitFullscreen === "function") {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("[UI] Pełny ekran:", err);
    }
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
        const { data } = supabase.auth.onAuthStateChange((event: string, newSession: Session | null) => {
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
      authInitStarted.current = false;
      if (subscription) subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Failsafe: never stay on wait-auth forever if Supabase stalls.
  useEffect(() => {
    if (appPhase !== "wait-auth" || !authLoading) return;

    const timer = setTimeout(() => {
      console.warn("[AUTH] wait-auth timeout reached, forcing authLoading=false");
      setAuthLoading(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, [appPhase, authLoading]);

  useEffect(() => {
    if (appPhase === "wait-auth") waitAuthEnteredAt.current = Date.now();
  }, [appPhase]);

  // 2. Control the Splash Screen phase
  useEffect(() => {
    if (appPhase !== "splash") return;

    const splashDuration = 1500; // Reduced for faster startup while keeping the 'premium' feel

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
        import("./components/Chat").catch(() => { });
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
        import("./components/Chat").catch(() => { });
        setTimeout(() => setAppPhase("app"), 150);
      } else if (appPhase === "wait-auth") {
        const elapsed = Date.now() - (waitAuthEnteredAt.current || 0);
        if (elapsed < 2500) return;
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

  // PHASE 1: SPLASH LOADER (PREMIUM WEBGL)
  if (appPhase === "splash") {
    return (
      <div className="splash-page h-dvh max-h-dvh w-full overflow-hidden bg-[#02040a] relative">
        <MemoizedLexMindLoader />
        <SplashProgressBar duration={1500} />
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
            import("./components/Chat").catch(() => { });
            setAuthLoading(true);
            setTimeout(() => setAppPhase("wait-auth"), 0);
            void (async () => {
              try {
                const { data: { session: resolvedSession } } = await supabase.auth.getSession();
                applyResolvedSession(resolvedSession);
              } catch (err) {
                console.warn("[AUTH] Post-login session resolve failed:", err);
                setAuthLoading(false);
              }
            })();
          }}
        />
      </Suspense>
    );
  }

  // PHASE 2.7: WAIT-AUTH (splash ended but supabase hasn't resolved session yet)
  if (appPhase === "wait-auth") {
    return (
      <div className="splash-page h-dvh max-h-dvh w-full overflow-hidden bg-[#02040a] relative">
        <MemoizedLexMindLoader />
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
        case "trial": return <TrialRoomView />;
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
        className="flex h-dvh min-h-dvh w-full max-w-[100vw] overflow-hidden relative font-sans text-accent p-0 md:p-1 lg:p-1.5"
        style={{
          background: "#000000", // Pure black background to prevent eye strain
        }}
      >
        <AmbientOrbs />

        <MobileNavigation
          navItems={filteredNavItems}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onLogout={handleLogout}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
        />

        {/* Main Liquid Superglassmorphism Container (Win 98 + Platinum Glass) */}
        <div
          className="app-shell relative flex-1 flex flex-col min-h-0 lg:grid lg:grid-cols-[5rem_minmax(0,1fr)] 2xl:grid-cols-[8rem_minmax(0,1fr)] lg:grid-rows-[3.5rem_minmax(0,1fr)] 2xl:grid-rows-[5rem_minmax(0,1fr)] overflow-hidden z-10 transition-all duration-500"
          style={{
            background:
              "radial-gradient(900px 600px at 0% 0%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 30%, transparent 70%), " +
              "linear-gradient(135deg, var(--bg-deep) 0%, var(--bg-sea) 55%, var(--bg-blue) 100%)",
            // Windows 98 / Brutalist inspired borders integrated with deep obsidian glass
            borderTop: "2px solid rgba(255, 255, 255, 0.05)",
            borderLeft: "2px solid rgba(255, 255, 255, 0.05)",
            borderRight: "2px solid rgba(0, 0, 0, 0.4)",
            borderBottom: "2px solid rgba(0, 0, 0, 0.4)",
            borderRadius: "12px",
            // Inner glow + deep shadow for liquid volume
            boxShadow: "inset 3px 3px 6px rgba(255,255,255,0.7), inset -3px -3px 6px rgba(0,0,0,0.05), 0 20px 50px rgba(0,0,0,0.25)",
          }}
        >
          <div className="absolute inset-0 z-[-1]" />

          {/* Jedna warstwa chrome (L) — bez szwu sidebar / header */}
          <div className="app-nav-chrome hidden lg:block" aria-hidden="true" />

          {/* Master Mercury Monolith — tylko mobile */}
          <div className="mercury-master-monolith lg:hidden">
            <div className="mercury-l-gradient opacity-50" />
            <div className="mercury-top-beam opacity-50" />
            <div className="mercury-left-beam opacity-50" />
            <div className="liquid-caustics opacity-20" />
          </div>
          <div className="mercury-corner-flare lg:hidden" />

          {/* Desktop Sidebar */}
          <Sidebar
            navItems={filteredNavItems}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onLogout={handleLogout}
          />

          {/* Desktop Header — osobna komórka siatki (bez szwu z sidebarem) */}
          <header className="app-nav-header hidden lg:flex lg:col-start-2 lg:row-start-1 items-center justify-between pointer-events-auto rounded-r-2xl rounded-l-none z-30">
              <div className="app-topbar-inner flex items-center justify-between w-full min-w-0 gap-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="full-header"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3 xl:gap-6 min-w-0 flex-1"
                  >
                    <div className="flex items-center gap-3 xl:gap-5 min-w-0">
                      <div className="-mt-0.5 flex flex-col min-w-0 app-topbar-heading-shift" style={topbarAccentStyle}>
                        <h1 className="app-topbar-title text-xl xl:text-2xl 2xl:text-3xl font-black tracking-[-0.04em] leading-none font-outfit uppercase text-black truncate">
                          {activeNavItem?.label}
                        </h1>
                        <p className="app-topbar-subtitle text-[8px] xl:text-[9px] font-black uppercase tracking-[0.28em] xl:tracking-[0.34em] mt-1 xl:mt-2 font-outfit truncate">
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
                          className="hidden lg:flex items-center gap-4 border-l border-black/10 pl-4 xl:pl-6 shrink-0"
                        >
                          <ProfileMenuTabs
                            activeTab={(currentSettingsTab as SettingsTabId) || "Profil"}
                            onTabChange={setSettingsTab}
                            variant="header"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </AnimatePresence>

                <div className="flex items-center gap-3">
                  <div className="h-8 w-px bg-black/10" />
                  <button
                    type="button"
                    onClick={() => void toggleFullscreen()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center glass-liquid-convex shadow-md text-black/60 hover:text-black transition-all duration-300"
                    title={isFullscreen ? "Zamknij pełny ekran (Esc)" : "Pełny ekran"}
                  >
                    {isFullscreen ? <Minimize2 size={16} strokeWidth={2} /> : <Maximize2 size={16} strokeWidth={2} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-10 h-10 rounded-xl flex items-center justify-center glass-liquid-convex shadow-md text-black/60 hover:text-red-600 transition-all duration-300 group"
                    title="Wyloguj się"
                  >
                    <LogOut size={16} strokeWidth={2} className="group-hover:translate-x-0.5 transition-transform duration-500" />
                  </button>
                </div>
              </div>
          </header>

          {/* Main Content Area */}
          <main className="app-main-mobile-offset flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden lg:pt-0 lg:col-start-2 lg:row-start-2 z-20">
            <section className="flex-1 relative min-h-0 overflow-hidden">
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
    <div className="splash-progress">
      <div className="splash-progress__inner">
        <div className="splash-progress__labels">
          {/* eslint-disable-next-line */}
          <span>Uruchamianie</span>
          <span>{Math.round(progress)}%</span>
        </div>

        <div className="splash-progress__track">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.65) 55%, rgba(255,255,255,0.25) 100%)",
              boxShadow: "0 0 18px rgba(255,255,255,0.12)",
            }}
          />
          <motion.div
            className="absolute inset-0"
            animate={{ x: ["-30%", "130%"] }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], repeat: Infinity }}
            style={{
              width: "45%",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0) 100%)",
              mixBlendMode: "overlay",
              filter: "blur(0.5px)",
            }}
          />
        </div>
      </div>
    </div>
  );
};
