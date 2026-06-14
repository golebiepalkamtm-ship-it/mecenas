import React, { useEffect, useId, useState } from "react";
import mermaid from "mermaid";

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
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
  const reactId = useId().replace(/:/g, "");
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!content) {
      setRenderedHtml(null);
      return;
    }

    let cancelled = false;

    const renderChart = async () => {
      try {
        const id = `mermaid-${reactId}-${Math.random().toString(36).slice(2, 11)}`;
        const { svg } = await mermaid.render(id, content);
        if (!cancelled) setRenderedHtml(svg);
      } catch (error) {
        console.error("Mermaid error:", error);
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          setRenderedHtml(
            `<pre class="text-xs text-red-400 bg-red-900/10 p-4 rounded-xl border border-red-500/20">Błąd renderowania wykresu: ${message}</pre>`,
          );
        }
      }
    };

    setRenderedHtml(null);
    void renderChart();

    return () => {
      cancelled = true;
    };
  }, [content, reactId]);

  return (
    <div className="mermaid-container w-full overflow-x-auto my-6 p-4 glass-prestige rounded-2xl border border-white/10 shadow-2xl transition-all hover:border-gold-500/30">
      <div
        className="flex justify-center"
        dangerouslySetInnerHTML={renderedHtml ? { __html: renderedHtml } : undefined}
      />
    </div>
  );
};

export default Mermaid;
