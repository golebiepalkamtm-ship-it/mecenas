import React, { useId } from "react";
import "./splash-screen.css";

export const LexMindLoader: React.FC = () => {
  const uid = useId().replace(/:/g, "");
  const lexMindGradientId = `lexMindGradient-${uid}`;
  const aiGradientId = `aiGradient-${uid}`;
  const raisedId = `raised-${uid}`;

  return (
    <div className="splash-screen" role="status" aria-live="polite" aria-label="Ładowanie LexMind">
      <div className="splash-screen__bg" aria-hidden>
        <div className="splash-screen__bg-glow" />
        <div className="splash-screen__bg-vignette" />
        <div className="splash-screen__bg-grain" />
      </div>

      <div className="splash-screen__stack">
        <div className="splash-screen__brand">
          <div className="splash-screen__logo-wrap">
            <img src="/logo.png" alt="" className="splash-screen__logo" aria-hidden />
          </div>

          <div className="splash-screen__wordmark-wide" aria-hidden>
            <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid meet" className="w-full h-auto italic font-black overflow-visible">
              <defs>
                <linearGradient id={lexMindGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="35%" stopColor="#cbd5e1" />
                  <stop offset="50%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
                <linearGradient id={aiGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f9e29d" />
                  <stop offset="35%" stopColor="#d4af37" />
                  <stop offset="50%" stopColor="#b89108" />
                  <stop offset="100%" stopColor="#854d0e" />
                </linearGradient>
                <filter id={raisedId} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.5" />
                </filter>
              </defs>
              <g filter={`url(#${raisedId})`}>
                <text x="50" y="150" style={{ fontSize: "160px", fill: "none", stroke: "rgba(148,163,184,0.6)", strokeWidth: "4px" }}>
                  LexMind
                </text>
                <text x="50" y="150" style={{ fontSize: "160px", fill: `url(#${lexMindGradientId})` }}>
                  LexMind
                </text>
                <text x="760" y="150" style={{ fontSize: "160px", fill: "none", stroke: "rgba(249,226,157,0.7)", strokeWidth: "4px" }}>
                  AI
                </text>
                <text x="760" y="150" style={{ fontSize: "160px", fill: `url(#${aiGradientId})` }}>
                  AI
                </text>
              </g>
            </svg>
          </div>

          <p className="splash-screen__wordmark-compact">
            LexMind <span className="accent">AI</span>
          </p>
        </div>

        <div className="splash-screen__line splash-screen__line--tag">
          <div className="splash-screen__divider" />
          <p>Intelligent Justice</p>
          <div className="splash-screen__divider" />
        </div>

        <div className="splash-screen__line splash-screen__line--load">
          <div className="splash-screen__divider" />
          <p>Ładowanie systemu</p>
          <div className="splash-screen__divider" />
        </div>
      </div>
    </div>
  );
};
