import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronDown, Lightbulb, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "../../utils/cn";

const TIPS = [
  {
    icon: Search,
    title: "Krok 1 — Wpisz, czego szukasz",
    body: (
      <>
        W głównym polu wyszukiwania wpisz hasła związane ze sprawą, na przykład:{" "}
        <strong>odszkodowanie</strong>, <strong>umowa najmu</strong> lub{" "}
        <strong>wypowiedzenie</strong>. Następnie kliknij lupę albo naciśnij Enter. Na liście
        zobaczysz orzeczenia z bazy SAOS — oficjalnego, publicznego rejestru orzeczeń polskich
        sądów.
      </>
    ),
  },
  {
    icon: SlidersHorizontal,
    title: "Krok 2 — Zawęź wyniki (gdy trzeba)",
    body: (
      <>
        Jeśli wyników jest za dużo albo za mało, kliknij <strong>Pokaż filtry</strong>. Możesz
        doprecyzować wyszukiwanie m.in. według sygnatury sprawy, daty, sądu, sędziego, przepisu
        prawnego lub typu orzeczenia (wyrok, postanowienie i inne). Na początek wystarczą zwykle
        jeden lub dwa filtry — zbyt wiele kryteriów naraz może całkowicie ograniczyć listę
        wyników.
      </>
    ),
  },
  {
    icon: Lightbulb,
    title: "Krok 3 — Jak pisać zapytania",
    body: (
      <ul className="list-disc pl-4 space-y-2.5 marker:text-gold-primary/80">
        <li>
          <strong>Dokładna fraza</strong> — umieść ją w cudzysłowie. Zapytanie{" "}
          <span className="font-mono text-black/80">&quot;dobra osobiste&quot;</span> znajdzie
          tylko ten układ słów, a nie np. sformułowanie „osobiste dobro”.
        </li>
        <li>
          <strong>Jedno lub drugie słowo</strong> — użyj łącznika{" "}
          <span className="font-mono">OR</span> między hasłami, np.{" "}
          <span className="font-mono text-black/80">kara OR grzywna</span>.
        </li>
        <li>
          <strong>Pominięcie słowa</strong> — postaw minus bezpośrednio przed słowem, którego
          nie chcesz w wynikach, np.{" "}
          <span className="font-mono text-black/80">dobro -osobiste</span> (szuka „dobro”, ale
          wyklucza „osobiste”).
        </li>
        <li>
          <strong>Hasła tematyczne</strong> (w filtrach) — wpisz hasło i naciśnij Enter. Gdy
          dodasz kilka haseł, wyszukiwarka pokaże tylko orzeczenia zawierające{" "}
          <em>wszystkie</em> naraz.
        </li>
      </ul>
    ),
  },
] as const;

function ExampleCard({ label, query }: { label: string; query: string }) {
  return (
    <motion.div layout className="rounded-xl bg-white/80 border border-black/10 px-3 py-2.5 shadow-sm">
      <p className="text-[11px] font-bold text-black/50 mb-1">{label}</p>
      <p className="text-sm font-semibold text-black font-mono leading-snug">{query}</p>
    </motion.div>
  );
}

export function SaosApiHelp({ className }: { className?: string }) {
  const [open, setOpen] = useState(true);

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl glass-prestige border border-gold-primary/25 shadow-lg overflow-hidden",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left bg-gold-primary/5 hover:bg-gold-primary/10 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl glass-liquid-convex flex items-center justify-center text-gold-primary shrink-0">
            <BookOpen size={20} />
          </span>
          <span>
            <span className="block text-sm font-black text-black uppercase tracking-wide">
              Jak szukać orzeczeń?
            </span>
            <span className="block text-xs font-semibold text-black/55 mt-0.5 normal-case tracking-normal">
              Krótka instrukcja obsługi bazy SAOS
            </span>
          </span>
        </span>
        <ChevronDown
          size={20}
          className={cn(
            "shrink-0 text-black/50 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <motion.div className="px-5 pb-5 pt-2 space-y-5 border-t border-gold-primary/15">
              <p className="text-[13px] font-medium text-black/60 leading-relaxed pt-2">
                Poniżej znajdziesz najprostszy sposób pracy z wyszukiwarką. Nie musisz znać
                skrótów ani technicznych nazw — wystarczy wpisać słowa opisujące Twoją sprawę.
              </p>

              <motion.div layout className="space-y-4">
                {TIPS.map((tip) => {
                  const Icon = tip.icon;
                  return (
                    <motion.div
                      key={tip.title}
                      layout
                      className="flex gap-3 rounded-xl bg-white/70 border border-black/10 p-4"
                    >
                      <motion.div className="w-9 h-9 rounded-lg bg-gold-primary/10 flex items-center justify-center shrink-0 text-gold-primary">
                        <Icon size={18} />
                      </motion.div>
                      <motion.div className="min-w-0 space-y-1.5">
                        <h4 className="text-sm font-black text-black leading-snug">{tip.title}</h4>
                        <motion.div className="text-[13px] font-medium text-black/70 leading-relaxed">
                          {tip.body}
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </motion.div>

              <motion.div layout className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-black/50">
                  Przykłady gotowych zapytań
                </p>
                <motion.div layout className="grid gap-2 sm:grid-cols-2">
                  <ExampleCard label="Szerokie wyszukiwanie" query="zniesławienie internet" />
                  <ExampleCard label="Z pominięciem słowa" query="odszkodowanie -ruchu" />
                  <ExampleCard label="Kilka wariantów naraz" query="kara OR grzywna OR nagana" />
                  <ExampleCard label="Tylko dokładna fraza" query='"dobra osobiste"' />
                </motion.div>
              </motion.div>

              <motion.div
                layout
                className="rounded-xl bg-gold-primary/8 border border-gold-primary/15 px-4 py-3.5 text-[13px] font-medium text-black/70 leading-relaxed"
              >
                <strong className="text-black font-bold">Co dalej?</strong> Kliknij wybrane
                orzeczenie na liście, aby przeczytać jego treść i szczegóły. Możesz zapisać je do
                sprawy albo otworzyć w serwisie SAOS. Włączona opcja{" "}
                <strong>AI</strong> pomaga doprecyzować zapytanie — przy pierwszym wyszukiwaniu
                warto zostawić ją włączoną.
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
