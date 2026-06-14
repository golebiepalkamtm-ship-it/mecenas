export interface FormalPresetOption {
  id: string;
  label: string;
  value: string;
  category?: string;
}

export const PLACE_CITY_OPTIONS: FormalPresetOption[] = [
  { id: "warszawa", label: "Warszawa", value: "Warszawa", category: "Województwa" },
  { id: "krakow", label: "Kraków", value: "Kraków", category: "Województwa" },
  { id: "wroclaw", label: "Wrocław", value: "Wrocław", category: "Województwa" },
  { id: "poznan", label: "Poznań", value: "Poznań", category: "Województwa" },
  { id: "gdansk", label: "Gdańsk", value: "Gdańsk", category: "Województwa" },
  { id: "lodz", label: "Łódź", value: "Łódź", category: "Województwa" },
  { id: "szczecin", label: "Szczecin", value: "Szczecin", category: "Województwa" },
  { id: "lublin", label: "Lublin", value: "Lublin", category: "Województwa" },
  { id: "bialystok", label: "Białystok", value: "Białystok", category: "Województwa" },
  { id: "katowice", label: "Katowice", value: "Katowice", category: "Województwa" },
  { id: "rzeszow", label: "Rzeszów", value: "Rzeszów", category: "Województwa" },
  { id: "kielce", label: "Kielce", value: "Kielce", category: "Województwa" },
  { id: "olsztyn", label: "Olsztyn", value: "Olsztyn", category: "Województwa" },
  { id: "opole", label: "Opole", value: "Opole", category: "Województwa" },
  { id: "gorzow", label: "Gorzów Wielkopolski", value: "Gorzów Wielkopolski", category: "Województwa" },
  { id: "zielona-gora", label: "Zielona Góra", value: "Zielona Góra", category: "Województwa" },
  { id: "luban", label: "Lubań", value: "Lubań", category: "Powiaty" },
  { id: "jelenia-gora", label: "Jelenia Góra", value: "Jelenia Góra", category: "Powiaty" },
  { id: "legnica", label: "Legnica", value: "Legnica", category: "Powiaty" },
  { id: "walbrzych", label: "Wałbrzych", value: "Wałbrzych", category: "Powiaty" },
  { id: "leszno", label: "Leszno", value: "Leszno", category: "Powiaty" },
  { id: "custom-city", label: "Inna miejscowość…", value: "", category: "Inne" },
];

export const RECIPIENT_ORGAN_OPTIONS: FormalPresetOption[] = [
  {
    id: "starosta-luban",
    label: "Starosta Powiatowy — Lubań",
    value: "Starosta Lubański\nul. Mickiewicza 2\n59-800 Lubań",
    category: "Starostowie",
  },
  {
    id: "sko-jelenia-gora",
    label: "SKO — Jelenia Góra (za pośrednictwem Starosty)",
    value:
      "Samorządowe Kolegium Odwoławcze w Jeleniej Górze\n(za pośrednictwem Starosty Lubańskiego)\nul. Mickiewicza 2\n59-800 Lubań",
    category: "SKO",
  },
  {
    id: "prokuratura-luban",
    label: "Prokuratura Rejonowa — Lubań",
    value: "Prokurator Rejonowy w Lubaniu",
    category: "Prokuratura",
  },
  {
    id: "wsa-wroclaw",
    label: "WSA — Wrocław",
    value: "Wojewódzki Sąd Administracyjny we Wrocławiu",
    category: "Sądy administracyjne",
  },
  {
    id: "wsa-gdansk",
    label: "WSA — Gdańsk",
    value: "Wojewódzki Sąd Administracyjny w Gdańsku",
    category: "Sądy administracyjne",
  },
  {
    id: "wsa-warszawa",
    label: "WSA — Warszawa",
    value: "Wojewódzki Sąd Administracyjny w Warszawie",
    category: "Sądy administracyjne",
  },
  {
    id: "nsa",
    label: "Naczelny Sąd Administracyjny",
    value: "Naczelny Sąd Administracyjny\nul. Czerniakowska 17A\n00-372 Warszawa",
    category: "Sądy administracyjne",
  },
  {
    id: "sad-rejonowy",
    label: "Sąd Rejonowy (szablon)",
    value: "Sąd Rejonowy\n[Wydział]\n[Adres]",
    category: "Sądy powszechne",
  },
  {
    id: "sad-okregowy",
    label: "Sąd Okręgowy (szablon)",
    value: "Sąd Okręgowy\n[Wydział]\n[Adres]",
    category: "Sądy powszechne",
  },
  {
    id: "urzad-miasta",
    label: "Urząd Miasta (szablon)",
    value: "Prezydent Miasta / Burmistrz\n[Adres urzędu]",
    category: "Urzędy",
  },
  {
    id: "zus",
    label: "ZUS — Oddział (szablon)",
    value: "Zakład Ubezpieczeń Społecznych\n[Oddział / adres]",
    category: "Urzędy",
  },
  {
    id: "us",
    label: "Urząd Skarbowy (szablon)",
    value: "Naczelnik Urzędu Skarbowego\n[Adres]",
    category: "Urzędy",
  },
  {
    id: "custom-recipient",
    label: "Inny adresat — wpisz ręcznie",
    value: "",
    category: "Inne",
  },
];

export const DRAFTER_FORMAL_STORAGE_KEY = "lexmind-drafter-formal-v1";

export function findPresetById(
  options: FormalPresetOption[],
  id: string,
): FormalPresetOption | undefined {
  return options.find((o) => o.id === id);
}

export function findPresetIdByValue(
  options: FormalPresetOption[],
  value: string,
): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = options.find((o) => o.value.trim() === trimmed);
  return match?.id ?? "custom-recipient";
}

export function findCityPresetId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = PLACE_CITY_OPTIONS.find((o) => o.value === trimmed);
  return match?.id ?? "custom-city";
}
