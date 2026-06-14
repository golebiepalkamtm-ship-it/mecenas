import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export function SettingsPrimaryButton({
  children,
  onClick,
  disabled,
  variant = 'gold',
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'gold' | 'ghost' | 'danger' | 'vip';
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.16em] font-outfit italic transition-all duration-300 disabled:opacity-45',
        variant === 'vip' &&
          'bg-linear-to-r from-[#c9a227] via-gold-bright to-gold-primary text-[#0a0a0c] border-t border-white/50 shadow-[0_12px_32px_rgba(212,175,55,0.45)] hover:brightness-110 hover:shadow-[0_16px_40px_rgba(212,175,55,0.55)] active:scale-[0.98]',
        variant === 'gold' &&
          'bg-gold-primary text-black border-t border-white/50 shadow-[0_10px_28px_rgba(212,175,55,0.4)] hover:brightness-105 active:scale-[0.98]',
        variant === 'ghost' &&
          'bg-white/50 text-black/75 border border-black/10 hover:bg-white hover:text-black',
        variant === 'danger' &&
          'bg-red-950/20 text-red-400 border border-red-500/25 hover:bg-red-600 hover:text-white hover:border-red-500',
        className
      )}
    >
      {children}
    </button>
  );
}
