import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
  delay = 0
}: AnimatedSectionProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    // Professional Entrance: Slide + Blur + Scale
    gsap.fromTo(element,
      {
        opacity: 0,
        y: 60,
        scale: 0.98,
        filter: "blur(10px)"
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        duration: 1.5,
        delay,
        ease: "expo.out",
        scrollTrigger: {
          trigger: element,
          start: "top 90%",
          end: "bottom 10%",
          toggleActions: "play none none none",
          once: true
        }
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, [delay]);

  return (
    <section 
      ref={sectionRef} 
      id={id} 
      className={className}
      style={{ willChange: "transform, opacity, filter" }}
    >
      {children}
    </section>
  );
};
