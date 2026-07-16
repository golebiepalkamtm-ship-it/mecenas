import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { LandingPortalButton } from "../LandingPortalButton";
import { onLandingScroll, scrollToLandingTarget } from "./landingScroll";
import { useLandingScrollReady } from "./useLandingScrollReady";

function BrandWordmark({ className, size = "lg" }: { className?: string; size?: "md" | "lg" | "xl" | "xxl" }) {
  const uid = useId().replace(/:/g, "");
  const lexMindGradientId = `lexMindGradient-${uid}`;
  const aiGradientId = `aiGradient-${uid}`;
  const raisedId = `raised-${uid}`;

  const dims =
    size === "xxl"
      ? { w: 520, h: 104 }
      : size === "xl"
        ? { w: 320, h: 64 }
        : size === "md"
          ? { w: 200, h: 40 }
          : { w: 260, h: 52 };

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <img
          src="/logo.png"
          alt="LexMind AI"
          className="select-none pointer-events-none"
          style={{
            width: size === "xxl" ? 260 : size === "xl" ? 160 : 116,
            height: size === "xxl" ? 260 : size === "xl" ? 160 : 116,
            objectFit: "contain",
            filter: "drop-shadow(0 0 60px rgba(212,175,55,0.45))",
          }}
        />

        <div className="flex flex-col leading-none">
          <svg
            width={dims.w}
            height={dims.h}
            viewBox="0 0 1200 200"
            preserveAspectRatio="xMinYMid meet"
            className="italic font-black overflow-visible"
          >
            <defs>
              <linearGradient id={lexMindGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="35%" stopColor="#cbd5e1" />
                <stop offset="50%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              <linearGradient id={aiGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f9e29d" />
                <stop offset="35%" stopColor="#d4af37" />
                <stop offset="50%" stopColor="#b89108" />
                <stop offset="100%" stopColor="#854d0e" />
              </linearGradient>
              <filter id={raisedId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.5" />
              </filter>
            </defs>
            <g filter={`url(#${raisedId})`}>
              <text
                x="50"
                y="150"
                style={{ fontSize: "160px", fill: "none", stroke: "rgba(148,163,184,0.6)", strokeWidth: "4px" }}
              >
                LexMind
              </text>
              <text x="50" y="150" style={{ fontSize: "160px", fill: `url(#${lexMindGradientId})` }}>
                LexMind
              </text>

              <text
                x="760"
                y="150"
                style={{ fontSize: "160px", fill: "none", stroke: "rgba(249,226,157,0.7)", strokeWidth: "4px" }}
              >
                AI
              </text>
              <text x="760" y="150" style={{ fontSize: "160px", fill: `url(#${aiGradientId})` }}>
                AI
              </text>
            </g>
          </svg>

          <div className="flex items-center gap-4 mt-1 opacity-70">
            <div className="h-[2px] w-10 bg-white/15 shadow-[0_0_14px_rgba(212,175,55,0.15)]" />
            <p className="text-[11px] md:text-[12px] font-inter font-black tracking-[0.6em] text-white/60 uppercase italic whitespace-nowrap">
              Intelligent Justice
            </p>
            <div className="h-[2px] w-10 bg-white/15 shadow-[0_0_14px_rgba(212,175,55,0.15)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const Navbar = ({ onLoginOpen, onPortalClick }: { onLoginOpen: () => void; onPortalClick?: () => void }) => {
  const navRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const hiddenRef = useRef(false);
  const scrolledRef = useRef(false);
  const scrollReady = useLandingScrollReady();

  useEffect(() => {
    if (!scrollReady) return;

    return onLandingScroll(({ scroll, direction }) => {
      if (scroll < 64) {
        if (hiddenRef.current) {
          hiddenRef.current = false;
          setHidden(false);
        }
        if (scrolledRef.current) {
          scrolledRef.current = false;
          setScrolled(false);
        }
        return;
      }

      if (!scrolledRef.current) {
        scrolledRef.current = true;
        setScrolled(true);
      }

      if (direction > 0 && !hiddenRef.current) {
        hiddenRef.current = true;
        setHidden(true);
      } else if (direction < 0 && hiddenRef.current) {
        hiddenRef.current = false;
        setHidden(false);
      }
    });
  }, [scrollReady]);

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, hash: string) => {
    event.preventDefault();
    const target = document.querySelector<HTMLElement>(hash);
    if (target) {
      scrollToLandingTarget(target, -80);
    }
  };

  return (
    <header
      className={[
        "landing-nav-shell pointer-events-none",
        scrolled ? "navbar-scrolled" : "",
        hidden ? "navbar-hidden" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
    <nav
      ref={navRef}
      className="landing-nav-bar relative left-0 right-0 w-full h-[var(--landing-nav-h,4.5rem)] min-h-[var(--landing-nav-h,4.5rem)] flex items-center justify-between gap-2 sm:gap-3 px-4 sm:px-8 md:px-12 bg-transparent"
    >
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 shrink max-w-[55%] sm:max-w-none">
        <div className="landing-nav-brand pointer-events-auto select-none scale-[0.57] sm:scale-[0.68] md:scale-[0.81] lg:scale-[0.90] xl:scale-[1.02] 2xl:scale-[1.14] origin-left">
          <BrandWordmark size="md" className="sm:hidden" />
          <BrandWordmark size="lg" className="hidden sm:block lg:hidden" />
          <BrandWordmark size="xl" className="hidden lg:block 2xl:hidden" />
          <BrandWordmark size="xxl" className="hidden 2xl:block" />
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-6 xl:gap-10 ml-auto xl:pr-24 2xl:pr-40 pointer-events-auto shrink-0">
        {[
          { label: "Problem", hash: "#problem" },
          { label: "Funkcje", hash: "#funkcje" },
          { label: "Cennik", hash: "#cennik" },
          { label: "FAQ", hash: "#faq" },
        ].map((item) => (
          <a
            key={item.label}
            href={item.hash}
            onClick={(e) => handleNavClick(e, item.hash)}
            className="text-[11px] font-black uppercase tracking-[0.4em] text-[#9ca3af] hover:text-white transition-opacity duration-300"
          >
            {item.label}
          </a>
        ))}
      </div>

      <LandingPortalButton
        onClick={onPortalClick || onLoginOpen}
        roundClassName="rounded-xl md:rounded-2xl"
        shellClassName="shrink-0 pointer-events-auto"
        className="px-3 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3 text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]"
      >
        Portal Klienta
      </LandingPortalButton>
    </nav>
    </header>
  );
};
