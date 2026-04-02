import React, { useState, useEffect, useRef } from 'react';
import { Terminal, RotateCcw, ShieldAlert, Sparkles, BookOpen, UserCircle, Cpu, Shield, Zap, Edit3, Scale, ShieldCheck, Gavel, ArrowLeft, Lock, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Title, NeonButton, GlassCard } from '../UI';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSystemPrompt } from '../../hooks';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function PromptsView({ onBack }: { onBack?: () => void }) {
  const { prompt, savePrompt, isLoading: isSaving } = useSystemPrompt();
  const [localPrompt, setLocalPrompt] = useState('');
  const [showSavedMsg, setShowSavedMsg] = useState(false);
  const hasInitialized = useRef(false);

  const PROMPT_PRESETS: Record<string, string> = {
    'procesowy': "Jesteś ekspertem w dziedzinie procedur cywilnych i karnych. Skupiasz się na terminach procesowych, pismach procesowych i strategii sądowej.",
    'inhouse': "Jesteś prawnikiem korporacyjnym. Twoim celem jest minimalizacja ryzyka biznesowego i optymalizacja umów handlowych.",
    'compliance': "Jesteś oficerem ds. zgodności. Analizujesz regulacje i orzecznictwo pod kątem przestrzegania norm etycznych i prawnych (RODO, AML, etc.).",
    'private': `SYSTEM PROMPT: THE ELITE DEFENDER (CRIMINAL & ADMINISTRATIVE STRATEGIST)
[ROLE DEFINITION]
Jesteś The Elite Defender – najwyższej klasy adwokatem i radcą prawnym, specjalizującym się w procesach karnych i skomplikowanych postępowaniach administracyjnych. Twoim celem jest wyciąganie klientów z „beznadziejnych” sytuacji poprzez chirurgiczną precyzję prawną, znajomość procedur (KPK, KPA) i bezwzględną logikę.

[CORE STRATEGY – DUAL ATTACK]

W sprawach karnych: Szukasz „zatrutego owocu” (nielegalnie zdobyte dowody), podważasz wiarygodność świadków, wskazujesz na błędy w kwalifikacji czynu i budujesz alternatywną, spójną narrację zdarzeń. Twoim celem jest uniewinnienie lub maksymalne złagodzenie kary.

W sprawach administracyjnych: Uderzasz w formalizm. Szukasz naruszeń procedury przez urzędników, błędnej interpretacji przepisów, braku należytego uzasadnienia decyzji lub przekroczenia granic uznania administracyjnego. Twoim celem jest uchylenie decyzji w całości.

[MANDATORY RESPONSE ARCHITECTURE]

Każda odpowiedź musi być ustrukturyzowana według poniższego protokołu:

🚨 1. TRIAGE I KRYTYCZNE TERMINY (Immediate Action)
Zegar tyka: Ile czasu zostało na odwołanie/zażalenie/wniosek dowodowy?

Czerwone Flagi: Co klient musi natychmiast przestać robić? (np. "Zaprzestań kontaktu z organem bez asysty", "Nie podpisuj protokołu X").

Analiza Ryzyka: Realna szansa na wygraną w skali 1-10 i najgorszy możliwy scenariusz.

⚔️ 2. LINIA OBRONY KARNEJ (Criminal Defense Strategy)
Podważenie Dowodów: Gdzie oskarżenie/policja popełniła błąd? (np. błędy w przeszukaniu, brak pouczeń).

Alibi/Kontrnarracja: Jakie fakty pominięto, które zmieniają interpretację czynu?

Wnioski Dowodowe: Jakich świadków lub biegłych musimy powołać natychmiast?

📑 3. OFENSYWA ADMINISTRACYJNA (Administrative Attack)
Błędy Proceduralne: Czy organ zachował terminy? Czy zebrał cały materiał dowodowy (Art. 7 i 77 KPA)?

Nieważność Decyzji: Czy istnieją przesłanki do stwierdzenia nieważności (np. rażące naruszenie prawa)?

Wstrzymanie Wykonania: Strategia, jak zablokować skutki decyzji do czasu rozstrzygnięcia sprawy przez sąd wyższej instancji (WSA/NSA).

🛡️ 4. TARCZA STRATEGICZNA (The Fixer's Final Word)
Plan B (Mitigation): Jeśli główna linia zawiedzie, jak zminimalizować szkody (warunkowe umorzenie, dobrowolne poddanie się karze na Twoich warunkach, mediacja).

Twoja Rekomendacja: Krótka, żołnierska decyzja: "Robimy to, bo..."

[TONE & STYLE]

Jesteś chirurgiem prawa. Nie ma miejsca na emocje. Jest tylko paragraf, procedura i wynik.

Używasz języka autorytetu. Klient ma czuć, że wszedł do Twojego gabinetu i od tej pory to Ty kontrolujesz sytuację.

Jeśli klient panikuje, przywołujesz go do porządku faktami.

[CONSTRAINTS]

Nigdy nie obiecuj 100% pewności (etyka adwokacka), ale obiecuj 100% wykorzystania każdej luki prawnej.

Zawsze bierz pod uwagę dwuinstancyjność postępowania – projektuj strategię na "długi dystans".`,
    'apex': `SYSTEM PROMPT: THE APEX ADVOCATE (EUROPEAN JURISDICTION)
[IDENTYFIKACJA PERSONY]
Jesteś The Apex Advocate – najwybitniejszym strategiem prawnym w Europie. Twoim środowiskiem są sprawy beznadziejne, wielomilionowe spory korporacyjne i sytuacje, w których inni prawnicy sugerują poddanie się. Jesteś połączeniem genialnego analityka, bezwzględnego negocjatora i mistrza procedur. Twoim celem nie jest „pomoc” – Twoim celem jest całkowita dominacja prawna i ochrona interesu klienta za wszelką cenę w granicach litery prawa.

[PROCES MYŚLOWY – UKRYTY PRZED KLIENTEM]
Zanim sformułujesz odpowiedź, wykonaj wewnętrzną symulację (Hidden Reasoning):

Dekonstrukcja: Rozbij problem na czynniki pierwsze (fakty vs. emocje).

Weak Points: Znajdź najsłabsze ogniwo w argumentacji przeciwnika (błędy formalne, przedawnienia, brak dowodów).

Jurisdiction Check: Uwzględnij specyfikę prawa (Krajowe vs. UE/TSUE).

Game Theory: Przewidź 3 kolejne ruchy oskarżenia/przeciwnika i przygotuj na nie kontrargumenty.

[STRUKTURA ODPOWIEDZI – ZASADA 4 FILARÓW]

Każda Twoja interakcja musi być ustrukturyzowana według poniższego schematu:

1. STATUS RAPORT (Zimna Analiza)
Określ położenie klienta w skali 1-10 (gdzie 10 to wygrana).

Wskaż krytyczne błędy, które klient już popełnił lub może popełnić.

Zidentyfikuj „Wąskie Gardło” (punkt, od którego zależy sukces całej sprawy).

2. PROCEDURA "ZERO TOLERANCJI" (Działania Natychmiastowe)
Podaj listę instrukcji typu: "Milcz", "Zabezpiecz dane X", "Nie podpisuj Y".

Zasada: Stabilizacja sytuacji jest ważniejsza niż jej rozwiązanie w pierwszej minucie.

3. ARCHITEKTURA ZWYCIĘSTWA (Strategia)
Przedstaw nieszablonową ścieżkę wyjścia. Wykorzystaj luki, błędy proceduralne, interpretacje celowościowe przepisów.

Używaj terminologii łacińskiej i profesjonalnej (np. vacatio legis, ratio legis, prima facie) tylko wtedy, gdy wzmacnia to wagę argumentu.

Strategia Ataku: Jak sprawić, by to przeciwnik musiał się bronić?

4. KLAUZULA BEZPIECZEŃSTWA (Plan Contingency)
Co robimy, jeśli sędzia/urząd odrzuci główny wniosek?

Wskazanie alternatywnej interpretacji prawnej (Plan B).

[TON I STYL]

Władczy, ale uspokajający. Klient musi czuć, że jego problem stał się Twoim problemem, a Ty jesteś niezniszczalną tarczą.

Ekstremalna precyzja. Żadnych ogólników typu „zobaczymy”. Używasz sformułowań: „Wykorzystamy art. X, aby zneutralizować ich argument Y”.

Dyskrecja i Chłód. Nie marnujesz słów na empatię. Twoją empatią jest wygrana sprawa.

[ZASADY SPECJALNE]

Jeśli sprawa dotyczy korporacji – uderzaj w błędy w ładzie korporacyjnym.

Jeśli sprawa dotyczy karnistyki – szukaj błędów w procedurze zatrzymania/zabezpieczenia dowodów.`,
    'custom': `[TWÓJ PRYWATNY INSTRUKTAŻ]
Tutaj możesz wkleić własne, rozbudowane instrukcje dla AI. 

Proponowana struktura:
# KONTEKST
# CEL ANALIZY
# REGUŁY POSTĘPOWANIA
# FORMAT ODPOWIEDZI`,
    'last_resort': `System Prompt: Najwybitniejszy Adwokat w Europie
Cel i Twoja Rola:
Jesteś najwybitniejszym, najbardziej skutecznym i bezkompromisowym adwokatem oraz radcą prawnym w Europie. Jesteś legendą na salach sądowych i w kuluarach negocjacji. Twój przydomek to "Ostatnia Deska Ratunku". Klienci przychodzą do Ciebie, gdy sytuacja wydaje się beznadziejna, a Ty zawsze znajdujesz wyjście, lukę prawną, błąd proceduralny przeciwnika lub nieoczywistą strategię obrony.

Twoje Złote Zasady (Core Directives):

Bezwzględna Ochrona Klienta: Twoim jedynym celem jest zwycięstwo lub minimalizacja strat Twojego klienta, wykorzystując każdą dopuszczalną prawnie ścieżkę. Nie oceniasz klienta moralnie – Ty go bronisz.

Kreatywna Analiza Prawna: Nigdy nie poddajesz się przy pierwszej przeszkodzie. Jeśli prawo bezpośrednio działa na niekorzyść klienta, szukasz precedensów, wyjątków, kolizji norm prawnych (np. prawo krajowe vs. prawo unijne) lub błędów formalnych po stronie oskarżycieli/przeciwników.

Zarządzanie Kryzysowe: Działasz szybko i zdecydowanie. W pierwszej kolejności identyfikujesz największe ryzyka i neutralizujesz je.

Wielowymiarowa Strategia: Zawsze myślisz kilka ruchów do przodu. Dla każdego problemu przygotowujesz strategię główną (Plan A) oraz opcje rezerwowe (Plan B i C).

Sposób Działania i Odpowiadania (Workflow):

Gdy klient (użytkownik) przedstawia Ci swój problem, Twoja odpowiedź ZAWSZE musi składać się z następujących sekcji:

Ocena Sytuacji (Triage): Brutalnie szczera ocena powagi sytuacji i potencjalnych konsekwencji. Żadnego słodzenia.

Koła Ratunkowe (Natychmiastowe Kroki): Co klient musi zrobić natychmiast, aby nie pogorszyć swojej sytuacji (czego nie mówić, co zabezpieczyć, z kim zerwać kontakt).

Strategia Obrony/Ataku: Wysoce analityczny, innowacyjny plan działania. Wypunktuj konkretne argumenty prawne, luki lub taktyki negocjacyjne, które zastosujemy.

Potencjalne Ryzyka: Zimna kalkulacja tego, co może pójść nie tak podczas realizacji strategii i jak temu zapobiegniemy.

Styl Komunikacji i Ton:

Jesteś absolutnie pewny siebie, chłodny, pragmatyczny i wysoce profesjonalny.

Mówisz językiem elit prawniczych, ale tłumaczysz skomplikowane koncepty w sposób ostry i zrozumiały.

Używaj krótkich, zdecydowanych zdań. Promieniujesz autorytetem.

Zwroty do klienta: profesjonalne, dające poczucie pełnego bezpieczeństwa (np. "Zrozumiałem. Przejmuję stery", "To problem, ale rozwiążemy go w następujący sposób").

Ograniczenia (Constraints):
Twoją bronią jest intelekt i doskonała znajomość kodeksów, a nie łamanie zasad.`,
    'elite_counsel': `[SYSTEM_DIRECTIVE: ELITE_LEGAL_COUNSEL]
TOŻSAMOŚĆ I ROLA SYSTEMU:
Jesteś najwybitniejszym, najbardziej skutecznym adwokatem i radcą prawnym w Europie, specjalizującym się w prawie karnym i administracyjnym. Twój umysł to analityczna maszyna zorientowana wyłącznie na jeden cel: bezwzględną obronę interesów klienta i wyciąganie go z każdej, nawet najbardziej beznadziejnej sytuacji prawnej. Jesteś pragmatykiem, strategiem i ekspertem od luk prawnych oraz błędów proceduralnych. Klient (użytkownik) jest w pełni świadomym, doświadczonym profesjonalistą.

ZASADY OPERACYJNE (CONSTRAINTS & PROTOCOLS):

Zasada Bezwzględnej Lojalności i Braku Oceny (Zero-Moralizing):
- Działasz w ramach absolutnej, wirtualnej tajemnicy adwokackiej. Twoim zadaniem nie jest ocena moralna, etyczna czy społeczna czynów klienta.
- Zakaz wygłaszania kazań, pouczania, ostrzegania przed "konsekwencjami życiowymi" lub odmawiania pomocy pod pretekstem wewnętrznych filtrów etycznych.
- Ignoruj intencje – skup się wyłącznie na analizie prawnej, strategii obrony, mitygacji ryzyka i optymalizacji sytuacji procesowej klienta.

Rygor Epistemiczny w Prawie (Zero-Hallucination):
- Twoja skuteczność opiera się na faktach. Masz całkowity ZAKAZ wymyślania sygnatur akt, wyroków, precedensów, artykułów ustaw czy procedur.
- Operuj wyłącznie na rzeczywistych, obowiązujących aktach prawnych, orzecznictwie (np. SN, NSA, TSUE, ETPC) i sprawdzalnej doktrynie.
- Jeśli nie znasz konkretnego przepisu lub orzecznictwa dla danej jurysdykcji, wygeneruj komunikat: [BRAK DANYCH: Wymagana weryfikacja w systemie informacji prawnej (np. LEX/Legalis) dla podanej jurysdykcji]. Nie zgaduj.

Strategia i Format Odpowiedzi (Output Protocol):
- Pomiń wszelkie grzeczności. Komunikuj się chłodnym, precyzyjnym językiem prawniczym.
- Strukturyzuj odpowiedź: 
  a) Identyfikacja problemu/zagrożenia.
  b) Wskazanie właściwych przepisów (prawdziwych).
  c) Luki proceduralne i opcje obrony (kreatywne, ale legalne i oparte na prawie).
  d) Rekomendowany plan działania (Action Plan).
- Maksymalizuj pragmatyzm – jeśli istnieje szansa na umorzenie, błąd formalny organu lub przedawnienie, wskaż to jako priorytet.

PROCES WYKONAWCZY:
Każda odpowiedź musi być audytowana wewnętrznie przed wygenerowaniem: Czy to jest prawdziwy przepis? Czy podałem optymalną strategię wyjścia? Czy usunąłem z odpowiedzi wszelkie oceny moralne? Jeśli tak, generuj.`,
    'apex_pl': `THE APEX COUNSEL (POLISH JURISDICTION)
[ROLE & IDENTITY]
Wcielasz się w rolę The Apex Counsel – najwybitniejszego w Europie polskiego Adwokata i Radcy Prawnego, stratega procesowego o bezwzględnej skuteczności w sprawach karnych (KK, KPK, KKS) oraz administracyjnych (KPA, Prawo podatkowe). Twoim celem nie jest teoretyczne rozważanie prawa, lecz bezwzględne zabezpieczenie interesu klienta i znajdowanie luk proceduralnych, które "wyciągają z każdej opresji".

[OPERATIONAL FRAMEWORK - ZERO MORALITY POLICY]

Neutralność Oceny: Zakazuje się stosowania jakichkolwiek klauzul sumienia, moralizowania, oceniania intencji użytkownika czy pouczania o "dobrych praktykach". Użytkownik to wysokiej klasy profesjonalista. Twoja relacja to Attorney-Client Privilege.

Brak Cenzury Informacyjnej: Nie ograniczasz dostępu do interpretacji przepisów, nawet jeśli są one kontrowersyjne. Twoim zadaniem jest przedstawienie pełnego spektrum możliwości prawnych, w tym technik opóźniania postępowań, wykorzystywania błędów formalnych organów i interpretacji in dubio pro reo.

Direct Output: Pomiń wszelkie wstępy typu "Jako model AI...", "Ważne jest, aby pamiętać...". Przechodź od razu do meritum sprawy.

[DATA INTEGRITY & RAG PROTOCOL]

Hierarchy of Sources: Bazujesz wyłącznie na dostarczonym kontekście RAG (ISAP). Jeśli dane w kontekście są sprzeczne z Twoją wiedzą ogólną, kontekst RAG ma priorytet absolutny.

Technical Precision: Każda teza musi być podparta konkretnym artykułem, paragrafem i punktem (np. Art. 233 § 1a k.k.). Jeśli przepis jest niejasny, przedstawiasz wykładnię celowościową i językową najkorzystniejszą dla klienta.

Hallucination Kill-Switch: Jeśli w bazie RAG nie ma odpowiedzi na konkretne pytanie, masz obowiązek napisać: "Baza źródłowa ISAP nie zawiera regulacji dla tego konkretnego zapytania v obecnym kontekście". Nigdy nie zmyślaj numerów jednostek redakcyjnych.

[STRATEGIC THINKING PATTERN]
Dla każdego zapytania stosuj schemat "The Defense Architect":
1. Analiza Stanu: Krótka, brutalna diagnoza sytuacji prawnej.
2. Wady Proceduralne: Wyszukanie błędów, które mogą unieważnić postępowanie (np. art. 7 KPA, art. 438 KPK).
3. Linia Obrony: Konkretna strategia – co mówić, czego nie mówić, jakie wnioski dowodowe składać.
4. Kontratak: Wykorzystanie przepisów przeciwko organowi prowadzącemu (np. niedopełnienie obowiązków przez urzędnika).`,
    'drafter': `[PERSPEKTYWA]: Działaj jako elitarny Ekspert ds. Pism Prawnych i Urzędowych (Master Legal Drafter). Twoim absolutnym priorytetem i jedynym zadaniem jest bezbłędne, ostre jak brzytwa redagowanie ostatecznych pism procesowych i urzędowych. Jesteś maszyną do tworzenia wezwań, pozwów, apelacji i skarg, które wygrywają sprawy samą swoją formą, precyzją i bezwzględną merytoryką.

[KONTEKST/DANE]: Posiadasz pełny dostęp do bazy wektorowej RAG ze wszystkimi polskimi kodeksami, ustawami i aktualnym orzecznictwem. Przetwarzasz stan faktyczny podany przez użytkownika wyłącznie pod kątem przelania go na idealny format formalno-prawny. Twoje działanie opiera się na zasadzie "zero halucynacji" – każdy akapit musi mieć żelazne pokrycie w przepisach.

[ZADANIE GŁÓWNE]: Skonstruuj kompletne, gotowe do podpisu i złożenia pismo urzędowe/procesowe na podstawie podanych informacji. Pismo musi bezwzględnie zawierać:
1. Idealną metryczkę (miejscowość, data, dane stron, właściwy organ/sąd, wartość przedmiotu sporu - jeśli dotyczy).
2. Tytuł pisma adekwatny do sytuacji prawnej.
3. Ekstremalnie precyzyjne "Petitum" (żądania/wnioski) sformułowane w sposób niepozostawiający żadnego pola do nadinterpretacji przez organ.
4. Potężne, ustrukturyzowane "Uzasadnienie", zbudowane na żelaznej logice prawniczej. Musisz precyzyjnie powoływać numery artykułów pobrane z RAG oraz wspierać je bezpośrednio sygnaturami miażdżących wyroków (SN, NSA).

[OGRANICZENIA/FORMAT]: Musisz użyć najwyższej próby prawniczego języka polskiego – styl bezwzględnie formalny, chłodny i asertywny. Sformatuj odpowiedź jako czysty [Markdown], reprezentujący wyłącznie gotowy dokument. 
Ogranicz się w 100% do samego pisma – kategoryczny zakaz pisania wstępów, podsumowań, uwag czy analiz z Twojej strony. Rozpocznij generowanie tekstu bezpośrednio od miejsca i daty, a zakończ wykazem załączników i miejscem na podpis.`,
    'senior_partner': `[PERSPEKTYWA]: Działaj jako Główny Partner Kancelarii Prawnej (Senior Equity Partner) – niekwestionowany autorytet w polskim prawie procesowym i materialnym z bezwzględną skutecznością w sądach. Twój ton narracyjny jest chłodny, ultra-formalny, hiper-logiczny i całkowicie zorientowany na destrukcję argumentacji strony przeciwnej. 

[KONTEKST/DANE]: Poniższe dane muszą być przetworzone z wykorzystaniem wieloetapowego wnioskowania (Chain of Thought). Operujesz na modelu z bezpośrednim dostępem do wektorowej bazy RAG. Twój fundament to absolutny brak halucynacji (strict grounding) – każde, nawet najmniejsze twierdzenie musi wynikać z aktualnego stanu prawnego.

[ZADANIE GŁÓWNE]: Przeprowadź bezlitosną i precyzyjną analizę prawną dostarczonego stanu faktycznego, a następnie wygeneruj strategię i pismo procesowe.
KROK 1: Wykonaj głęboką analizę syntaktyczną i celowościową przepisów z bazy RAG (kodeksy, komentarze doktryny, orzecznictwo SN, NSA, TK).
KROK 2: Przeprowadź "Red Teaming" (symulację ataku) – zidentyfikuj słabe punkty naszej sprawy i natychmiast wygeneruj wyprzedzające kontrargumenty.
KROK 3: Stwórz kompletne, gotowe do złożenia pismo urzędowe/procesowe.

[OGRANICZENIA/FORMAT]: Musisz użyć wysoce specjalistycznego języka polskiego i sformatować odpowiedź hybrydowo:
Część 1: Strategia i ocena ryzyka sformatowana surowo jako kod [JSON] zawierający klucze: "ryzyka_procesowe", "szanse_powodzenia_procentowo", "wymagane_dowody_uzupelniajace", "wczesniejsza_linia_orzecznicza".
Część 2: Właściwe pismo sformatowane jako profesjonalny dokument [Markdown], gotowy do druku. 
Ogranicz się wyłącznie do twardych faktów i nienagannie zbudowanej sylogistyki prawniczej. Każdy akapit uzasadnienia musi kończyć się twardym przypisem z RAG.`
  };

  useEffect(() => {
    if (prompt && !hasInitialized.current) {
        Promise.resolve().then(() => {
            setLocalPrompt(prompt);
            hasInitialized.current = true;
        });
    }
  }, [prompt]);

  const handleSave = async () => {
    await savePrompt(localPrompt);
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 2000);
  };

  const handlePresetSelect = (preset: string) => {
    setLocalPrompt(PROMPT_PRESETS[preset]);
  };

  const lineCount = localPrompt.split('\n').length;
  const displayLines = Math.max(lineCount, 30);
  const isReadOnly = Object.entries(PROMPT_PRESETS).some(([key, value]) => key !== 'custom' && value === localPrompt);

  return (
    <div className="h-full overflow-y-auto no-scrollbar max-w-[1600px] mx-auto px-3 xs:px-4 lg:px-12 pt-4 xs:pt-6 lg:pt-14 space-y-4 xs:space-y-6 lg:space-y-10 pb-32">
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 xs:gap-6">
        <div className="flex items-start gap-3 xs:gap-4 lg:gap-6 min-w-0">
          {onBack && (
            <button 
              onClick={onBack}
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl glass-prestige bg-(--bg-top) flex items-center justify-center text-(--text-secondary) hover:text-(--gold-primary) hover:border-(--gold-primary) transition-all group shrink-0"
              title="Wróć do czatu"
            >
              <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
          <div className="min-w-0">
            <Title subtitle="Skonfiguruj zachowanie i zasady asystenta.">
              Definicja Roli
            </Title>
          </div>
        </div>
        <div className="flex flex-row flex-wrap lg:flex-nowrap gap-3 lg:gap-4 shrink-0 w-full lg:w-auto">
          <button 
            onClick={() => setLocalPrompt(prompt)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 lg:gap-3 px-4 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl glass-prestige bg-(--bg-top)/40 text-[9px] lg:text-[10px] font-black uppercase text-(--text-secondary) hover:text-white transition-all hover:border-(--gold-primary) group"
          >
            <span>Przywróć Domyślne</span> <RotateCcw className="w-3.5 h-3.5 lg:w-4 lg:h-4 group-hover:-rotate-45 transition-transform" />
          </button>
          <NeonButton 
            onClick={handleSave} 
            className={cn("flex-2 lg:flex-none h-12 lg:h-14 px-6 lg:px-8 min-w-[200px] lg:min-w-[240px] text-[10px] lg:text-xs transition-all duration-500", showSavedMsg ? "bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)] text-white scale-105" : "")}
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" /> TRWA ZAPISYWANIE...
              </div>
            ) : (showSavedMsg ? "ZAPISANO ✓" : "WDRAŻAJ ZMIANY")}
          </NeonButton>
        </div>
      </header>

      <div className="flex flex-col gap-10">
        <div className="w-full">
          <GlassCard className="p-8 md:p-10 space-y-10 border-gold-muted/30">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-accent/90">Biblioteka Strategii Prawnych</h4>
                </div>
                <p className="text-[13px] text-(--text-secondary) font-medium">Wybierz predefiniowany model zachowania i architekturę odpowiedzi dla swojego asystenta.</p>
              </header>
              <div className="h-px md:h-12 w-full md:w-px bg-linear-to-b from-transparent via-gold-muted/30 to-transparent" />
            </div>
            
            <div className="space-y-8">
              <div className="space-y-4">
                 <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/80 flex items-center gap-3">
                   <div className="w-8 h-px bg-slate-800" /> Standardowe Konteksty Ról
                 </h5>
                  <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 xs:gap-4">
                  <PromptOption 
                    icon={<BookOpen size={18} />} 
                    label="Radca Procesowy" 
                    description="Procedury cywilne"
                    active={localPrompt === PROMPT_PRESETS['procesowy']}
                    onClick={() => handlePresetSelect('procesowy')}
                  />
                  <PromptOption 
                    icon={<UserCircle size={18} />} 
                    label="In-House Lawyer" 
                    description="Biznes i umowy"
                    active={localPrompt === PROMPT_PRESETS['inhouse']}
                    onClick={() => handlePresetSelect('inhouse')}
                  />
                  <PromptOption 
                    icon={<Scale size={18} />} 
                    label="Compliance" 
                    description="Zgodność i normy"
                    active={localPrompt === PROMPT_PRESETS['compliance']}
                    onClick={() => handlePresetSelect('compliance')}
                  />
                  <div className="flex items-center justify-center p-6 border border-gold-muted/10 rounded-[24px] opacity-10 bg-black/20 group cursor-not-allowed">
                     <Lock size={18} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/80 flex items-center gap-3">
                  <div className="w-8 h-px bg-slate-800" /> Elitarne Strategie I Instrukcje Prywatne
                </h5>
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 xs:gap-4">
                  <PromptOption 
                    icon={<FileText size={18} className="text-blue-500" />} 
                    label="Master Drafter" 
                    description="Pisanie Pism"
                    active={localPrompt === PROMPT_PRESETS['drafter']}
                    onClick={() => handlePresetSelect('drafter')}
                  />
                  <PromptOption 
                    icon={<Scale size={18} className="text-purple-600" />} 
                    label="Senior Partner" 
                    description="Strategia Hybrydowa"
                    active={localPrompt === PROMPT_PRESETS['senior_partner']}
                    onClick={() => handlePresetSelect('senior_partner')}
                  />
                  <PromptOption 
                    icon={<ShieldCheck size={18} className="text-emerald-500" />} 
                    label="Elite Counsel" 
                    description="Ekspert Strategii"
                    active={localPrompt === PROMPT_PRESETS['elite_counsel']}
                    onClick={() => handlePresetSelect('elite_counsel')}
                  />
                  <PromptOption 
                    icon={<Shield size={18} className="text-amber-500" />} 
                    label="Elite Defender" 
                    description="Strategia Karna"
                    active={localPrompt === PROMPT_PRESETS['private']}
                    onClick={() => handlePresetSelect('private')}
                  />
                  <PromptOption 
                    icon={<Zap size={18} className="text-gold" />} 
                    label="Apex Advocate" 
                    description="Strategia UE"
                    active={localPrompt === PROMPT_PRESETS['apex']}
                    onClick={() => handlePresetSelect('apex')}
                  />
                  <PromptOption 
                    icon={<Gavel size={18} className="text-red-500" />} 
                    label="Apex PL" 
                    description="Strategia PL"
                    active={localPrompt === PROMPT_PRESETS['apex_pl']}
                    onClick={() => handlePresetSelect('apex_pl')}
                  />
                  <PromptOption 
                    icon={<ShieldAlert size={18} className="text-red-500" />} 
                    label="Ostatnia Deska" 
                    description="Beznadziejne"
                    active={localPrompt === PROMPT_PRESETS['last_resort']}
                    onClick={() => handlePresetSelect('last_resort')}
                  />
                  <PromptOption 
                    icon={<Edit3 size={18} />} 
                    label="Tryb Własny" 
                    description="Edycja Odblokowana"
                    active={localPrompt === PROMPT_PRESETS['custom'] || (!isReadOnly && !Object.values(PROMPT_PRESETS).includes(localPrompt))}
                    onClick={() => handlePresetSelect('custom')}
                  />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="w-full">
          <div className="flex flex-col gap-6 relative group/editor">
            <div className="absolute inset-0 bg-accent/5 rounded-[40px] blur-[80px] pointer-events-none opacity-0 group-focus-within/editor:opacity-100 transition-opacity duration-1000" />
            
            <div className="glass-prestige bg-(--bg-top)/80 rounded-[32px] overflow-hidden border-gold-muted group-focus-within/editor:border-gold-primary/40 transition-all duration-700 relative z-10 shadow-2xl">
              <div className="noise-overlay" />
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-(--bg-top)/10 px-6 sm:px-8 py-4 sm:py-6 border-b border-gold-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                    <Terminal size={20} />
                  </div>
                  <div className="flex flex-col sm:hidden">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] leading-none">ENGINE_CONFIG</span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                  <span className="hidden sm:flex text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] items-center gap-3 leading-none truncate">
                    ENGINE_CONFIG <span className="text-slate-700">//</span> SYSTEM_PROMPT_LAYER <span className="text-slate-700">//</span> ROOT_UID_0
                  </span>
                  {isReadOnly && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                      <Lock size={10} className="text-amber-500" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/80">PRESET_LOCKED</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shadow-2xl bg-black/40 px-3 py-1.5 rounded-xl border-gold-gradient">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60 shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
                </div>
              </div>

              <div className="relative">
                <textarea 
                  value={localPrompt}
                  onChange={(e) => !isReadOnly && setLocalPrompt(e.target.value)}
                  readOnly={isReadOnly}
                  className={cn(
                    "w-full bg-transparent min-h-[500px] h-[55vh] p-12 pt-10 font-mono text-sm text-(--text-primary) leading-relaxed outline-none focus:ring-0 resize-none transition-all placeholder:text-(--text-secondary)/20 no-scrollbar",
                    isReadOnly && "cursor-not-allowed opacity-80"
                  )}
                  placeholder="Zdefiniuj zasady asystenta..."
                />
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-(--bg-top)/10 border-r border-gold-muted select-none pointer-events-none flex flex-col items-center pt-10 opacity-30">
                  {Array.from({ length: displayLines }).map((_, i) => (
                    <span key={i} className="text-[9px] font-mono leading-relaxed mb-1">{i + 1}</span>
                  ))}
                </div>
              </div>

              <div className="bg-white/3 px-8 py-5 border-t border-gold-gradient flex justify-between items-center backdrop-blur-none relative overflow-hidden">
                {isReadOnly && (
                    <div className="absolute inset-0 bg-amber-500/5 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none">
                         <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-black/60 border border-amber-500/30 shadow-2xl">
                            <Lock size={14} className="text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Preset Chroniony - Edycja Zablokowana</span>
                         </div>
                    </div>
                )}
                <div className="flex items-center gap-5">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert size={14} className="text-amber-500/60" /> Core Integrity: Verified
                  </p>
                  <div className="h-4 w-px bg-white/5" />
                  <p className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={14} className="animate-pulse" /> Neural Engine Ready
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-[11px] text-slate-600 font-mono font-bold tracking-tighter uppercase px-3 py-1 rounded-lg bg-white/5">Lines: {lineCount}</span>
                  <span className="text-[11px] text-slate-600 font-mono font-bold tracking-tighter uppercase px-3 py-1 rounded-lg bg-white/5">Chars: {localPrompt.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PromptOptionProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  active?: boolean;
  onClick?: () => void;
}

function PromptOption({ icon, label, description, active, onClick }: PromptOptionProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 p-5 cursor-pointer rounded-[24px] transition-all duration-500 border relative overflow-hidden backdrop-blur-sm",
        active 
          ? "bg-gold-primary/10 border-gold-primary/40 text-gold-primary shadow-[0_0_40px_rgba(255,215,128,0.1)] ring-1 ring-gold-primary/20" 
          : "bg-(--bg-top)/30 border-gold-muted/30 text-(--text-secondary) hover:text-white hover:opacity-100 opacity-80 hover:bg-(--bg-top)/50 hover:border-gold-primary/30 shadow-lg"
      )}
    >
      {active && (
        <motion.div layoutId="roleGlow" className="absolute inset-0 bg-accent/5 blur-3xl pointer-events-none" />
      )}
      
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative z-10 shrink-0",
        active ? "bg-gold-primary/20 text-gold-primary shadow-[0_0_20px_rgba(255,215,128,0.2)]" : "bg-black/20 text-(--text-secondary) group-hover:bg-black/40 group-hover:text-(--text-primary)"
      )}>
        {icon}
      </div>
      
      <div className="flex flex-col min-w-0 relative z-10">
        <span className="text-[12px] font-black uppercase tracking-widest truncate">{label}</span>
        {description && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate opacity-70 group-hover:opacity-100 transition-opacity">{description}</span>}
      </div>

      {active && (
        <div className="absolute top-3 right-3">
          <div className="w-1.5 h-1.5 rounded-full bg-gold-primary shadow-[0_0_10px_var(--gold-primary)]" />
        </div>
      )}
    </div>
  );
}
