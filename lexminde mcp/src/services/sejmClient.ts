import { logError } from "../utils/logger.js";

const SEJM_API_BASE_URL = "https://api.sejm.gov.pl/sejm";

export interface SejmPrintSummary {
  term: number;
  number: string;
  title: string;
  documentDate?: string;
  deliveryDate?: string;
  changeDate?: string;
  attachments?: string[];
  processPrint?: string[];
}

export interface SejmMP {
  id: number;
  firstName: string;
  lastName: string;
  firstLastName: string;
  club: string;
  districtName: string;
  districtNum: number;
  email?: string;
  profession?: string;
  educationLevel?: string;
  active: boolean;
  numberOfVotes?: number;
  voivodeship?: string;
}

export interface SejmInterpellation {
  term: number;
  num: number;
  title: string;
  receiptDate: string;
  lastModified?: string;
  from?: string[];
  to?: string[];
}

export interface SejmCommittee {
  code: string;
  name: string;
  nameGenitive?: string;
  appointmentDate?: string;
  scope?: string;
  type?: string;
}

export interface SejmVotingSummary {
  date: string;
  proceeding: number;
  votingsNum: number;
}

export interface SejmVotingDetails {
  term: number;
  sitting: number;
  sittingDay: number;
  date: string;
  title: string;
  topic?: string;
  description?: string;
  totalVoted: number;
  yes?: number;
  no?: number;
  abstain?: number;
  notParticipating?: number;
  votes?: Array<{
    MP: number;
    firstName: string;
    lastName: string;
    club: string;
    vote: string;
    listVotes?: Record<string, string>;
  }>;
}

export async function getSejmPrints(term: number = 10): Promise<SejmPrintSummary[]> {
  try {
    const response = await fetch(`${SEJM_API_BASE_URL}/term${term}/prints`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Sejm API HTTP Error ${response.status}: ${response.statusText}`);
    }
    return await response.json() as SejmPrintSummary[];
  } catch (error) {
    logError(`Error in getSejmPrints (term ${term}):`, error);
    throw error;
  }
}

export async function getSejmPrintDetails(number: string, term: number = 10): Promise<SejmPrintSummary> {
  try {
    const response = await fetch(`${SEJM_API_BASE_URL}/term${term}/prints/${number}`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Sejm API HTTP Error ${response.status}: ${response.statusText}`);
    }
    return await response.json() as SejmPrintSummary;
  } catch (error) {
    logError(`Error in getSejmPrintDetails (term ${term}, print ${number}):`, error);
    throw error;
  }
}

export async function getSejmMPs(term: number = 10): Promise<SejmMP[]> {
  try {
    const response = await fetch(`${SEJM_API_BASE_URL}/term${term}/MP`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Sejm API HTTP Error ${response.status}: ${response.statusText}`);
    }
    return await response.json() as SejmMP[];
  } catch (error) {
    logError(`Error in getSejmMPs (term ${term}):`, error);
    throw error;
  }
}

export async function getSejmInterpellations(term: number = 10): Promise<SejmInterpellation[]> {
  try {
    const response = await fetch(`${SEJM_API_BASE_URL}/term${term}/interpellations`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Sejm API HTTP Error ${response.status}: ${response.statusText}`);
    }
    return await response.json() as SejmInterpellation[];
  } catch (error) {
    logError(`Error in getSejmInterpellations (term ${term}):`, error);
    throw error;
  }
}

export async function getSejmCommittees(term: number = 10): Promise<SejmCommittee[]> {
  try {
    const response = await fetch(`${SEJM_API_BASE_URL}/term${term}/committees`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Sejm API HTTP Error ${response.status}: ${response.statusText}`);
    }
    return await response.json() as SejmCommittee[];
  } catch (error) {
    logError(`Error in getSejmCommittees (term ${term}):`, error);
    throw error;
  }
}

export async function getSejmVotings(term: number = 10): Promise<SejmVotingSummary[]> {
  try {
    const response = await fetch(`${SEJM_API_BASE_URL}/term${term}/votings`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Sejm API HTTP Error ${response.status}: ${response.statusText}`);
    }
    return await response.json() as SejmVotingSummary[];
  } catch (error) {
    logError(`Error in getSejmVotings (term ${term}):`, error);
    throw error;
  }
}

export async function getSejmVotingDetails(sitting: number, votingNumber: number, term: number = 10): Promise<SejmVotingDetails> {
  try {
    const response = await fetch(`${SEJM_API_BASE_URL}/term${term}/votings/${sitting}/${votingNumber}`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Sejm API HTTP Error ${response.status}: ${response.statusText}`);
    }
    return await response.json() as SejmVotingDetails;
  } catch (error) {
    logError(`Error in getSejmVotingDetails (term ${term}, sitting ${sitting}, voting ${votingNumber}):`, error);
    throw error;
  }
}
