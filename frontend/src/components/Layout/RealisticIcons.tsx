import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

type IconComponent = React.ComponentType<IconProps>;

// Helper drop shadow filter for 3D elements
const DropShadowFilter = () => (
  <filter id="icon-3d-shadow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000" floodOpacity="0.35" />
  </filter>
);

// 1. Czat (Chat) - Volumetric overlapping speech bubbles with specular highlights
export const ChatIcon: IconComponent = ({ className, style, size = 24, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    width={size}
    height={size}
    {...props}
  >
    <defs>
      <DropShadowFilter />
      <linearGradient id="chat-3d-primary-ext" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <linearGradient id="chat-3d-primary" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="chat-3d-secondary-ext" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#6d28d9" />
      </linearGradient>
      <linearGradient id="chat-3d-secondary" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    
    {/* Secondary Bubble (Back) with 3D Extrusion */}
    <g filter="url(#icon-3d-shadow)">
      {/* Extrusion */}
      <path
        d="M15 10c0-2.8-2.2-5-5-5S5 7.2 5 10c0 1.2.4 2.3 1.1 3.2L5 16l3.2-1.1c.8.4 1.7.6 2.8.6 2.8 0 5-2.2 5-5z"
        fill="url(#chat-3d-secondary-ext)"
        transform="translate(0.5, 0.5)"
      />
      {/* Front Face */}
      <path
        d="M15 10c0-2.8-2.2-5-5-5S5 7.2 5 10c0 1.2.4 2.3 1.1 3.2L5 16l3.2-1.1c.8.4 1.7.6 2.8.6 2.8 0 5-2.2 5-5z"
        fill="url(#chat-3d-secondary)"
      />
      {/* Glossy sheen */}
      <path
        d="M6 8.5c.3-1.2 1.2-2 2.5-2 .5 0 .8.1 1.2.2-.6-.5-1.4-.7-2.2-.7-1.8 0-3.2 1.4-3.2 3.2 0 .5.1.9.3 1.3.2-.7.6-1.4 1.2-2z"
        fill="#ffffff"
        opacity="0.25"
      />
    </g>

    {/* Primary Bubble (Front) with 3D Extrusion */}
    <g filter="url(#icon-3d-shadow)">
      {/* Extrusion */}
      <path
        d="M20 13c0-3.3-2.7-6-6-6s-6 2.7-6 6c0 1.4.5 2.7 1.3 3.7L8 20.5l4-1.2c.6.4 1.3.7 2 .7 3.3 0 6-2.7 6-6z"
        fill="url(#chat-3d-primary-ext)"
        transform="translate(0.6, 0.8)"
      />
      {/* Front Face */}
      <path
        d="M20 13c0-3.3-2.7-6-6-6s-6 2.7-6 6c0 1.4.5 2.7 1.3 3.7L8 20.5l4-1.2c.6.4 1.3.7 2 .7 3.3 0 6-2.7 6-6z"
        fill="url(#chat-3d-primary)"
      />
      {/* Glossy sheen */}
      <path
        d="M9.2 11.2c.4-1.6 1.8-2.7 3.5-2.7.7 0 1.3.2 1.8.5-.9-.7-2.1-1-3.2-1-2.8 0-5 2.2-5 5 0 .7.1 1.4.4 2 .3-1.1.9-2.2 2.5-3.8z"
        fill="#ffffff"
        opacity="0.3"
      />
    </g>
    
    {/* Inside dots with subtle 3D shading */}
    <circle cx="11.5" cy="13.5" r="0.8" fill="#0369a1" opacity="0.4" />
    <circle cx="11.5" cy="13" r="0.8" fill="#ffffff" />
    <circle cx="14" cy="13.5" r="0.8" fill="#0369a1" opacity="0.4" />
    <circle cx="14" cy="13" r="0.8" fill="#ffffff" />
    <circle cx="16.5" cy="13.5" r="0.8" fill="#0369a1" opacity="0.4" />
    <circle cx="16.5" cy="13" r="0.8" fill="#ffffff" />
  </svg>
);
ChatIcon.displayName = "ChatIcon";

// 2. Sala rozprawy (Trial Room) - 3D Scales of justice with thick base and metallic sheen
export const TrialRoomIcon: IconComponent = ({ className, style, size = 24, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    width={size}
    height={size}
    {...props}
  >
    <defs>
      <DropShadowFilter />
      <linearGradient id="scale-3d-gold-light" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#eab308" />
      </linearGradient>
      <linearGradient id="scale-3d-gold-dark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ca8a04" />
        <stop offset="100%" stopColor="#854d0e" />
      </linearGradient>
      <linearGradient id="scale-3d-bronze" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="scale-3d-stone" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#78716c" />
        <stop offset="100%" stopColor="#292524" />
      </linearGradient>
    </defs>

    <g filter="url(#icon-3d-shadow)">
      {/* 3D Base Side (Extrusion) */}
      <path d="M2.5 19h19v2.5H2.5V19z" fill="#1c1917" />
      {/* 3D Base Top */}
      <path d="M2.5 18.5h19v0.8H2.5v-0.8z" fill="url(#scale-3d-stone)" />
      
      {/* Pillar base extrusion */}
      <path d="M9 18.5h6v1H9v-1z" fill="url(#scale-3d-gold-dark)" />
      <path d="M9.5 17.5h5L15 18.5H9l.5-1z" fill="url(#scale-3d-gold-light)" />

      {/* Main Pillar Column */}
      <rect x="11.5" y="4.5" width="1.2" height="13.5" rx="0.3" fill="url(#scale-3d-gold-dark)" />
      <rect x="11" y="4" width="1.2" height="13.5" rx="0.3" fill="url(#scale-3d-gold-light)" />
      
      {/* Top sphere sphere */}
      <circle cx="11.6" cy="3.6" r="1.3" fill="url(#scale-3d-gold-dark)" />
      <circle cx="11" cy="3" r="1.3" fill="url(#scale-3d-gold-light)" />

      {/* 3D Balance Beam */}
      <path d="M4 6.3h16V7H4v-.7z" fill="url(#scale-3d-gold-dark)" />
      <path d="M4 5.5h16v0.8H4V5.5z" fill="url(#scale-3d-gold-light)" />

      {/* Left Hanging Cords */}
      <path d="M6 6.3L3.5 12.5h5L6 6.3z" stroke="#475569" strokeWidth="0.8" fill="none" />
      {/* Left Pan */}
      <path d="M3.2 12.5h5.6c0 1.8-1.3 2.7-2.8 2.7s-2.8-.9-2.8-2.7z" fill="#b45309" />
      <path d="M3 12c0 1.8 1.3 2.7 2.8 2.7s2.8-.9 2.8-2.7H3z" fill="url(#scale-3d-bronze)" />
      {/* Left Pan rim highlight */}
      <ellipse cx="5.8" cy="12" rx="2.8" ry="0.4" fill="#fef08a" opacity="0.6" />

      {/* Right Hanging Cords */}
      <path d="M18 6.3L15.5 12.5h5L18 6.3z" stroke="#475569" strokeWidth="0.8" fill="none" />
      {/* Right Pan */}
      <path d="M15.2 12.5h5.6c0 1.8-1.3 2.7-2.8 2.7s-2.8-.9-2.8-2.7z" fill="#b45309" />
      <path d="M15 12c0 1.8 1.3 2.7 2.8 2.7s2.8-.9 2.8-2.7H15z" fill="url(#scale-3d-bronze)" />
      {/* Right Pan rim highlight */}
      <ellipse cx="17.8" cy="12" rx="2.8" ry="0.4" fill="#fef08a" opacity="0.6" />
    </g>
  </svg>
);
TrialRoomIcon.displayName = "TrialRoomIcon";

// 3. Kreator Pism (Drafter) - Floating paper document with folded corner and cylindrical 3D fountain pen
export const DrafterIcon: IconComponent = ({ className, style, size = 24, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    width={size}
    height={size}
    {...props}
  >
    <defs>
      <DropShadowFilter />
      <linearGradient id="drafter-paper-3d" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f5f5f4" />
      </linearGradient>
      {/* Cylindrical shading gradient for 3D pen */}
      <linearGradient id="drafter-pen-metal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7c2d12" />
        <stop offset="30%" stopColor="#ea580c" />
        <stop offset="50%" stopColor="#ffedd5" />
        <stop offset="70%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#431407" />
      </linearGradient>
      <linearGradient id="drafter-pen-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a16207" />
        <stop offset="50%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#713f12" />
      </linearGradient>
    </defs>

    <g filter="url(#icon-3d-shadow)">
      {/* Paper Extrusion */}
      <rect x="3.5" y="3.5" width="13" height="18" rx="1.5" fill="#e2e8f0" />
      {/* Paper Main Face */}
      <rect x="3" y="3" width="13" height="18" rx="1.5" fill="url(#drafter-paper-3d)" stroke="#fff" strokeWidth="0.5" />
      
      {/* Text line representations */}
      <line x1="5.5" y1="7.5" x2="13.5" y2="7.5" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="10.5" x2="13.5" y2="10.5" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="13.5" x2="11.5" y2="13.5" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="16.5" x2="9.5" y2="16.5" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
      
      {/* Corner Fold details */}
      <path d="M13.5 3h2.5v2.5L13.5 3z" fill="#cbd5e1" />
      <path d="M13.5 3l2.5 2.5h-2.5V3z" fill="#f8fafc" />

      {/* Fountain Pen 3D Body */}
      <path
        d="M13.5 18.5l1.5-3.5 6.5-6.5c0.8-0.8 2-0.8 2.8 0s0.8 2 0 2.8l-6.5 6.5-4.3.7z"
        fill="url(#drafter-pen-metal)"
      />
      {/* Pen Nib */}
      <path d="M13.5 18.5l2.2-0.8-1.4-1.4-0.8 2.2z" fill="url(#drafter-pen-gold)" />
      <line x1="13.5" y1="18.5" x2="15.2" y2="16.8" stroke="#431407" strokeWidth="0.6" />
    </g>
  </svg>
);
DrafterIcon.displayName = "DrafterIcon";

// 4. Orzecznictwo (Judgments) - 3D Gavel on Sound Block with cylindrical wooden texture shading
export const JudgmentsIcon: IconComponent = ({ className, style, size = 24, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    width={size}
    height={size}
    {...props}
  >
    <defs>
      <DropShadowFilter />
      <linearGradient id="gavel-wood-3d-ext" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#431407" />
        <stop offset="100%" stopColor="#1a0500" />
      </linearGradient>
      <linearGradient id="gavel-wood-3d-light" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#c2410c" />
        <stop offset="50%" stopColor="#9a3412" />
        <stop offset="100%" stopColor="#7c2d12" />
      </linearGradient>
      <linearGradient id="gavel-wood-cylinder" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7c2d12" />
        <stop offset="40%" stopColor="#b91c1c" />
        <stop offset="60%" stopColor="#f87171" opacity="0.6" />
        <stop offset="80%" stopColor="#7c2d12" />
        <stop offset="100%" stopColor="#431407" />
      </linearGradient>
      <linearGradient id="gavel-gold-3d" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#854d0e" />
      </linearGradient>
    </defs>

    <g filter="url(#icon-3d-shadow)">
      {/* Sound Block 3D base */}
      <path d="M11.5 18h9v3c0 1.5-2 2.5-4.5 2.5s-4.5-1-4.5-2.5v-3z" fill="url(#gavel-wood-3d-ext)" />
      <ellipse cx="16" cy="18" rx="4.5" ry="1.5" fill="url(#gavel-wood-3d-light)" stroke="#ea580c" strokeWidth="0.5" />
      
      {/* Gavel Handle 3D rod */}
      <path
        d="M4.5 19.5l8.5-8.5c0.4-0.4 1-0.4 1.4 0s0.4 1 0 1.4l-8.5 8.5c-0.4 0.4-1 .4-1.4 0s-.4-1 0-1.4z"
        fill="url(#gavel-wood-3d-ext)"
        transform="translate(0.5, 0.5)"
      />
      <path
        d="M4.5 19.5l8.5-8.5c0.4-0.4 1-0.4 1.4 0s0.4 1 0 1.4l-8.5 8.5c-0.4 0.4-1 .4-1.4 0s-.4-1 0-1.4z"
        fill="url(#gavel-wood-3d-light)"
      />
      <circle cx="5" cy="20" r="0.8" fill="url(#gavel-gold-3d)" />

      {/* Gavel Head cylinder - wood texture gradient */}
      <path
        d="M10.5 7.5l4.5 4.5-2.5 2.5-4.5-4.5 2.5-2.5z"
        fill="url(#gavel-wood-cylinder)"
        stroke="url(#gavel-wood-3d-ext)"
        strokeWidth="0.5"
      />
      
      {/* Gavel Head Rings (Gold specular detail) */}
      <path d="M12.1 9.1l1.1 1.1-0.7 0.7-1.1-1.1 0.7-0.7z" fill="url(#gavel-gold-3d)" />
      <path d="M13.5 7.7l0.8 0.8-0.5 0.5-0.8-0.8 0.5-0.5z" fill="url(#gavel-gold-3d)" />
      <path d="M9.7 11.5l0.8 0.8-0.5 0.5-0.8-0.8 0.5-0.5z" fill="url(#gavel-gold-3d)" />
    </g>
  </svg>
);
JudgmentsIcon.displayName = "JudgmentsIcon";

// 5. Dokumentacja (Documents) - 3D tabbed folder with papers sticking out and extruded bottom fold
export const DocumentsIcon: IconComponent = ({ className, style, size = 24, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    width={size}
    height={size}
    {...props}
  >
    <defs>
      <DropShadowFilter />
      <linearGradient id="folder-3d-back" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
      <linearGradient id="folder-3d-front" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>

    <g filter="url(#icon-3d-shadow)">
      {/* Folder Back cover */}
      <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2H4V6z" fill="url(#folder-3d-back)" />
      
      {/* 3D Paper sheets sticking out */}
      <rect x="6.5" y="5.5" width="12" height="10" rx="1" fill="#cbd5e1" />
      <rect x="6" y="5" width="12" height="10" rx="1" fill="#ffffff" />
      <line x1="8" y1="8" x2="16" y2="8" stroke="#94a3b8" strokeWidth="0.9" />
      <line x1="8" y1="10.5" x2="14" y2="10.5" stroke="#94a3b8" strokeWidth="0.9" />
      
      {/* Folder Front cover extrusion */}
      <path
        d="M2 9.5A1.5 1.5 0 0 1 3.5 8h5l2 2h10A1.5 1.5 0 0 1 22 11.5v8H2v-10z"
        fill="#b45309"
        transform="translate(0, 0.8)"
      />
      {/* Folder Front cover main face */}
      <path
        d="M2 9.5A1.5 1.5 0 0 1 3.5 8h5l2 2h10A1.5 1.5 0 0 1 22 11.5v8H2v-10z"
        fill="url(#folder-3d-front)"
      />
      {/* Specular light line on the top folder border */}
      <path
        d="M2 9.5A1.5 1.5 0 0 1 3.5 8h5l2 2"
        stroke="#fef08a"
        strokeWidth="0.6"
        fill="none"
        opacity="0.75"
      />
    </g>
  </svg>
);
DocumentsIcon.displayName = "DocumentsIcon";

// 6. Prompty (Prompts) - 3D Multi-faceted Diamond Stars with light and shadow halves
export const PromptsIcon: IconComponent = ({ className, style, size = 24, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    width={size}
    height={size}
    {...props}
  >
    <defs>
      <DropShadowFilter />
    </defs>
    
    <g filter="url(#icon-3d-shadow)">
      {/* Large Star (Gold/Yellow 3D facets) centered at 10,7 */}
      {/* Top Left */}
      <polygon points="10,2 10,7 8,5" fill="#fef08a" />
      {/* Top Right */}
      <polygon points="10,2 12,5 10,7" fill="#eab308" />
      {/* Right Top */}
      <polygon points="15,7 10,7 12,5" fill="#fef08a" />
      {/* Right Bottom */}
      <polygon points="15,7 12,9 10,7" fill="#ca8a04" />
      {/* Bottom Right */}
      <polygon points="10,12 10,7 12,9" fill="#eab308" />
      {/* Bottom Left */}
      <polygon points="10,12 8,9 10,7" fill="#a16207" />
      {/* Left Bottom */}
      <polygon points="5,7 10,7 8,9" fill="#ca8a04" />
      {/* Left Top */}
      <polygon points="5,7 8,5 10,7" fill="#fef08a" />
      
      {/* Medium Star (Purple 3D facets) centered at 18,14.5 */}
      {/* Top Left */}
      <polygon points="18,11 18,14.5 16.5,13" fill="#e9d5ff" />
      {/* Top Right */}
      <polygon points="18,11 19.5,13 18,14.5" fill="#c084fc" />
      {/* Right Top */}
      <polygon points="21.5,14.5 18,14.5 19.5,13" fill="#e9d5ff" />
      {/* Right Bottom */}
      <polygon points="21.5,14.5 19.5,16 18,14.5" fill="#a855f7" />
      {/* Bottom Right */}
      <polygon points="18,18 18,14.5 19.5,16" fill="#c084fc" />
      {/* Bottom Left */}
      <polygon points="18,18 16.5,16 18,14.5" fill="#7e22ce" />
      {/* Left Bottom */}
      <polygon points="14.5,14.5 18,14.5 16.5,16" fill="#a855f7" />
      {/* Left Top */}
      <polygon points="14.5,14.5 16.5,13 18,14.5" fill="#e9d5ff" />
      
      {/* Small Star (Cyan 3D facets) centered at 5.5,15.5 */}
      {/* Top Left */}
      <polygon points="5.5,13 5.5,15.5 4.5,14.5" fill="#cffafe" />
      {/* Top Right */}
      <polygon points="5.5,13 6.5,14.5 5.5,15.5" fill="#22d3ee" />
      {/* Right Top */}
      <polygon points="8,15.5 5.5,15.5 6.5,14.5" fill="#cffafe" />
      {/* Right Bottom */}
      <polygon points="8,15.5 6.5,16.5 5.5,15.5" fill="#0891b2" />
      {/* Bottom Right */}
      <polygon points="5.5,18 5.5,15.5 6.5,16.5" fill="#22d3ee" />
      {/* Bottom Left */}
      <polygon points="5.5,18 4.5,16.5 5.5,15.5" fill="#0369a1" />
      {/* Left Bottom */}
      <polygon points="3,15.5 5.5,15.5 4.5,16.5" fill="#0891b2" />
      {/* Left Top */}
      <polygon points="3,15.5 4.5,14.5 5.5,15.5" fill="#cffafe" />
    </g>
  </svg>
);
PromptsIcon.displayName = "PromptsIcon";

// 7. Baza Wiedzy (Knowledge) - 3D open book with realistic leather cover and curved 3D paper pages
export const KnowledgeIcon: IconComponent = ({ className, style, size = 24, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    width={size}
    height={size}
    {...props}
  >
    <defs>
      <DropShadowFilter />
      <linearGradient id="book-3d-cover-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#059669" />
        <stop offset="100%" stopColor="#064e3b" />
      </linearGradient>
      <linearGradient id="book-3d-page-left" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="25%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
      <linearGradient id="book-3d-page-right" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="75%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
    </defs>

    <g filter="url(#icon-3d-shadow)">
      {/* Leather Book Cover Extrusion */}
      <path d="M12 19.3c-2.2-1.5-5.5-1.5-8.5-1.5v0.5c3 0 6.3 0 8.5 1z" fill="#022c22" />
      <path d="M12 19.3c2.2-1.5 5.5-1.5 8.5-1.5v0.5c-3 0-6.3 0-8.5 1z" fill="#022c22" />

      {/* Book Cover Face */}
      <path d="M12 18.5c-2.2-1.5-5.5-1.5-8.5-1.5V4c3 0 6.3 0 8.5 1.5v13z" fill="url(#book-3d-cover-grad)" />
      <path d="M12 18.5c2.2-1.5 5.5-1.5 8.5-1.5V4c-3 0-6.3 0-8.5 1.5v13z" fill="url(#book-3d-cover-grad)" />
      
      {/* 3D Curved Book Pages (Left) */}
      <path d="M12 17.5c-2-1.5-5-1.5-8-1.5V4.5c3 0 6 0 8 1.5v11.5z" fill="url(#book-3d-page-left)" stroke="#cbd5e1" strokeWidth="0.5" />
      {/* 3D Curved Book Pages (Right) */}
      <path d="M12 17.5c2-1.5 5-1.5 8-1.5V4.5c-3 0-6 0-8 1.5v11.5z" fill="url(#book-3d-page-right)" stroke="#cbd5e1" strokeWidth="0.5" />
      
      {/* Text lines (Left page) */}
      <line x1="5.5" y1="7.5" x2="10.2" y2="7.5" stroke="#94a3b8" strokeWidth="0.8" opacity="0.8" />
      <line x1="5.5" y1="10" x2="10.2" y2="10" stroke="#94a3b8" strokeWidth="0.8" opacity="0.8" />
      <line x1="5.5" y1="12.5" x2="9.2" y2="12.5" stroke="#94a3b8" strokeWidth="0.8" opacity="0.8" />
      
      {/* Text lines (Right page) */}
      <line x1="13.8" y1="7.5" x2="18.5" y2="7.5" stroke="#94a3b8" strokeWidth="0.8" opacity="0.8" />
      <line x1="13.8" y1="10" x2="18.5" y2="10" stroke="#94a3b8" strokeWidth="0.8" opacity="0.8" />
      <line x1="13.8" y1="12.5" x2="17.5" y2="12.5" stroke="#94a3b8" strokeWidth="0.8" opacity="0.8" />
      
      {/* 3D Golden Bookmark Ribbon */}
      <path d="M11.5 5.5v11.8l1-1.3 1 1.3V5.5h-2z" fill="#d97706" />
      <path d="M11.5 5.5v11.5l1-1.3 1 1.3V5.5h-2z" fill="#fbbf24" />
    </g>
  </svg>
);
KnowledgeIcon.displayName = "KnowledgeIcon";

// 8. Profil (Profile/Settings) - Glossy Chrome Token with 3D shadow and specular lens flare
export const ProfilIcon: IconComponent = ({ className, style, size = 24, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    width={size}
    height={size}
    {...props}
  >
    <defs>
      <DropShadowFilter />
      <linearGradient id="profile-3d-chrome" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="30%" stopColor="#cbd5e1" />
        <stop offset="70%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
      <linearGradient id="profile-3d-blue" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>

    <g filter="url(#icon-3d-shadow)">
      {/* 3D Chrome Token Rim */}
      <circle cx="12" cy="12" r="10" fill="url(#profile-3d-chrome)" />
      {/* Lens Inner cut */}
      <circle cx="12" cy="12" r="8.5" fill="#f1f5f9" />
      
      {/* User Silhouette - Head & Shoulders */}
      <g>
        <circle cx="12" cy="9.2" r="3" fill="url(#profile-3d-blue)" />
        <path d="M5.8 17.2C5.8 14.8 8.5 13 12 13s6.2 1.8 6.2 4.2V19H5.8v-1.8z" fill="url(#profile-3d-blue)" />
      </g>
      
      {/* Glossy highlight/lens reflection */}
      <path
        d="M3.5 12A8.5 8.5 0 0 1 12 3.5c3.5 0 6.5 2.1 7.8 5.2-1.2-3.1-4.2-5.2-7.8-5.2C7.3 3.5 3.8 7.3 3.5 12z"
        fill="#ffffff"
        opacity="0.6"
      />
    </g>
  </svg>
);
ProfilIcon.displayName = "ProfilIcon";

// 9. Panel Admina (Admin) - Extruded security shield with metallic gold frame and 3D checkmark
export const AdminIcon: IconComponent = ({ className, style, size = 24, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    width={size}
    height={size}
    {...props}
  >
    <defs>
      <DropShadowFilter />
      <linearGradient id="shield-3d-gold-light" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <linearGradient id="shield-3d-blue-inner" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
      <linearGradient id="shield-3d-check" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#15803d" />
      </linearGradient>
    </defs>

    <g filter="url(#icon-3d-shadow)">
      {/* 3D Shield Border Extrusion (Gold depth) */}
      <path
        d="M12 21.5s7.5-3.8 7.5-9.5V5.5L12 2.5 4.5 5.5v6.5c0 5.7 7.5 9.5 7.5 9.5z"
        fill="#854d0e"
        transform="translate(0, 0.8)"
      />
      {/* Shield Border Front Face */}
      <path
        d="M12 21.5s7.5-3.8 7.5-9.5V5.5L12 2.5 4.5 5.5v6.5c0 5.7 7.5 9.5 7.5 9.5z"
        fill="url(#shield-3d-gold-light)"
      />
      {/* Inner Recessed blue shield */}
      <path
        d="M12 19s5.8-3 5.8-7.8V7l-5.8-2.4L6.2 7v4.2c0 4.8 5.8 7.8 5.8 7.8z"
        fill="url(#shield-3d-blue-inner)"
      />
      
      {/* Specular Shield highlight */}
      <path
        d="M6.2 7l5.8-2.4V19c0-.2-.1-.2-.2-.3-4.8-2.8-5.6-5.8-5.6-9.5V7z"
        fill="#ffffff"
        opacity="0.15"
      />
      
      {/* 3D checkmark shadow */}
      <path
        d="M9 11.5l2 2 4-4"
        stroke="#000000"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
        transform="translate(0.5, 0.8)"
      />
      {/* 3D Checkmark */}
      <path
        d="M9 11.5l2 2 4-4"
        stroke="url(#shield-3d-check)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);
AdminIcon.displayName = "AdminIcon";

export const realisticIconMap: Record<string, IconComponent> = {
  chat: ChatIcon,
  trial: TrialRoomIcon,
  drafter: DrafterIcon,
  judgments: JudgmentsIcon,
  documents: DocumentsIcon,
  prompts: PromptsIcon,
  knowledge: KnowledgeIcon,
  settings: ProfilIcon,
  admin: AdminIcon,
};
