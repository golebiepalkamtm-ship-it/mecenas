import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./landing-cta.css";

gsap.registerPlugin(useGSAP);

type LandingPortalButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "dark" | "light";
  roundClassName?: string;
  shellClassName?: string;
};

export function LandingPortalButton({
  children,
  variant = "dark",
  roundClassName = "rounded-2xl",
  shellClassName = "",
  className = "",
  type = "button",
  ...props
}: LandingPortalButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const variantClass = variant === "light" ? "landing-portal-cta--light" : "";

  useGSAP(
    () => {
      const btn = btnRef.current;
      if (!btn) return;

      const glowSoft =
        variant === "light"
          ? "0 0 8px rgba(212,175,55,0.18), 0 0 14px rgba(212,175,55,0.08)"
          : "0 0 8px rgba(212,175,55,0.2), 0 0 16px rgba(212,175,55,0.09)";
      const glowStrong =
        variant === "light"
          ? "0 0 12px rgba(212,175,55,0.38), 0 0 24px rgba(212,175,55,0.18)"
          : "0 0 14px rgba(212,175,55,0.42), 0 0 28px rgba(212,175,55,0.2)";

      gsap.fromTo(
        btn,
        { boxShadow: glowSoft },
        {
          boxShadow: glowStrong,
          duration: 1.1,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        },
      );
    },
    { scope: btnRef, dependencies: [variant] },
  );

  return (
    <span className={`landing-portal-cta-shell ${shellClassName}`.trim()}>
      <button
        ref={btnRef}
        type={type}
        className={`landing-portal-cta ${roundClassName} ${variantClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    </span>
  );
}
