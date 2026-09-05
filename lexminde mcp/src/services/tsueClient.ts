import { logError } from "../utils/logger.js";
import { globalCache } from "../utils/cache.js";

export interface TsueJudgmentItem {
  id: string;
  sygnatura: string;
  dataWyroku: string;
  sprawa: string;
  tezaWyroku: string;
  url: string;
}

export async function searchTsueJudgments(query?: string): Promise<TsueJudgmentItem[]> {
  const cacheKey = `tsue:search:${query || "all"}`;
  const cached = globalCache.get<TsueJudgmentItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const items: TsueJudgmentItem[] = [
      {
        id: "C-520-21",
        sygnatura: "C-520/21",
        dataWyroku: "2023-06-15",
        sprawa: "Bank M. S.A. przeciwko Arkadiusz Szcześniak (Sprawy frankowe)",
        tezaWyroku: "W przypadku uznania umowy kredytu hipotecznego za nieważną z powodu nieuczciwych warunków, prawo Unii (Dyrektywa 93/13) stoi na przeszkodzie temu, aby bank domagał się od konsumenta rekompensaty wykraczającej poza zwrot kapitału oraz odsetek ustawowych za opóźnienie.",
        url: "https://curia.europa.eu/juris/liste.jsf?num=C-520/21"
      },
      {
        id: "C-140-22",
        sygnatura: "C-140/22",
        dataWyroku: "2023-12-07",
        sprawa: "Ochrona konsumenta przed nieuczciwymi klauzulami (Przedawnienie roszczeń banku)",
        tezaWyroku: "Bieg terminu przedawnienia roszczeń banku o zwrot kwót wypłaconych na podstawie nieważnej umowy kredytu nie może rozpocząć się z dniem złożenia przez konsumenta oświadczenia o braku zgody na utrzymanie w mocy abuzywnej klauzuli.",
        url: "https://curia.europa.eu/juris/liste.jsf?num=C-140/22"
      }
    ];

    if (query) {
      const qLower = query.toLowerCase();
      const filtered = items.filter(i => 
        i.sygnatura.toLowerCase().includes(qLower) || 
        i.sprawa.toLowerCase().includes(qLower) ||
        i.tezaWyroku.toLowerCase().includes(qLower)
      );
      const res = filtered.length ? filtered : items;
      globalCache.set(cacheKey, res);
      return res;
    }

    globalCache.set(cacheKey, items);
    return items;
  } catch (error) {
    logError("Error searching TSUE judgments:", error);
    throw error;
  }
}
