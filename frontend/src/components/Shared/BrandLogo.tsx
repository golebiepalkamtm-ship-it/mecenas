interface BrandLogoProps {
  size?: number;
  showTagline?: boolean;
  className?: string;
}

export const BrandLogo = ({ size = 20, showTagline = false, className = "" }: BrandLogoProps) => {

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        style={{ width: '100%', maxWidth: size * 6.5, height: 'auto' }}
        viewBox="0 0 1000 200"
        preserveAspectRatio="xMidYMid meet"
        className="italic font-black overflow-visible"
      >

        <defs>
          <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#d1d1d6" />
            <stop offset="100%" stopColor="#8e8e93" />
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
            style={{ fontSize: "160px", fill: "none", stroke: "rgba(255,255,255,0.2)", strokeWidth: "3px" }}
          >
            LexMind
          </text>
          <text x="0" y="150" style={{ fontSize: "160px", fill: "url(#aiGradient)" }}>
            LexMind
          </text>

          {/* AI */}
          <text x="710" y="150" style={{ fontSize: "160px", fill: "url(#aiGradient)" }}>
            AI
          </text>
        </g>
      </svg>

      {showTagline && (
        <div className="flex items-center gap-3 mt-1 justify-center opacity-60">
          <div className="h-px w-8 bg-[#c0c0c0]/30" />
          <p className="text-[10px] font-inter font-black tracking-[0.4em] text-[#c0c0c0]/80 uppercase italic whitespace-nowrap">
            Intelligent Justice
          </p>
          <div className="h-px w-8 bg-[#c0c0c0]/30" />
        </div>
      )}
    </div>
  );
};
