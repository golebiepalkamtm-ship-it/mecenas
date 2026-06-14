import { memo, useEffect, useMemo, useRef, useState, forwardRef, type ElementType } from "react";
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
  MessageCircle,
  HardDrive,
  GitBranch,
  Search,
} from "lucide-react";

const GOLD = "#d4af37";
const GOLD_BRIGHT = "#f9e29d";

interface NodeDef {
  id: string;
  x: number;
  y: number;
  size: number;
  icon: ElementType;
  label: string;
  sublabel: string;
  isCenter?: boolean;
}

const NODE_DATA: NodeDef[] = [
  { id: "center", x: 45, y: 50, size: 180, icon: Cpu, label: "Consensus Engine", sublabel: "Final Decision", isCenter: true },
  { id: "n2", x: 82, y: 10, size: 50, icon: Brain, label: "Neural Core A", sublabel: "Logic Layer" },
  { id: "n6", x: 25, y: 12, size: 50, icon: ShieldCheck, label: "Weryfikacja", sublabel: "Zero Halucynacji" },
  { id: "n5", x: 52, y: 28, size: 46, icon: Scale, label: "Synteza Prawa", sublabel: "Evaluation" },
  { id: "n9", x: 72, y: 38, size: 46, icon: Activity, label: "Monitorowanie", sublabel: "Real-time Pulse" },
  { id: "n12", x: 22, y: 45, size: 46, icon: MessageCircle, label: "Komunikacja", sublabel: "NLP Core" },
  { id: "n7", x: 8, y: 35, size: 48, icon: Lock, label: "Bezpieczeństwo", sublabel: "AES-256" },
  { id: "n1", x: 10, y: 88, size: 52, icon: Database, label: "Agentic RAG", sublabel: "Legal Vault" },
  { id: "n3", x: 32, y: 28, size: 48, icon: Zap, label: "Neural Core B", sublabel: "Context Sync" },
  { id: "n10", x: 58, y: 62, size: 48, icon: Network, label: "Analiza Ryzyka", sublabel: "Pre-processing" },
  { id: "n14", x: 48, y: 85, size: 46, icon: GitBranch, label: "Rozumowanie", sublabel: "Chain of Thought" },
  { id: "n13", x: 65, y: 50, size: 44, icon: HardDrive, label: "Pamięć", sublabel: "Vector Store" },
  { id: "n8", x: 75, y: 65, size: 48, icon: Fingerprint, label: "Tożsamość", sublabel: "Biometric Auth" },
  { id: "n11", x: 82, y: 88, size: 48, icon: Globe, label: "Dostępność", sublabel: "Global Reach" },
  { id: "n15", x: 30, y: 92, size: 48, icon: Search, label: "Research", sublabel: "Discovery Engine" },
];

