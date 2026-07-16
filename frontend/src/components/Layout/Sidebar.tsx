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
    <nav className="app-nav-sidebar hidden lg:flex lg:col-start-1 lg:row-start-1 lg:row-span-2 flex-col mercury-sidebar-shimmer lex-view-grain h-full min-h-0 2xl:w-32 shrink-0 relative z-30 pointer-events-auto overflow-hidden rounded-l-[var(--app-nav-chrome-r-side)]">
      <div className="sidebar-logo-lead shrink-0 relative z-20 w-full px-2 pt-2 2xl:pt-3 pb-1 flex flex-col items-center justify-center min-h-[var(--app-nav-header-h)]">
        <motion.div
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-14 h-14 2xl:w-16 2xl:h-16 rounded-2xl 2xl:rounded-[1.35rem] glass-liquid-convex flex items-center justify-center cursor-pointer relative group/logo border border-gold-primary/35 shadow-[0_0_30px_rgba(212,175,55,0.28)] hover:shadow-[0_0_48px_rgba(212,175,55,0.5)] transition-all duration-700"
        >
          <motion.div
            animate={{
              opacity: [0.05, 0.22, 0.05],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-inherit bg-gold-primary/5"
          />
          <TrialRoomIcon className="w-9 h-9 2xl:w-11 2xl:h-11 relative z-10 filter drop-shadow-[0_0_10px_rgba(212,175,55,0.45)]" />
        </motion.div>

        <span className="text-[9px] 2xl:text-[11px] font-black uppercase tracking-[0.32em] 2xl:tracking-[0.42em] font-outfit mt-1.5 2xl:mt-2 text-white/70">
          LexMind
        </span>
      </div>

      <LayoutGroup id="sidebar-nav">
        <div className="sidebar-nav-stack flex-1 w-full min-h-0 flex flex-col items-stretch px-1.5 2xl:px-2 gap-0.5 2xl:gap-1 py-1 pb-1 [perspective:800px]">
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

      <div className="shrink-0 w-full px-1.5 2xl:px-2 pb-2 xl:pb-4 flex flex-col justify-center gap-1 relative">
        <button
          onClick={onLogout}
          onMouseEnter={() => setHoveredAction('logout')}
          onMouseLeave={() => setHoveredAction(null)}
          className="w-full h-9 2xl:h-11 flex flex-col items-center justify-center gap-0.5 rounded-lg 2xl:rounded-xl transition-all duration-500 relative group/nav outline-none glass-liquid-convex opacity-80 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-[rgba(var(--gold-rgb),0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
          aria-label="Wyloguj się"
        >
          <LogOut
            size={18}
            strokeWidth={1.5}
            className="relative z-10 text-white/70 group-hover/nav:text-red-400 transition-colors duration-500"
          />
          <span className="text-[8px] font-black uppercase tracking-[0.15em] font-outfit relative z-10 text-white/75 transition-all duration-500 whitespace-nowrap group-hover/nav:text-white">
            Wyloguj
          </span>
        </button>
        <AnimatePresence>
          {hoveredAction === 'logout' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: -15, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.9, x: -15, filter: "blur(4px)" }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 24,
                delay: 0.15,
              }}
              className="absolute left-full bottom-2 ml-3 w-52 p-3 rounded-2xl shadow-[0_28px_60px_rgba(0,0,0,0.55)] text-left z-9999 pointer-events-none"
              style={{
                background: "rgba(8,8,10,0.82)",
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(20px)",
              }}
            >
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-[9px] font-black uppercase tracking-widest text-white mb-1"
              >
                Wyloguj Się
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
                className="text-[8px] leading-relaxed text-white/65 font-bold uppercase tracking-wider"
              >
                Zakończ sesję i wróć do ekranu logowania.
              </motion.p>
              <div
                className="absolute top-1/2 -translate-y-1/2 right-full -mr-px w-2 h-2 rotate-45"
                style={{
                  background: "rgba(8,8,10,0.82)",
                  borderLeft: "1px solid rgba(255,255,255,0.15)",
                  borderBottom: "1px solid rgba(255,255,255,0.15)",
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
  const ref = React.useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0, rX: 0, rY: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    
    // Magnetic pull: max 3px offset
    const pullX = (mouseX / (width / 2)) * 3;
    const pullY = (mouseY / (height / 2)) * 3;
    
    // Tilt rotate: max 8 degrees
    const tiltX = -(mouseY / (height / 2)) * 8;
    const tiltY = (mouseX / (width / 2)) * 8;

    setCoords({ x: pullX, y: pullY, rX: tiltX, rY: tiltY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ x: 0, y: 0, rX: 0, rY: 0 });
  };

  return (
    <div className="relative w-full flex-1 min-h-0">
      <motion.button
        ref={ref}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        animate={{
          x: coords.x,
          y: coords.y,
          rotateX: coords.rX,
          rotateY: coords.rY,
        }}
        transition={{ type: "spring", stiffness: 250, damping: 25, mass: 0.8 }}
        style={{ "--item-rgb": item.colorRgb } as React.CSSProperties}
        className={cn(
          "w-full h-full min-h-0 flex flex-col items-center justify-between py-1 2xl:py-1.5 rounded-xl 2xl:rounded-[1.15rem] relative group/nav outline-none glass-liquid-convex border border-transparent transition-[transform,filter,opacity,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-2 focus-visible:ring-[rgba(var(--item-rgb),0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/30",
          active ? "scale-[1.02] 2xl:scale-[1.03] z-10 opacity-100" : "opacity-80 hover:opacity-100 hover:scale-[1.01]",
        )}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active-surface"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
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
            "flex-1 min-h-0 w-full flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-10",
            active ? "scale-105" : "group-hover/nav:scale-[1.04]",
          )}
        >
          <Icon
            className={cn(
              "sidebar-nav-icon h-[clamp(1.2rem,72%,2.5rem)] w-[clamp(1.2rem,72%,2.5rem)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              active
                ? "opacity-100"
                : "opacity-60 grayscale-[12%] group-hover/nav:opacity-100"
            )}
            style={active ? { filter: `drop-shadow(0 0 7px rgba(${item.colorRgb}, 0.6))` } : undefined}
          />
        </div>

        <span
          className={cn(
            "sidebar-nav-label shrink-0 text-[clamp(6.5px,1.05vh,9px)] font-black uppercase tracking-[0.05em] 2xl:tracking-[0.08em] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] font-outfit relative z-10 text-center px-1 leading-[1.05] truncate w-full pb-0.5",
            active ? "opacity-100" : "text-white/80 opacity-90 group-hover/nav:opacity-100 group-hover/nav:text-white"
          )}
          style={active ? { color: item.color } : undefined}
        >
          {item.label}
        </span>

        {active && (
          <motion.div
            className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-[42%] min-h-[1.25rem] max-h-[2rem] rounded-r-full shadow-lg z-20"
            style={{ backgroundColor: item.color }}
            animate={{
              boxShadow: [
                `0 0 10px ${item.color}`,
                `0 0 20px ${item.color}`,
                `0 0 10px ${item.color}`,
              ],
              scaleY: [1, 1.15, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -15, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.9, x: -15, filter: "blur(4px)" }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 24,
              delay: 0.15,
            }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 p-3 rounded-2xl shadow-[0_28px_60px_rgba(0,0,0,0.55)] text-left z-9999 pointer-events-none"
            style={{
              background: "rgba(8,8,10,0.82)",
              border: `1px solid rgba(${item.colorRgb},0.35)`,
              backdropFilter: "blur(20px)",
            }}
          >
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-[9px] font-black uppercase tracking-widest mb-1"
              style={{ color: item.color }}
            >
              {item.label}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="text-[8px] leading-relaxed text-white/65 font-bold uppercase tracking-wider"
            >
              {item.sublabel}
            </motion.p>
            <div
              className="absolute top-1/2 -translate-y-1/2 right-full -mr-px w-2 h-2 rotate-45"
              style={{
                background: "rgba(8,8,10,0.82)",
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
