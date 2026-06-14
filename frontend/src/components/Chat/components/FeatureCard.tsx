import React from "react";
import { cn } from "../../../utils/cn";

export function FeatureCard({
  icon,
  title,
  description,
  bgColor,
  textColor,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  bgColor?: string;
  textColor?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border border-black/8 px-3 py-2.5 shadow-sm",
        bgColor ?? "glass-prestige",
        className,
      )}
    >
      <div className="w-9 h-9 rounded-xl bg-black/5 border border-black/8 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "text-[10px] font-black uppercase tracking-[0.22em] truncate font-outfit",
            textColor ?? "text-black",
          )}
        >
          {title}
        </p>
        {description ? (
          <p className="text-[9px] font-bold text-black/45 mt-0.5 truncate">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

