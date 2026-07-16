import { describe, expect, it } from 'vitest';

import type { ChatStreamEvent } from '../types/chatContract';
import { consumeChatSSE } from './consumeChatSSE';

function makeReader(chunks: string[]): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return {
    read: async () => {
      if (index >= chunks.length) {
        return { done: true, value: undefined };
      }

      const value = encoder.encode(chunks[index]);
      index += 1;
      return { done: false, value };
    },
    releaseLock: () => undefined,
    cancel: async () => undefined,
    closed: Promise.resolve(undefined),
  } as ReadableStreamDefaultReader<Uint8Array>;
}

describe('consumeChatSSE', () => {
  it('parses valid SSE events across chunk boundaries and ignores DONE markers', async () => {
    const reader = makeReader([
      'data: {"type":"metadata","step":"start"}\n\n',
      'data: {"type":"chunk","text":"Hel',
      'lo"}\n\n',
      'data: [DONE]\n\n',
    ]);

    const events: ChatStreamEvent[] = [];

    await consumeChatSSE(reader, (payload) => {
      events.push(payload);
    });

    expect(events).toEqual([
      { type: 'metadata', step: 'start' },
      { type: 'chunk', text: 'Hello' },
    ]);
  });

  it('ignores malformed JSON payloads and unrelated lines', async () => {
    const reader = makeReader([
      'event: ping\n',
      'data: {"type":"metadata","id":"ok"}\n\n',
      'data: {oops}\n\n',
      'data: {"type":"chunk","text":"A"}\n\n',
    ]);

    const events: ChatStreamEvent[] = [];

    await consumeChatSSE(reader, (payload) => {
      events.push(payload);
    });

    expect(events).toEqual([
      { type: 'metadata', id: 'ok' },
      { type: 'chunk', text: 'A' },
    ]);
  });
});
