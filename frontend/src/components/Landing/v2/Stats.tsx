import { motion } from "framer-motion";

const STATS = [
  { value: "3.7s", label: "Przebieg odpowiedzi" },
  { value: "127k", label: "Stron aktów" },
  { value: "3.2M", label: "Orzeczeń SAOS" },
  { value: "94.7%", label: "Dokładność" }
];

export const Stats = () => {
  return (
    <section className="py-24 px-6 relative overflow-hidden bg-[#0f0f0f]">
      {/* Intense gold background wash */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.06)_0%,transparent_80%)] pointer-events-none" />
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-12">
        {STATS.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center group"
          >
            <div className="text-4xl md:text-5xl font-inter font-semibold text-[#9ca3af] mb-2 group-hover:scale-105 transition-transform duration-500">
              {s.value}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#6b7280]">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
