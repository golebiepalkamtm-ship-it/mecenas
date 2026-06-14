import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLandingScrollReady } from "./useLandingScrollReady";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
}

export const AnimatedSection = ({
  children,
  className = "",
  id,
  delay = 0,
}: AnimatedSectionProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollReady = useLandingScrollReady();

  useGSAP(
    () => {
      const element = sectionRef.current;
      if (!element || !scrollReady) return;

      gsap.fromTo(
        element,
        {
          opacity: 0,
          y: 60,
          scale: 0.98,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.5,
          delay,
          ease: "expo.out",
          scrollTrigger: {
            trigger: element,
            start: "top 90%",
            end: "bottom 10%",
            toggleActions: "play none none none",
            once: true,
          },
        },
      );
    },
    { scope: sectionRef, dependencies: [scrollReady, delay] },
  );

  return (
    <section ref={sectionRef} id={id} className={className}>
      {children}
    </section>
  );
};
