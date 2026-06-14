import { useState, useCallback, useEffect, useRef } from "react";
export { useModelHealth } from "./useModelHealth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../utils/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { API_BASE } from "../config";

import type { Document, KnowledgeDocument } from "../types/library";



export interface ApiProvider {
  id: string;
  name: string;
  active: boolean;
  key: string;
}

import type { ChatMessage } from "../types/chat";

interface ChatSession {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}

interface ChatModel {
  id: string;
  name: string;
  active: boolean;
  provider: string;
  vision: boolean;
}

/**
 * Hook do zarządzania bazą wiedzy (RAG) przez Supabase.
 * Zastosowano React Query dla wydajnego cachowania i eliminacji duplikatów zapytań.
 */
export function useKnowledgeBase() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents = [], isLoading, refetch } = useQuery<KnowledgeDocument[]>({
    queryKey: ["knowledge_base_global"],
    queryFn: async ({ signal }) => {
      console.log(`[KB] ${new Date().toISOString()} Fetching legal knowledge base...`);
      const startTime = Date.now();

      // 1. Try fetching from optimized view first
      const viewRes = await supabase
        .from("unique_legal_documents_view")
        .select("representative_chunk_id, name, chunks, first_seen_at")
        .abortSignal(signal);

      if (!viewRes.error) {
        const result = (viewRes.data || []).map((row: any) => ({
          id: String(row.representative_chunk_id),
          name: row.name || "Dokument bez nazwy",
          chunks: Number(row.chunks),
          status: "ready" as const,
          created_at: row.first_seen_at
        })).sort((a: any, b: any) => a.name.localeCompare(b.name, "pl"));
        
        console.log(`[KB] Fetched ${result.length} documents from optimized view in ${Date.now() - startTime}ms`);
        return result;
      }

      if (viewRes.error?.message?.includes("AbortError") || viewRes.error?.code === "ABORTED") {
        return [];
      }
      
      console.warn("[KB] Optimized view unique_legal_documents_view not available, falling back to legacy fetch:", viewRes.error.message);

      // 2. Fallback to legacy chunk fetching if view doesn't exist
      type LegalRow = { id: string | number; metadata?: { filename?: string }; created_at: string };
      const allRows: LegalRow[] = [];
      let from = 0;
      const step = 1000;

      while (true) {
        if (signal.aborted) return [];

        const { data, error } = await supabase
          .from("knowledge_base_legal")
          .select("id, metadata, created_at")
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + step - 1);

        if (error) {
          if (error.message?.includes("AbortError") || error.code === "ABORTED") {
            return [];
          }
          console.error(
            `[KB] Knowledge fetch error (${error.code}):`,
            error.message,
            error.code === "PGRST301" || error.message?.includes("401")
              ? "— zaloguj się na konto Supabase (mock auth nie działa z bazą w chmurze)."
              : "",
          );
          return [];
        }

        const batch = (data || []) as LegalRow[];
        if (batch.length === 0) break;

        allRows.push(...batch);
        if (batch.length < step) break;
        from += step;
      }

      const docMap = new Map<string, KnowledgeDocument>();
      for (const row of allRows) {
        const name = row.metadata?.filename || "Dokument bez nazwy";
        const id = String(row.id);
        const existing = docMap.get(name);
        if (!existing) {
          docMap.set(name, {
            id,
            name,
            chunks: 1,
            status: "ready",
            created_at: row.created_at,
          });
        } else {
          docMap.set(name, {
            ...existing,
            chunks: existing.chunks + 1,
            created_at: row.created_at < existing.created_at ? row.created_at : existing.created_at,
          });
        }
      }

      const result = Array.from(docMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "pl"),
      );

      const duration = Date.now() - startTime;
      console.log(`[KB] ${result.length} documents (${allRows.length} chunks) from legacy fetch in ${duration}ms`);
      return result;
    },
    staleTime: 1000 * 60 * 2,
  });

  const uploadPDF = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "rag_legal");

        const res = await fetch(`${API_BASE}/documents/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed on server");
        
        // Refresh cache
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ["knowledge_base_global"] }), 2000);
      } catch (error) {
        console.error("PDF Upload failed:", error);
        alert("Błąd wgrywania pliku PDF.");
      } finally {
        setIsUploading(false);
      }
    },
    [queryClient],
  );

  const removeFile = useCallback(
    async (filename: string) => {
      try {
        const res = await fetch(`${API_BASE}/documents/${filename}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Delete failed");
        queryClient.invalidateQueries({ queryKey: ["knowledge_base_global"] });
      } catch (error) {
        console.error("Failed to remove file:", error);
      }
    },
    [queryClient],
  );

  return {
    documents,
    uploadPDF,
    removeFile,
    isUploading,
    isLoading,
    refresh: refetch,
  };
}


