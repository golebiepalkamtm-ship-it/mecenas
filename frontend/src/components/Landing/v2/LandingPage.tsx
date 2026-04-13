import React, { useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { Problem } from "./Problem";
import { Solution } from "./Solution";
import { Features } from "./Features";
import { Consensus } from "./Consensus";
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

    // Bardzo masywny gładki scroll
    const smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.8,
      smoothTouch: 0.8,
      effects: true,
      normalizeScroll: true
    });

    return () => {
      smoother.kill();
      ScrollTrigger.getAll().forEach(st => st.kill());
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };
  }, []);

  return (
    <div className="relative bg-[#050505] text-white selection:bg-white selection:text-black overflow-hidden">
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <Navbar 
            onLoginOpen={() => setIsLoginOpen(true)} 
            onPortalClick={onGoToPortal}
          />
          
          <main>
            <Hero onStartTrial={() => setIsLoginOpen(true)} />
            
            <AnimatedSection id="problem">
              <Problem />
            </AnimatedSection>
            
            <AnimatedSection>
              <Solution />
            </AnimatedSection>
            
            <AnimatedSection id="funkcje">
              <Features />
            </AnimatedSection>
            
            <AnimatedSection>
              <Consensus />
            </AnimatedSection>
            
            <AnimatedSection>
              <Security />
            </AnimatedSection>
            
            <AnimatedSection>
              <Stats />
            </AnimatedSection>
            
            <AnimatedSection>
              <Testimonials />
            </AnimatedSection>
            
            <AnimatedSection id="cennik">
              <Pricing onStartTrial={() => setIsLoginOpen(true)} />
            </AnimatedSection>
            
            <AnimatedSection>
              <FAQ />
            </AnimatedSection>
            
            <AnimatedSection>
              <FinalCTA onStartTrial={() => setIsLoginOpen(true)} />
            </AnimatedSection>
          </main>

          <Footer />

          <div className="fixed inset-0 pointer-events-none z-0">
            {/* Platinum Global Ambient Lighting - Sharp/Direct */}
            <div className="absolute top-0 left-0 w-full h-[150vh] bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08)_0%,transparent_60%)]" />
            <div className="absolute top-[20%] right-0 w-full h-[200vh] bg-[radial-gradient(circle_at_80%_40%,rgba(255,255,255,0.04)_0%,transparent_70%)]" />
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-white/[0.02] to-transparent" />
          </div>
        </div>
      </div>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
};

export default LandingPage;
