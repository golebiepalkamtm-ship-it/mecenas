import { Scale, LogOut } from "lucide-react";
import { cn } from "../../utils/cn";
import type { Tab } from "../../types/navigation";
import React from "react";

interface NavItem {
  id: Tab;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  color: string;
  colorRgb: string;
  adminOnly?: boolean;
}

interface SidebarProps {
  navItems: NavItem[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onLogout: () => void;
}

export function Sidebar({
  navItems,
  activeTab,
  onTabChange,
  onLogout,
}: SidebarProps) {
  return (
    <nav className="hidden lg:flex flex-col w-[130px] h-full relative z-[500] pointer-events-auto overflow-hidden bg-transparent">
      {/* Logo zone */}
      <div className="h-32 flex flex-col items-center justify-center shrink-0 relative z-20">
        <div className="mt-7 w-[4.25rem] h-[4.25rem] rounded-[1.5rem] glass-liquid-convex flex items-center justify-center cursor-pointer relative group/logo border border-gold-primary/30 shadow-[0_0_25px_rgba(212,175,55,0.25)] hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] transition-all duration-700">
          <div className="absolute inset-0 rounded-inherit bg-gold-primary/5 animate-pulse" />
          <Scale
            size={35}
            className="relative z-10 text-gold-bright drop-shadow-[0_0_8px_rgba(240,204,90,0.5)]"
            strokeWidth={1.2}
          />
        </div>

        <span className="text-[10px] font-black uppercase tracking-[0.5em] font-outfit mt-3 text-gold-primary/60 group-hover/logo:text-gold-bright transition-all duration-500">
          LexMind
        </span>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-visible px-2 py-6 gap-1.5 flex flex-col items-center justify-between">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </div>

      {/* User footer */}
      <div className="p-4 pb-8 shrink-0 flex justify-center">
        <button
          onClick={onLogout}
          className="w-28 h-[72px] flex flex-col items-center justify-center gap-0.5 rounded-[1.25rem] transition-all duration-500 relative group/nav outline-none glass-liquid-convex opacity-80 hover:opacity-100 group"
          title="Wyloguj się"
        >
          <LogOut
            size={28}
            strokeWidth={1.5}
            className="relative z-10 text-black/60 group-hover:text-red-600 transition-colors duration-500"
          />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] font-outfit relative z-10 text-black/40 group-hover:text-black transition-all duration-500 whitespace-nowrap">
            Wyloguj
          </span>
        </button>
      </div>
    </nav>
  );
}

const NavItem = React.memo(({ item, active, onClick }: NavItemProps) => {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-28 h-[72px] flex flex-col items-center justify-center gap-0.5 rounded-[1.25rem] transition-all duration-500 relative group/nav outline-none glass-liquid-convex",
        active ? "scale-105 z-10" : "opacity-80 hover:opacity-100",
      )}
      style={
        active
          ? {
              backgroundColor: item.color,
              backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.1) 100%)`,
              boxShadow: `0 0 25px ${item.color}bb, 0 10px 50px -10px ${item.color}88, inset 0 2.5px 4px rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.1)`,
            }
          : {}
      }
    >
      {/* Icon Capsule */}
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 relative z-10 text-black",
          !active && "opacity-40",
        )}
      >
        <Icon size={28} strokeWidth={active ? 3.5 : 1.5} />
      </div>

      <span
        className={cn(
          "text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 font-outfit relative z-10 text-black text-center px-1 leading-tight whitespace-nowrap",
          !active ? "opacity-30" : "opacity-100",
        )}
      >
        {item.label}
      </span>

      {/* Side Indicator */}
      {active && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-black shadow-lg z-20" />
      )}
    </button>
  );
});
