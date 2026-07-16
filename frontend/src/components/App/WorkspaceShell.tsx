import type { ReactNode } from 'react';

import { MobileNavigation } from '../Layout/MobileNavigation';
import { Sidebar } from '../Layout/Sidebar';
import { AmbientOrbs } from '../Shared/AmbientOrbs';
import { Topbar } from './Topbar';
import type { SettingsTabId } from '../Settings/settingsTabs';
import type { NavItem, Tab } from '../../types/navigation';

interface WorkspaceShellProps {
  navItems: NavItem[];
  activeTab: Tab;
  activeNavItem?: NavItem;
  currentSettingsTab: SettingsTabId;
  isFullscreen: boolean;
  onTabChange: (tab: Tab) => void;
  onLogout: () => Promise<void>;
  onToggleFullscreen: () => Promise<void>;
  onSettingsTabChange: (tab: SettingsTabId) => void;
  content: ReactNode;
}

export function WorkspaceShell({
  navItems,
  activeTab,
  activeNavItem,
  currentSettingsTab,
  isFullscreen,
  onTabChange,
  onLogout,
  onToggleFullscreen,
  onSettingsTabChange,
  content,
}: WorkspaceShellProps) {
  return (
    <div
      className="flex h-dvh min-h-dvh w-full max-w-[100vw] overflow-hidden relative font-sans text-accent p-0 md:p-1 lg:p-1.5"
      style={{
        background: '#000000',
      }}
    >
      <AmbientOrbs />

      <MobileNavigation
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
        onToggleFullscreen={onToggleFullscreen}
        isFullscreen={isFullscreen}
      />

      <div
        className="app-shell relative flex-1 flex flex-col min-h-0 lg:grid lg:grid-cols-[5rem_minmax(0,1fr)] 2xl:grid-cols-[8rem_minmax(0,1fr)] lg:grid-rows-[3.5rem_minmax(0,1fr)] 2xl:grid-rows-[5rem_minmax(0,1fr)] overflow-hidden z-10 transition-all duration-500"
        style={{
          background:
            'radial-gradient(900px 600px at 0% 0%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 30%, transparent 70%), ' +
            'linear-gradient(135deg, var(--bg-deep) 0%, var(--bg-sea) 55%, var(--bg-blue) 100%)',
          borderTop: '2px solid rgba(255, 255, 255, 0.05)',
          borderLeft: '2px solid rgba(255, 255, 255, 0.05)',
          borderRight: '2px solid rgba(0, 0, 0, 0.4)',
          borderBottom: '2px solid rgba(0, 0, 0, 0.4)',
          borderRadius: '1.5rem',
          boxShadow:
            'inset 3px 3px 6px rgba(255,255,255,0.7), inset -3px -3px 6px rgba(0,0,0,0.05), 0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        <div className="absolute inset-0 z-[-1]" />
        <div className="app-nav-chrome hidden lg:block" aria-hidden="true" />

        <div className="mercury-master-monolith lg:hidden">
          <div className="mercury-l-gradient opacity-50" />
          <div className="mercury-top-beam opacity-50" />
          <div className="mercury-left-beam opacity-50" />
          <div className="liquid-caustics opacity-20" />
        </div>
        <div className="mercury-corner-flare lg:hidden" />

        <Sidebar
          navItems={navItems}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onLogout={onLogout}
        />

        <Topbar
          activeTab={activeTab}
          activeNavItem={activeNavItem}
          currentSettingsTab={currentSettingsTab}
          isFullscreen={isFullscreen}
          onLogout={onLogout}
          onToggleFullscreen={onToggleFullscreen}
          onSettingsTabChange={onSettingsTabChange}
        />

        <main className="app-main-mobile-offset flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden lg:pt-0 lg:col-start-2 lg:row-start-2 z-20">
          <section className="flex-1 relative min-h-0 overflow-hidden">{content}</section>
        </main>
      </div>
    </div>
  );
}
