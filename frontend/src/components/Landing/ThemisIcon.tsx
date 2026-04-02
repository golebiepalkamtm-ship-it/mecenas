 
interface ThemisIconProps {
  className?: string;
}

const ThemisIcon = ({ className }: ThemisIconProps) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_20px_rgba(212,175,55,0.4)]"
      >
        {/* Outer Circular Frame */}
        <circle
          cx="100"
          cy="90"
          r="85"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          className="opacity-40"
        />
        <circle cx="100" cy="90" r="80" stroke="currentColor" strokeWidth="3" />

        {/* Inner Decorative Circle with Leaves/Patterns */}
        <circle
          cx="100"
          cy="90"
          r="72"
          stroke="currentColor"
          strokeWidth="1"
          className="opacity-60"
        />

        {/* Lady Justice (Themis) Silhouette */}
        <g transform="translate(75, 45) scale(0.5)">
          {/* Main Body/Robes */}
          <path
            d="M50 10 C45 10 40 15 40 25 L40 40 L35 80 C35 90 40 110 50 120 C60 110 65 90 65 80 L60 40 L60 25 C60 15 55 10 50 10Z"
            fill="currentColor"
            className="opacity-90"
          />
          {/* Blindfold and Head */}
          <circle cx="50" cy="20" r="8" fill="currentColor" />
          <rect
            x="42"
            y="18"
            width="16"
            height="3"
            fill="black"
            className="opacity-40"
          />

          {/* Sword behind */}
          <path
            d="M65 30 L85 10 M82 13 L88 7"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>

        {/* Scales Structure */}
        <g transform="translate(100, 90)">
          {/* Horizontal Beam */}
          <path
            d="M-65 -45 L65 -45"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Ornaments on Beam Ends */}
          <circle cx="-65" cy="-45" r="3" fill="currentColor" />
          <circle cx="65" cy="-45" r="3" fill="currentColor" />

          {/* Left Scale Plate */}
          <g transform="translate(-65, -45)">
            <path
              d="M0 0 L-15 45 M0 0 L15 45"
              stroke="currentColor"
              strokeWidth="1"
              className="opacity-60"
            />
            <path
              d="M-20 45 C-20 55 20 55 20 45 Z"
              fill="currentColor"
              className="opacity-40"
            />
            <path d="M-20 45 L20 45" stroke="currentColor" strokeWidth="2" />
          </g>

          {/* Right Scale Plate */}
          <g transform="translate(65, -45)">
            <path
              d="M0 0 L-15 45 M0 0 L15 45"
              stroke="currentColor"
              strokeWidth="1"
              className="opacity-60"
            />
            <path
              d="M-20 45 C-20 55 20 55 20 45 Z"
              fill="currentColor"
              className="opacity-40"
            />
            <path d="M-20 45 L20 45" stroke="currentColor" strokeWidth="2" />
          </g>
        </g>

        {/* Laurel Wreath Silhouettes at the bottom */}
        <g className="opacity-50">
          <path
            d="M30 140 Q50 130 70 145"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M130 145 Q150 130 170 140"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </g>

        {/* Base Pedestal */}
        <path
          d="M60 160 L140 160 L145 168 L55 168 Z"
          fill="currentColor"
          className="opacity-30"
        />
        <rect x="65" y="160" width="70" height="2" fill="currentColor" />
      </svg>
    </div>
  );
};

export default ThemisIcon;
