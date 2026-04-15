import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  Cpu,
  Scale,
  Database,
  ShieldCheck,
  Zap,
  Network,
  Lock,
  Fingerprint,
  Activity,
  Globe,
  MessageSquare,
  HardDrive,
  GitBranch,
  Search,
} from "lucide-react";

const GOLD = "#d4af37";
const GOLD_BRIGHT = "#f9e29d";

interface NodeDef {
  id: string;
  x: number; // percentage
  y: number; // percentage
  size: number;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  isCenter?: boolean;
}

const NODE_DATA: NodeDef[] = [
  // Top center area (between HeroSection and LoginPortal)
  {
    id: "center",
    x: 45,
    y: 58,
    size: 85,
    icon: Cpu,
    label: "Consensus Engine",
    sublabel: "Final Decision",
    isCenter: true,
  },
  {
    id: "n2",
    x: 72,
    y: 20,
    size: 50,
    icon: Brain,
    label: "Neural Core A",
    sublabel: "Logic Layer",
  },

  // Upper middle area
  {
    id: "n6",
    x: 35,
    y: 38,
    size: 50,
    icon: ShieldCheck,
    label: "Weryfikacja",
    sublabel: "Zero Hallucynacji",
  },
  {
    id: "n5",
    x: 52,
    y: 42,
    size: 46,
    icon: Scale,
    label: "Synteza Prawa",
    sublabel: "Evaluation",
  },
  {
    id: "n9",
    x: 72,
    y: 38,
    size: 46,
    icon: Activity,
    label: "Monitorowanie",
    sublabel: "Real-time Pulse",
  },

  // Left column
  {
    id: "n12",
    x: 22,
    y: 45,
    size: 46,
    icon: MessageSquare,
    label: "Komunikacja",
    sublabel: "NLP Core",
  },
  {
    id: "n7",
    x: 8,
    y: 60,
    size: 48,
    icon: Lock,
    label: "Bezpieczeństwo",
    sublabel: "AES-256",
  },
  {
    id: "n1",
    x: 15,
    y: 75,
    size: 52,
    icon: Database,
    label: "Agentic RAG",
    sublabel: "Legal Vault",
  },

  // Center area
  {
    id: "n3",
    x: 42,
    y: 45,
    size: 48,
    icon: Zap,
    label: "Neural Core B",
    sublabel: "Context Sync",
  },
  {
    id: "n10",
    x: 58,
    y: 62,
    size: 48,
    icon: Network,
    label: "Analiza Ryzyka",
    sublabel: "Pre-processing",
  },
  {
    id: "n14",
    x: 48,
    y: 75,
    size: 46,
    icon: GitBranch,
    label: "Rozumowanie",
    sublabel: "Chain of Thought",
  },

  // Right column (above LoginPortal)
  {
    id: "n13",
    x: 65,
    y: 50,
    size: 44,
    icon: HardDrive,
    label: "Pamięć",
    sublabel: "Vector Store",
  },
  {
    id: "n8",
    x: 68,
    y: 65,
    size: 48,
    icon: Fingerprint,
    label: "Tożsamość",
    sublabel: "Biometric Auth",
  },
  {
    id: "n11",
    x: 72,
    y: 78,
    size: 48,
    icon: Globe,
    label: "Dostępność",
    sublabel: "Global Reach",
  },

  // Bottom area - above ticker
  {
    id: "n15",
    x: 30,
    y: 82,
    size: 48,
    icon: Search,
    label: "Research",
    sublabel: "Discovery Engine",
  },
];

