import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";

export const Pricing = ({ onStartTrial }: { onStartTrial: () => void }) => {
  return (
    <section className="py-24 px-6 bg-[#1e1e1e] relative">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#6b7280] mb-6 block">Inwestycja</span>
          <h2 className="text-3xl md:text-5xl font-inter font-semibold tracking-tight text-chameleon drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] mb-6">
            Prosty wybór, <span className="opacity-60">brak abonamentów</span>
          </h2>
          <div className="w-12 h-px bg-white/20 mx-auto" />
          <p className="text-[#9ca3af] max-w-2xl mx-auto font-medium">
            Koszt jednorazowy. Równowartość 1 godziny u prawnika = cały rok nieograniczonego dostępu.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative max-w-lg mx-auto p-8 md:p-14 rounded-4xl md:rounded-[3.5rem] glass-prestige border border-white/30 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-visible!"
        >
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-white text-[#9ca3af] text-[10px] font-black uppercase tracking-[0.4em] rounded-full whitespace-nowrap z-50">
            Najczęściej Wybierany
          </div>

          <div className="mt-10 mb-8">
            <h3 className="text-lg font-outfit font-black uppercase text-[#6b7280] mb-3">Pełna Licencja</h3>
            <div className="flex items-center justify-center gap-2">
              <span className="text-4xl md:text-5xl font-outfit font-black text-[#9ca3af]">499</span>
              <span className="text-xl font-outfit font-black text-[#6b7280] uppercase">PLN</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4b5563] mt-3">Płatność jednorazowa</p>
          </div>

          <ul className="text-left space-y-3 mb-8">
            {[
              "Nieograniczony dostęp 24/7",
              "Zaawansowana analityka AI",
              "Baza 3.2 mln orzeczeń SAOS",
              "Lokalna prywatność i bezpieczeństwo",
              "Generator pism procesowych",
              "Aktualizacje systemowe w cenie"
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">
                <Check size={14} className="text-[#9ca3af] shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartTrial}
            className="w-full py-4 bg-white text-[#9ca3af] font-black uppercase tracking-[0.4em] text-xs rounded-2xl flex items-center justify-center gap-3 relative z-20"
          >
            <Star size={14} fill="black" />
            Rozpocznij Test
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};