const NodeItem = memo(
  forwardRef<
    HTMLDivElement,
    {
      node: NodeDef;
      index: number;
      onHoverChange: (id: string | null) => void;
    }
  >(function NodeItem({ node, index: _index, onHoverChange }, ref) {
    const [isHovered, setIsHovered] = useState(false);
    const Icon = node.icon;
    const { size, isCenter } = node;

    return (
      <div
        ref={ref}
        id={`neural-node-${node.id}`}
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
          width: size,
          height: size,
          zIndex: isHovered ? 100 : isCenter ? 5 : 4,
          pointerEvents: "auto",
          cursor: "pointer",
          transform: "translate(-50%, -50%)",
          transition: "z-index 0.3s",
          willChange: "transform",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: size + (isCenter ? 120 : 80),
            height: size + (isCenter ? 120 : 80),
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: isHovered
              ? "radial-gradient(circle, rgba(212,175,55,0.4) 0%, transparent 75%)"
              : isCenter
                ? "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 80%)"
                : "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 80%)",
            filter: "none",
            transition: "background 0.35s",
            opacity: isHovered || isCenter ? 1 : 0.6,
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
            background: isHovered || isCenter
              ? "linear-gradient(135deg, rgba(212,175,55,0.3) 0%, rgba(212,175,55,0.15) 50%, rgba(212,175,55,0.05) 100%)"
              : "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 100%)",
            border: isHovered || isCenter ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.25)",
            boxShadow: isHovered || isCenter
              ? "0 0 40px rgba(212,175,55,0.5), inset 0 1px 0 0 rgba(220,180,60,0.3)"
              : "0 4px 15px rgba(0,0,0,0.4), inset 0 1px 0 0 rgba(255,255,255,0.1)",
            transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            willChange: "transform, opacity",
          }}
        >
          <Icon
            style={{
              width: size * 0.4,
              height: size * 0.4,
              color: isHovered || isCenter ? GOLD_BRIGHT : "rgba(255,255,255,0.85)",
              strokeWidth: isHovered || isCenter ? 2.0 : 1.4,
              filter: isHovered ? `drop-shadow(0 0 8px ${GOLD})` : "none",
              transition: "all 0.35s ease",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            top: size / 2 + (isCenter ? 45 : 15),
            left: "50%",
            transform: "translateX(-50%)",
            width: 140,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: isCenter ? 9 : 8,
              fontFamily: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
              fontWeight: 900,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: isHovered || isCenter ? "#fff" : "rgba(255,255,255,0.7)",
              margin: 0,
              textShadow: isHovered || isCenter ? "0 0 10px rgba(255,255,255,0.5)" : "0 2px 4px rgba(0,0,0,0.5)",
              transition: "all 0.3s ease",
            }}
          >
            {node.label}
          </p>
          <p
            style={{
              fontSize: 7,
              fontFamily: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
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
  })
);

