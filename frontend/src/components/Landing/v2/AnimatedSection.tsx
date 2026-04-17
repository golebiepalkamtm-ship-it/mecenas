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
  const ctxRef = useRef<ReturnType<typeof gsap.context> | null>(null);

  useEffect(() => {
    // Defer ScrollTrigger initialization with setTimeout to prevent blocking
    const initAnimation = () => {
      const ctx = gsap.context(() => {
        const element = sectionRef.current;
        if (!element) return;

        gsap.fromTo(element,
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
              once: true
            }
          }
        );
      });

      return ctx;
    };

    const timeoutId = setTimeout(() => {
      ctxRef.current = initAnimation();
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      if (ctxRef.current) {
        ctxRef.current.revert();
        ctxRef.current = null;
      }
    };
  }, [delay]);

  return (
    <section 
      ref={sectionRef} 
      id={id} 
      className={className}
    >
      {children}
    </section>
  );
};
