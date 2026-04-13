import React, { useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { Problem } from "./Problem";
import { Solution } from "./Solution";
import { Features } from "./Features";
import { Stats } from "./Stats";
import { Pricing } from "./Pricing";
import { FAQ } from "./FAQ";
import { FinalCTA, Footer } from "./Footer";
import { Testimonials } from "./Testimonials";
import { Security } from "./Security";
import { LoginModal } from "./LoginModal";
import { AnimatedSection } from "./AnimatedSection";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollSmoother, ScrollTrigger);

const LandingPage = ({ onGoToPortal }: { onGoToPortal?: () => void }) => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    // Enable scroll for landing page
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";

    // Force GSAP to 60 FPS for that "buttery" feel
    gsap.ticker.fps(60);

    // Bardzo masywny, maślany gładki scroll (premium feel)
    const smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 2.2, // Increased for "powolny" feel
      smoothTouch: 0.1,
      effects: true, // Enable data-speed and data-lag effects
      normalizeScroll: true,
      ignoreMobileResize: true
    });

    // Optional: add subtle parallax to all images automatically
    gsap.utils.toArray('img').forEach((img: any) => {
      gsap.to(img, {
        y: -40,
        ease: "none",
        scrollTrigger: {
          trigger: img,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });
    });

    return () => {
      if (smoother) smoother.kill();
      ScrollTrigger.getAll().forEach(st => st.kill());
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };
  }, []);

  return (
    <div className="relative bg-[#050505] text-white selection:bg-white selection:text-black overflow-hidden">
      <div id="smooth-wrapper">
        <div id="smooth-content" style={{ willChange: "transform" }}>
          <Navbar 
            onLoginOpen={() => setIsLoginOpen(true)} 
            onPortalClick={onGoToPortal}
          />
          
          <main>
            <Hero onStartTrial={() => setIsLoginOpen(true)} />
            
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
            
            <AnimatedSection id="cennik" delay={0.1}>
              <Pricing onStartTrial={() => setIsLoginOpen(true)} />
            </AnimatedSection>
            
            <AnimatedSection delay={0.1}>
              <FAQ />
            </AnimatedSection>
            
            <AnimatedSection delay={0.2}>
              <FinalCTA onStartTrial={() => setIsLoginOpen(true)} />
            </AnimatedSection>
          </main>

          <Footer />

          <div className="fixed inset-0 pointer-events-none z-0">
            {/* Platinum Global Ambient Lighting - Sharp/Direct */}
            <div className="absolute top-0 left-0 w-full h-[150vh] bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08)_0%,transparent_60%)]" />
            <div className="absolute top-[20%] right-0 w-full h-[200vh] bg-[radial-gradient(circle_at_80%_40%,rgba(255,255,255,0.04)_0%,transparent_70%)]" />
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-white/2 to-transparent" />
          </div>
        </div>
      </div>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
};

export default LandingPage;
