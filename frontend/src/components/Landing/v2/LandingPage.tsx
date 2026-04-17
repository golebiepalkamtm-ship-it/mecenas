import React, { useEffect } from "react";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { AnimatedSection } from "./AnimatedSection";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import SplitType from "split-type";

const Problem = React.lazy(() => import("./Problem").then(m => ({ default: m.Problem })));
const Solution = React.lazy(() => import("./Solution").then(m => ({ default: m.Solution })));
const Features = React.lazy(() => import("./Features").then(m => ({ default: m.Features })));
const Stats = React.lazy(() => import("./Stats").then(m => ({ default: m.Stats })));
const Pricing = React.lazy(() => import("./Pricing").then(m => ({ default: m.Pricing })));
const FAQ = React.lazy(() => import("./FAQ").then(m => ({ default: m.FAQ })));
const Testimonials = React.lazy(() => import("./Testimonials").then(m => ({ default: m.Testimonials })));
const Security = React.lazy(() => import("./Security").then(m => ({ default: m.Security })));
const Footer = React.lazy(() => import("./Footer").then(m => ({ default: m.Footer })));
const FinalCTA = React.lazy(() => import("./Footer").then(m => ({ default: m.FinalCTA })));

gsap.registerPlugin(ScrollTrigger);

const LandingPage = ({ onGoToPortal, onStartTrial }: { onGoToPortal?: () => void, onStartTrial?: () => void }) => {
  useEffect(() => {
    // Enable scroll for landing page
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";

    // Defer heavy operations with setTimeout to allow browser paint first
    const initAnimations = () => {
      // LENIS SMOOTH SCROLL (Awwwards Standard)
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1.1,
        touchMultiplier: 2,
      });

      const tickerHandler = (time: number) => {
        lenis.raf(time * 1000);
      };

      gsap.ticker.add(tickerHandler);
      gsap.ticker.lagSmoothing(0);

      const ctx = gsap.context(() => {
        // 1. Single read phase: SplitType
        // Optimized: Only split the main hero title and specific h2s to avoid DOM bloating
        const splitElements = document.querySelectorAll(".hero-title, h2.animate-text");
        Array.from(splitElements).forEach(el => new SplitType(el as HTMLElement, { types: "chars" }));

        splitElements.forEach((title) => {
          const chars = title.querySelectorAll(".char");
          if (chars.length > 0) {
            gsap.from(chars, {
              y: 40,
              opacity: 0,
              stagger: 0.02,
              duration: 1,
              ease: "expo.out",
              scrollTrigger: {
                trigger: title,
                start: "top 85%",
              }
            });
          }
        });
      });

      return { ctx, tickerHandler, lenis };
    };

    // Use setTimeout with delay to allow browser to complete paint before heavy operations
    let animationState: ReturnType<typeof initAnimations> | null = null;
    const timeoutId = setTimeout(() => {
      animationState = initAnimations();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (animationState) {
        animationState.ctx.revert();
        gsap.ticker.remove(animationState.tickerHandler);
        animationState.lenis.destroy();
      }
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };
  }, []);

  return (
    <div className="relative bg-[#121212] text-[#9ca3af] selection:bg-white selection:text-[#9ca3af] min-h-screen">
      <Navbar 
        onLoginOpen={onGoToPortal || (() => {})} 
        onPortalClick={onGoToPortal || (() => {})}
      />
      
      <main>
        <Hero onStartTrial={onStartTrial || (() => {})} />
        
        <React.Suspense fallback={<div className="h-96 bg-[#121212]" />}>
          <AnimatedSection id="problem" delay={0.1}>
            <Problem />
          </AnimatedSection>
          
          <AnimatedSection delay={0.2}>
            <Solution />
          </AnimatedSection>
          
          <AnimatedSection id="funkcje" delay={0.1}>
            <Features />
          </AnimatedSection>
          
          <AnimatedSection delay={0.2}>
            <Security />
          </AnimatedSection>
          
          <AnimatedSection delay={0.1}>
            <Stats />
          </AnimatedSection>
          
          <AnimatedSection delay={0.2}>
            <Testimonials />
          </AnimatedSection>
          
          <AnimatedSection id="cennik" delay={0.2}>
            <Pricing onStartTrial={onStartTrial || (() => {})} />
          </AnimatedSection>
          
          <AnimatedSection id="faq" delay={0.1}>
            <FAQ />
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <FinalCTA onStartTrial={onStartTrial || (() => {})} />
          </AnimatedSection>

          <Footer />
        </React.Suspense>
      </main>
    </div>
  );
};

export default LandingPage;
