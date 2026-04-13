import { motion } from "framer-motion";
import { Clock, Banknote, HelpCircle } from "lucide-react";

const PROBLEMS = [
  {
    icon: <Clock size={32} />,
    title: "Czas oczekiwania",
    text: "Nie chcesz czekać 2 tygodni na termin u prawnika, gdy potrzebujesz odpowiedzi teraz."
  },
  {
    icon: <Banknote size={32} />,
    title: "Wysokie koszty",
    text: "Nie chcesz płacić 500 zł za 15 minut konsultacji, aby sprawdzić proste zagadnienie."
  },
  {
    icon: <HelpCircle size={32} />,
    title: "Błąd i niepewność",
    text: "Nie ufasz losowym informacjom z internetu, które mogą być nieaktualne lub błędne."
  }
];

export const Problem = () => {
  return (
    <section className="py-24 px-6 relative bg-[#0f0f0f] border-y border-white/5 overflow-hidden">
      {/* Intense gold background wash */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(212,175,55,0.08)_0%,transparent_50%)] pointer-events-none" />
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-4 block">Problem</span>
          <h2 className="text-4xl md:text-5xl font-outfit font-black italic uppercase tracking-wider text-[#808080]">
            Masz pytanie prawne i...
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {PROBLEMS.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="group p-8 rounded-3xl bg-white/2 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-500"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors duration-500 mb-6">
                {p.icon}
              </div>
              <h3 className="text-xl font-outfit font-black uppercase tracking-wider text-[#a8a8a8] mb-4">
                {p.title}
              </h3>
              <p className="text-white/50 leading-relaxed font-medium">
                {p.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