/**
 * Hook do zarządzania dokumentami użytkownika (pełna biblioteka: uploady + pisma AI).
 */
export function useUserLibrary() {
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading, refetch } = useQuery<Document[]>({
    queryKey: ["user_library"],
    queryFn: async ({ signal }) => {
      console.log("[KB] Fetching user library via React Query...");
      const startTime = Date.now();

      // 1. Try fetching from optimized view first
      const viewRes = await supabase
        .from("unique_user_documents_view")
        .select("representative_chunk_id, name, chunks, first_seen_at")
        .abortSignal(signal);

      if (!viewRes.error) {
        const result = (viewRes.data || []).map((row: any) => {
          const filename = row.name || "Dokument bez nazwy";
          const lowerName = filename.toLowerCase();
          const isImage =
            lowerName.endsWith(".jpg") ||
            lowerName.endsWith(".jpeg") ||
            lowerName.endsWith(".png") ||
            lowerName.endsWith(".webp") ||
            lowerName.endsWith(".bmp") ||
            lowerName.endsWith(".tiff");

          return {
            id: filename,
            title: filename,
            content: "",
            type: isImage ? "image" : "document",
            created_at: row.first_seen_at,
            chunks: Number(row.chunks),
          };
        }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        console.log(`[KB] Fetched ${result.length} user documents from optimized view in ${Date.now() - startTime}ms`);
        return result;
      }

      if (viewRes.error?.message?.includes("AbortError") || viewRes.error?.code === "ABORTED") {
        return [];
      }
      
      console.warn("[KB] Optimized view unique_user_documents_view not available, falling back to legacy fetch:", viewRes.error.message);

      // 2. Fallback to legacy chunk fetching
      type UserRow = {
        id: string | number;
        metadata?: Record<string, unknown> | string;
        created_at: string;
      };

      const allRows: UserRow[] = [];
      let from = 0;
      const step = 1000;

      while (true) {
        if (signal.aborted) return [];

        const { data, error } = await supabase
          .from("knowledge_base_user")
          .select("id, metadata, created_at")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + step - 1)
          .abortSignal(signal);

        if (error) {
          if (error.message?.includes("AbortError") || error.code === "ABORTED") {
            return [];
          }
          console.error(
            `[KB] User library fetch error (${error.code}):`,
            error.message,
            error.code === "PGRST301" || error.message?.includes("401")
              ? "— zaloguj się na konto Supabase (mock auth nie działa z bazą w chmurze)."
              : "",
          );
          throw error;
        }

        const batch = (data || []) as UserRow[];
        if (batch.length === 0) break;

        allRows.push(...batch);
        if (batch.length < step) break;
        from += step;
      }

      const docMap = new Map<string, Document>();
      for (const item of allRows) {
        let metadata = item.metadata;
        if (typeof metadata === "string") {
          try {
            metadata = JSON.parse(metadata) as Record<string, unknown>;
          } catch {
            metadata = {};
          }
        }

        const meta = (metadata || {}) as Record<string, unknown>;
        const filename = (meta.filename as string) || "Dokument bez nazwy";

        const lowerName = filename.toLowerCase();
        const isImage =
          lowerName.endsWith(".jpg") ||
          lowerName.endsWith(".jpeg") ||
          lowerName.endsWith(".png") ||
          lowerName.endsWith(".webp") ||
          lowerName.endsWith(".bmp") ||
          lowerName.endsWith(".tiff");

        const displayType = isImage ? "image" : ((meta.type as string) || "document");

        const existing = docMap.get(filename);
        if (!existing) {
          docMap.set(filename, {
            id: filename,
            title: filename,
            content: "",
            type: displayType,
            created_at: item.created_at,
            chunks: 1,
          });
        } else {
          existing.chunks = (existing.chunks || 0) + 1;
          if (item.created_at > existing.created_at) {
            existing.created_at = item.created_at;
          }
        }
      }

      return Array.from(docMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
    staleTime: 1000 * 30, // 30 sekund
  });

  const removeDocument = useCallback(async (id: string, filename?: string) => {
    try {
      const targetFilename = filename || id;
      const { error } = await supabase
        .from("knowledge_base_user")
        .delete()
        .filter("metadata->>filename", "eq", targetFilename);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["user_library"] });
    } catch (err) {
      console.error("Failed to remove document:", err);
    }
  }, [queryClient]);

  const removeDocuments = useCallback(async (filenames: string[]) => {
    const unique = [...new Set(filenames.filter(Boolean))];
    if (unique.length === 0) return;

    try {
      const results = await Promise.all(
        unique.map((filename) =>
          supabase
            .from("knowledge_base_user")
            .delete()
            .filter("metadata->>filename", "eq", filename),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      queryClient.invalidateQueries({ queryKey: ["user_library"] });
    } catch (err) {
      console.error("Failed to remove documents:", err);
      throw err;
    }
  }, [queryClient]);

  const uploadUserDocument = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "rag_user");

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["user_library"] }), 2000);
    } catch (error) {
      console.error("User document upload failed:", error);
    }
  }, [queryClient]);

  return { 
    documents, 
    isLoading, 
    refresh: refetch, 
    removeDocument,
    removeDocuments,
    uploadUserDocument 
  };
}

