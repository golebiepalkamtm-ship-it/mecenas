import { DRAFTING_PROMPTS } from "./constants";

export type ExpertModeKey = keyof typeof DRAFTING_PROMPTS;

export interface StructuredData {
  sender: string;
  recipient: string;
  placeDate: string;
}

export interface DrafterViewProps {
  chatMessages?: Array<{ role: string; content: string }>;
}
