import { logError } from "../utils/logger.js";
import { globalCache } from "../utils/cache.js";

const KRS_API_BASE = "https://api-krs.ms.gov.pl/api/krs";

export interface KrsCompanyResult {
  krs: string;
  nazwa: string;
  formaPrawna?: string;
  siedziba?: {
    miejscowosc?: string;
    kraj?: string;
  };
  reprezentacja?: {
    sposobReprezentacji?: string;
    sklad?: Array<{
      nazwisko?: string;
      imiona?: string;
      funkcja?: string;
    }>;
  };
  kapitalZakladowy?: string;
  rawResponse?: any;
}

export async function getKrsCompanyDetails(krs: string): Promise<KrsCompanyResult> {
  const cleanKrs = krs.padStart(10, "0");
  const cacheKey = `krs:company:${cleanKrs}`;
  const cached = globalCache.get<KrsCompanyResult>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${KRS_API_BASE}/OdpisAktualny/${cleanKrs}?rejestr=P&format=json`;
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Nie odnaleziono podmiotu o numerze KRS ${cleanKrs} w rejestrze przedsiębiorców.`);
      }
      throw new Error(`KRS API HTTP Error ${response.status}: ${response.statusText}`);
    }

    const json = await response.json() as any;
    const odp = json?.odpis?.dane;

    const result: KrsCompanyResult = {
      krs: cleanKrs,
      nazwa: odp?.dzial1?.danePodmiotu?.nazwa || "Nieokreślona nazwa",
      formaPrawna: odp?.dzial1?.danePodmiotu?.formaPrawna,
      siedziba: {
        miejscowosc: odp?.dzial1?.siedzibaIAdres?.siedziba?.miejscowosc,
        kraj: odp?.dzial1?.siedzibaIAdres?.siedziba?.kraj,
      },
      reprezentacja: {
        sposobReprezentacji: odp?.dzial2?.reprezentacja?.sposobReprezentacji,
        sklad: odp?.dzial2?.reprezentacja?.sklad?.map((member: any) => ({
          nazwisko: member.nazwisko,
          imiona: member.imiona,
          funkcja: member.funkcjaWOrganie || member.funkcja,
        })) || []
      },
      kapitalZakladowy: odp?.dzial1?.kapitalPodmiotu?.kapitalZakladowy?.wartosc,
      rawResponse: json
    };

    globalCache.set(cacheKey, result, 24 * 60 * 60 * 1000); // 24h cache dla danych KRS
    return result;
  } catch (error) {
    logError(`Error fetching KRS ${cleanKrs}:`, error);
    throw error;
  }
}

export async function searchCeidgBusiness(query: string): Promise<any> {
  const cacheKey = `ceidg:search:${query}`;
  const cached = globalCache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    // Public CEIDG Sandbox / Open Search Interface
    const url = `https://dane.biznes.gov.pl/api/ceidg/v2/firmy?nip=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return {
        query,
        message: `Zapytanie CEIDG dla ${query} (Weryfikacja podmiotu jednoosobowego).`,
        firmy: []
      };
    }

    const data = await response.json();
    globalCache.set(cacheKey, data);
    return data;
  } catch (error) {
    logError(`Error searching CEIDG for ${query}:`, error);
    return {
      query,
      message: `Weryfikacja CEIDG dla podmiotu ${query}.`,
      firmy: []
    };
  }
}
