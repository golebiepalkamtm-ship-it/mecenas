import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { LexIcon, type LexIconName } from '../Layout/LexIcon';

export const LIBRARY_SHELL =
  'flex-1 min-h-0 glass-prestige rounded-2xl border border-white/55 bg-white/32 shadow-[0_32px_64px_rgba(0,0,0,0.12),inset_0_2px_10px_rgba(255,255,255,0.88)] overflow-hidden library-view-grain';

export const DRAFTER_SHELL = `${LIBRARY_SHELL} flex flex-col scheme-light`;

export const DOCUMENTS_SHELL = `${LIBRARY_SHELL} flex flex-col scheme-light`;

export const KNOWLEDGE_SHELL = `${LIBRARY_SHELL} flex flex-col scheme-light`;

export const JUDGMENTS_SHELL = `${LIBRARY_SHELL} judgments-view-shell flex flex-col scheme-light`;

/** Ten sam shell co Baza wiedzy / Dokumenty + jasne pola formularzy */
export const PROMPTS_SHELL = `${LIBRARY_SHELL} flex flex-col scheme-light`;

export const PROFILE_SHELL = `${LIBRARY_SHELL} flex flex-col scheme-light`;

export const ADMIN_SHELL = `${LIBRARY_SHELL} flex flex-col scheme-light`;

/** Panele boczne czatu — spójne wymiary, oryginalne szkło (kolory bez zmian w komponentach) */
const CHAT_SIDE_PANEL_BASE =
  'fixed lg:relative top-[var(--app-mobile-header-offset)] lg:top-0 bottom-0 lg:h-full w-full max-w-[100vw] lg:w-64 lg:max-w-64 2xl:w-80 2xl:max-w-80 z-10000 pointer-events-auto flex flex-col overflow-hidden shrink-0 glass-liquid-convex rounded-3xl';

export const CHAT_SIDE_PANEL_LEFT = CHAT_SIDE_PANEL_BASE;
export const CHAT_SIDE_PANEL_RIGHT = `${CHAT_SIDE_PANEL_BASE} right-0`;

/** Środkowa kolumna czatu — wiadomości + dock inputu */
export const CHAT_MAIN_STAGE =
  'flex-1 flex flex-col relative h-full min-w-0 min-h-0 overflow-hidden p-1 md:p-1.5 lg:p-2 gap-1.5';

export const CHAT_MESSAGES_SURFACE =
  'chat-messages-scroll flex-1 min-h-0 overflow-y-auto scroll-smooth custom-scrollbar glass-prestige bg-white/32 rounded-2xl xl:rounded-[2rem] border border-white/55 shadow-[0_32px_64px_rgba(0,0,0,0.12),inset_0_2px_10px_rgba(255,255,255,0.88)] library-view-grain scheme-light';

export const CHAT_MESSAGES_INNER =
  'mx-auto w-full max-w-none px-3 md:px-5 lg:px-6 py-4 lg:py-6 xl:py-8 space-y-4 lg:space-y-6 min-h-full';

export const CHAT_INPUT_DOCK =
  'shrink-0 relative z-20 w-full px-0 pb-3 md:pb-4 pt-0';

export const CHAT_INPUT_DOCK_INNER =
  'w-full max-w-none scheme-light';

