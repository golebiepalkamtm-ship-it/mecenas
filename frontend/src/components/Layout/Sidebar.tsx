import { motion, AnimatePresence } from "framer-motion";
import { Scale, LogOut, Plus } from "lucide-react";
import { cn } from "../../utils/cn";
import type { Tab } from "../../types/navigation";

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
  userEmail: string;
  onLogout: () => void;
}

export function Sidebar({ navItems, activeTab, onTabChange, userEmail, onLogout }: SidebarProps) {
  const userInitials = userEmail.slice(0, 2).toUpperCase();

  return (
    <motion.nav
      initial={{ width: 78 }}
      animate={{ width: 78 }}
      transition={{ type: "spring", stiffness: 260, damping: 32 }}
      className="hidden lg:flex flex-col shrink-0 relative z-20"
      style={{
        background: "transparent",
        borderRight: "none",
      }}
    >
      {/* Logo zone */}
      <div
        className="h-20 pt-1 flex flex-col items-center justify-center shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <motion.div
            whileHover={{ scale: 1.06 }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer mb-1"
            style={{
              background: "linear-gradient(145deg, rgba(212,175,55,0.18) 0%, rgba(3,8,18,0.72) 100%)",
              borderTop:    "1.5px solid rgba(212,175,55,0.85)",
              borderLeft:   "1px   solid rgba(212,175,55,0.28)",
              borderRight:  "0.5px solid rgba(212,175,55,0.08)",
              borderBottom: "1.5px solid rgba(0,0,0,0.70)",
              boxShadow:    "0 10px 30px rgba(0,0,0,0.50), inset 0 1px 0 rgba(212,175,55,0.50), 0 0 20px rgba(212,175,55,0.08)",
            }}
          >
            <Scale size={20} style={{ color: "#d4af37" }} strokeWidth={1.5} />
        </motion.div>
        <span className="text-[7.5px] font-black uppercase tracking-[0.5em] text-white/30 font-outfit relative left-[0.25em]">LexMind</span>
      </div>


      {/* Nav items */}
      <div className="flex-1 overflow-y-auto px-1.5 pt-4 pb-8 space-y-4 custom-scrollbar flex flex-col items-center">
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
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* Profile Avatar with Integrated Status Lampka */}
        <div
          className="flex items-center justify-center p-2 rounded-2xl transition-colors relative group"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 relative"
            style={{
              background:   "linear-gradient(145deg, rgba(212,175,55,0.20) 0%, rgba(3,8,18,0.72) 100%)",
              borderTop:    "1.5px solid rgba(212,175,55,0.82)",
              borderLeft:   "1px   solid rgba(212,175,55,0.28)",
              borderRight:  "0.5px solid rgba(212,175,55,0.08)",
              borderBottom: "1.5px solid rgba(0,0,0,0.70)",
              boxShadow:    "inset 0 1px 0 rgba(212,175,55,0.55), 0 4px 14px rgba(0,0,0,0.50), 0 0 12px rgba(212,175,55,0.08)",
            }}
          >
            <span className="text-[11px] font-black" style={{ color: "#d4af37" }}>
              {userInitials}
            </span>
            
            {/* Status Lampka Badge */}
            <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
               <div className="relative">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold-primary shadow-[0_0_8px_#d4af37]" />
                  <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-gold-primary animate-ping opacity-40" />
               </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center opacity-40">
           <span className="text-[7px] font-black uppercase tracking-[0.2em] text-gold-primary">Encrypted</span>
        </div>

        {/* Global Logout Button */}
        <div className="pt-2 flex justify-center">
            <motion.button
              whileHover={{ scale: 1.1, rotate: -10 }}
              whileTap={{ scale: 0.9 }}
              onClick={onLogout}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
            >
              <LogOut size={16} strokeWidth={2.5} />
            </motion.button>
        </div>
      </div>
    </motion.nav>
  );
}

interface NavItemProps {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}

function NavItem({ item, active, onClick }: NavItemProps) {
  const Icon = item.icon;
  const c = item.color;
  const rgb = item.colorRgb;

  const activeStyle: React.CSSProperties = {
    background: `linear-gradient(145deg, rgba(${rgb},0.2) 0%, rgba(4,2,2,0.60) 100%)`,
    borderTop:    `1.5px solid rgba(${rgb},0.40)`,
    borderLeft:   `1px   solid rgba(${rgb},0.15)`,
    borderRight:  `0.5px solid rgba(255,255,255,0.04)`,
    borderBottom: `1.5px solid rgba(0,0,0,0.60)`,
    boxShadow: `0 8px 16px rgba(0,0,0,0.40), 0 0 20px rgba(${rgb},0.15), inset 0 1px 0 rgba(255,255,255,0.12)`,
  };

  return (
    <motion.button
      whileHover={{ y: active ? 0 : -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex flex-col items-center gap-2 px-2 pt-3 pb-6 rounded-2xl transition-all relative overflow-hidden group",
      )}
      style={
        active
          ? activeStyle
          : { background: "transparent", border: "1px solid transparent" }
      }
    >
      {/* Hover/Active Ambient Glow Background */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          active ? "opacity-30" : "opacity-0 group-hover:opacity-10"
        )}
        style={{
          background: `radial-gradient(circle at center, rgba(${rgb},0.4) 0%, transparent 70%)`
        }}
      />

      {/* Floating Prestige Dot */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute top-2 right-2 w-1 h-1 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            style={{ backgroundColor: c }}
          />
        )}
      </AnimatePresence>

      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
        style={
          active
            ? {
                background: `rgba(${rgb},0.25)`,
                color: c,
                boxShadow: `0 0 25px rgba(${rgb},0.4), 0 4px 10px rgba(0,0,0,0.30)`,
                borderTop:   `1px solid rgba(255,255,255,0.50)`,
                borderLeft:  `1px solid rgba(255,255,255,0.20)`,
                borderBottom:`1px solid rgba(0,0,0,0.35)`,
              }
            : {
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.25)",
                border: "1px solid rgba(255,255,255,0.02)",
              }
        }
      >
        <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
      </div>

      {/* Label */}
      <div className="text-center">
        <p
          className="text-[9px] font-black uppercase tracking-widest leading-none font-outfit -mt-1"
          style={{ color: active ? "#fff" : "rgba(255,255,255,0.4)" }}
        >
          {item.label}
        </p>
      </div>
    </motion.button>
  );
}
