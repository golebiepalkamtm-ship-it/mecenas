import { motion } from "framer-motion";
import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "Czy LexMind zastępuje prawnika?",
    a: "Nie. LexMind AI to asystent prawny, który dostarcza rzetelnych informacji i wspomaga pracę prawnika oraz osób prywatnych. Zawsze zalecamy weryfikację krytycznych spraw z uprawnionym radcą."
  },
  {
    q: "Jak działa system konsensusu?",
    a: "System wysyła Twoje zapytanie do 5 różnych modeli AI jednocześnie. Następnie analizuje odpowiedzi, wyłapuje rozbieżności i syntetyzuje jedną, najbardziej prawdopodobną i udokumentowaną odpowiedź."
  },
  {
    q: "Czy moje dane są bezpieczne?",
    a: "Tak. LexMind AI jest zaprojektowany z myślą o prywatności. Wiele procesów zachodzi lokalnie, a Twoje zapytania nie są wykorzystywane do trenowania globalnych modeli AI."
  },
  {
    q: "Co obejmuje cena 499 PLN?",
    a: "To opłata jednorazowa za roczny dostęp do systemu, wszystkich jego funkcji, bazy orzeczeń SAOS oraz regularnych aktualizacji bazy prawnej."
  }
];

export const FAQ = () => {
  return (
    <section id="faq" className="py-24 px-6 relative overflow-hidden bg-[#0f0f0f]">
      {/* Intense gold background wash */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="max-w-3xl mx-auto">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className="text-center mb-16"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-4 block">FAQ</span>
          <h2 className="text-4xl font-outfit font-black italic uppercase tracking-tight text-white mb-6">
            Częste Pytania
          </h2>
        </motion.div>

        <div className="space-y-4">
          {FAQS.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-3xl bg-white/2 border border-white/5 hover:border-white/20 transition-all duration-300 group"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4 flex justify-between items-center">
                {f.q}
                <Plus size={16} className="text-white/20 group-hover:text-white transition-colors" />
              </h3>
              <p className="text-xs text-white/40 leading-relaxed font-medium">
                {f.a}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
