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

export function Sidebar({ navItems, activeTab, onTabChange, onLogout }: SidebarProps) {

  const logoStyle = React.useMemo(() => ({
    background: "linear-gradient(145deg, rgba(212,175,55,0.3) 0%, rgba(20,20,20,0.95) 100%)",
    borderTop:    "1.5px solid rgba(240,204,90,0.95)",
    borderLeft:   "1px solid rgba(212,175,55,0.4)",
    borderRight:  "0.5px solid rgba(212,175,55,0.1)",
    borderBottom: "2px solid rgba(0,0,0,0.95)",
    boxShadow: `
      0 15px 35px rgba(0,0,0,0.7), 
      inset 0 1.5px 0 rgba(240,204,90,0.6), 
      0 0 25px rgba(212,175,55,0.15)
    `,
  }), []);

  return (
    <nav
      className="hidden lg:flex flex-col w-[90px] h-full relative z-500 pointer-events-auto overflow-hidden bg-transparent"
    >
      {/* Logo zone */}
      <div className="h-24 flex flex-col items-center justify-center shrink-0 relative z-20">
        <div
          className="w-13 h-13 rounded-2xl flex items-center justify-center cursor-pointer relative overflow-hidden group/logo"
          style={logoStyle}
        >
          {/* Inner glow ring */}
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,0.25),transparent_70%)]"
          />
          <Scale size={20} style={{ color: "#f0cc5a" }} strokeWidth={1.5} className="relative z-10 drop-shadow-[0_0_12px_rgba(212,175,55,0.9)]" />
        </div>

        <span
          className="text-[8px] font-black uppercase tracking-[0.45em] font-outfit relative mt-2.5"
          style={{
            color: "rgba(240,204,90,0.6)",
            filter: "drop-shadow(0 0 4px rgba(212,175,55,0.2))"
          }}
        >
          LexMind
        </span>
      </div>

      {/* Nav items - Static layout, centered vertically */}
      <div className="flex-1 overflow-hidden px-2 py-4 space-y-4 flex flex-col items-center justify-center">
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
      <div
        className="p-3 pb-6 shrink-0 space-y-2.5"
      >


        {/* Logout */}
        <div className="flex justify-center">
          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/20 hover:text-red-400 transition-all border border-transparent hover:border-red-500/25 hover:bg-red-500/08 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
          >
            <LogOut size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ══════════════════════════════════════════════════════════ */

interface NavItemProps {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}

const NavItem = React.memo(({ item, active, onClick }: NavItemProps) => {
  const Icon = item.icon;
  const rgb = item.colorRgb;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex flex-col items-center gap-1 px-2 pt-2.5 pb-4 rounded-xl transition-all duration-300 relative overflow-hidden group/nav",
        active ? "bg-white/5 border-t border-white/20 shadow-lg" : "hover:bg-white/[0.03] border border-transparent"
      )}
    >
      {/* Background Backlight */}
      {active && (
        <div
          className="absolute inset-0 blur-2xl pointer-events-none -z-10"
          style={{ background: `radial-gradient(circle, rgba(${rgb},0.2) 0%, transparent 70%)` }}
        />
      )}

      {/* Active Indicator Bar */}
      {active && (
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-r-sm shadow-[0_0_8px_currentColor]"
          style={{ backgroundColor: item.color, color: item.color }} 
        />
      )}

      {/* Icon */}
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300",
          active 
            ? "bg-white/10 text-white shadow-inner border border-white/10" 
            : "text-white/40 group-hover/nav:text-white/70"
        )}
      >
        <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
      </div>

      {/* Label */}
      <span
        className={cn(
          "text-[7px] font-bold uppercase tracking-widest transition-opacity duration-300",
          active ? "opacity-100 text-white" : "opacity-40 group-hover/nav:opacity-70"
        )}
      >
        {item.label}
      </span>
    </button>
  );
});
