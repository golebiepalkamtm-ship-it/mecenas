import { motion } from "framer-motion";

export const Navbar = ({ onLoginOpen, onPortalClick }: { onLoginOpen: () => void; onPortalClick?: () => void }) => {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-200 h-20 flex items-center justify-between px-8 bg-black border-b border-white/5"
    >
      {/* Glossy top edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-gold-primary/30 to-transparent" />
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center">
          <img src="/logo.png" alt="LexMind Logo" className="w-full h-full object-cover" />
        </div>
        <span className="text-2xl font-outfit font-black italic uppercase tracking-wider text-white">LexMind AI</span>
      </div>

      <div className="hidden md:flex items-center gap-12">
        {["Problem", "Funkcje", "Cennik", "FAQ"].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-white transition-colors"
          >
            {item}
          </a>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onPortalClick || onLoginOpen}
        className="px-6 py-2.5 rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-[0.3em] text-white hover:bg-white hover:text-black transition-all"
      >
        Portal Klienta
      </motion.button>
    </motion.nav>
  );
};
