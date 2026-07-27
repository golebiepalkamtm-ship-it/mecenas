// LexMind App v4.1.0
import { useState, useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import type { SettingsTabId } from "./components/Settings/settingsTabs";

import { useSettingsNavigationState } from "./hooks/chatSettingsSelectors";
import { useHashNavigation } from "./hooks/useHashNavigation";
import { useViewportDensity } from "./hooks/useViewportDensity";
import { LexMindLoader } from "./components/Shared/LexMindLoader";
import { SplashProgressBar } from "./components/Shared/SplashProgressBar";
import "./components/Shared/splash-screen.css";

import { lazy, Suspense, memo } from "react";
import { ChatProvider } from "./context/ChatContext";
import { useFavoriteModelsSync } from "./hooks/useFavoriteModelsSync";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";
import { AppPhaseRouter } from "./components/App/AppPhaseRouter";
import { WorkspaceShell } from "./components/App/WorkspaceShell";
import { NAV_ITEMS } from "./components/App/navigationConfig";
import { WorkspaceContentView } from "./components/App/WorkspaceContentView";
import type { Tab } from "./types/navigation";
import type { AppPhase, UserRole } from "./types/app";

const MemoizedLexMindLoader = memo(LexMindLoader);
const LandingView = lazy(() => import("./components/Landing/LandingView").then(m => ({ default: m.LandingView })));

const PortalView = lazy(() => import("./components/Landing/PortalView").then(m => ({ default: m.PortalView })));

export default function App() {
  const { activeTab, setActiveTab } = useHashNavigation();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>("user");
  const [appPhase, setAppPhase] = useState<AppPhase>("splash");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useFavoriteModelsSync(session?.user?.id);

  const { currentSettingsTab, setSettingsTab } = useSettingsNavigationState();
  useViewportDensity();
  const [isFirstMount, setIsFirstMount] = useState(true);
  const isInitialRendering = useRef(true);
  const { handleLogout, resolveSessionAfterLogin, waitAuthEnteredAtRef } = useAuthBootstrap({
    authLoading,
    appPhase,
    setSession,
    setAuthLoading,
    setUserRole,
    setAppPhase,
  });

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [setIsFullscreen]);

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
        const elapsed = Date.now() - (waitAuthEnteredAtRef.current || 0);
        if (elapsed < 2500) return;
        setTimeout(() => setAppPhase("landing"), 0);
      }
    }
  }, [appPhase, session, authLoading, setAppPhase, waitAuthEnteredAtRef]);

  // For initial mount dummy return to trigger TTI faster 
  // and we also use it for brief blackout during heavy app mount
  if (isFirstMount) {
    return <div style={{ background: "black", width: "100%", height: "100vh" }} aria-hidden="true" />;
  }

  const filteredNavItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || userRole === "admin",
  );

  const activeNavItem = NAV_ITEMS.find((n) => n.id === activeTab);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  if (appPhase !== "app") {
    return (
      <AppPhaseRouter
        appPhase={appPhase}
        splash={
          <div className="splash-page h-dvh max-h-dvh w-full overflow-hidden bg-[#02040a] relative">
            <MemoizedLexMindLoader />
            <SplashProgressBar duration={1500} />
          </div>
        }
        landing={
          <Suspense fallback={<div className="h-screen w-screen bg-[#050505]" />}>
            <LandingView onGoToPortal={() => setAppPhase("portal")} onStartTrial={() => setAppPhase("portal")} />
          </Suspense>
        }
        portal={
          <Suspense fallback={<div className="h-screen w-screen bg-[#050505]" />}>
            <PortalView
              onBack={() => setAppPhase("landing")}
              onLoginSuccess={() => {
                import("./components/Chat").catch(() => { });
                setAuthLoading(true);
                setTimeout(() => setAppPhase("wait-auth"), 0);
                void resolveSessionAfterLogin();
              }}
            />
          </Suspense>
        }
        waitAuth={
          <div className="splash-page h-dvh max-h-dvh w-full overflow-hidden bg-[#02040a] relative">
            <MemoizedLexMindLoader />
          </div>
        }
      />
    );
  }

  return (
    <ChatProvider>
      <WorkspaceShell
        navItems={filteredNavItems}
        activeTab={activeTab}
        activeNavItem={activeNavItem}
        currentSettingsTab={(currentSettingsTab as SettingsTabId) || "Profil"}
        isFullscreen={isFullscreen}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        onToggleFullscreen={toggleFullscreen}
        onSettingsTabChange={setSettingsTab}
        content={
          <WorkspaceContentView activeTab={activeTab} onNavigate={setActiveTab} />
        }
      />
    </ChatProvider>
  );
}