/**
 * Klucze API są teraz zarządzane przez Supabase Secrets (Secure Layer).
 * Ten hook jest uproszczony do zarządzania widocznością dostawców w UI.
 */
export function useApiManagement() {
  const STORAGE_KEY = "lexmind_api_providers_v2";

  const [providers, setProviders] = useState<ApiProvider[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved providers", e);
      }
    }
    return [
      {
        id: "openrouter",
        name: "OpenRouter (Master Engine)",
        active: true,
        key: "••••••••",
      },
      {
        id: "google",
        name: "Google (Gemini SDK)",
        active: true,
        key: "••••••••",
      },
      {
        id: "openai",
        name: "OpenAI",
        active: false,
        key: "",
      },
      {
        id: "anthropic",
        name: "Anthropic",
        active: false,
        key: "",
      },
      {
        id: "mindee",
        name: "Mindee (OCR Engine)",
        active: true,
        key: "••••••••",
      }
    ];
  });

  // Save to localStorage whenever providers change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
  }, [providers]);

  const toggleProvider = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    );
  };

  const updateKey = async (id: string, key: string) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, key } : p)));
    
    // Sync with other specific keys if needed
    if (id === "google") localStorage.setItem("GOOGLE_API_KEY", key);
    if (id === "openai") localStorage.setItem("OPENAI_API_KEY", key);
    if (id === "anthropic") localStorage.setItem("ANTHROPIC_API_KEY", key);
    if (id === "mindee") localStorage.setItem("MINDEE_API_KEY", key);
  };

  const addProvider = (name: string, key?: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (providers.find(p => p.id === id)) return;
    setProviders([...providers, { id, name, active: true, key: key || "" }]);
  };

  const removeProvider = (id: string) => {
    if (['openrouter', 'google', 'openai', 'anthropic', 'mindee'].includes(id)) {
      alert("Nie można usunąć systemowego dostawcy.");
      return;
    }
    setProviders((prev) => prev.filter((p) => p.id !== id));
  };

  return { providers, toggleProvider, updateProviderKey: updateKey, addProvider, removeProvider };
}

