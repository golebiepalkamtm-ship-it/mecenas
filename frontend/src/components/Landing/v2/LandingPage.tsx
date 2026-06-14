import React, { useEffect, useRef } from "react";

import { Navbar } from "./Navbar";

import { Hero } from "./Hero";

import { AnimatedSection } from "./AnimatedSection";

import { gsap } from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";

import SplitType from "split-type";

import {
  destroyLandingScroll,
  initLandingScroll,
  refreshLandingScroll,
} from "./landingScroll";
import { useLandingScrollReady } from "./useLandingScrollReady";
import {
  maybeAutoRunLandingScrollDiagnostics,
  registerLandingScrollDiagnostics,
} from "./landingScrollDiagnostics";



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



function LazySectionRefresh() {

  useEffect(() => {

    const id = requestAnimationFrame(() => refreshLandingScroll());

    return () => cancelAnimationFrame(id);

  }, []);

  return null;

}



const LandingPage = ({ onGoToPortal, onStartTrial }: { onGoToPortal?: () => void, onStartTrial?: () => void }) => {

  const rootRef = useRef<HTMLDivElement>(null);

  const scrollReady = useLandingScrollReady();



  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    initLandingScroll(root);
    registerLandingScrollDiagnostics();
    maybeAutoRunLandingScrollDiagnostics();

    const resizeObserver = new ResizeObserver(() => {
      refreshLandingScroll();
    });
    resizeObserver.observe(root);

    const onLoad = () => refreshLandingScroll();
    window.addEventListener("load", onLoad);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("load", onLoad);
      destroyLandingScroll();
    };
  }, []);



  useEffect(() => {

    if (!scrollReady) return;



    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) return;



    const ctx = gsap.context(() => {

      const splitElements = document.querySelectorAll("h2.animate-text");

      Array.from(splitElements).forEach((el) => new SplitType(el as HTMLElement, { types: "chars" }));



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

            },

          });

        }

      });

    });



    refreshLandingScroll();



    return () => ctx.revert();

  }, [scrollReady]);



  return (
    <>
      <Navbar
        onLoginOpen={onGoToPortal || (() => {})}
        onPortalClick={onGoToPortal || (() => {})}
      />
      <div
        ref={rootRef}
        className="landing-scroll-root relative bg-[#121212] text-[#9ca3af] selection:bg-white selection:text-[#9ca3af]"
      >
        <div className="landing-scroll-content">
      <main>

        <Hero onStartTrial={onStartTrial || (() => {})} />



        <React.Suspense fallback={<div className="h-96 bg-[#121212]" />}>

          <LazySectionRefresh />

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
      </div>
    </>
  );

};



export default LandingPage;

