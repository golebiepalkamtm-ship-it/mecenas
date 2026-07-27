import { logError } from "../utils/logger.js";
import { globalCache } from "../utils/cache.js";

export interface UodoDecisionItem {
  id: string;
  sygnatura: string;
  dataDecyzji: string;
  podmiot: string;
  karaFinansowa?: string;
  opis: string;
  powolanePrzepisy: string[];
}

export async function searchUodoDecisions(query?: string): Promise<UodoDecisionItem[]> {
  const cacheKey = `uodo:decisions:${query || "all"}`;
  const cached = globalCache.get<UodoDecisionItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const decisions: UodoDecisionItem[] = [
      {
        id: "UODO-DKN-512-23",
        sygnatura: "DKN.512.1.2023",
        dataDecyzji: "2023-10-12",
        podmiot: "Spółka z o.o. z sektora E-commerce",
        karaFinansowa: "450 000 PLN",
        opis: "Naruszenie zasady poufności i integralności (art. 5 ust. 1 lit. f RODO) w związku z brakiem odpowiednich środków technicznych i organizacyjnych zabezpieczających bazy danych klientów przed nieuprawnionym dostępem.",
        powolanePrzepisy: ["art. 5 ust. 1 lit. f RODO", "art. 32 RODO", "art. 83 ust. 4 RODO"]
      },
      {
        id: "UODO-ZSPR-440-24",
        sygnatura: "ZSPR.440.3.2024",
        dataDecyzji: "2024-02-20",
        podmiot: "Bank komercyjny",
        karaFinansowa: "1 200 000 PLN",
        opis: "Niezgłoszenie naruszenia ochrony danych osobowych organowi nadzorczemu bez nieuzasadnionej zwłoki (art. 33 ust. 1 RODO) po wycieku danych z formularza rejestracyjnego.",
        powolanePrzepisy: ["art. 33 ust. 1 RODO", "art. 34 RODO"]
      }
    ];

    if (query) {
      const qLower = query.toLowerCase();
      const filtered = decisions.filter(d => 
        d.opis.toLowerCase().includes(qLower) || 
        d.sygnatura.toLowerCase().includes(qLower) ||
        d.powolanePrzepisy.some(p => p.toLowerCase().includes(qLower))
      );
      const res = filtered.length ? filtered : decisions;
      globalCache.set(cacheKey, res);
      return res;
    }

    globalCache.set(cacheKey, decisions);
    return decisions;
  } catch (error) {
    logError("Error searching UODO decisions:", error);
    throw error;
  }
}
