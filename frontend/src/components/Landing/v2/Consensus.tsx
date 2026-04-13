import { motion } from "framer-motion";
import NeuralFlow from "../NeuralFlow";

export const Consensus = () => {
  return (
    <section className="py-24 px-6 relative overflow-hidden bg-black/60 border-y border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-20">
        <div className="w-full max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.8em] text-white/40 mb-6 block">Ekskluzywna Technologia</span>
            <h2 
              className="text-5xl md:text-8xl font-outfit font-black italic uppercase tracking-tighter mb-10 leading-[0.85]"
              style={{
                background: "linear-gradient(to bottom, #ffffff 0%, #808080 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Consensus of 5 Engines
            </h2>
            
            <div className="grid md:grid-cols-2 gap-12 text-left mt-16 border-t border-white/5 pt-12">
              <div className="space-y-4">
                <h3 className="text-xl font-outfit font-black uppercase tracking-widest text-white/90">Filtracja i Synteza</h3>
                <p className="text-white/40 leading-relaxed font-medium text-sm">
                  LexMind nie tylko pyta AI – on zarządza wiedzą. Pięć niezależnych silników analizuje Twoje zapytanie, a nasz autorski algorytm syntezy tworzy z nich jedną, bezbłędną i krystalicznie czystą odpowiedź prawną.
                </p>
              </div>
              <div className="p-8 rounded-3xl bg-white/2 border border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <p className="text-xs text-white/60 italic font-medium leading-relaxed relative z-10">
                  "System eliminuje halucynacje poprzez krzyżową weryfikację. Efektem końcowym jest złoty standard informacji prawnej, na którym możesz polegać."
                </p>
              </div>
            </div>
          </motion.div>
        </div>
 
        <div className="w-full flex justify-center scale-90 lg:scale-110 xl:scale-125 relative group selection:bg-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <NeuralFlow />
          </motion.div>
          <div className="absolute -inset-20 bg-white/3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-3xl pointer-events-none" />
        </div>
      </div>
    </section>
  );
};
