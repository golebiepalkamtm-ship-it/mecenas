import { useState } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle2, Cpu, Database, Landmark, Scale, FileText, Vote, Search, Sparkles, Building2, ShieldAlert, Gavel, Globe } from "lucide-react";
import { cn } from "../../../utils/cn";

interface LexmindeMcpModalProps {
  isOpen: boolean;
  onClose: () => void;
  useLexmindeMcp: boolean;
  setUseLexmindeMcp: (val: boolean) => void;
  onSelectPrompt?: (prompt: string) => void;
}

export function LexmindeMcpModal({
  isOpen,
  onClose,
  useLexmindeMcp,
  setUseLexmindeMcp,
  onSelectPrompt
}: LexmindeMcpModalProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'sejm' | 'saos' | 'isap' | 'registers' | 'courts' | 'uodo' | 'internet' | 'system'>('all');

  if (!isOpen) return null;

  const toolsList = [
    {
      id: "krs_get_company",
      category: "registers",
      name: "Odpis Spółki z KRS API",
      icon: Building2,
      desc: "Pobiera aktualny odpis spółki handlowej z Krajowego Rejestru Sądowego (KRS API MS). Zwraca zarząd, reprezentację, kapitał zakładowy i siedzibę.",
      example: "Pobierz odpis spółki z KRS o numerze 0000012345 i sprawdź jej zarząd i sposób reprezentacji."
    },
    {
      id: "ceidg_search_business",
      category: "registers",
      name: "Weryfikacja Jednoosobowej Działalności (CEIDG)",
      icon: Building2,
      desc: "Weryfikacja jednoosobowych przedsiębiorców w rejestrze CEIDG po numerze NIP lub REGON.",
      example: "Sprawdź w CEIDG status działalności gospodarczej o NIP 1234567890."
    },
    {
      id: "cbosa_search_judgments",
      category: "courts",
      name: "Orzeczenia Sądów Administracyjnych (CBOSA / NSA / WSA)",
      icon: Gavel,
      desc: "Przeszukuje wyroki Naczelnego Sądu Administracyjnego oraz Wojewódzkich Sądów Administracyjnych (podatki VAT/CIT, budownictwo, nieruchomości).",
      example: "Szukaj w CBOSA wyroków NSA dotyczących prawa do odliczenia podatku VAT od usług IT."
    },
    {
      id: "uodo_search_decisions",
      category: "uodo",
      name: "Decyzje i Kary RODO (UODO)",
      icon: ShieldAlert,
      desc: "Baza decyzji administracyjnych oraz kar finansowych nakładanych przez Prezesa Urzędu Ochrony Danych Osobowych за naruszenie RODO.",
      example: "Znajdź decyzje UODO dotyczące kar finansowych za wyciek danych i brak zgłoszenia incydentu."
    },
    {
      id: "kio_search_judgments",
      category: "courts",
      name: "Wyroki KIO (Zamówienia Publiczne Pzp)",
      icon: Gavel,
      desc: "Przeszukuje wyroki Krajowej Izby Odwoławczej (KIO) w sprawach odwołań przetargowych, rażąco niskiej ceny oraz SIWZ/SWZ.",
      example: "Wyszukaj wyroki KIO dotyczące rażąco niskiej ceny i odrzucenia oferty wykonawcy."
    },
    {
      id: "tsue_search_judgments",
      category: "courts",
      name: "Wyroki TSUE (Prawo Unijne / CURIA)",
      icon: Globe,
      desc: "Przeszukuje wyroki Trybunału Sprawiedliwości UE (TSUE) w sprawach frankowych, prawa konsumenckiego i ochrony danych.",
      example: "Znajdź wyroki TSUE w sprawie C-520/21 dotyczące unieważnienia umów kredytowych."
    },
    {
      id: "sejm_get_voting_details",
      category: "sejm",
      name: "Wyniki & Głosy Posłów",
      icon: Vote,
      desc: "Pobiera pełne wyniki głosowania w Sejmie wraz z imiennymi głosami 460 posłów (ZA, PRZECIW, WSTRZYMAŁ SIĘ) i filtrowaniem po klubach.",
      example: "Pobierz wyniki ostatniego głosowania na 1. posiedzeniu Sejmu X kadencji i sprawdź jak głosował klub PiS i KO."
    },
    {
      id: "sejm_list_prints",
      category: "sejm",
      name: "Druki Sejmowe i Projekty Ustaw",
      icon: FileText,
      desc: "Wyszukuje druki sejmowe i projekty ustaw z wyszukiwaniem po słowach kluczowych w tytule aktu oraz bezpośrednimi linkami PDF.",
      example: "Znajdź druki sejmowe w X kadencji Sejmu dotyczące podatków lub budżetu."
    },
    {
      id: "sejm_list_mps",
      category: "sejm",
      name: "Wyszukiwarka Posłów RP",
      icon: Landmark,
      desc: "Przeszukuje bazę posłów na Sejm RP z możliwością filtrowania po imieniu, nazwisku, klubie parlamentarnym i okręgu.",
      example: "Wyszukaj posłów z klubu Konfederacja reprezentujących okręg Warszawa."
    },
    {
      id: "sejm_list_votings",
      category: "sejm",
      name: "Wykaz Posiedzeń i Głosowań",
      icon: Vote,
      desc: "Pobiera listę posiedzeń Sejmu RP z podaniem liczby głosowań i szczegółowymi datami.",
      example: "Pokaż listę posiedzeń Sejmu w X kadencji i ich dni głosowań."
    },
    {
      id: "saos_search_judgments",
      category: "saos",
      name: "Wyszukiwarka Orzeczeń SAOS",
      icon: Scale,
      desc: "Przeszukuje setki tysięcy orzeczeń polskich sądów powszechnych i SN z filtracją po sygnaturze, sędzim, sądzie i dacie.",
      example: "Przeszukaj orzeczenia SAOS pod kątem spraw o nienależyte wykonanie umowy IT."
    },
    {
      id: "saos_get_judgment_details",
      category: "saos",
      name: "Uzasadnienie & Archiwizacja .MD",
      icon: Database,
      desc: "Pobiera pełne uzasadnienie orzeczenia i automatycznie archiwizuje je na dysku jako czytelny plik .md.",
      example: "Pobierz uzasadnienie orzeczenia SAOS o ID 1000 i zapisz plik."
    },
    {
      id: "saos_search_by_article",
      category: "saos",
      name: "Szukaj wg Artykułu / Przepisu",
      icon: Search,
      desc: "Szybkie wyszukiwanie wyroków powołujących się na konkretny artykuł (np. art. 415 kc, art. 148 kk).",
      example: "Znajdź orzeczenia sądowe powołujące się na art. 415 kc."
    },
    {
      id: "isap_search_acts",
      category: "isap",
      name: "Wyszukiwarka Aktów Prawnych ISAP",
      icon: Landmark,
      desc: "Dostęp do oficjalnego repozytorium Dziennika Ustaw (DU) oraz Monitora Polskiego (MP) - ponad 164 000 aktów.",
      example: "Wyszukaj w ISAP ustawę o prawie autorskim i prawach pokrewnych."
    },
    {
      id: "isap_get_act_text",
      category: "isap",
      name: "Ujednolicony Tekst Ustawy HTML",
      icon: FileText,
      desc: "Pobiera ujednoliconą treść przepisów prawnych z bazy ISAP / Sejm ELI API.",
      example: "Pobierz treść tekstu jednolitego ustawy o ochronie danych osobowych."
    },
    {
      id: "internet_search",
      category: "internet",
      name: "Wyszukiwarka Internetowa (DuckDuckGo)",
      icon: Globe,
      desc: "Przeszukuje otwarty internet (wiadomości, fakty, artykuły) w czasie rzeczywistym.",
      example: "Wyszukaj w internecie najnowsze informacje o zmianach w podatkach."
    },
    {
      id: "search_supabase_rag",
      category: "system",
      name: "Własna Baza Wiedzy (RAG)",
      icon: Database,
      desc: "Wyszukiwanie semantyczne w wektorowej bazie danych Twojej kancelarii (Supabase RAG).",
      example: "Przeszukaj bazę wiedzy pod kątem starych opinii prawnych."
    },
    {
      id: "search_code",
      category: "system",
      name: "Inspekcja Kodu Źródłowego",
      icon: Cpu,
      desc: "Zaawansowane przeszukiwanie kodu źródłowego (AST / Text) w celu debugowania.",
      example: "Znajdź definicję funkcji w pliku debate_engine.py."
    },
    {
      id: "list_documents",
      category: "system",
      name: "Lista Dokumentów Klienta",
      icon: FileText,
      desc: "Pobiera listę aktualnie wgranych przez użytkownika dokumentów (PDF/TXT/MD).",
      example: "Pokaż wgrane dokumenty w tej sesji."
    },
    {
      id: "find_files",
      category: "system",
      name: "Wyszukiwarka Plików Lokalnych",
      icon: Search,
      desc: "Znajduje ścieżki i lokalizacje plików na dysku systemowym.",
      example: "Wyszukaj pliki .md w folderze dokumentów."
    },
    {
      id: "sejm_search_interpellations",
      category: "sejm",
      name: "Interpelacje Poselskie",
      icon: FileText,
      desc: "Pobiera odpowiedzi i treść interpelacji poselskich wg zapytań.",
      example: "Sprawdź interpelacje w sprawie budowy CPK."
    },
    {
      id: "sejm_list_committees",
      category: "sejm",
      name: "Komisje Sejmowe",
      icon: Building2,
      desc: "Lista komisji sejmowych, posiedzeń i ich składu osobowego.",
      example: "Kto zasiada w komisji finansów publicznych?"
    },
    {
      id: "isap_list_publishers",
      category: "isap",
      name: "Wydawnictwa ISAP (DU/MP)",
      icon: Database,
      desc: "Lista oficjalnych wydawnictw Dziennika Ustaw i Monitora Polskiego.",
      example: "Pokaż najnowsze dzienniki ustaw."
    },
    {
      id: "isap_get_act_details",
      category: "isap",
      name: "Metadane Aktu Prawnego",
      icon: Search,
      desc: "Szczegółowa metryka aktu prawnego (status, wejście w życie, uchylenia).",
      example: "Kiedy weszła w życie ustawa o obronie ojczyzny?"
    },
    {
      id: "saos_list_courts",
      category: "saos",
      name: "Lista Sądów Powszechnych",
      icon: Scale,
      desc: "Zwraca oficjalny słownik i strukturę sądów powszechnych z bazy SAOS.",
      example: "Pokaż listę sądów apelacyjnych w Polsce."
    },
    {
      id: "sejm_get_print_details",
      category: "sejm",
      name: "Szczegóły Druku Sejmowego",
      icon: FileText,
      desc: "Pobiera metadane, proces legislacyjny i autorów wskazanego druku sejmowego.",
      example: "Podaj szczegóły druku sejmowego nr 10."
    },
    {
      id: "search_legal_acts",
      category: "system",
      name: "Wyszukiwarka Aktów (Lokalna)",
      icon: Database,
      desc: "Szybkie przeszukiwanie lokalnego cache ustaw i rozporządzeń w bazie RAG.",
      example: "Poszukaj lokalnie przepisów o urlopie macierzyńskim."
    },
    {
      id: "search_judgments",
      category: "system",
      name: "Wyszukiwarka Orzeczeń (Lokalna)",
      icon: Database,
      desc: "Przeszukuje lokalne, wcześniej pobrane orzecznictwo i glosy.",
      example: "Znajdź orzeczenia z lokalnej bazy o odszkodowaniach."
    },
    {
      id: "list_sessions",
      category: "system",
      name: "Historia Sesji",
      icon: Search,
      desc: "Wyświetla listę aktywnych i historycznych sesji czatu.",
      example: "Jakie były moje ostatnie 3 tematy rozmów?"
    },
    {
      id: "get_session_messages",
      category: "system",
      name: "Odtwarzanie Kontekstu Rozmowy",
      icon: FileText,
      desc: "Pobiera dokładny zapis poprzednich wiadomości ze wskazanej sesji.",
      example: "Przypomnij mi, o czym pisaliśmy wczoraj."
    },
    {
      id: "get_document_info",
      category: "system",
      name: "Szczegóły Pliku Klienta",
      icon: Search,
      desc: "Pobiera metadane i strukturę wgranego dokumentu do analizy.",
      example: "Z czego składa się wgrana opinia prawna .pdf?"
    }
  ];

  const filteredTools = activeCategory === 'all' 
    ? toolsList 
    : toolsList.filter(t => t.category === activeCategory);

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 pointer-events-none">
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-5xl max-h-[92vh] rounded-3xl overflow-hidden flex flex-col glass-prestige bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_32px_64px_rgba(0,0,0,0.25),inset_0_2px_20px_rgba(255,255,255,1)] pointer-events-auto cursor-grab active:cursor-grabbing"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-black/5 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl glass-liquid-convex bg-gold-primary border border-gold-primary/30 flex items-center justify-center text-black">
              <Cpu size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-black tracking-wide">Serwer MCP Lexminde</h2>
                <span className="px-2 py-0.5 rounded-xl glass-liquid-convex bg-gold-primary border border-gold-primary/30 text-black text-[10px] font-bold uppercase tracking-wider">
                  {toolsList.length} Narzędzi API
                </span>
              </div>
              <p className="text-xs text-black">Integracja z SAOS, ISAP, Sejm API, KRS, CEIDG, CBOSA, UODO, KIO & TSUE</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle switch */}
            <button
              onClick={() => setUseLexmindeMcp(!useLexmindeMcp)}
              className="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer glass-liquid-convex bg-gold-primary border border-gold-primary/30 text-black font-bold"
            >
              <div className={cn("w-2 h-2 rounded-full", useLexmindeMcp ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]")} />
              {useLexmindeMcp ? "MCP Aktywne" : "MCP Wyłączone"}
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 60%, rgba(0, 0, 0, 0.2) 100%), linear-gradient(135deg, #fb7185 0%, #e11d48 100%)'
              }}
              className="p-2 rounded-xl glass-liquid-convex border-t border-t-white/60 border-b border-b-rose-900 text-black hover:brightness-110 transition-all cursor-pointer shadow-[0_3px_6px_rgba(0,0,0,0.35),0_0_12px_rgba(225,29,72,0.3)]"
            >
              <X size={18} strokeWidth={2.5} style={{ color: 'black', stroke: 'black' }} />
            </button>
          </div>
        </div>

        {/* Subheader Status */}
        <div className="px-6 py-3 bg-white/30 border-b border-black/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-black">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>SAOS / ISAP</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Sejm RP</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>KRS & CEIDG</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>CBOSA & KIO</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>UODO / TSUE</span>
            </span>
          </div>

          <span className="text-[11px] text-gold-primary/80 font-mono">
            Status: Połączono | Cache: Active
          </span>
        </div>

        {/* Filter tabs */}
        <div className="px-6 pt-4 flex flex-wrap gap-2">
          {[
            { id: 'all', label: `Wszystkie (${toolsList.length})` },
            { id: 'registers', label: 'KRS & CEIDG (2)' },
            { id: 'courts', label: 'Sądy CBOSA, KIO & TSUE (3)' },
            { id: 'uodo', label: 'UODO & RODO (1)' },
            { id: 'sejm', label: 'Sejm RP (4)' },
            { id: 'saos', label: 'SAOS (4)' },
            { id: 'isap', label: 'ISAP (4)' },
            { id: 'internet', label: 'Internet (1)' },
            { id: 'system', label: 'Narzędzia Systemowe (8)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as typeof activeCategory)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer",
                activeCategory === tab.id 
                  ? "glass-liquid-convex bg-gold-primary border border-gold-primary/30 text-black font-bold" 
                  : "text-black hover:text-black hover:bg-black/5 font-medium"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content list */}
        <div className="flex-1 p-6 overflow-y-auto space-y-3 custom-scrollbar">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                className="p-4 rounded-2xl glass-liquid-convex border border-black/5 hover:border-gold-primary/40 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl glass-liquid-convex bg-gold-primary text-black border border-gold-primary/30">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-black">{tool.name}</h4>
                        <span className="font-mono text-[10px] text-black bg-black/5 px-2 py-0.5 rounded-md">
                          {tool.id}
                        </span>
                      </div>
                      <p className="text-xs text-black mt-1 leading-relaxed">{tool.desc}</p>
                    </div>
                  </div>

                  {onSelectPrompt && (
                    <button
                      onClick={() => {
                        onSelectPrompt(tool.example);
                        onClose();
                      }}
                      className="shrink-0 px-3 py-1.5 rounded-xl glass-liquid-convex bg-gold-primary border border-gold-primary/30 text-black text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles size={12} />
                      <span>Użyj przykładu</span>
                    </button>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-[11px] text-black">
                  <span className="truncate italic">Przykładowe zapytanie: "{tool.example}"</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-black/10 bg-white/50 flex items-center justify-between text-xs text-black">
          <span>Ścieżka serwera: <code className="text-gold-primary">E:\moj prawnik\lexminde mcp</code></span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl glass-liquid-convex bg-gold-primary border border-gold-primary/30 text-black font-bold transition-all cursor-pointer"
          >
            Gotowe
          </button>
        </div>
      </motion.div>
    </div>
  );
}
