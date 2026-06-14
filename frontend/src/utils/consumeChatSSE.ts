/** Wspólny parser SSE (czat + sala rozprawy). */

export async function consumeChatSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (payload: Record<string, unknown>) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      for (const line of block.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const dataStr = line.slice(6).trim();
        if (!dataStr || dataStr === '[DONE]') continue;
        try {
          onEvent(JSON.parse(dataStr) as Record<string, unknown>);
        } catch {
          /* ignore malformed */
        }
      }

      boundary = buffer.indexOf('\n\n');
    }
  }
}