export function LibraryHero({
  variant,
  ornament,
  title,
  subtitle,
  badge,
  children,
  below,
}: {
  variant: 'knowledge' | 'documents';
  title: string;
  subtitle: string;
  /** Nadpisuje domyślny ornament z variant */
  ornament?: string;
  badge?: ReactNode;
  children?: ReactNode;
  /** Sekcja pod tytułem (np. wyszukiwarka w Orzecznictwie) */
  below?: ReactNode;
}) {
  const ornamentText =
    ornament ??
    (variant === 'knowledge' ? 'RAG · Indeks prawny' : 'Archiwum · Dokumenty osobiste');

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="shrink-0 flex flex-col"
    >
      <div className="library-view-hero flex items-center">
        <div className="relative z-10 flex w-full min-w-0 items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 leading-none">
            <h1 className="library-hero-title font-profile-display font-semibold italic tracking-tight text-library-gradient truncate">
              {title}
            </h1>
            <p className="library-hero-subtitle mt-1 font-outfit text-gold-primary/80 truncate">
              <span className="library-view-ornament font-outfit mr-1.5">{ornamentText}</span>
              <span className="opacity-90">{subtitle}</span>
            </p>
          </div>
          {(badge || children) && (
            <div className="flex max-h-13 flex-wrap items-center justify-end gap-1.5 shrink-0">
              {badge}
              {children}
            </div>
          )}
        </div>
      </div>
      {below ? (
        <div className="shrink-0 border-b border-black/6 bg-white/25 px-4 py-3 sm:px-5">
          {below}
        </div>
      ) : null}
    </motion.header>
  );
}

export type LibraryTabItem = {
  id: string;
  label: string;
  lexIcon: LexIconName;
  count?: number;
};

/** Poziome zakładki — ten sam wzorzec co filtry w Bazie wiedzy */
export function LibraryTabRow({
  tabs,
  activeId,
  onChange,
}: {
  tabs: LibraryTabItem[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-0.5 -mx-1 px-1"
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeId === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex items-center gap-2 shrink-0 h-9 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all font-outfit',
            activeId === tab.id
              ? 'library-filter-active'
              : 'library-view-cell text-black/50 hover:text-black',
          )}
        >
          <LexIcon name={tab.lexIcon} size={14} />
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'text-[9px] px-1.5 py-0.5 rounded-md font-black tabular-nums',
                activeId === tab.id ? 'bg-gold-primary/15 text-gold-deep' : 'bg-black/5 text-black/45',
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function LibraryStatPill({
  label,
  value,
  compact,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gold-primary/20 bg-gold-primary/6 text-center',
        compact ? 'library-hero-stat' : 'min-w-18 px-3 py-2',
      )}
    >
      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gold-primary/55 font-outfit">{label}</p>
      <p
        className={cn(
          'font-admin-mono font-semibold text-library-accent tabular-nums',
          compact ? '' : 'text-sm mt-0.5',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function LibraryToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('shrink-0 px-3 sm:px-5 py-3 border-b border-black/6 bg-white/25', className)}>
      {children}
    </div>
  );
}

export function LibrarySearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full h-10 library-view-cell px-3 text-[11px] font-outfit font-semibold text-black placeholder:text-black/30 outline-none focus:border-library-accent/45',
        className,
      )}
    />
  );
}

export function LibraryEmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-5 library-view-panel mx-3 sm:mx-5 mb-4 sm:mb-5 py-12 px-6"
    >
      <div className="w-16 h-16 rounded-2xl library-view-accent-box flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="space-y-2 max-w-md">
        <h3 className="font-profile-display text-2xl font-semibold italic text-black leading-tight">{title}</h3>
        <p className="text-[12px] text-black/45 font-outfit leading-relaxed">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </motion.div>
  );
}

export function LibraryListBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 sm:px-5 py-3 sm:py-4">
      <div className="flex flex-col gap-2 pb-4">{children}</div>
    </div>
  );
}

/** Wspólne style wiersza listy dokumentów */
export function libraryRowClasses(hovered: boolean, selected?: boolean) {
  return cn(
    'relative flex w-full h-[4.25rem] sm:h-[4.5rem] items-center rounded-xl transition-all duration-300 overflow-hidden px-3 sm:px-4 library-view-cell',
    selected && 'ring-2 ring-library-accent/30 bg-library-accent/5',
    hovered ? '-translate-y-0.5 shadow-[0_12px_28px_rgba(0,0,0,0.08)] border-library-accent/25' : 'hover:bg-white/45',
  );
}
