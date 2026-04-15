import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const Navbar = ({ onLoginOpen, onPortalClick }: { onLoginOpen: () => void; onPortalClick?: () => void }) => {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    ScrollTrigger.create({
      start: "top -50", // Start slightly after top
      onUpdate: (self) => {
        // ALWAYS show if we are near the top
        if (self.scroll() < 100) {
          gsap.to(nav, { yPercent: 0, duration: 0.4, ease: "power3.out", overwrite: true });
          nav.classList.remove('navbar-scrolled');
        } 
        // Show if scrolling up
        else if (self.direction === -1) {
          gsap.to(nav, { yPercent: 0, duration: 0.4, ease: "power3.out", overwrite: true });
          nav.classList.add('navbar-scrolled');
        } 
        // Hide if scrolling down
        else if (self.direction === 1) {
          gsap.to(nav, { yPercent: -100, duration: 0.4, ease: "power3.out", overwrite: true });
          nav.classList.add('navbar-scrolled');
        }
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <nav
      ref={navRef as any}
      className="fixed top-0 left-0 right-0 z-200 h-24 flex items-center justify-between px-12 bg-transparent pointer-events-none"
    >
      <div className="flex items-center gap-4">
        {/* Logo and name removed as requested */}
      </div>

      <div className="hidden md:flex items-center gap-12 ml-auto pr-48 pointer-events-auto">
        {["Problem", "Funkcje", "Cennik", "FAQ"].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            className="text-[11px] font-black uppercase tracking-[0.4em] text-[#9ca3af] hover:text-white transition-opacity duration-300"
          >
            {item}
          </a>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.05, borderColor: "rgba(212,175,55,1)", boxShadow: "0 0 35px rgba(212,175,55,0.7)" }}
        whileTap={{ scale: 0.95 }}
        onClick={onPortalClick || onLoginOpen}
        className="px-12 py-5 rounded-[2rem] border-2 border-white/70 text-[13px] font-black uppercase tracking-[0.45em] text-white bg-white/10 hover:bg-white/20  transition-all duration-300 pointer-events-auto shadow-[0_15px_40px_rgba(0,0,0,0.6)]"
      >
        Portal Klienta
      </motion.button>
    </nav>
  );
};
