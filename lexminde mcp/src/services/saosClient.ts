import { logError } from "../utils/logger.js";
import { globalCache } from "../utils/cache.js";

const SAOS_BASE_URL = "https://www.saos.org.pl/api";

export interface SaosSearchOptions {
  all?: string;
  caseNumber?: string;
  judgeName?: string;
  courtType?: "COMMON" | "SUPREME" | "CONSTITUTIONAL_TRIBUNAL" | "NATIONAL_APPEAL_CHAMBER" | "ADMINISTRATIVE";
  ccCourtType?: "APPEAL" | "REGIONAL" | "DISTRICT";
  ccCourtId?: number;
  judgmentDateFrom?: string;
  judgmentDateTo?: string;
  lawClause?: string;
  pageSize?: number;
  pageNumber?: number;
  sortingField?: "DATABASE_ID" | "JUDGMENT_DATE" | "REFERENCING_JUDGMENTS_COUNT" | "MAXIMUM_MONEY_AMOUNT" | "CC_COURT_TYPE" | "CC_COURT_ID" | string;
  sortingDirection?: "ASC" | "DESC";
}

export interface SaosJudgmentItem {
  id: number;
  href: string;
  courtType: string;
  courtCases: Array<{ caseNumber: string }>;
  judgmentType?: string;
  judgmentDate?: string;
  judges?: Array<{ name: string; specialRoles?: string[] }>;
  textContent?: string;
  keywords?: string[];
  division?: {
    name: string;
    court?: {
      name: string;
    };
  };
}

export interface SaosSearchResponse {
  items: SaosJudgmentItem[];
  info: {
    totalResults: number;
  };
  queryTemplate?: any;
}

export interface SaosJudgmentDetailsResponse {
  data: {
    id: number;
    courtType: string;
    judgmentType?: string;
    judgmentDate?: string;
    courtCases?: Array<{ caseNumber: string }>;
    judges?: Array<{ name: string; function?: string; specialRoles?: string[] }>;
    courtReporters?: string[];
    decision?: string;
    summary?: string;
    textContent?: string;
    keywords?: string[];
    referencedRegulations?: Array<{
      rawTitle?: string;
      journalTitle?: string;
      journalNo?: number;
      journalYear?: number;
      journalEntry?: number;
      text?: string;
    }>;
    legalBases?: string[];
    division?: {
      name: string;
      court?: {
        name: string;
      };
    };
  };
}

export async function searchSaosJudgments(options: SaosSearchOptions): Promise<SaosSearchResponse> {
  const cacheKey = `saos:search:${JSON.stringify(options)}`;
  const cached = globalCache.get<SaosSearchResponse>(cacheKey);
  if (cached) return cached;

  try {
    const url = new URL(`${SAOS_BASE_URL}/search/judgments`);

    if (options.all) url.searchParams.set("all", options.all);
    if (options.caseNumber) url.searchParams.set("caseNumber", options.caseNumber);
    if (options.judgeName) url.searchParams.set("judgeName", options.judgeName);
    if (options.courtType) url.searchParams.set("courtType", options.courtType);
    if (options.ccCourtType) url.searchParams.set("ccCourtType", options.ccCourtType);
    if (options.ccCourtId) url.searchParams.set("ccCourtId", String(options.ccCourtId));
    if (options.judgmentDateFrom) url.searchParams.set("judgmentDateFrom", options.judgmentDateFrom);
    if (options.judgmentDateTo) url.searchParams.set("judgmentDateTo", options.judgmentDateTo);
    if (options.lawClause) url.searchParams.set("legalBase", options.lawClause);

    url.searchParams.set("pageSize", String(options.pageSize ?? 10));
    url.searchParams.set("pageNumber", String(options.pageNumber ?? 0));
    if (options.sortingField) url.searchParams.set("sortingField", options.sortingField);
    if (options.sortingDirection) url.searchParams.set("sortingDirection", options.sortingDirection);

    const response = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`SAOS API HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as SaosSearchResponse;
    globalCache.set(cacheKey, data);
    return data;
  } catch (error) {
    logError("Error in searchSaosJudgments:", error);
    throw error;
  }
}

export async function getSaosJudgmentDetails(id: number): Promise<SaosJudgmentDetailsResponse> {
  const cacheKey = `saos:judgment:${id}`;
  const cached = globalCache.get<SaosJudgmentDetailsResponse>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${SAOS_BASE_URL}/judgments/${id}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`SAOS API HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as SaosJudgmentDetailsResponse;
    globalCache.set(cacheKey, data);
    return data;
  } catch (error) {
    logError(`Error in getSaosJudgmentDetails for ID ${id}:`, error);
    throw error;
  }
}

export async function listSaosCourts(): Promise<any> {
  const cacheKey = "saos:courts";
  const cached = globalCache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${SAOS_BASE_URL}/dump/courts`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`SAOS API HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    globalCache.set(cacheKey, data, 24 * 60 * 60 * 1000); // 24h cache dla bazy sądów
    return data;
  } catch (error) {
    logError("Error in listSaosCourts:", error);
    throw error;
  }
}
