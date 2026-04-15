import React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Internal utility — not exported (fast-refresh requires only components to be exported)
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── GlassCard ───────────────────────────────────────────────────────────────
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'bright';
    hoverable?: boolean;
}

export function GlassCard({ className, variant = 'default', hoverable = false, ...props }: GlassCardProps) {
    return (
        <div 
            className={cn(
                variant === 'default' 
                    ? "glass-prestige shadow-2xl" 
                    : "glass-prestige-embossed shadow-[0_40px_140px_rgba(0,0,0,0.6)]",
                "rounded-[2.5rem]",
                hoverable && "cursor-pointer hover:-translate-y-1 hover:brightness-110 active:scale-[0.98] transition-all duration-300",
                className
            )}
            {...props}
        />
    );
}

// ─── NeonButton ──────────────────────────────────────────────────────────────
interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

export function NeonButton({ className, variant = 'primary', size = 'md', ...props }: NeonButtonProps) {
    return (
        <button 
            className={cn(
                "relative inline-flex items-center justify-center font-black tracking-widest uppercase transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none overflow-hidden group/btn",
                size === 'sm' && "px-5 py-2 rounded-full text-[9px]",
                size === 'md' && "px-8 py-3.5 rounded-full text-[10px]",
                size === 'lg' && "px-10 py-4 rounded-2xl text-[11px]",
                variant === 'primary' && [
                    "bg-gold-primary text-white",
                    "shadow-[0_12px_40px_-5px_rgba(212,175,55,0.45)]",
                    "hover:shadow-[0_20px_60px_-5px_rgba(212,175,55,0.65)]",
                    "hover:scale-[1.03]",
                    "border-t-2 border-white/60",
                ],
                variant === 'secondary' && [
                    "glass-prestige text-white/90",
                    "hover:text-white hover:glass-prestige-gold",
                    "shadow-xl",
                ],
                variant === 'danger' && [
                    "bg-red-500/20 text-red-100 border-t-2 border-t-red-400/60 border-l border-l-red-400/30 border-r border-r-red-900/40 border-b-2 border-b-red-900/60",
                    "hover:bg-red-500/30",
                    "shadow-xl",
                ],
                className
            )}
            {...props}
        >
            {/* Shimmer sweep on hover */}
            <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500 pointer-events-none" />
            <span className="relative z-10 flex items-center gap-2">{props.children as React.ReactNode}</span>
        </button>
    );
}

// ─── Title ───────────────────────────────────────────────────────────────────
export function Title({ children, subtitle }: { children: React.ReactNode, subtitle?: string }) {
    return (
        <div className="text-left">
            <h2 className="text-xl lg:text-3xl font-black tracking-tighter italic leading-none text-gold-gradient mb-1.5">
                {children}
            </h2>
            {subtitle && (
                <p className="text-(--text-secondary) text-[9px] lg:text-[10px] font-bold tracking-[0.25em] opacity-50 uppercase">
                    {subtitle}
                </p>
            )}
        </div>
    );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
interface BadgeProps {
    children: React.ReactNode;
    variant?: 'gold' | 'emerald' | 'blue' | 'red' | 'muted';
    className?: string;
}

export function Badge({ children, variant = 'muted', className }: BadgeProps) {
    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em]",
            variant === 'gold'    && "bg-gold-primary/10 border border-gold-primary/20 text-gold-primary",
            variant === 'emerald' && "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
            variant === 'blue'    && "bg-blue-500/10 border border-blue-500/20 text-blue-400",
            variant === 'red'     && "bg-red-500/10 border border-red-500/20 text-red-400",
            variant === 'muted'   && "bg-white/5 border border-white/10 text-slate-500",
            className
        )}>{children}</span>
    );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={cn(
            "rounded-xl bg-white/5 overflow-hidden relative",
            className
        )}>
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_linear_infinite] bg-size-[200%_100%]" />
        </div>
    );
}

// ─── AnimatedNumber ──────────────────────────────────────────────────────────
export function AnimatedNumber({ value, className }: { value: number, className?: string }) {
    return (
        <motion.span
            key={value}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className={className}
        >
            {value}
        </motion.span>
    );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
    if (!label) return (
        <div className="h-px w-full bg-linear-to-r from-transparent via-gold-muted/20 to-transparent" />
    );

    return (
        <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-linear-to-r from-transparent to-gold-muted/20" />
            <span className="text-[8px] font-black uppercase tracking-[0.35em] text-slate-600 whitespace-nowrap">{label}</span>
            <div className="flex-1 h-px bg-linear-to-l from-transparent to-gold-muted/20" />
        </div>
    );
}
export { LiquidMetalIcon } from './LiquidMetalIcon';