export default function NeuralNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const vpRef = useRef({
    w: typeof window !== "undefined" ? window.innerWidth : 1440,
    h: typeof window !== "undefined" ? window.innerHeight : 900,
  });

  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hoverProgressRef = useRef<number[]>(new Array(NODE_DATA.length).fill(0));
  const hoveredIdRef = useRef<string | null>(null);

  useEffect(() => {
    hoveredIdRef.current = hoveredId;
  }, [hoveredId]);

  // Precalculate float parameters for optimization — compound waves for organic motion
  const floatParamsRef = useRef(
    NODE_DATA.map((_, idx) => {
      // Each node gets unique wave parameters so they don't move in sync
      const seed = idx * 1.618033; // golden ratio spacing
      return {
        // Primary wave (slow, large ~7-10s cycle)
        freqX1: 0.0007 + (idx % 5) * 0.00012,
        freqY1: 0.0006 + (idx % 7) * 0.0001,
        ampX1: 6 + (idx % 3) * 2,
        ampY1: 7 + (idx % 4) * 2.5,
        phaseX1: seed * 2.1,
        phaseY1: seed * 3.7,
        // Secondary wave (faster, smaller ~4-5s cycle — adds organic shimmer)
        freqX2: 0.0014 + (idx % 4) * 0.0002,
        freqY2: 0.0016 + (idx % 6) * 0.00015,
        ampX2: 2.5 + (idx % 3) * 0.8,
        ampY2: 3 + (idx % 5) * 0.6,
        phaseX2: seed * 5.3,
        phaseY2: seed * 4.1,
        // Tertiary wave (very slow drift ~15-20s)
        freqX3: 0.0003 + (idx % 3) * 0.00008,
        freqY3: 0.00025 + (idx % 4) * 0.00006,
        ampX3: 3,
        ampY3: 4,
        phaseX3: seed * 7.9,
        phaseY3: seed * 6.2,
      };
    })
  );

  const animationFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const handleResize = () => {
      vpRef.current = { w: window.innerWidth, h: window.innerHeight };
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

      neighbors.slice(0, 5).forEach((n2) => {
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
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Initial sizing
    canvas.width = vpRef.current.w;
    canvas.height = vpRef.current.h;
    let lastTime = 0;
    let lastW = -1;
    let lastH = -1;

    const animate = (now: number) => {
      if (!lastTime) lastTime = now;
      const delta = Math.min(100, now - lastTime);
      lastTime = now;

      const w = vpRef.current.w;
      const h = vpRef.current.h;

      // Handle dynamic resize check without reading window.innerWidth (avoids layout thrashing)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const isResize = w !== lastW || h !== lastH;

      ctx.clearRect(0, 0, w, h);

      // Increment time based on real delta (target 60fps = 16.67ms)
      timeRef.current += 0.02 * (delta / 16.67);
      
      // Przeliczanie czasu z requestAnimationFrame (w ms) na sekundy dla płynnych funkcji trygonometrycznych
      const timeInSec = now * 0.001; 

      const currentHoveredId = hoveredIdRef.current;
      const fParams = floatParamsRef.current;

      // Calculate node positions dynamically (perfect synchronization!)
      const nodePositions = NODE_DATA.map((node, idx) => {
        const px = (node.x / 100) * w;
        const py = (node.y / 100) * h;

        // 1. Smoothly interpolate hover progress (ease-out)
        const targetHover = currentHoveredId === node.id ? 1 : 0;
        let p = hoverProgressRef.current[idx] || 0;
        p += (targetHover - p) * 0.08; // slower lerp = smoother transition
        hoverProgressRef.current[idx] = p;

        // 2. Calculate compound float animation — 3 layered sine waves
        const fp = fParams[idx];
        const floatX =
          Math.sin(timeInSec * fp.freqX1 + fp.phaseX1) * fp.ampX1 +
          Math.sin(timeInSec * fp.freqX2 + fp.phaseX2) * fp.ampX2 +
          Math.sin(timeInSec * fp.freqX3 + fp.phaseX3) * fp.ampX3;
        const floatY =
          Math.cos(timeInSec * fp.freqY1 + fp.phaseY1) * fp.ampY1 +
          Math.cos(timeInSec * fp.freqY2 + fp.phaseY2) * fp.ampY2 +
          Math.cos(timeInSec * fp.freqY3 + fp.phaseY3) * fp.ampY3;

        // 3. Compute combined offsets
        // Reduce floating motion to 0 as hover approaches 1
        const tx = floatX * (1 - p);
        const ty = floatY * (1 - p) + (p * -35); // Lift by 35px on hover

        const scale = 1 + p * 0.85; // Scale to 1.85
        const rotate = p * -10; // Rotate -10deg

        // 4. Directly update DOM style via ref for maximum performance
        const el = nodeRefs.current[idx];
        if (el) {
          if (isResize) {
            el.style.left = `${px}px`;
            el.style.top = `${py}px`;
          }
          el.style.transform = `translate(-50%, -50%) translate3d(${tx}px, ${ty}px, 0) scale(${scale}) rotate(${rotate}deg)`;
          el.style.zIndex = p > 0.01 ? "100" : node.isCenter ? "5" : "4";
        }

        return {
          x: px + tx,
          y: py + ty,
        };
      });

      if (isResize) {
        lastW = w;
        lastH = h;
      }

      // Draw connections
      connections.forEach(([i, j], connIdx) => {
        const n1 = nodePositions[i];
        const n2 = nodePositions[j];

        const x1 = n1.x;
        const y1 = n1.y;
        const x2 = n2.x;
        const y2 = n2.y;

        const phaseOffset = connIdx * 2.39996;
        const cycleDuration = 15.0 + (connIdx % 8) * 2.5;
        const cycleTime = ((timeRef.current + phaseOffset) % cycleDuration) / cycleDuration;
        const pulseWindow = 1.5 / cycleDuration;
        const isActive = cycleTime < pulseWindow;
        const pulseIntensity = isActive ? Math.sqrt(1 - cycleTime / pulseWindow) : 0;

        const basePulse = 0.25 + Math.sin(timeInSec + (i + j)) * 0.1; // Ciemniejsza baza (25%)
        const lineOpacity = Math.min(0.8, basePulse + pulseIntensity * 0.5);
        const lineWidth = 0.6 + pulseIntensity * 0.4; // Cieńsze linie (0.6px)

        // Draw shadow glow lines (wider and faint)
        ctx.beginPath();
        ctx.strokeStyle = `rgba(212,175,55,${(0.2 + pulseIntensity * 0.6) * 0.15})`; // Delikatniejszy glow
        ctx.lineWidth = lineWidth * 6;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw solid lines
        ctx.beginPath();
        ctx.strokeStyle = `rgba(212,175,55,${lineOpacity})`;
        ctx.lineWidth = lineWidth;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        const impulseLength = 0.25; // Skrócona długość impulsu (25% długości linii)
        const pulsePos = cycleTime / pulseWindow;
        
        // Jeśli impuls całkowicie wszedł do węzła (ogon jest na mecie), kończymy rysowanie
        if (pulsePos - impulseLength >= 1) return;

        // Jednorazowe, mocne podświetlenie całej linii w momencie "strzału" impulsu
        // Najjaśniejsze na samym początku (pulsePos=0), całkowicie zanika w połowie trasy (pulsePos=0.5)
        const flashIntensity = Math.max(0, 1 - pulsePos * 2);

        if (flashIntensity > 0) {
          // Wąska poświata światła rozlewająca się wokół linii
          ctx.beginPath();
          ctx.strokeStyle = `rgba(212, 175, 55, ${flashIntensity * 0.3})`;
          ctx.lineWidth = 8;
          ctx.lineCap = "round";
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          
          // Środkowa, mocna złoto-biała aura, ale cienka
          ctx.beginPath();
          ctx.strokeStyle = `rgba(249, 226, 157, ${flashIntensity * 0.7})`;
          ctx.lineWidth = 3;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Oślepiająco biały, cienki rdzeń wyładowania
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255, 255, 255, ${flashIntensity})`;
          ctx.lineWidth = 1;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          
          // Uderzamy dodatkowo, żeby sztucznie przepalić biel na cienkiej linii
          ctx.stroke();
          ctx.stroke();
        }
        
        // Pozycja głowy (przodu) impulsu. Math.min ogranicza ruch do maksymalnie 1.0 (węzeł docelowy),
        // dzięki czemu impuls nigdy nie "wylatuje" poza docelową ikonę.
        const headPos = Math.min(1, pulsePos);
        const headX = x1 + (x2 - x1) * headPos;
        const headY = y1 + (y2 - y1) * headPos;
        
        // Pozycja ogona impulsu (zanikająca część)
        const tailPos = Math.max(0, pulsePos - impulseLength);
        const tailX = x1 + (x2 - x1) * tailPos;
        const tailY = y1 + (y2 - y1) * tailPos;
        
        // Zabezpieczenie przed stworzeniem gradientu o długości 0 (gdy ogon zrówna się z głową)
        if (headPos <= tailPos) return;

        // Ekstremalnie jasny gradient - prawie w całości czysta, nieprzezroczysta biel
        const gradient = ctx.createLinearGradient(tailX, tailY, headX, headY);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(0.05, "rgba(255, 255, 255, 1)"); // 95% długości to ostra biel
        gradient.addColorStop(1, "rgba(255, 255, 255, 1)");

        // Minimalna poświata dla wygładzenia krawędzi (antyaliasing)
        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        // Rdzeń jest teraz ekstremalnie cienki (0.5px)
        ctx.beginPath();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.5;
        ctx.lineCap = "round";
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();
        ctx.stroke(); // Drugie uderzenie pędzla eliminuje szarości antyaliasingu na cienkiej linii, dając 100% bieli
        
        // Główka zredukowana do drobnego punktu świetlnego
        ctx.beginPath();
        ctx.arc(headX, headY, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [connections]);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.6 }} />
      {NODE_DATA.map((node, index) => (
        <NodeItem
          ref={(el) => {
            nodeRefs.current[index] = el;
          }}
          key={node.id}
          node={node}
          index={index}
          onHoverChange={setHoveredId}
        />
      ))}
    </div>
  );
}
