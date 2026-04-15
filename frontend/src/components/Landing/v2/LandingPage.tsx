import React, { useEffect, useState } from "react";
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

    // LENIS SMOOTH SCROLL (Awwwards Standard)
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    
    gsap.ticker.lagSmoothing(0);
    requestAnimationFrame(raf);

    // Grouped initialization to prevent layout thrashing
    const initAnimations = () => {
      // 1. Single read phase: SplitType
      const splitHeaders = new SplitType('.hero-title, h2', { types: 'chars' });
      
      // 2. Write phase: GSAP Entrance
      gsap.utils.toArray('.hero-title, h2').forEach((title: any) => {
        const chars = title.querySelectorAll('.char');
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
      
      return splitHeaders;
    };

    let splitHeadersInstance: SplitType | null = null;

    // Use a small delay or font detection to avoid geometry recalculation on font load
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        splitHeadersInstance = initAnimations();
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      lenis.destroy();
      if (splitHeadersInstance) splitHeadersInstance.revert();
      ScrollTrigger.getAll().forEach(st => st.kill());
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };
  }, []);

  return (
    <div className="relative bg-[#121212] text-[#9ca3af] selection:bg-white selection:text-[#9ca3af] min-h-screen">
      <Navbar 
        onLoginOpen={onGoToPortal} 
        onPortalClick={onGoToPortal}
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
