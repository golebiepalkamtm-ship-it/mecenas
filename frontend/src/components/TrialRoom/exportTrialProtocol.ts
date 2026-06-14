import type { HearingRound } from '../../store/useTrialRoomStore';

export function buildTrialProtocolMarkdown(payload: {
  question: string;
  chatContext?: string;
  defenseBrief: string;
  prosecutionBrief: string;
  hearingRounds: HearingRound[];
  verdict: string;
}): string {
  const lines: string[] = [
    '# Sala rozprawy — protokół LexMind',
    '',
    `Data: ${new Date().toISOString()}`,
    '',
    '## Sprawa (skrót)',
    payload.question.trim(),
    '',
  ];

  if (payload.chatContext?.trim()) {
    lines.push('## Kontekst z czatu', '', payload.chatContext.trim(), '');
  }

  lines.push(
    '## Pozycja obrony',
    payload.defenseBrief.trim() || '_(brak)_',
    '',
    '## Pozycja oskarżenia',
    payload.prosecutionBrief.trim() || '_(brak)_',
    '',
  );

  if (payload.hearingRounds.length > 0) {
    lines.push('## Protokół sali', '');
    for (const r of payload.hearingRounds) {
      const side = r.side === 'prosecution' ? 'Oskarżenie' : 'Obrona';
      lines.push(`### Tura ${r.round} — ${side}`, '', r.text.trim(), '');
    }
  }

  lines.push('## Werdykt', '', payload.verdict.trim() || '_(brak)_', '');
  return lines.join('\n');
}

export function downloadTrialMarkdown(content: string, filename?: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `sala-rozprawy-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
