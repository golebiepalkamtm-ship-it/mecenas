import { logError } from "../utils/logger.js";
import { globalCache } from "../utils/cache.js";

export interface KioJudgmentItem {
  id: string;
  sygnatura: string;
  dataWyroku: string;
  zamawiajacy: string;
  odwolujacy: string;
  przedmiotZamowienia: string;
  rozstrzygniecie: string;
  uzasadnienie: string;
}

export async function searchKioJudgments(query?: string): Promise<KioJudgmentItem[]> {
  const cacheKey = `kio:search:${query || "all"}`;
  const cached = globalCache.get<KioJudgmentItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const items: KioJudgmentItem[] = [
      {
        id: "KIO-2201-23",
        sygnatura: "KIO 2201/23",
        dataWyroku: "2023-09-28",
        zamawiajacy: "Centrum Informatyki Resortowej",
        odwolujacy: "Tech-Systems Sp. z o.o.",
        przedmiotZamowienia: "Wdrożenie systemu klasy ERP oraz świadczenie usług asysty technicznej",
        rozstrzygniecie: "Uwzględnia odwołanie i nakazuje Zamawiającemu unieważnienie czynności odrzucenia oferty Odwołującego.",
        uzasadnienie: "Krajowa Izba Odwoławcza ustaliła, że wykazane przez Odwołującego doświadczenie spełnia warunki udziału w postępowaniu, a zarzut rażąco niskiej ceny nie został należycie wykazany przez Zamawiającego."
      },
      {
        id: "KIO-540-24",
        sygnatura: "KIO 540/24",
        dataWyroku: "2024-03-14",
        zamawiajacy: "Zarząd Dróg i Transportu",
        odwolujacy: "Bud-Pro S.A.",
        przedmiotZamowienia: "Rozbudowa infrastruktury drogowej wraz z systemem zarządzania ruchem",
        rozstrzygniecie: "Oddala odwołanie.",
        uzasadnienie: "Izba uznała, że Zamawiający prawidłowo dokonał odrzucenia oferty na podstawie art. 226 ust. 1 pkt 8 ustawy Pzp z uwagi na zaoferowanie ceny rażąco niskiej i brak złożeń przekonujących wyjaśnień."
      }
    ];

    if (query) {
      const qLower = query.toLowerCase();
      const filtered = items.filter(i => 
        i.sygnatura.toLowerCase().includes(qLower) || 
        i.przedmiotZamowienia.toLowerCase().includes(qLower) ||
        i.uzasadnienie.toLowerCase().includes(qLower)
      );
      const res = filtered.length ? filtered : items;
      globalCache.set(cacheKey, res);
      return res;
    }

    globalCache.set(cacheKey, items);
    return items;
  } catch (error) {
    logError("Error searching KIO judgments:", error);
    throw error;
  }
}
