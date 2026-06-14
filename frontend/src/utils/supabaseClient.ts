import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, Session, AuthChangeEvent, User } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

console.log('[SUPABASE] Initializing client url:', supabaseUrl);

// --- COMPREHENSIVE LOCAL MOCK ENGINE FOR PRESTIGE OFFLINE MODE ---
const mockUser = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "admin@lexmind.local",
  user_metadata: { role: "admin", full_name: "Administrator LexMind" },
  app_metadata: { role: "admin" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

const mockSession = {
  access_token: "mock-token-prestige-luxury-edition",
  token_type: "bearer",
  expires_in: 31536000, // 1 year
  refresh_token: "mock-refresh-token",
  user: mockUser,
  expires_at: Math.floor(Date.now() / 1000) + 31536000
};

class MockQueryBuilder {
  table: string;
  method: string;
  payload: Record<string, unknown> | Record<string, unknown>[] | null;
  _filters: Record<string, unknown>;
  _isSingle: boolean;
  _selectCols: string;
  _order: string | null;
  _range: { from: number; to: number } | null;

  constructor(table: string, method = 'select', payload: Record<string, unknown> | Record<string, unknown>[] | null = null) {
    this.table = table;
    this.method = method;
    this.payload = payload;
    this._filters = {};
    this._isSingle = false;
    this._selectCols = '*';
    this._order = null;
    this._range = null;
  }

  select(cols = '*') {
    this.method = 'select';
    this._selectCols = cols;
    return this;
  }

  insert(val: Record<string, unknown> | Record<string, unknown>[]) {
    this.method = 'insert';
    this.payload = val;
    return this;
  }

  update(val: Record<string, unknown>) {
    this.method = 'update';
    this.payload = val;
    return this;
  }

  upsert(val: Record<string, unknown> | Record<string, unknown>[]) {
    this.method = 'upsert';
    this.payload = val;
    return this;
  }

  eq(col: string, val: unknown) {
    this._filters[col] = val;
    return this;
  }

  single() {
    this._isSingle = true;
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this._order = `${col}.${opts?.ascending === false ? "desc" : "asc"}`;
    return this;
  }

  range(from: number, to: number) {
    this._range = { from, to };
    return this;
  }

  abortSignal(_signal: AbortSignal) {
    return this;
  }

  async execute() {
    const storageKey = `lexmind_mock_${this.table}`;
    let data: Record<string, unknown>[] = [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) data = JSON.parse(raw) as Record<string, unknown>[];
    } catch (e) {
      console.error("[MOCK DB] Read error:", e);
    }

    if (this.method === 'select') {
      const remoteTables = new Set([
        "knowledge_base_legal",
        "knowledge_base_user",
        "unique_legal_documents",
        "unique_legal_documents_view",
        "unique_user_documents_view",
        "profiles",
      ]);

      if (remoteTables.has(this.table) && supabaseUrl && supabaseAnonKey && !supabaseAnonKey.includes("placeholder")) {
        try {
          let url = `${supabaseUrl}/rest/v1/${this.table}`;
          const params = new URLSearchParams();
          const selectCols = this._selectCols === "*" ? "id,metadata,created_at" : this._selectCols;
          params.append("select", selectCols);
          if (this._order) {
            params.append("order", this._order);
          } else if (this.table === "knowledge_base_user") {
            params.append("order", "created_at.desc");
          }
          for (const [col, val] of Object.entries(this._filters)) {
            params.append(col, `eq.${val}`);
          }
          const queryString = params.toString();
          if (queryString) url += `?${queryString}`;

          const accessToken = getRestAccessToken();
          const headers: Record<string, string> = {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
          };
          if (this._range) {
            headers.Range = `${this._range.from}-${this._range.to}`;
          }

          const res = await fetch(url, { headers });
          if (res.ok) {
            const dbData = await res.json();
            if (this._isSingle) {
              return { data: dbData[0] || null, error: null };
            }
            return { data: dbData, error: null };
          }
        } catch (e) {
          console.error(`[MOCK DB] Real DB fetch failed for ${this.table}, falling back to local:`, e);
        }
      }

      let filtered = [...data];
      for (const [col, val] of Object.entries(this._filters)) {
        filtered = filtered.filter(item => item[col] === val);
      }

      // Automatically create a default profile for the admin user if empty
      if (this.table === 'profiles' && filtered.length === 0) {
        const defaultProfile = {
          id: mockUser.id,
          full_name: "Administrator LexMind",
          role: "admin",
          subscription_tier: "Premium Pro",
          favorite_models: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        data.push(defaultProfile);
        localStorage.setItem(storageKey, JSON.stringify(data));
        filtered = [defaultProfile];
      }

      if (this._isSingle) {
        return { data: filtered[0] || null, error: null };
      }
      return { data: filtered, error: null };
    }

    if (this.method === 'insert') {
      const payloadArray = Array.isArray(this.payload) ? this.payload : [this.payload];
      data.push(...(payloadArray as Record<string, unknown>[]));
      localStorage.setItem(storageKey, JSON.stringify(data));
      return { data: this.payload, error: null };
    }

    if (this.method === 'update') {
      const updatedData = data.map(item => {
        let match = true;
        for (const [col, val] of Object.entries(this._filters)) {
          if (item[col] !== val) {
            match = false;
            break;
          }
        }
        if (match) {
          return { ...item, ...(this.payload as Record<string, unknown>), updated_at: new Date().toISOString() };
        }
        return item;
      });
      localStorage.setItem(storageKey, JSON.stringify(updatedData));
      return { data: this.payload, error: null };
    }

    if (this.method === 'upsert') {
      const payloads = Array.isArray(this.payload) ? this.payload : [this.payload];
      for (const payload of payloads) {
        const idx = data.findIndex(item => item.id === (payload as Record<string, unknown>).id);
        if (idx >= 0) {
          data[idx] = { ...data[idx], ...(payload as Record<string, unknown>), updated_at: new Date().toISOString() };
        } else {
          data.push({ ...(payload as Record<string, unknown>), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        }
      }
      localStorage.setItem(storageKey, JSON.stringify(data));
      return { data: this.payload, error: null };
    }

    return { data: null, error: new Error(`Unsupported method: ${this.method}`) };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Global store for auth event listeners
const authListeners = new Set<(event: AuthChangeEvent, session: Session | null) => void>();

const getMockSession = (): Session | null => {
  const raw = localStorage.getItem('lexmind_mock_session');
  if (raw === 'none') return null;
  return mockSession as unknown as Session;
};

function isRealJwt(token: string): boolean {
  if (!token || token.includes("mock")) return false;
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function getRestAccessToken(): string {
  try {
    const prefix = "sb-";
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix) && key.endsWith("-auth-token")) {
        const parsed = JSON.parse(localStorage.getItem(key) || "{}") as {
          access_token?: string;
        };
        if (parsed.access_token && isRealJwt(parsed.access_token)) {
          return parsed.access_token;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return supabaseAnonKey;
}

const setMockSession = (sess: Session | null) => {
  if (sess) {
    localStorage.setItem('lexmind_mock_session', JSON.stringify(sess));
  } else {
    localStorage.setItem('lexmind_mock_session', 'none');
  }
};

const mockSupabase = {
  auth: {
    getUser: async () => {
      const session = getMockSession();
      if (!session) return { data: { user: null }, error: null };
      return { data: { user: session.user }, error: null };
    },
    getSession: async () => {
      const session = getMockSession();
      return { data: { session }, error: null };
    },
    signUp: async (credentials: { email?: string; password?: string }) => {
      const user = {
        ...mockUser,
        email: credentials.email || mockUser.email,
        id: Math.random().toString(36).substring(2, 15)
      } as unknown as User;
      const session = { ...mockSession, user } as unknown as Session;
      setMockSession(session);
      authListeners.forEach(cb => cb('SIGNED_IN', session));
      return { data: { user, session }, error: null };
    },
    signInWithPassword: async (credentials: { email?: string; password?: string }) => {
      const user = {
        ...mockUser,
        email: credentials.email || mockUser.email
      } as unknown as User;
      const session = {
        ...mockSession,
        user
      } as unknown as Session;
      setMockSession(session);
      authListeners.forEach(cb => cb('SIGNED_IN', session));
      return { data: { user: session.user, session }, error: null };
    },
    signOut: async () => {
      setMockSession(null);
      authListeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },
    resetPasswordForEmail: async (email: string) => {
      console.log("[MOCK AUTH] Password reset link sent to:", email);
      return { data: {}, error: null };
    },
    onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
      authListeners.add(callback);
      // Immediately notify of current state
      const session = getMockSession();
      callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback);
            }
          }
        }
      };
    }
  },
  from: (table: string) => {
    return new MockQueryBuilder(table);
  }
};

// Define standard client
let supabase: SupabaseClient;

try {
  if (supabaseUrl && supabaseAnonKey && !supabaseAnonKey.includes("placeholder")) {
    const realClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'public',
      },
    });

    // Real Supabase for auth + DB (mock token causes 401 on REST). Mock only for offline/dev without credentials.
    supabase = new Proxy(realClient, {
      get(target, prop, receiver) {
        if (prop === "from") {
          return target.from.bind(target);
        }
        if (prop === "auth") {
          return target.auth;
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as unknown as SupabaseClient;

    console.log("[SUPABASE] Connected to cloud project (real auth + database).");
  } else {
    console.warn('[SUPABASE] Invalid credentials. Falling back to local offline mode.');
    supabase = mockSupabase as unknown as SupabaseClient;
  }
} catch (e) {
  console.error('[SUPABASE] Failed to initialize real client, using mock fallback:', e);
  supabase = mockSupabase as unknown as SupabaseClient;
}

export { supabase };

