export function formatDocumentTitle(filename: string): string {
  const raw = String(filename || '').trim();
  if (!raw) return 'Dokument';

  let name = raw;
  try {
    if (/%[0-9A-Fa-f]{2}/.test(name)) name = decodeURIComponent(name);
  } catch {}

  name = name.replace(/\.[^/.]+$/, '');
  name = name.replace(/[_]+/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();

  name = name.replace(/^\d{10,14}[_-]+/, '');
  name = name.replace(/^\d{4}-\d{2}-\d{2}[_-]+/, '');

  name = name.replace(/^(du|dzu|isap|saos)[_-]?\d{4}[_-]\d{3,5}[_-]+/i, '');
  name = name.replace(/\s+/g, ' ').trim();

  name = name.replace(/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]\d+\)\s*$/, (m) => m.replace(/\d+\)\s*$/, ''));
  name = name.replace(/\s+/g, ' ').trim();

  const tokens = name.split(' ').filter(Boolean);
  if (tokens.length >= 4) {
    const singleLetters = tokens.filter((t) => t.length === 1).length;
    if (singleLetters / tokens.length >= 0.6) {
      name = tokens.join('');
    }
  }

  const hasLower = /[a-ząćęłńóśźż]/.test(name);
  const hasUpper = /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(name);
  if (hasUpper && !hasLower) {
    name = name.toLocaleLowerCase('pl-PL');
  }

  name = name.replace(/\s+/g, ' ').trim();
  if (!name) return 'Dokument';

  return name.charAt(0).toLocaleUpperCase('pl-PL') + name.slice(1);
}