/**
 * Hook do zarządzania instrukcjami systemowymi (System Prompt) przez Supabase.
 */
export function useSystemPrompt() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPrompt = async () => {
      console.log(`[SYSTEM_PROMPT] ${new Date().toISOString()} Fetching system prompt...`);
      const startTime = Date.now();
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000)
        );
        const userPromise = supabase.auth.getUser();
        const authResponse = (await Promise.race([userPromise, timeoutPromise])) as { data: { user: User | null } }; 
        const { data: { user } } = authResponse;
        const authDuration = Date.now() - startTime;
        console.log(`[SYSTEM_PROMPT] ${new Date().toISOString()} Auth completed in ${authDuration}ms`);
        
        if (!user) {
          console.log(`[SYSTEM_PROMPT] ${new Date().toISOString()} No user`);
          return;
        }

        const profilePromise = supabase
          .from("profiles")
          .select("system_prompt")
          .eq("id", user.id)
          .single();

        const profileResponse = await Promise.race([profilePromise, timeoutPromise]) as { data: { system_prompt: string | null } | null; error: unknown };
        const { data, error } = profileResponse;
        const totalDuration = Date.now() - startTime;

        if (!error && data) {
          console.log(`[SYSTEM_PROMPT] ${new Date().toISOString()} Prompt fetched (${totalDuration}ms)`);
          setPrompt(data.system_prompt || "");
        } else {
          console.log(`[SYSTEM_PROMPT] ${new Date().toISOString()} Profile error (${totalDuration}ms):`, error);
        }
      } catch (err) {
        const totalDuration = Date.now() - startTime;
        console.warn(`[SYSTEM_PROMPT] ${new Date().toISOString()} Fetch failed (${totalDuration}ms):`, err);
      }
    };
    fetchPrompt();
  }, []);

  const savePrompt = useCallback(async (newPrompt: string) => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ system_prompt: newPrompt })
        .eq("id", user.id);

      if (error) throw error;
      setPrompt(newPrompt);
    } catch (err) {
      console.error("Save prompt failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { prompt, savePrompt, isLoading };
}

/**
 * Hook do zarządzania profilem użytkownika i kluczami API.
 */
export function useProfile() {
    const { data: profile, isLoading, refetch } = useQuery({
        queryKey: ["user_profile"],
        queryFn: async () => {
            console.log(`[PROFILE] ${new Date().toISOString()} Fetching user profile...`);
            const startTime = Date.now();
            const { data: { user } } = (await supabase.auth.getUser()) as { data: { user: User | null } };
            const authDuration = Date.now() - startTime;
            console.log(`[PROFILE] ${new Date().toISOString()} Auth check completed in ${authDuration}ms`);

            if (!user) {
                console.log(`[PROFILE] ${new Date().toISOString()} No user logged in`);
                return null;
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            const totalDuration = Date.now() - startTime;
            if (error) {
                console.error(`[PROFILE] ${new Date().toISOString()} Profile fetch error (${totalDuration}ms):`, error);
                return null;
            }
            console.log(`[PROFILE] ${new Date().toISOString()} Profile fetched (${totalDuration}ms)`);
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minut
    });

    const updateProfile = async (updates: Record<string, unknown>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from("profiles")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", user.id);

        if (error) throw error;
        refetch();
    };

    return { profile, updateProfile, isLoading, refetch };
}

/**
 * Hook do obsługi czatu i serializacji historii.
 */

/**
 * Hook do obsługi czatu przez Supabase Edge Functions.
 */
interface AdminStats {
  users: number;
  docs: number;
  requests: number;
  tokens: number;
}

interface ServiceHealth {
  id: string;
  name: string;
  status: "online" | "offline" | "degraded";
  latency: number;
}

export function useAdminSystem() {
  const [stats, setStats] = useState<AdminStats>({
    users: 0,
    docs: 0,
    requests: 0,
    tokens: 0,
  });
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSystemStats = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
        
        const res = await fetch(`${API_BASE}/admin/stats`, { headers });
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats || { users: 0, docs: 0, requests: 0, tokens: 0 });
          setServices(data.services || []);
        }
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return { stats, services, isLoading };
}

interface AdminUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      
      const res = await fetch(`${API_BASE}/admin/users`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers();
    }, 0);
    return () => clearTimeout(timeout);
  }, [fetchUsers]);

  const updateUserRole = useCallback(async (userId: string, newRole: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      
      const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch (error) {
      console.error("Failed to update user role:", error);
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  }, []);

  return { users, isLoading, updateUserRole, deleteUser, refetch: fetchUsers };
}


