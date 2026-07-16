import { API_BASE } from '../config';

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path}`;
}

async function readErrorText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(resolveUrl(path), init);
}

export async function apiGetJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    const errorText = await readErrorText(response);
    throw new Error(errorText || `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function apiPostJson<T>(
  path: string,
  body: unknown,
  init?: Omit<RequestInit, 'method' | 'body'>,
): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await readErrorText(response);
    throw new Error(errorText || `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function apiPostStream(
  path: string,
  body: unknown,
  init?: Omit<RequestInit, 'method' | 'body'>,
): Promise<Response> {
  const response = await apiFetch(path, {
    ...init,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await readErrorText(response);
    throw new Error(`Błąd serwera: ${response.status} - ${errorText}`);
  }
  return response;
}
