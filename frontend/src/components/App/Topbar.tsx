import { useState } from 'react';
import type { CSSProperties } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Maximize2, Minimize2 } from 'lucide-react';

import { ProfileMenuTabs } from '../Settings/components/ProfileMenuTabs';
import type { SettingsTabId } from '../Settings/settingsTabs';
import type { NavItem, Tab } from '../../types/navigation';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface TopbarProps {
  activeTab: Tab;
  activeNavItem?: NavItem;
  currentSettingsTab: SettingsTabId;
  isFullscreen: boolean;
  onLogout: () => Promise<void>;
  onToggleFullscreen: () => Promise<void>;
  onSettingsTabChange: (tab: SettingsTabId) => void;
}

export function Topbar({
  activeTab,
  activeNavItem,
  currentSettingsTab,
  isFullscreen,
  onLogout,
  onToggleFullscreen,
  onSettingsTabChange,
}: TopbarProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  
  const topbarAccentStyle = {
    '--topbar-accent-rgb': activeNavItem?.colorRgb ?? '59, 130, 246',
  } as CSSProperties;

  return (
    <header className="app-nav-header hidden lg:flex lg:col-start-2 lg:row-start-1 items-center justify-between pointer-events-auto rounded-tr-[var(--app-nav-chrome-r-top)] rounded-l-none z-30">
      <div className="app-topbar-inner flex items-center justify-between w-full min-w-0 gap-3">
        <AnimatePresence mode="wait">
          <motion.div
            key="full-header"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="flex items-center gap-3 xl:gap-6 min-w-0 flex-1"
          >
            <div className="flex items-center gap-3 xl:gap-5 min-w-0">
              <div className="-mt-0.5 flex flex-col min-w-0 app-topbar-heading-shift" style={topbarAccentStyle}>
                <motion.h1
                  key={`title-${activeNavItem?.label}`}
                  initial={{ opacity: 0, y: -5, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="app-topbar-title text-xl xl:text-2xl 2xl:text-3xl font-black tracking-[-0.04em] leading-none font-outfit uppercase text-black truncate"
                >
                  {activeNavItem?.label}
                </motion.h1>
                <motion.p
                  key={`subtitle-${activeNavItem?.label}`}
                  initial={{ opacity: 0, y: 5, filter: 'blur(2px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
                  className="app-topbar-subtitle text-[8px] xl:text-[9px] font-black uppercase tracking-[0.28em] xl:tracking-[0.34em] mt-1 xl:mt-2 font-outfit truncate"
                >
                  {activeNavItem?.sublabel} • Neural Node
                </motion.p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'settings' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="hidden lg:flex items-center gap-4 border-l border-black/10 pl-4 xl:pl-6 shrink-0"
                >
                  <ProfileMenuTabs
                    activeTab={currentSettingsTab}
                    onTabChange={onSettingsTabChange}
                    variant="header"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-3">
          <div className="h-8 w-px bg-black/10" />
          
          <div className="relative">
            <motion.button
              whileHover="hover"
              whileTap={{ scale: 0.95 }}
              onMouseEnter={() => setHoveredAction('fullscreen')}
              onMouseLeave={() => setHoveredAction(null)}
              type="button"
              onClick={() => void onToggleFullscreen()}
              className="w-10 h-10 rounded-xl flex items-center justify-center glass-liquid-convex shadow-md text-black/60 hover:text-black transition-all duration-300"
              aria-label={isFullscreen ? 'Zamknij pełny ekran' : 'Pełny ekran'}
            >
              <motion.div
                variants={{
                  hover: { scale: 1.15 }
                }}
              >
                {isFullscreen ? <Minimize2 size={16} strokeWidth={2} /> : <Maximize2 size={16} strokeWidth={2} />}
              </motion.div>
            </motion.button>
            <AnimatePresence>
              {hoveredAction === 'fullscreen' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.9, y: 10, filter: 'blur(4px)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="absolute right-0 top-full mt-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-xl z-50 pointer-events-none whitespace-nowrap"
                  style={{
                    background: 'rgba(8, 8, 10, 0.85)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  {isFullscreen ? 'Tryb Okienkowy' : 'Pełny Ekran'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <motion.button
              whileHover="hover"
              whileTap={{ scale: 0.95 }}
              onMouseEnter={() => setHoveredAction('logout')}
              onMouseLeave={() => setHoveredAction(null)}
              type="button"
              onClick={() => void onLogout()}
              className="w-10 h-10 rounded-xl flex items-center justify-center glass-liquid-convex shadow-md text-black/60 hover:text-red-600 transition-all duration-300"
              aria-label="Wyloguj się"
            >
              <motion.div
                variants={{
                  hover: { 
                    rotate: [0, -10, 10, -10, 10, 0],
                    transition: { duration: 0.5 }
                  }
                }}
              >
                <LogOut size={16} strokeWidth={2} />
              </motion.div>
            </motion.button>
            <AnimatePresence>
              {hoveredAction === 'logout' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.9, y: 10, filter: 'blur(4px)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="absolute right-0 top-full mt-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-xl z-50 pointer-events-none whitespace-nowrap"
                  style={{
                    background: 'rgba(8, 8, 10, 0.85)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  Wyloguj Się
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
