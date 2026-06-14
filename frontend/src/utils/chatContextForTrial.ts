import type { ChatMessage } from '../types/chat';
import { capString } from './storageLimits';

const MAX_CHAT_CONTEXT = 48_000;

export type TrialElaborationMode = 'skrot' | 'standard' | 'pelna';

export const ELABORATION_PRESETS: Record<
  TrialElaborationMode,
  { label: string; description: string; hearingRounds: number; expertTokenScale: number }
> = {
  skrot: {
    label: 'Skrót',
    description: 'Szybka symulacja — zwięzłe pozycje, 2 tury sali',
    hearingRounds: 2,
    expertTokenScale: 0.75,
  },
  standard: {
    label: 'Standard',
    description: 'Balans jakości i czasu — 4 tury sali',
    hearingRounds: 4,
    expertTokenScale: 1,
  },
  pelna: {
    label: 'Pełna',
    description: 'Rozbudowane pisma stron — 6 tur sali',
    hearingRounds: 6,
    expertTokenScale: 1.25,
  },
};

export function formatChatMessagesForTrial(messages: ChatMessage[]): string {
  const lines: string[] = [];
  for (const msg of messages) {
    const role = msg.role === 'user' ? 'UŻYTKOWNIK' : 'LEXMIND';
    const body = (msg.content || '').trim();
    if (!body) continue;
    lines.push(`### ${role}\n${body}`);
    if (msg.attachments?.length) {
      const names = msg.attachments.map((a) => a.name).join(', ');
      lines.push(`_(załączniki: ${names})_`);
    }
  }
  return capString(lines.join('\n\n'), MAX_CHAT_CONTEXT);
}

export function deriveTrialQuestionFromChat(messages: ChatMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user' && m.content?.trim());
  if (lastUser?.content) {
    const snippet = lastUser.content.trim().slice(0, 500);
    return `Sprawa z czatu LexMind:\n${snippet}${lastUser.content.length > 500 ? '…' : ''}`;
  }
  return 'Sprawa przeniesiona z rozmowy w czacie LexMind.';
}

export function hasTrialEligibleChat(messages: ChatMessage[]): boolean {
  return messages.some((m) => (m.content || '').trim().length > 0);
}
