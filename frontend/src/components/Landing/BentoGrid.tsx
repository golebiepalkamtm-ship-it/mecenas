import { motion } from "framer-motion";
import { Database, Brain, FileText } from "lucide-react";

const features = [
  {
    number: "01",
    icon: <Database className="w-4 h-4" />,
    tag: "System RAG",
    title: "Absolutna Pewność",
    subtitle: "Źródłowa",
    metric: "100%",
    metricLabel: "pokrycie",
    description:
      "Konstytucja RP i Kodeksy wpięte w wektorowe synapsy. Zero halucynacji.",
  },
  {
    number: "02",
    icon: <Brain className="w-4 h-4" />,
    tag: "Konsensus",
    title: "Przewaga",
    subtitle: "Wielomodelowa",
    metric: "3→1",
    metricLabel: "synteza",
    description:
      "Kilka modeli AI analizuje równolegle — jeden syntetyzuje bezbłędną opinię.",
  },
  {
    number: "03",
    icon: <FileText className="w-4 h-4" />,
    tag: "Generatywne",
    title: "Pisma",
    subtitle: "Procesowe",
    metric: "12s",
    metricLabel: "generowanie",
    description:
      "Od apelacji po analizy umów — z przypisami do aktualnych przepisów.",
  },
];

const BentoGrid = () => {
  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      {features.map((feature, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.8,
            delay: 0.6 + i * 0.2,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <div
            className="group relative glass rounded-2xl overflow-hidden transition-all duration-700 hover:border-gold-primary/30 cursor-default"
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-gold-primary/20 to-transparent" />

            <div className="relative p-5 flex items-start gap-5">
              {/* Left: number + icon */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <span className="text-[10px] font-mono text-gold-primary/30 tracking-widest uppercase">
                  {feature.number}
                </span>
                <div
                  className="w-10 h-10 rounded-xl border border-gold-primary/10 bg-gold-primary/5
                  flex items-center justify-center text-gold-primary/60
                  transition-all duration-500 group-hover:bg-gold-primary/20 group-hover:text-gold-primary group-hover:border-gold-primary/30
                  group-hover:shadow-[0_0_20px_-4px_rgba(175,142,59,0.3)]"
                >
                  {feature.icon}
                </div>
              </div>

              {/* Right: content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-inter font-black tracking-[0.4em] uppercase text-gold-primary/40 block">
                      {feature.tag}
                    </span>
                    <h3 className="text-base font-outfit font-bold text-white leading-tight tracking-wide uppercase italic">
                      {feature.title}{" "}
                      <span className="text-gold-primary/60">
                        {feature.subtitle}
                      </span>
                    </h3>
                  </div>
                  {/* Metric */}
                  <div className="text-right shrink-0">
                    <span className="text-xl font-outfit font-black text-gold-primary leading-none italic">
                      {feature.metric}
                    </span>
                    <span className="block text-[8px] font-inter font-bold tracking-[0.2em] uppercase text-white/20 mt-1">
                      {feature.metricLabel}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-white/40 font-inter font-medium leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default BentoGrid;
