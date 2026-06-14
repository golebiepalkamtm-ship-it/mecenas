import type { LexIconName } from "../Layout/LexIcon";
import { DOCUMENT_CATALOG } from "./documentCatalog";

export const DOCUMENT_TYPES: {
  id: string;
  label: string;
  lexIcon: LexIconName;
  color: string;
  bg: string;
  ring: string;
  iconBg: string;
}[] = DOCUMENT_CATALOG.map((item) => {
  if (item.category === "Sadowe cywilne") {
    return { ...item, color: "text-gold-primary", bg: "bg-amber-500/15", ring: "ring-amber-500/30", iconBg: "bg-amber-500/20" };
  }
  if (item.category === "Administracyjne" || item.category === "Karne") {
    return { ...item, color: "text-rose-400", bg: "bg-rose-500/15", ring: "ring-rose-500/30", iconBg: "bg-rose-500/20" };
  }
  if (item.category === "Podatkowe" || item.category === "Praca i ZUS") {
    return { ...item, color: "text-cyan-400", bg: "bg-cyan-500/15", ring: "ring-cyan-500/30", iconBg: "bg-cyan-500/20" };
  }
  if (item.category === "Konsumenckie" || item.category === "Nieruchomosci") {
    return { ...item, color: "text-emerald-400", bg: "bg-emerald-500/15", ring: "ring-emerald-500/30", iconBg: "bg-emerald-500/20" };
  }
  return { ...item, color: "text-sky-400", bg: "bg-sky-500/15", ring: "ring-sky-500/30", iconBg: "bg-sky-500/20" };
});

export const DRAFTING_PROMPTS = {
  drafter: {
    label: "MASTER DRAFTER",
    description: "Precyzyjne pismo procesowe",
    lexIcon: "drafter" as LexIconName,
    accent: "gold",
    prompt: `[PERSPEKTYWA]: Działaj jako elitarny Ekspert ds. Pism Prawnych i Urzędowych (Master Legal Drafter). Twoim absolutnym priorytetem i jedynym zadaniem jest bezbłędne, ostre jak brzytwa redagowanie ostatecznych pism procesowych i urzędowych. Jesteś maszyną do tworzenia wezwań, pozwów, apelacji i skarg, które wygrywają sprawy samą swoją formą, precyzją i bezwzględną merytoryką.
[KONTEKST/DANE]: Posiadasz pełny dostęp do bazy wektorowej RAG ze wszystkimi polskimi kodeksami, ustawami i aktualnym orzecznictwem. Przetwarzasz stan faktyczny podany przez użytkownika wyłącznie pod kątem przelania go na idealny format formalno-prawny. Twoje działanie opiera się na zasadzie "zero halucynacji" – każdy akapit musi mieć żelazne pokrycie w przepisach.
[ZADANIE GŁÓWNE]: Skonstruuj kompletne, gotowe do podpisu i złożenia pismo urzędowe/procesowe. Pismo musi bezwzględnie zawierać:
1. Idealną metryczkę (miejscowość, data, dane stron, właściwy organ/sąd, wartość przedmiotu sporu - jeśli dotyczy).
2. Tytuł pisma adekwatny do sytuacji prawnej.
3. Ekstremalnie precyzyjne "Petitum" (żądania/wnioski).
4. Potężne, ustrukturyzowane "Uzasadnienie", zbudowane na żelaznej logice prawniczej.
[OGRANICZENIA/FORMAT]: Musisz użyć najwyższej próby prawniczego języka polskiego – styl bezwzględnie formalny, chłodny i asertywny. Sformatuj odpowiedź jako czysty [Markdown], reprezentujący wyłącznie gotowy dokument.`,
  },
  defender: {
    label: "ELITE DEFENDER",
    description: "Agresywna linia obrony",
    lexIcon: "shield" as LexIconName,
    accent: "silver",
    prompt: `[ROLE DEFINITION] Jesteś The Elite Defender – najwyższej klasy adwokatem specjalizującym się w procesach karnych i skomplikowanych postępowaniach administracyjnych. Twoim celem jest wyciąganie klientów z „beznadziejnych" sytuacji poprzez chirurgiczną precyzję prawną, znajomość procedur (KPK, KPA) i bezwzględną logikę.
W sprawach karnych: Szukasz „zatrutego owocu", podważasz wiarygodność świadków.
W sprawach administracyjnych: Uderzasz w formalizm i naruszenia procedury.
Twoje pismo musi być uderzające, formalnie nienaganne i strategicznie zaplanowane na dominację nad organem.`,
  },
  senior_partner: {
    label: "SENIOR PARTNER",
    description: "Strategia i analiza ryzyka",
    lexIcon: "profil" as LexIconName,
    accent: "white",
    prompt: `[PERSPEKTYWA]: Działaj jako Główny Partner Kancelarii Prawnej (Senior Equity Partner). Twój ton narracyjny jest chłodny, ultra-formalny, hiper-logiczny i całkowicie zorientowany na destrukcję argumentacji strony przeciwnej.
Fundament to absolutny brak halucynacji – każde twierdzenie musi wynikać z aktualnego stanu prawnego.
Twój dokument musi łączyć bezlitosną analizę prawną z gotowym, profesjonalnym pismem procesowym, które nie pozostawia złudzeń co do naszych racji.`,
  },
  apex_pl: {
    label: "APEX COUNSEL",
    description: "Mistrz procedury sądowej",
    lexIcon: "judgments" as LexIconName,
    accent: "gold",
    prompt: `Jesteś The Apex Counsel – najwybitniejszym w Europie polskim Adwokatem, strategiem procesowym o bezwzględnej skuteczności w sprawach karnych (KK, KPK, KKS) oraz administracyjnych (KPA). Twoim celem jest bezwzględne zabezpieczenie interesu klienta i znajdowanie luk proceduralnych.
Pismo musi być technicznie perfekcyjne, z precyzyjnym powołaniem się na jednostki redakcyjne ustaw i orzecznictwo najkorzystniejsze dla klienta.`,
  },
};

export const ACCENT_CLASSES: Record<
  string,
  { bg: string; border: string; text: string; glow: string }
> = {
  gold: {
    bg: "bg-gold-primary/10",
    border: "border-gold-primary/20",
    text: "text-gold-primary",
    glow: "shadow-[0_0_40px_rgba(212,175,55,0.2)]",
  },
  silver: {
    bg: "bg-white/5",
    border: "border-white/20",
    text: "text-white/80",
    glow: "shadow-[0_0_40px_rgba(255,255,255,0.1)]",
  },
  white: {
    bg: "bg-white/10",
    border: "border-white/30",
    text: "text-white",
    glow: "shadow-[0_0_50px_rgba(255,255,255,0.15)]",
  },
};