const NodeItem = React.memo(({
  node,
  vp,
  index,
  onHoverChange,
}: {
  node: NodeDef;
  vp: { w: number; h: number };
  index: number;
  onHoverChange: (id: string | null) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = node.icon;
  const { size, isCenter, x, y } = node;
  const px = (x / 100) * vp.w;
  const py = (y / 100) * vp.h;
  const floatDelay = index * 0.3;
  const floatDuration = 4 + (index % 3);

  return (
    <div
      onMouseEnter={() => {
        setIsHovered(true);
        onHoverChange(node.id);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHoverChange(null);
      }}
      style={{
        position: "absolute",
        left: px,
        top: py,
        zIndex: isHovered ? 100 : (isCenter ? 5 : 4),
        pointerEvents: "auto",
        cursor: "pointer",
        transform: `translate(-50%, ${isHovered ? "-85%" : "-50%"}) scale(${isHovered ? 1.85 : 1}) rotate(${isHovered ? "-10deg" : "0deg"})`,
        animation: isHovered ? "none" : `nodeFloat ${floatDuration}s ease-in-out ${floatDelay}s infinite`,
        transition: "transform 0.45s cubic-bezier(0.2, 1.25, 0.45, 1), z-index 0.3s",
      }}
    >
      {/* Background Aura */}
      <div
        style={{
          position: "absolute",
          width: size + 100,
          height: size + 100,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: isHovered
            ? "radial-gradient(circle, rgba(212,175,55,0.45) 0%, transparent 70%)"
            : (isCenter
              ? "radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)"),
          filter: (isHovered || isCenter) ? "blur(18px)" : "blur(8px)",
          transition: "background 0.35s, filter 0.35s",
        }}
      />

      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: (isHovered || isCenter)
            ? "linear-gradient(135deg, rgba(212,175,55,0.3) 0%, rgba(212,175,55,0.15) 50%, rgba(212,175,55,0.05) 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 100%)",
          border: (isHovered || isCenter)
            ? `2px solid ${GOLD}`
            : "1px solid rgba(255,255,255,0.25)",
          boxShadow: (isHovered || isCenter)
            ? `0 0 50px rgba(212,175,55,0.6), inset 0 1px 0 0 rgba(220,180,60,0.4), inset 0 -1px 0 0 rgba(212,175,55,0.2)`
            : "0 4px 25px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(255,255,255,0.15), inset 0 -1px 0 0 rgba(255,255,255,0.08)",
          transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <Icon
          style={{
            width: size * 0.4,
            height: size * 0.4,
            color: (isHovered || isCenter) ? GOLD_BRIGHT : "rgba(255,255,255,0.85)",
            strokeWidth: (isHovered || isCenter) ? 2.0 : 1.4,
            filter: isHovered ? `drop-shadow(0 0 8px ${GOLD})` : "none",
            transition: "all 0.35s ease",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: size / 2 + 15,
          left: "50%",
          transform: "translateX(-50%)",
          width: 140,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: isCenter ? 9 : 8,
            fontFamily: "Inter, sans-serif",
            fontWeight: 900,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: (isHovered || isCenter) ? "#fff" : "rgba(255,255,255,0.7)",
            margin: 0,
            textShadow: (isHovered || isCenter) ? "0 0 10px rgba(255,255,255,0.5)" : "0 2px 4px rgba(0,0,0,0.5)",
            transition: "all 0.3s ease",
          }}
        >
          {node.label}
        </p>
        <p
          style={{
            fontSize: 7,
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: GOLD,
            marginTop: 2,
            opacity: 0.8,
          }}
        >
          {node.sublabel}
        </p>
      </div>
    </div>
  );
});

export default function NeuralNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [vp, setVp] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 1440,
    h: typeof window !== "undefined" ? window.innerHeight : 900,
  });

  useEffect(() => {
    const handleResize = () =>
      setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handleResize);
    
    // Intersection Observer to pause animation
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, []);

  const connections = useMemo(() => {
    const list: [number, number][] = [];
    const used = new Set<string>();

    NODE_DATA.forEach((n1, i) => {
      const neighbors = NODE_DATA.map((n2, j) => ({
        index: j,
        dist: Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2),
      }))
        .filter((n) => n.index !== i)
        .sort((a, b) => a.dist - b.dist);

      neighbors.slice(0, 3).forEach((n2) => { // Reduced from 5 to 3 nearest
        const key = [i, n2.index].sort().join("-");
        if (!used.has(key)) {
          list.push([i, n2.index]);
          used.add(key);
        }
      });
    });
    return list;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      time += 0.02;
      const w = (canvas.width = window.innerWidth);
      const h = (canvas.height = window.innerHeight);
      ctx.clearRect(0, 0, w, h);

      connections.forEach(([i, j], connIdx) => {
        const n1 = NODE_DATA[i];
        const n2 = NODE_DATA[j];
        
        const x1 = (n1.x / 100) * w;
        let y1 = (n1.y / 100) * h;
        const x2 = (n2.x / 100) * w;
        let y2 = (n2.y / 100) * h;

        if (hoveredId === n1.id) y1 -= 25;
        if (hoveredId === n2.id) y2 -= 25;

        const phaseOffset = connIdx * 2.39996;
        const cycleDuration = 20.0 + (connIdx % 8) * 3.5; // Slower cycles
        const cycleTime = ((time + phaseOffset) % cycleDuration) / cycleDuration;
        const pulseWindow = 1.2 / cycleDuration;
        const isActive = cycleTime < pulseWindow;
        const pulseIntensity = isActive ? Math.pow(1 - (cycleTime / pulseWindow), 0.5) : 0;

        const lineOpacity = 0.2 + Math.sin(time + (i + j)) * 0.05 + (pulseIntensity * 0.4);
        
        // Static connections (cheaper)
        ctx.beginPath();
        ctx.strokeStyle = `rgba(212,175,55,${lineOpacity})`;
        ctx.lineWidth = 0.5;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
 
        if (isActive) {
          const pulsePos = cycleTime / pulseWindow;
          const px = x1 + (x2 - x1) * pulsePos;
          const py = y1 + (y2 - y1) * pulsePos;

          // Reduced complexity for pulses
          ctx.save();
          ctx.shadowColor = "rgba(212,175,55,0.6)";
          ctx.shadowBlur = 0;
          
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.fill();

          ctx.restore();
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [connections, hoveredId, isVisible]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, opacity: 0.4 }}
      />
      {NODE_DATA.map((node, index) => (
        <NodeItem 
          key={node.id} 
          node={node} 
          vp={vp} 
          index={index} 
          onHoverChange={setHoveredId}
        />
      ))}
    </div>
  );
}
