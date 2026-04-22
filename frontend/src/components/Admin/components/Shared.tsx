import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import { formatNumber } from "../utils";
import type { AdminTabConfig } from "../types";

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
        <h3 className="text-base font-black uppercase tracking-[0.2em] text-black italic">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-black/20 mt-2 italic font-outfit">
            {subtitle}
          </p>
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
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="glass-prestige rounded-xl p-3 border border-white/40 bg-white/30 hover:border-gold-primary/40 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.8)] w-full">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-black/10 flex items-center justify-center text-gold-primary shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-black text-black leading-none italic font-outfit">
            {formatNumber(value)}
          </p>
          <span className="text-[7px] font-black uppercase tracking-widest text-black/30 italic block mt-1 truncate">
            {label}
          </span>
        </div>
      </div>
    </div>
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
  status: "online" | "offline";
  ping: string;
}) {
  return (
    <div className="glass-prestige rounded-2xl border border-white/40 bg-white/30 px-5 py-4 flex items-center justify-between gap-4 group hover:bg-white/50 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.8)]">
      <div className="flex items-center gap-4 min-w-0">
        <span className="w-9 h-9 rounded-xl bg-white/5 border border-black/10 flex items-center justify-center text-black/20 group-hover:text-gold-primary transition-colors shrink-0">
          {icon}
        </span>
        <span className="text-[11px] font-black uppercase tracking-widest text-black/60 truncate italic">{label}</span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            status === "online" ? "neon-status-emerald shadow-[0_0_10px_#10B981]" : "neon-status-red shadow-[0_0_10px_#EF4444]",
          )}
        />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black">
          {ping}
        </span>
      </div>
    </div>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const isAdmin = role.toLowerCase() === "admin";
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] italic border",
        isAdmin
          ? "neon-status-amber"
          : "bg-white/5 border-black/10 text-black",
      )}
    >
      {role}
    </span>
  );
}

export function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: AdminTabConfig;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  const iconColors: Record<string, string> = {
    system: "text-emerald-500",
    security: "text-blue-500",
    models: "text-gold-primary",
    users: "text-violet-500",
  };

  const iconColor = iconColors[tab.id] || "text-black/20";

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center gap-4 h-14 px-8 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border font-outfit italic overflow-hidden group/btn",
        active
          ? "glass-prestige bg-white/40 border-white/60 text-black shadow-[0_20px_40px_rgba(0,0,0,0.1),inset_0_2px_10px_rgba(255,255,255,0.8)] scale-105"
          : "bg-white/10 border-black/5 text-black/40 hover:text-black hover:bg-white/20",
      )}
    >
      {/* Internal lens highlight */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <Icon 
        size={18} 
        className={cn(
            "relative z-10 transition-all duration-500", 
            active ? iconColor : "text-black/20 group-hover:text-black/40"
        )} 
      />
      <span className="relative z-10">{tab.label}</span>
      {active && (
        <div className={cn(
            "absolute inset-0 rounded-2xl blur-xl pointer-events-none opacity-30",
            iconColor.replace('text-', 'bg-')
        )} />
      )}
    </button>
  );
}
