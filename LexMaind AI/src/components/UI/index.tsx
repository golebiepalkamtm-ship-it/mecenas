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
                "glass-prestige",
                variant === 'default' 
                    ? "bg-(--bg-top)/40" 
                    : "bg-(--bg-top)/80 shadow-[0_0_50px_rgba(66,192,206,0.15)]",
                "rounded-[2.5rem]",
                hoverable && "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_40px_120px_rgba(0,0,0,0.8)] active:scale-[0.99] transition-all duration-200",
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
                    "bg-gold-primary text-black",
                    "shadow-[0_8px_24px_-4px_rgba(255,215,128,0.35)]",
                    "hover:shadow-[0_12px_36px_-4px_rgba(255,215,128,0.55)]",
                    "hover:brightness-110",
                ],
                variant === 'secondary' && [
                    "glass-prestige bg-(--bg-top)/30 text-(--text-secondary) border-gold-muted/30",
                    "hover:bg-(--bg-top)/60 hover:text-white hover:border-gold-primary/40",
                    "shadow-lg",
                ],
                variant === 'danger' && [
                    "bg-red-500/15 text-red-400 border border-red-500/30",
                    "hover:bg-red-500/25 hover:text-red-300",
                    "shadow-lg",
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