export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeMessagesRequestId = useRef(0);
  const [initialBootDone, setInitialBootDone] = useState(false);

  // Sessions & Models
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  // Bez auto-przywracania ostatniej sesji — unikamy „wlewania” starej sprawy po restarcie aplikacji.
  const [sessionId, setSessionId] = useState<string>("");

  // ── KOŁO RATUNKOWE #1: Fetch z automatycznym retry + backoff ──
  const fetchWithRetry = useCallback(async (url: string, maxRetries = 3): Promise<Response> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        return res;
      } catch (err) {
        clearTimeout(timeout);
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 4000); // 1s, 2s, 4s
          console.log(`[RETRY] ${url} attempt ${attempt + 1}/${maxRetries}, next in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
    throw new Error("Unreachable");
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/models/all`);
      const text = await res.text();
      const parseStart = performance.now();
      const data = JSON.parse(text);
      const parseDuration = performance.now() - parseStart;
      
      console.log(`[CHAT] Models data size: ${(text.length / 1024).toFixed(2)}KB, parse took ${parseDuration.toFixed(2)}ms`);
      
      if (parseDuration > 100) {
        console.warn(`[PERF] JSON.parse(models) took ${parseDuration.toFixed(2)}ms`);
      }

      if (Array.isArray(data) && data.length > 0) {
        const formatted = data.map((m: ChatModel) => ({
          id: m.id,
          name: `${m.id.split("/")[0].toUpperCase()}: ${m.name || m.id.split("/").slice(-1)[0]}`.trim(),
          active: true,
          provider: "openrouter",
          vision: m.vision || false,
        }));
        void formatted;
      }
    } catch {
      // All retries exhausted — app works without models list, user can refresh later
    } finally {
      setModelsLoaded(true);
    }
  }, [fetchWithRetry]);

  useEffect(() => {
    // Defer model loading to allow UI to paint first
    const timer = setTimeout(() => {
      fetchModels();
    }, 100);
    window.addEventListener("prawnik_models_updated", fetchModels);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("prawnik_models_updated", fetchModels);
    };
  }, [fetchModels]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/sessions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const text = await res.text();
      const parseStart = performance.now();
      const data: ChatSession[] = JSON.parse(text);
      const parseDuration = performance.now() - parseStart;
      
      console.log(`[CHAT] Sessions data size: ${(text.length / 1024).toFixed(2)}KB, parse took ${parseDuration.toFixed(2)}ms`);
      
      if (parseDuration > 100) {
        console.warn(`[PERF] JSON.parse(sessions) took ${parseDuration.toFixed(2)}ms`);
      }
      
      setSessions(data || []);
    } catch {
      // All retries exhausted — start with empty sessions, user can still chat
      setSessions([]);
    } finally {
      setSessionsLoaded(true);
    }
  }, [fetchWithRetry]);

  useEffect(() => {
    // Defer session loading to avoid blocking the main thread on mount
    const timer = setTimeout(() => {
      fetchSessions();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchSessions]);

  const [messagesLoaded, setMessagesLoaded] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!sessionId) {
      setMessages([]);
      setMessagesLoaded(true);
      return;
    }

    const requestId = ++activeMessagesRequestId.current;
    setMessagesLoaded(false);

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Messages fetch timeout")), 8000),
      );
      const res = await Promise.race([
        fetchWithRetry(`${API_BASE}/sessions/${sessionId}/messages?limit=100`, 1),
        timeoutPromise,
      ]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      const parseStart = performance.now();
      const data: ChatMessage[] = JSON.parse(text);
      const parseDuration = performance.now() - parseStart;

      console.log(
        `[CHAT] Messages payload for ${sessionId}: ${(text.length / 1024).toFixed(2)}KB, parse took ${parseDuration.toFixed(2)}ms`,
      );

      if (requestId !== activeMessagesRequestId.current) {
        return;
      }

      setMessages(data || []);
    } catch (error) {
      if (requestId !== activeMessagesRequestId.current) {
        return;
      }

      console.warn("[CHAT] Failed to load archived messages:", error);
      // KOŁO RATUNKOWE: jeśli historia nie załaduje się, zaczynamy czysty czat
      setMessages([]);
    } finally {
      if (requestId === activeMessagesRequestId.current) {
        setMessagesLoaded(true);
      }
    }
  }, [sessionId, fetchWithRetry]);

  useEffect(() => {
    // Opóźnione ładowanie wiadomości, aby nie blokować UI
    const timer = setTimeout(() => {
      loadMessages();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadMessages]);


  // Latch: once boot completes the first time, never go back to "not complete"
  useEffect(() => {
    if (!initialBootDone && modelsLoaded && sessionsLoaded && messagesLoaded) {
      // Defer state update to next tick to avoid cascading render warning
      const timeout = setTimeout(() => {
        setInitialBootDone(true);
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [initialBootDone, modelsLoaded, sessionsLoaded, messagesLoaded]);



  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const newChat = useCallback(() => {
    stopGeneration();
    activeMessagesRequestId.current += 1;
    setSessionId("");
    setMessages([]);
    setMessagesLoaded(true);
    localStorage.removeItem("prawnik_session_id");
  }, [stopGeneration]);

  const clearHistory = useCallback(async () => {
    stopGeneration();
    if (!sessionId) return;
    try {
      await fetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' });
      setMessages([]);
      fetchSessions();
      newChat();
    } catch (error) {
      console.error("Failed to clear messages:", error);
    }
  }, [sessionId, stopGeneration, fetchSessions, newChat]);

  const switchSession = useCallback(async (id: string) => {
    if (id === sessionId) return;

    setMessagesLoaded(false);
    setMessages([]); // Clear current messages immediately
    setSessionId(id);
    localStorage.setItem("prawnik_session_id", id);
    // Effects will handle loading messages
  }, [sessionId]);

  const removeSession = useCallback(
    async (id: string) => {
      const confirmed = window.confirm(
        "Czy na pewno chcesz usunąć tę sesję? Wszystkie wiadomości zostaną utracone.",
      );
      if (!confirmed) return;
      try {
        await fetch(`${API_BASE}/sessions/${id}`, {
          method: "DELETE",
        });
        if (sessionId === id) {
          newChat();
        }
        fetchSessions();
      } catch (error) {
        console.error("Failed to delete session:", error);
      }
    },
    [sessionId, newChat, fetchSessions],
  );

  const removeSessions = async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
    if (uniqueIds.length === 0) return;

    try {
      const results = await Promise.allSettled(
        uniqueIds.map((id) =>
          fetch(`${API_BASE}/sessions/${id}`, {
            method: "DELETE",
          }),
        ),
      );

      const hasFailures = results.some((result) => result.status === "rejected");
      if (hasFailures) {
        console.error("Some sessions failed to delete:", results);
      }

      if (sessionId && uniqueIds.includes(sessionId)) {
        newChat();
      }
      fetchSessions();
    } catch (error) {
      console.error("Failed to delete selected sessions:", error);
    }
  };

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    clearHistory,
    stopGeneration,
    sessions,
    sessionId,
    setSessionId,
    newChat,
    switchSession,
    removeSession,
    removeSessions,
    fetchSessions,
    messagesLoaded,
    sessionsLoaded,
    modelsLoaded,
    isInitialLoadComplete: initialBootDone || (sessionsLoaded && messagesLoaded),
  };

}
