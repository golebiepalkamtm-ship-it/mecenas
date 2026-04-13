import { motion } from "framer-motion";
import { Brain, Search, FileText, Library, Scale, Laptop } from "lucide-react";

const FEATURES = [
  {
    icon: <Brain />,
    title: "Konsensus Modeli",
    desc: "5 niezależnych ekspertów AI weryfikuje się nawzajem aby dać Ci najbardziej rzetelną odpowiedź."
  },
  {
    icon: <Search />,
    title: "Wyszukiwanie Prawne",
    desc: "Przeszukuje cały polski kodeks w 0,2 sekundy. Błyskawiczny dostęp do przepisów."
  },
  {
    icon: <FileText />,
    title: "Kreator Pism",
    desc: "Automatycznie generuje gotowe pisma procesowe, skargi, wnioski w kilka sekund."
  },
  {
    icon: <Library />,
    title: "Biblioteka PDF",
    desc: "Możesz załadować własne PDF i AI będzie się do nich odwoływać podczas analizy."
  },
  {
    icon: <Scale />,
    title: "Orzecznictwo SAOS",
    desc: "Zintegrowany dostęp do wszystkich orzeczeń sądów polskich od 1990 roku."
  },
  {
    icon: <Laptop />,
    title: "Tryb Offline",
    desc: "Wszystko działa lokalnie na Twoim urządzeniu, zapewniając 100% prywatności."
  }
];

export const Features = () => {
  return (
    <section className="py-24 px-6 bg-[#121212] relative overflow-hidden">
      {/* Intense gold background wash */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,rgba(212,175,55,0.12)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.05)_0%,transparent_40%)] pointer-events-none" />
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-4 block">Funkcje</span>
          <h2 className="text-4xl md:text-5xl font-outfit font-black italic uppercase tracking-tight text-[#808080] mb-6">
            Narzędzia legal-tech nowej generacji
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-4xl bg-white/2 border border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors duration-500 mb-6 group-hover:scale-110">
                {f.icon}
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#a8a8a8] mb-4">
                {f.title}
              </h3>
              <p className="text-xs text-white/50 leading-relaxed font-medium">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
