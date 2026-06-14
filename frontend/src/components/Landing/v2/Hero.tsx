import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Star } from "lucide-react";
import SplitType from "split-type";
import "../landing-hero.css";
import { LandingPortalButton } from "../LandingPortalButton";
import { refreshLandingScroll } from "./landingScroll";
import { useLandingScrollReady } from "./useLandingScrollReady";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const BADGES = ["100% Polskie Prawo", "3.2 mln Orzeczeń", "5 Modeli AI", "Prywatność Lokalna"];

const LEAD =
  "System RAG przeszukuje polskie kodeksy, ustawy oraz orzeczenia sądów, pobierając wyłącznie zweryfikowane źródła. Pytanie trafia równolegle do czołowych modeli od liderów rynku – OpenAI, Google, Anthropic oraz xAI. Zaawansowany silnik LexMind syntetyzuje dane w sekundy, eliminując błędy i dostarczając precyzyjną wykładnię opartą na faktach.";

export const Hero = ({ onStartTrial }: { onStartTrial: () => void }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const scrollReady = useLandingScrollReady();

  useGSAP(
    () => {
      const section = sectionRef.current;
      const bg = bgRef.current;
      if (!section || !bg || !scrollReady) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          compact: "(max-height: 820px)",
        },
        (context) => {
          const { reduceMotion, compact } = context.conditions as {
            reduceMotion: boolean;
            compact: boolean;
          };

          if (!reduceMotion) {
            gsap.fromTo(
              bg,
              { yPercent: compact ? 4 : 8 },
              {
                yPercent: compact ? -6 : -18,
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "top top",
                  end: "bottom top",
                  scrub: 0.5,
                  invalidateOnRefresh: true,
                },
              },
            );
          }

          const tagline = section.querySelector<HTMLElement>(".hero-title");
          let split: SplitType | null = null;
          if (tagline && !reduceMotion) {
            split = new SplitType(tagline, { types: "chars" });
            gsap.from(tagline.querySelectorAll(".char"), {
              y: 24,
              opacity: 0,
              stagger: 0.018,
              duration: 1.05,
              ease: "expo.out",
              delay: 0.15,
            });
          }

          const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
          if (!reduceMotion) {
            intro
              .from(".hero-lead", { opacity: 0, x: -28, duration: 0.85 }, 0.35)
              .from(".hero-cta-block", { opacity: 0, x: -22, duration: 0.75 }, "-=0.45")
              .from(
                ".hero-badge-item",
                { opacity: 0, y: 18, stagger: 0.07, duration: 0.55 },
                "-=0.35",
              );
          }

          return () => {
            split?.revert();
          };
        },
      );

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [scrollReady] },
  );

  return (
    <section
      ref={sectionRef}
      className="landing-hero-section relative w-full flex flex-col items-start pb-12 sm:pb-16 md:pb-20 px-4 sm:px-8 md:px-12 bg-[#0f0f0f]"
      aria-label="Strona główna LexMind"
    >
      <div ref={bgRef} className="landing-hero__bg-wrap will-change-transform" aria-hidden>
        <img
          src="/Gemini_Generated_Image_57qibm57qibm57qi.png"
          alt=""
          fetchPriority="high"
          loading="eager"
          onLoad={() => refreshLandingScroll()}
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-linear-to-b from-black/35 via-black/45 to-[#050505]/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15)_0%,transparent_70%)]" />
      </div>

      <div className="landing-hero__inner flex flex-col items-start gap-8 w-full">
        <div className="flex-1 min-w-0 text-left relative pt-0">
          <div className="text-left">
            <p className="hero-lead text-sm sm:text-base md:text-xl text-[#d1d5db] font-medium leading-relaxed mb-4 sm:mb-6 drop-shadow-md max-w-xl">
              {LEAD}
            </p>
            <p className="hero-title text-xs sm:text-base font-black uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[#9ca3af] italic drop-shadow-lg mb-6 sm:mb-10">
              LexMind — Pewność prawa, potęga technologii
            </p>

            <div className="hero-cta-block flex flex-col items-start gap-4">
              <LandingPortalButton
                onClick={onStartTrial}
                roundClassName="rounded-full"
                className="group px-10 py-4 font-black uppercase tracking-[0.3em] text-[12px]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Star size={12} className="landing-portal-cta__icon shrink-0 fill-[#d4af37]" />
                  Wypróbuj za darmo
                  <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform shrink-0" />
                </span>
              </LandingPortalButton>
              <p className="hero-cta-note text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7280]">
                Nie wymaga karty kredytowej • 7 dni testu
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-badges-wrap relative mt-10 z-20 opacity-70 w-full mx-auto">
        <div className="hero-badges-inner">
          {BADGES.map((item) => (
            <div key={item} className="hero-badge-item flex items-center gap-2 shrink-0">
              <div className="w-1 h-1 rounded-full bg-[#6b7280] shrink-0" />
              <span className="text-[7px] min-[400px]:text-[8px] sm:text-[9px] font-black uppercase tracking-[0.12em] sm:tracking-[0.28em] md:tracking-[0.38em] text-[#9ca3af] whitespace-nowrap">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
