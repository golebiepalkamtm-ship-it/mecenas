import type { LexIconName } from "../Layout/LexIcon";

export interface DocumentCatalogItem {
  id: string;
  label: string;
  category: string;
  lexIcon: LexIconName;
  defaultInstructions: string;
  recipientPresetId?: string;
}

export const DOCUMENT_CATALOG: DocumentCatalogItem[] = [
  // Sadowe - cywilne
  { id: "pozew-zaplata", label: "Pozew o zaplate", category: "Sadowe cywilne", lexIcon: "judgments", defaultInstructions: "Sporzadz pozew o zaplate. Uwzglednij wartosc przedmiotu sporu, odsetki, termin wymagalnosci i dowody.", recipientPresetId: "sad-rejonowy" },
  { id: "pozew-rozwod", label: "Pozew o rozwod", category: "Sadowe cywilne", lexIcon: "judgments", defaultInstructions: "Sporzadz pozew o rozwod. Uwzglednij zadanie dotyczace winy, alimentow, kontaktow i kosztow postepowania.", recipientPresetId: "sad-okregowy" },
  { id: "pozew-alimenty", label: "Pozew o alimenty", category: "Sadowe cywilne", lexIcon: "judgments", defaultInstructions: "Sporzadz pozew o alimenty. Wskaz potrzeby uprawnionego, mozliwosci zobowiazanego i dowody.", recipientPresetId: "sad-rejonowy" },
  { id: "pozew-eksmisja", label: "Pozew o eksmisje", category: "Sadowe cywilne", lexIcon: "judgments", defaultInstructions: "Sporzadz pozew o eksmisje. Opisz tytul prawny lokalu, naruszenia i dotychczasowe wezwania.", recipientPresetId: "sad-rejonowy" },
  { id: "odpowiedz-pozew", label: "Odpowiedz na pozew", category: "Sadowe cywilne", lexIcon: "documents", defaultInstructions: "Sporzadz odpowiedz na pozew. Odpowiedz na kazde zadanie, podnies zarzuty i przedstaw dowody.", recipientPresetId: "sad-rejonowy" },
  { id: "sprzeciw-nakaz", label: "Sprzeciw od nakazu zaplaty", category: "Sadowe cywilne", lexIcon: "documents", defaultInstructions: "Sporzadz sprzeciw od nakazu zaplaty. Zakwestionuj roszczenie i wskaz wszystkie zarzuty materialne i formalne.", recipientPresetId: "sad-rejonowy" },
  { id: "zarzuty-nakaz", label: "Zarzuty od nakazu zaplaty", category: "Sadowe cywilne", lexIcon: "documents", defaultInstructions: "Sporzadz zarzuty od nakazu zaplaty w postepowaniu nakazowym. Wnies o uchylenie nakazu.", recipientPresetId: "sad-rejonowy" },
  { id: "apelacja-cywilna", label: "Apelacja w sprawie cywilnej", category: "Sadowe cywilne", lexIcon: "documents", defaultInstructions: "Sporzadz apelacje cywilna. Wskaz zakres zaskarzenia, zarzuty, wnioski i uzasadnienie.", recipientPresetId: "sad-okregowy" },
  { id: "zazalenie-cywilne", label: "Zazalenie", category: "Sadowe cywilne", lexIcon: "documents", defaultInstructions: "Sporzadz zazalenie na postanowienie. Wskaz zaskarzone rozstrzygniecie, zarzuty i wniosek.", recipientPresetId: "sad-okregowy" },
  { id: "wniosek-dowodowy", label: "Pismo z wnioskami dowodowymi", category: "Sadowe cywilne", lexIcon: "file", defaultInstructions: "Sporzadz pismo zawierajace wnioski dowodowe. Uzasadnij przydatnosc i tezy dowodowe.", recipientPresetId: "sad-rejonowy" },
  { id: "wniosek-uzasadnienie", label: "Wniosek o uzasadnienie wyroku", category: "Sadowe cywilne", lexIcon: "file", defaultInstructions: "Sporzadz wniosek o uzasadnienie wyroku z zachowaniem terminow i sygnatury.", recipientPresetId: "sad-rejonowy" },
  { id: "wniosek-przywrocenie-terminu", label: "Wniosek o przywrocenie terminu", category: "Sadowe cywilne", lexIcon: "file", defaultInstructions: "Sporzadz wniosek o przywrocenie terminu i uprawdopodobnij brak winy w uchybieniu.", recipientPresetId: "sad-rejonowy" },

  // Administracyjne
  { id: "odwolanie-decyzja-admin", label: "Odwolanie od decyzji administracyjnej", category: "Administracyjne", lexIcon: "shield", defaultInstructions: "Sporzadz odwolanie od decyzji administracyjnej. Wskaz naruszenia prawa materialnego i proceduralnego.", recipientPresetId: "sko-jelenia-gora" },
  { id: "skarga-wsa", label: "Skarga do WSA", category: "Administracyjne", lexIcon: "shield", defaultInstructions: "Sporzadz skarge do WSA na decyzje administracyjna. Dodaj wniosek o uchylenie decyzji.", recipientPresetId: "wsa-wroclaw" },
  { id: "skarga-kasacyjna-nsa", label: "Skarga kasacyjna do NSA", category: "Administracyjne", lexIcon: "shield", defaultInstructions: "Sporzadz skarge kasacyjna do NSA. Oparta na podstawach kasacyjnych z PPSA.", recipientPresetId: "nsa" },
  { id: "ponaglenie-kpa", label: "Ponaglenie (bezczynnosc/przewleklosc)", category: "Administracyjne", lexIcon: "shield", defaultInstructions: "Sporzadz ponaglenie z art. 37 KPA z uzasadnieniem bezczynnosci lub przewleklosci.", recipientPresetId: "urzad-miasta" },
  { id: "wniosek-info-publiczna", label: "Wniosek o informacje publiczna", category: "Administracyjne", lexIcon: "file", defaultInstructions: "Sporzadz wniosek o udostepnienie informacji publicznej. Okresl zakres, forme i sposob udostepnienia.", recipientPresetId: "urzad-miasta" },
  { id: "pismo-ogolne-epuap", label: "Pismo ogolne do urzedu (ePUAP)", category: "Administracyjne", lexIcon: "file", defaultInstructions: "Sporzadz pismo ogolne do podmiotu publicznego z jasnym zadaniem i uzasadnieniem.", recipientPresetId: "urzad-miasta" },
  { id: "wniosek-zaswiadczenie", label: "Wniosek o zaswiadczenie", category: "Administracyjne", lexIcon: "file", defaultInstructions: "Sporzadz wniosek o wydanie zaswiadczenia, wskaz interes prawny i cel.", recipientPresetId: "urzad-miasta" },
  { id: "wniosek-umorzenie-postepowania", label: "Wniosek o umorzenie postepowania administracyjnego", category: "Administracyjne", lexIcon: "file", defaultInstructions: "Sporzadz wniosek o umorzenie postepowania administracyjnego z podstawa prawna.", recipientPresetId: "urzad-miasta" },

  // Konsumenckie / cywilne przedsadowe
  { id: "reklamacja-towaru", label: "Reklamacja towaru", category: "Konsumenckie", lexIcon: "gavel", defaultInstructions: "Sporzadz reklamacje z tytulu niezgodnosci towaru z umowa. Wskaz zadanie i termin realizacji." },
  { id: "reklamacja-uslugi", label: "Reklamacja uslugi", category: "Konsumenckie", lexIcon: "gavel", defaultInstructions: "Sporzadz reklamacje uslugi. Opisz nienalezyte wykonanie i oczekiwany sposob rozliczenia." },
  { id: "odstapienie-14-dni", label: "Odstapienie od umowy (14 dni)", category: "Konsumenckie", lexIcon: "gavel", defaultInstructions: "Sporzadz oswiadczenie o odstapieniu od umowy zawartej na odleglosc." },
  { id: "wezwanie-zaplaty", label: "Przedsadowe wezwanie do zaplaty", category: "Konsumenckie", lexIcon: "gavel", defaultInstructions: "Sporzadz przedsadowe wezwanie do zaplaty z terminem i zapowiedzia skierowania sprawy do sadu." },
  { id: "wezwanie-wykonanie-umowy", label: "Wezwanie do wykonania umowy", category: "Konsumenckie", lexIcon: "gavel", defaultInstructions: "Sporzadz wezwanie do wykonania umowy i usuniecia naruszen." },
  { id: "wezwanie-usuniecie-wad", label: "Wezwanie do usuniecia wad", category: "Konsumenckie", lexIcon: "gavel", defaultInstructions: "Sporzadz wezwanie do usuniecia wad i wskaz konsekwencje braku reakcji." },
  { id: "wezwanie-zwrot-zaliczki", label: "Wezwanie do zwrotu zaliczki", category: "Konsumenckie", lexIcon: "gavel", defaultInstructions: "Sporzadz wezwanie do zwrotu zaliczki z naliczeniem odsetek ustawowych." },
  { id: "wypowiedzenie-najem", label: "Wypowiedzenie umowy najmu", category: "Konsumenckie", lexIcon: "documents", defaultInstructions: "Sporzadz wypowiedzenie umowy najmu, podaj podstawe i termin wypowiedzenia." },
  { id: "wypowiedzenie-telekom", label: "Wypowiedzenie umowy telekomunikacyjnej", category: "Konsumenckie", lexIcon: "documents", defaultInstructions: "Sporzadz wypowiedzenie umowy uslug telekomunikacyjnych z data i numerem umowy." },

  // Praca i ZUS
  { id: "odwolanie-wypowiedzenie-praca", label: "Odwolanie od wypowiedzenia umowy o prace", category: "Praca i ZUS", lexIcon: "documents", defaultInstructions: "Sporzadz odwolanie do sadu pracy od wypowiedzenia umowy o prace.", recipientPresetId: "sad-rejonowy" },
  { id: "pozew-przywrocenie-pracy", label: "Pozew o przywrocenie do pracy", category: "Praca i ZUS", lexIcon: "judgments", defaultInstructions: "Sporzadz pozew o przywrocenie do pracy i wynagrodzenie za czas pozostawania bez pracy.", recipientPresetId: "sad-rejonowy" },
  { id: "pozew-zalegle-wynagrodzenie", label: "Pozew o zalegle wynagrodzenie", category: "Praca i ZUS", lexIcon: "judgments", defaultInstructions: "Sporzadz pozew o wyplate zaleglego wynagrodzenia i odsetek.", recipientPresetId: "sad-rejonowy" },
  { id: "odwolanie-zus", label: "Odwolanie od decyzji ZUS", category: "Praca i ZUS", lexIcon: "shield", defaultInstructions: "Sporzadz odwolanie od decyzji ZUS do sadu pracy i ubezpieczen spolecznych.", recipientPresetId: "zus" },
  { id: "wniosek-zasilek-zus", label: "Wniosek o wyplate zasilku (uzasadnienie)", category: "Praca i ZUS", lexIcon: "file", defaultInstructions: "Sporzadz pismo uzasadniajace prawo do zasilku i zalaczniki.", recipientPresetId: "zus" },

  // Podatkowe
  { id: "odwolanie-decyzja-us", label: "Odwolanie od decyzji urzedu skarbowego", category: "Podatkowe", lexIcon: "shield", defaultInstructions: "Sporzadz odwolanie od decyzji podatkowej wraz z zarzutami i wnioskami dowodowymi.", recipientPresetId: "us" },
  { id: "czynny-zal", label: "Czynny zal", category: "Podatkowe", lexIcon: "file", defaultInstructions: "Sporzadz czynny zal zgodnie z KKS, opisz naruszenie i okolicznosci naprawienia szkody.", recipientPresetId: "us" },
  { id: "wniosek-raty-podatku", label: "Wniosek o rozlozenie podatku na raty", category: "Podatkowe", lexIcon: "file", defaultInstructions: "Sporzadz wniosek o ulge w splacie zobowiazania podatkowego (raty).", recipientPresetId: "us" },
  { id: "wniosek-umorzenie-zaleglosci", label: "Wniosek o umorzenie zaleglosci podatkowej", category: "Podatkowe", lexIcon: "file", defaultInstructions: "Sporzadz wniosek o umorzenie zaleglosci podatkowej z uzasadnieniem interesu publicznego i podatnika.", recipientPresetId: "us" },
  { id: "wniosek-nadplata", label: "Wniosek o stwierdzenie nadplaty podatku", category: "Podatkowe", lexIcon: "file", defaultInstructions: "Sporzadz wniosek o stwierdzenie nadplaty wraz z wyliczeniem i podstawa prawna.", recipientPresetId: "us" },
  { id: "pelnomocnictwo-ogolne-info", label: "Pelnomocnictwo ogolne / zmiana / odwolanie (PPO-1)", category: "Podatkowe", lexIcon: "file", defaultInstructions: "Sporzadz pismo przewodnie i uzasadnienie dotyczace pelnomocnictwa ogolnego PPO-1.", recipientPresetId: "us" },

  // Karne
  { id: "zawiadomienie-przestepstwo", label: "Zawiadomienie o podejrzeniu popelnienia przestepstwa", category: "Karne", lexIcon: "shield", defaultInstructions: "Sporzadz zawiadomienie o podejrzeniu popelnienia przestepstwa wraz z opisem czynu i dowodami.", recipientPresetId: "prokuratura-luban" },
  { id: "wniosek-sciganie", label: "Wniosek o sciganie", category: "Karne", lexIcon: "shield", defaultInstructions: "Sporzadz wniosek o sciganie sprawcy przestepstwa sciganego na wniosek.", recipientPresetId: "prokuratura-luban" },
  { id: "zazalenie-umorzenie", label: "Zazalenie na postanowienie o umorzeniu dochodzenia/sledztwa", category: "Karne", lexIcon: "documents", defaultInstructions: "Sporzadz zazalenie na umorzenie, wskaz bledy ustalen i naruszenia procedury.", recipientPresetId: "sad-rejonowy" },
  { id: "wniosek-obronca-z-urzedu", label: "Wniosek o obronce z urzedu", category: "Karne", lexIcon: "documents", defaultInstructions: "Sporzadz wniosek o wyznaczenie obroncy z urzedu z uzasadnieniem sytuacji majatkowej.", recipientPresetId: "sad-rejonowy" },

  // Nieruchomosci i KW
  { id: "wniosek-kw-wpis", label: "Wniosek o wpis do ksiegi wieczystej", category: "Nieruchomosci", lexIcon: "file", defaultInstructions: "Sporzadz pismo przewodnie i uzasadnienie do wniosku o wpis do ksiegi wieczystej.", recipientPresetId: "sad-rejonowy" },
  { id: "wniosek-kw-zalozenie", label: "Wniosek o zalozenie ksiegi wieczystej", category: "Nieruchomosci", lexIcon: "file", defaultInstructions: "Sporzadz pismo dotyczace zalozenia ksiegi wieczystej i wymaganych zalacznikow.", recipientPresetId: "sad-rejonowy" },
  { id: "wezwanie-oproznienie-lokalu", label: "Wezwanie do oproznienia lokalu", category: "Nieruchomosci", lexIcon: "gavel", defaultInstructions: "Sporzadz wezwanie do oproznienia lokalu i wydania nieruchomosci." },

  // Uniwersalne
  { id: "oswiadczenie", label: "Oswiadczenie", category: "Uniwersalne", lexIcon: "file", defaultInstructions: "Sporzadz formalne oswiadczenie z jednoznaczna trescia i data skutku." },
  { id: "wniosek-ogolny", label: "Wniosek ogolny", category: "Uniwersalne", lexIcon: "file", defaultInstructions: "Sporzadz wniosek formalny z zadaniem, podstawa i uzasadnieniem." },
  { id: "odpowiedz-na-pismo", label: "Odpowiedz na pismo urzedowe", category: "Uniwersalne", lexIcon: "documents", defaultInstructions: "Sporzadz odpowiedz na otrzymane pismo, odnies sie punkt po punkcie." },
  { id: "pismo-przewodnie", label: "Pismo przewodnie", category: "Uniwersalne", lexIcon: "documents", defaultInstructions: "Sporzadz pismo przewodnie do zalaczanych dokumentow." },
];

export const getDocumentCatalogItem = (id: string): DocumentCatalogItem | undefined =>
  DOCUMENT_CATALOG.find((item) => item.id === id);
