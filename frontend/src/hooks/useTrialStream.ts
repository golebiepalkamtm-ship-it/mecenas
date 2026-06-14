import { useCallback } from 'react';
import { API_BASE } from '../config';
import { consumeChatSSE } from '../utils/consumeChatSSE';
import type { TrialSide } from '../components/TrialRoom/types';
import type { HearingRound } from '../store/useTrialRoomStore';

type StreamHandlers = {
  onChunk: (text: string) => void;
  onMeta?: (msg: string) => void;
  onRound?: (round: HearingRound) => void;
  onDone?: (final: { text: string; hearingRounds?: HearingRound[] }) => void;
  signal?: AbortSignal;
};

async function postTrialStream(
  path: string,
  body: Record<string, unknown>,
  handlers: StreamHandlers,
): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: handlers.signal,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('Brak strumienia odpowiedzi');

  let full = '';
  let rounds: HearingRound[] = [];

  await consumeChatSSE(reader, (ev) => {
    if (ev.type === 'chunk' && typeof ev.text === 'string') {
      full += ev.text;
      handlers.onChunk(ev.text);
    }
    if (ev.type === 'metadata' && typeof ev.message === 'string') {
      handlers.onMeta?.(ev.message);
    }
    if (ev.type === 'trial_round' && typeof ev.text === 'string') {
      const side: TrialSide = ev.side === 'prosecution' ? 'prosecution' : 'defense';
      const round: HearingRound = {
        round: Number(ev.round) || rounds.length + 1,
        side,
        text: ev.text,
        model: typeof ev.model === 'string' ? ev.model : undefined,
      };
      rounds.push(round);
      handlers.onRound?.(round);
    }
    if (ev.type === 'final_metadata') {
      if (typeof ev.final_answer === 'string') {
        full = ev.final_answer;
      }
      if (Array.isArray(ev.hearing_rounds)) {
        rounds = ev.hearing_rounds as HearingRound[];
      }
      handlers.onDone?.({ text: full, hearingRounds: rounds });
    }
    if (ev.type === 'error') {
      throw new Error(String(ev.text ?? 'Błąd sali rozprawy'));
    }
  });

  return full;
}

export function useTrialStream() {
  const runPosition = useCallback(
    async (
      side: TrialSide,
      payload: Record<string, unknown>,
      handlers: StreamHandlers,
    ) => postTrialStream('/trial/position', { side, ...payload }, handlers),
    [],
  );

  const runHearing = useCallback(
    async (payload: Record<string, unknown>, handlers: StreamHandlers) =>
      postTrialStream('/trial/hearing', payload, handlers),
    [],
  );

  const runVerdict = useCallback(
    async (payload: Record<string, unknown>, handlers: StreamHandlers) =>
      postTrialStream('/trial/verdict', payload, handlers),
    [],
  );

  return { runPosition, runHearing, runVerdict };
}
