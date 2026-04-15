import { motion } from "framer-motion";
import { Shield, Brain, Sparkles } from "lucide-react";

export const Solution = () => {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#6b7280] mb-6 block">Rozwiązanie</span>
          <h2 className="text-3xl md:text-5xl font-inter font-semibold tracking-tight text-chameleon  mb-8 leading-tight">
            Twój prawnik w zasięgu ręki <span className="opacity-60">24/h na dobę</span>
          </h2>
          <p className="text-lg text-[#9ca3af] mb-10 leading-relaxed font-medium">
            LexMind AI eliminuje bariery w dostępie do informacji prawnej. Zamiast czekać na termin, otrzymujesz rzetelną odpowiedź w kilka sekund. Zamiast płacić fortunę, inwestujesz raz i korzystasz bez limitu.
          </p>

          <ul className="space-y-6">
            {[
              { icon: <Shield size={18} />, text: "100% rzetelności dzięki zaawansowanym modelom AI" },
              { icon: <Brain size={18} />, text: "Dostęp do 3.2 miliona orzeczeń sądowych SAOS" },
              { icon: <Sparkles size={18} />, text: "Prywatność klasy wojskowej - dane zostają na Twoim urządzeniu" }
            ].map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-4 text-[#d1d5db] font-bold uppercase tracking-wider text-xs"
              >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#9ca3af]">
                  {item.icon}
                </div>
                {item.text}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <div className="flex-1 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 rounded-3xl overflow-hidden border border-white/10 shadow-[0_50px_100px_-20px_rgba(255,255,255,0.05)]"
            data-lag="0.1"
          >
            <img 
              src="/neural-brain.png" 
              alt="Neural Law Intelligence" 
              className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-1000"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-40" />

          </motion.div>
        </div>
      </div>
    </section>
  );
};

