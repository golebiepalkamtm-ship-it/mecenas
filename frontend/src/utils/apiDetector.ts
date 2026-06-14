export function detectProvider(key: string): string {
  const k = key.trim();
  if (k.startsWith('sk-ant-')) return 'Anthropic';
  if (k.startsWith('sk-proj-') || (k.startsWith('sk-') && !k.startsWith('sk-or-'))) return 'OpenAI';
  if (k.startsWith('sk-or-')) return 'OpenRouter';
  if (k.startsWith('AIza')) return 'Google';
  if (k.startsWith('gsk_')) return 'Groq';
  if (k.startsWith('mistral-') || k.length === 32) return 'Mistral'; // Mistral keys are often 32 chars hex if not prefixed
  if (k.startsWith('deepseek-')) return 'DeepSeek';
  
  return '';
}
