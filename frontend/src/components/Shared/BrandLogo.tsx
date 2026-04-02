interface BrandLogoProps {
  size?: number;
  showTagline?: boolean;
  className?: string;
}

export const BrandLogo = ({ size = 20, showTagline = false, className = "" }: BrandLogoProps) => {

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={size * 6.5}
        height={size * 1.5}
        viewBox="0 0 1000 200"
        preserveAspectRatio="xMinYMid meet"
        className="italic font-black overflow-visible"
      >
        <defs>
          <linearGradient id="lexMindGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="35%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f9e29d" />
            <stop offset="35%" stopColor="#d4af37" />
            <stop offset="50%" stopColor="#b89108" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>
          <filter id="raised" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.5" />
          </filter>
        </defs>
        <g filter="url(#raised)">
          {/* LexMind */}
          <text
            x="0"
            y="150"
            style={{ fontSize: "160px", fill: "none", stroke: "rgba(148,163,184,0.4)", strokeWidth: "3px" }}
          >
            LexMind
          </text>
          <text x="0" y="150" style={{ fontSize: "160px", fill: "url(#lexMindGradient)" }}>
            LexMind
          </text>

          {/* AI */}
          <text
            x="710"
            y="150"
            style={{ fontSize: "160px", fill: "none", stroke: "rgba(249,226,157,0.5)", strokeWidth: "3px" }}
          >
            AI
          </text>
          <text x="710" y="150" style={{ fontSize: "160px", fill: "url(#aiGradient)" }}>
            AI
          </text>
        </g>
      </svg>

      {showTagline && (
        <div className="flex items-center gap-3 mt-1 justify-center opacity-60">
          <div className="h-[1px] w-8 bg-[#c0c0c0]/30" />
          <p className="text-[10px] font-inter font-black tracking-[0.4em] text-[#c0c0c0]/80 uppercase italic whitespace-nowrap">
            Intelligent Justice
          </p>
          <div className="h-[1px] w-8 bg-[#c0c0c0]/30" />
        </div>
      )}
    </div>
  );
};
