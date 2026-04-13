import { motion } from "framer-motion";
import { Shield, Brain, Sparkles } from "lucide-react";

export const Solution = () => {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-4 block">Rozwiązanie</span>
            <h2 className="text-4xl md:text-6xl font-outfit font-black italic uppercase tracking-tight text-[#808080] mb-8 leading-[0.9]">
              Twój prawnik 24/7 w zasięgu ręki
            </h2>
            <p className="text-lg text-white/60 mb-10 leading-relaxed font-medium">
              LexMind AI eliminuje bariery w dostępie do informacji prawnej. Zamiast czekać na termin, otrzymujesz rzetelną odpowiedź w kilka sekund. Zamiast płacić fortunę, inwestujesz raz i korzystasz bez limitu.
            </p>

            <ul className="space-y-6">
              {[
                { icon: <Shield size={18} />, text: "100% rzetelności dzięki konsensusowi 5 modeli AI" },
                { icon: <Brain size={18} />, text: "Dostęp do 3.2 miliona orzeczeń sądowych SAOS" },
                { icon: <Sparkles size={18} />, text: "Prywatność klasy wojskowej - dane zostają na Twoim urządzeniu" }
              ].map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-4 text-white/80 font-bold uppercase tracking-wider text-xs"
                >
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60">
                    {item.icon}
                  </div>
                  {item.text}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div className="flex-1 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative z-10 p-4 rounded-4xl glass-prestige border border-white/20 aspect-square flex items-center justify-center"
          >
            <div className="text-center">
              <div className="text-7xl font-outfit font-black text-white mb-2">24/7</div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Dostępność Systemu</p>
            </div>
          </motion.div>
          
          {/* Static premium ambient light - No blur */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gold-primary/5 rounded-full" />
        </div>
      </div>
    </section>
  );
};
