import { LogOut } from "lucide-react";
import { cn } from "../../utils/cn";
import type { Tab } from "../../types/navigation";
import React, { useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { realisticIconMap, TrialRoomIcon } from "./RealisticIcons";

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

interface NavItemProps {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}

export function Sidebar({
  navItems,
  activeTab,
  onTabChange,
  onLogout,
}: SidebarProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  return (
    <nav className="app-nav-sidebar hidden lg:flex lg:col-start-1 lg:row-start-1 lg:row-span-2 flex-col mercury-sidebar-shimmer lex-view-grain h-full min-h-0 2xl:w-32 shrink-0 relative z-30 pointer-events-auto overflow-hidden rounded-l-3xl">
      <div className="flex flex-col items-center justify-center shrink-0 relative z-20 px-1 h-16 2xl:h-32">
        <div className="mt-1 2xl:mt-4 w-11 h-11 2xl:w-17 2xl:h-17 rounded-2xl 2xl:rounded-3xl glass-liquid-convex flex items-center justify-center cursor-pointer relative group/logo border border-gold-primary/30 shadow-[0_0_25px_rgba(212,175,55,0.22)] hover:shadow-[0_0_44px_rgba(212,175,55,0.45)] transition-all duration-700">
          <div className="absolute inset-0 rounded-inherit bg-gold-primary/5 animate-pulse" />
          <TrialRoomIcon className="w-7 h-7 2xl:w-11 2xl:h-11 relative z-10 filter drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
        </div>

        <span className="text-[8px] 2xl:text-[10px] font-black uppercase tracking-[0.35em] 2xl:tracking-[0.5em] font-outfit mt-1 2xl:mt-3 text-[#6b5420]">
          LexMind
        </span>
      </div>

      <LayoutGroup id="sidebar-nav">
        <div className="flex-1 w-full flex flex-col items-center gap-1.5 2xl:gap-2 py-2">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
            />
          ))}
        </div>
      </LayoutGroup>

      <div className="p-1.5 pb-2 xl:pb-4 shrink-0 flex flex-col justify-center gap-1 relative">
        <button
          onClick={onLogout}
          onMouseEnter={() => setHoveredAction('logout')}
          onMouseLeave={() => setHoveredAction(null)}
          className="w-18 2xl:w-20 h-9 2xl:h-12 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all duration-500 relative group/nav outline-none glass-liquid-convex opacity-80 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-[rgba(var(--gold-rgb),0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
          aria-label="Wyloguj się"
        >
          <LogOut
            size={18}
            strokeWidth={1.5}
            className="relative z-10 text-[#8a7a50] group-hover:text-red-600 transition-colors duration-500"
          />
          <span className="text-[8px] font-black uppercase tracking-[0.15em] font-outfit relative z-10 text-[#6b6350] transition-all duration-500 whitespace-nowrap">
            Wyloguj
          </span>
        </button>
        <AnimatePresence>
          {hoveredAction === 'logout' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: -10 }}
              className="absolute left-full bottom-2 ml-3 w-52 p-3 rounded-2xl shadow-[0_28px_60px_rgba(0,0,0,0.55)] text-left z-9999 pointer-events-none"
              style={{
                background: "rgba(8,8,10,0.78)",
                border: "1px solid rgba(212,175,55,0.25)",
                backdropFilter: "blur(14px)",
              }}
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-white mb-1">
                Wyloguj Się
              </p>
              <p className="text-[8px] leading-relaxed text-white/65 font-bold uppercase tracking-wider">
                Zakończ sesję i wróć do ekranu logowania.
              </p>
              <div
                className="absolute top-1/2 -translate-y-1/2 right-full -mr-px w-2 h-2 rotate-45"
                style={{
                  background: "rgba(8,8,10,0.78)",
                  borderLeft: "1px solid rgba(212,175,55,0.25)",
                  borderBottom: "1px solid rgba(212,175,55,0.25)",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

const NavItem = React.memo(({ item, active, onClick }: NavItemProps) => {
  const Icon = realisticIconMap[item.id] || item.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ "--item-rgb": item.colorRgb } as React.CSSProperties}
        className={cn(
          "w-18 2xl:w-28 h-11 2xl:h-18 flex flex-col items-center justify-center gap-0 rounded-xl 2xl:rounded-[1.25rem] relative group/nav outline-none glass-liquid-convex border border-transparent shrink-0 transition-[transform,filter,opacity,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-2 focus-visible:ring-[rgba(var(--item-rgb),0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/30",
          active ? "scale-[1.03] 2xl:scale-[1.07] z-10 opacity-100" : "opacity-80 hover:opacity-100 hover:scale-[1.02]",
        )}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active-surface"
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="absolute inset-[3px] rounded-[inherit] z-0"
            style={{
              background:
                `radial-gradient(80% 70% at 50% 0%, rgba(var(--item-rgb), 0.28) 0%, rgba(var(--item-rgb), 0.10) 42%, rgba(0,0,0,0.18) 100%), ` +
                `linear-gradient(145deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 55%, rgba(0,0,0,0.10) 100%)`,
              boxShadow:
                `0 18px 46px rgba(0,0,0,0.30), 0 0 26px rgba(var(--item-rgb), 0.22), inset 0 1px 0 rgba(255,255,255,0.65)`,
              border: `1px solid rgba(var(--item-rgb), 0.55)`,
            }}
          />
        )}

        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-[3px] rounded-[inherit] z-0 opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            active ? "opacity-0" : "group-hover/nav:opacity-100",
          )}
          style={{
            background:
              `radial-gradient(70% 80% at 50% 0%, rgba(var(--item-rgb), 0.22) 0%, rgba(var(--item-rgb), 0.06) 55%, rgba(0,0,0,0.10) 100%)`,
            border: `1px solid rgba(255,255,255,0.18)`,
          }}
        />

        <div
          className={cn(
            "w-8 h-7 2xl:w-12 2xl:h-11 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-10",
            active ? "scale-110" : "group-hover/nav:scale-[1.07]",
          )}
        >
          <Icon
            className={cn(
              "w-5 h-5 2xl:w-7 2xl:h-7 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              active
                ? "opacity-100"
                : "opacity-60 grayscale-[12%] group-hover/nav:opacity-100"
            )}
            style={active ? { filter: `drop-shadow(0 0 7px rgba(${item.colorRgb}, 0.6))` } : undefined}
          />
        </div>

        <span
          className={cn(
            "text-[7px] 2xl:text-[9px] font-black uppercase tracking-[0.12em] 2xl:tracking-[0.2em] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] font-outfit relative z-10 text-center px-0.5 leading-tight truncate max-w-full mt-0.5",
            active ? "opacity-100" : "text-[#6b6350] opacity-75 group-hover/nav:opacity-100"
          )}
          style={active ? { color: item.color } : undefined}
        >
          {item.label}
        </span>

        {active && (
          <div
            className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full shadow-lg z-20"
            style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }}
          />
        )}
      </button>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -10 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 p-3 rounded-2xl shadow-[0_28px_60px_rgba(0,0,0,0.55)] text-left z-9999 pointer-events-none"
            style={{
              background: "rgba(8,8,10,0.78)",
              border: `1px solid rgba(${item.colorRgb},0.30)`,
              backdropFilter: "blur(14px)",
            }}
          >
            <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: item.color }}>
              {item.label}
            </p>
            <p className="text-[8px] leading-relaxed text-white/65 font-bold uppercase tracking-wider">
              {item.sublabel}
            </p>
            <div
              className="absolute top-1/2 -translate-y-1/2 right-full -mr-px w-2 h-2 rotate-45"
              style={{
                background: "rgba(8,8,10,0.78)",
                borderLeft: `1px solid rgba(${item.colorRgb},0.30)`,
                borderBottom: `1px solid rgba(${item.colorRgb},0.30)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
