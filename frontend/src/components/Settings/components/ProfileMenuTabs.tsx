import { motion } from 'framer-motion';
import { LexIcon } from '../../Layout/LexIcon';
import { cn } from '../../../utils/cn';
import { SETTINGS_TABS, type SettingsTabId } from '../settingsTabs';

interface ProfileMenuTabsProps {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
  variant?: 'header' | 'compact';
  className?: string;
}

export function ProfileMenuTabs({
  activeTab,
  onTabChange,
  variant = 'header',
  className,
}: ProfileMenuTabsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 bg-black/4 border border-black/10 rounded-2xl shadow-inner',
        variant === 'compact' && 'w-full',
        className,
      )}
      role="tablist"
      aria-label="Menu profilu"
    >
      {SETTINGS_TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative flex items-center justify-center gap-2 rounded-xl transition-all duration-300 outline-none font-black uppercase tracking-widest',
              variant === 'compact' ? 'flex-1 py-2.5 text-[9px]' : 'px-4 py-2 text-[8px]',
              active ? 'text-black' : 'text-black/40 hover:text-black/70',
            )}
          >
            {active && (
              <motion.div
                layoutId="header-subtab-bg"
                className="absolute inset-0 bg-white/60 border border-white/80 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
                transition={{ type: 'spring', bounce: 0.12, duration: 0.55 }}
              />
            )}
            <LexIcon name={tab.lexIcon} size={11} className="relative z-10 -mt-0.5 shrink-0" />
            <span className="relative z-10">{variant === 'compact' ? tab.shortLabel : tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
