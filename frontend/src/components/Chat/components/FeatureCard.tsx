import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  bgColor: string;
  textColor?: string;
}

export function FeatureCard({
  icon,
  title,
  bgColor,
  textColor = "text-white",
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-default shadow-sm glass-prestige",
        bgColor,
      )}
    >
      <div className={cn("shrink-0 scale-90", textColor)}>{icon}</div>
      <span
        className={cn(
          "text-[10px] font-black uppercase tracking-wider whitespace-nowrap",
          textColor,
        )}
      >
        {title}
      </span>
    </div>
  );
}
