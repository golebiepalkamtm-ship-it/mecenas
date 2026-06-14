import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { formatNumber } from '../utils';
export function AdminPanel({
  children,
  className,
  delay = 0,
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  dark?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(dark ? 'lex-view-pass p-5 sm:p-6' : 'library-view-panel p-5 sm:p-7', className)}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="font-profile-display text-xl sm:text-2xl font-semibold italic text-black leading-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="library-view-label mt-2 not-italic">{subtitle}</p>
        )}
      </div>
      {badge}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  delay = 0,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="library-view-cell p-3.5 hover:border-gold-primary/30 transition-colors duration-300 w-full"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg border border-black/8 bg-white/50 flex items-center justify-center text-gold-deep shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-admin-mono font-semibold text-black leading-none tabular-nums">
            {formatNumber(value)}
          </p>
          <span className="text-[7px] font-black uppercase tracking-widest text-black/35 italic block mt-1 truncate font-outfit">
            {label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function HealthRow({
  icon,
  label,
  status,
  ping,
}: {
  icon: ReactNode;
  label: string;
  status: 'online' | 'offline' | 'degraded';
  ping: string;
}) {
  const dotClass =
    status === 'online'
      ? 'bg-emerald-500 shadow-[0_0_10px_#10B981]'
      : status === 'degraded'
        ? 'bg-amber-500 shadow-[0_0_10px_#F59E0B]'
        : 'bg-red-500 shadow-[0_0_10px_#EF4444]';

  return (
    <div className="library-view-cell px-4 py-3.5 flex items-center justify-between gap-4 group hover:bg-white/45 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-xl border border-black/8 bg-white/40 flex items-center justify-center text-black/25 group-hover:text-gold-deep transition-colors shrink-0">
          {icon}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-black/55 truncate italic font-outfit">
          {label}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className={cn('w-2 h-2 rounded-full', dotClass)} />
        <span className="text-[9px] font-admin-mono font-medium text-black/70 tabular-nums">{ping}</span>
      </div>
    </div>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const isAdmin = role.toLowerCase() === 'admin';
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] italic border font-outfit',
        isAdmin
          ? 'border-gold-primary/35 bg-gold-primary/12 text-gold-deep'
          : 'bg-white/50 border-black/10 text-black/70',
      )}
    >
      {role}
    </span>
  );
}

export function AdminLoading({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-gold-primary/25 border-t-gold-primary animate-spin" />
      <p className="library-view-label not-italic">{message}</p>
    </div>
  );
}
