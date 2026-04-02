import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "Outfit, sans-serif",
  gantt: {
    fontSize: 12,
    sectionFontSize: 11,
    numberSectionStyles: 4,
    axisFormat: "%d/%m",
  },
});

interface MermaidProps {
  content: string;
}

const Mermaid: React.FC<MermaidProps> = ({ content }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && content) {
      ref.current.innerHTML = ""; // Clear existing content
      
      const renderChart = async () => {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, content);
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        } catch (error) {
          console.error("Mermaid error:", error);
          if (ref.current) {
            ref.current.innerHTML = `<pre class="text-xs text-red-400 bg-red-900/10 p-4 rounded-xl border border-red-500/20">Błąd renderowania wykresu: ${error instanceof Error ? error.message : String(error)}</pre>`;
          }
        }
      };

      renderChart();
    }
  }, [content]);

  return (
    <div className="mermaid-container w-full overflow-x-auto my-6 p-4 glass-prestige rounded-2xl border border-white/10 shadow-2xl transition-all hover:border-gold-500/30">
      <div ref={ref} className="flex justify-center" />
    </div>
  );
};

export default Mermaid;
