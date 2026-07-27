import { logError } from "../utils/logger.js";

const SEJM_ELI_BASE_URL = "https://api.sejm.gov.pl/eli";

export interface IsapPublisher {
  code: string;
  name: string;
  shortName: string;
  actsCount: number;
  years: number[];
}

export interface IsapActSummary {
  address: string;
  ELI: string;
  publisher: string;
  year: number;
  pos: number;
  displayAddress: string;
  title: string;
  type?: string;
  status?: string;
  promulgation?: string;
  announcementDate?: string;
  textHTML?: boolean;
  textPDF?: boolean;
}

export interface IsapActListResponse {
  count: number;
  items: IsapActSummary[];
}

export interface IsapActDetails extends IsapActSummary {
  entryIntoForce?: string;
  inForce?: string;
  keywords?: string[];
  releasedBy?: string[];
  references?: {
    [key: string]: Array<{ id: string; date?: string; art?: string }>;
  };
  texts?: Array<{ fileName: string; type: string }>;
}

export async function getIsapPublishers(): Promise<IsapPublisher[]> {
  try {
    const response = await fetch(`${SEJM_ELI_BASE_URL}/acts`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Sejm ELI API HTTP Error ${response.status}: ${response.statusText}`);
    }
    return await response.json() as IsapPublisher[];
  } catch (error) {
    logError("Error in getIsapPublishers:", error);
    throw error;
  }
}

export async function getIsapActsByYear(publisher: string, year: number): Promise<IsapActListResponse> {
  try {
    const response = await fetch(`${SEJM_ELI_BASE_URL}/acts/${publisher}/${year}`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Sejm ELI API HTTP Error ${response.status}: ${response.statusText}`);
    }
    return await response.json() as IsapActListResponse;
  } catch (error) {
    logError(`Error in getIsapActsByYear (${publisher}/${year}):`, error);
    throw error;
  }
}

export async function getIsapActDetails(publisher: string, year: number, pos: number): Promise<IsapActDetails> {
  try {
    const response = await fetch(`${SEJM_ELI_BASE_URL}/acts/${publisher}/${year}/${pos}`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Sejm ELI API HTTP Error ${response.status}: ${response.statusText}`);
    }
    return await response.json() as IsapActDetails;
  } catch (error) {
    logError(`Error in getIsapActDetails (${publisher}/${year}/${pos}):`, error);
    throw error;
  }
}

export async function getIsapActText(publisher: string, year: number, pos: number): Promise<string> {
  try {
    const response = await fetch(`${SEJM_ELI_BASE_URL}/acts/${publisher}/${year}/${pos}/text.html`, {
      headers: { "Accept": "text/html" }
    });
    if (!response.ok) {
      throw new Error(`Tekst aktu niedostępny w formacie HTML (${response.status})`);
    }
    return await response.text();
  } catch (error) {
    logError(`Error in getIsapActText (${publisher}/${year}/${pos}):`, error);
    throw error;
  }
}
