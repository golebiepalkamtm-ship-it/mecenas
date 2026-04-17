import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../utils/supabaseClient";
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
      console.log(`[KB] ${new Date().toISOString()} Fetching global documents via React Query...`);
      const startTime = Date.now();
      const { data, error } = await supabase
        .from("unique_legal_documents")
        .select("*")
        .order('name', { ascending: true })
        .abortSignal(signal);

      const duration = Date.now() - startTime;
      console.log(`[KB] ${new Date().toISOString()} Query completed in ${duration}ms`);

      if (error) {
        // Skip logging for aborted requests (normal behavior in React StrictMode/HMR)
        if (error.message?.includes("AbortError") || error.code === "ABORTED") {
          return [];
        }
        console.error(`[KB] ${new Date().toISOString()} Knowledge fetch error (${duration}ms):`, error);
        return [];
      }

      console.log(`[KB] ${new Date().toISOString()} Fetched ${data?.length || 0} documents (${duration}ms)`);
      return (data || []).map((d: KnowledgeDocument) => ({
        id: d.id,
        name: d.name,
        chunks: d.chunks,
        status: "ready",
        created_at: d.created_at,
        type: d.type
      }));
    },
    staleTime: 1000 * 60 * 2, // 2 minuty świeżości
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
      const { data, error } = await supabase
        .from("knowledge_base_user")
        .select("id, metadata, created_at, content")
        .order("created_at", { ascending: false })
        .abortSignal(signal);

      if (error) {
        if (error.message?.includes("AbortError") || error.code === "ABORTED") {
          return [];
        }
        throw error;
      }
      if (!data) return [];

      const docMap = new Map<string, Document>();
      data.forEach(item => {
        let metadata = item.metadata;
        if (typeof metadata === 'string') {
          try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
        }
        
        const filename = metadata?.filename || "Dokument bez nazwy";
        
        // Detekcja typu na podstawie rozszerzenia
        const lowerName = filename.toLowerCase();
        const isImage = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || 
                        lowerName.endsWith('.png') || lowerName.endsWith('.webp') ||
                        lowerName.endsWith('.bmp') || lowerName.endsWith('.tiff');
        
        // Finalny typ wyświetlania
        const displayType = isImage ? 'image' : (metadata?.type || 'document');

        if (!docMap.has(filename)) {
          docMap.set(filename, {
            id: filename,
            title: filename,
            content: item.content,
            type: displayType,
            created_at: item.created_at,
            chunks: 1
          });
        } else {
          const existing = docMap.get(filename);
          if (existing) {
             (existing.chunks as number) += 1;
             // Jeśli to kolejny fragment, możemy appendować tekst (opcjonalnie)
             // existing.content += "\n\n" + item.content; 
          }
        }
      });

      return Array.from(docMap.values());
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
    uploadUserDocument 
  };
}

/**
 * Klucze API są teraz zarządzane przez Supabase Secrets (Secure Layer).
 * Ten hook jest uproszczony do zarządzania widocznością dostawców w UI.
 */
export function useApiManagement() {
  const [providers, setProviders] = useState<ApiProvider[]>([
    {
      id: "openrouter",
      name: "OpenRouter (Master Engine)",
      active: true,
      key: "••••••••",
    },
  ]);

  const toggleProvider = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    );
  };

  const updateKey = async (id: string, key: string) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, key } : p)));
  };

  return { providers, toggleProvider, updateKey };
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
        const authResponse = await Promise.race([userPromise, timeoutPromise]) as { data: { user: any } };
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

        const profileResponse = await Promise.race([profilePromise, timeoutPromise]) as { data: { system_prompt: string | null } | null; error: any };
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
            const { data: { user } } = await supabase.auth.getUser();
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

    const updateProfile = async (updates: any) => {
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
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [initialBootDone, setInitialBootDone] = useState(false);

  // Sessions & Models
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => {
    try {
      performance.mark("chat-init-start");
      const startTime = performance.now();
      const saved = localStorage.getItem("prawnik_session_id");
      const duration = performance.now() - startTime;
      if (duration > 50) {
        console.warn(`[PERF] localStorage.getItem(prawnik_session_id) took ${duration.toFixed(2)}ms`);
      }
      
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (saved && !uuidRegex.test(saved)) {
        localStorage.removeItem("prawnik_session_id");
        return "";
      }
      return saved || "";
    } catch (e) {
      console.warn("LocalStorage access failed", e);
      return "";
    }
  });

  const [availableModels, setAvailableModels] = useState<ChatModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(''); // No default model - user must choose

  // Enhanced setSelectedModel that preserves conversation context
  const setSelectedModelWithContext = useCallback(
    (newModel: string) => {
      setSelectedModel(newModel);
      try {
        localStorage.setItem(
          "prawnik_model_change_timestamp",
          Date.now().toString(),
        );
        localStorage.setItem("prawnik_previous_model", selectedModel);
      } catch (e) {
        console.warn("LocalStorage set failed", e);
      }
    },
    [selectedModel],
  );

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
      const startTime = performance.now();
      const text = await res.text();
      const parseStart = performance.now();
      const data = JSON.parse(text);
      const parseDuration = performance.now() - parseStart;
      const totalProcessDuration = performance.now() - startTime;
      
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
        setAvailableModels(formatted);
        setSelectedModel((prev) => {
          if (!prev) return "";
          const prevExists = formatted.find((m: ChatModel) => m.id === prev);
          return prevExists ? prev : "";
        });
      }
    } catch {
      // All retries exhausted — app works without models list, user can refresh later
    } finally {
      setModelsLoaded(true);
    }
  }, [fetchWithRetry]);

  useEffect(() => {
    fetchModels();
    window.addEventListener("prawnik_models_updated", fetchModels);
    return () => window.removeEventListener("prawnik_models_updated", fetchModels);
  }, [fetchModels]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/sessions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const startTime = performance.now();
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
    fetchSessions();
  }, [fetchSessions]);

  const [messagesLoaded, setMessagesLoaded] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!sessionId) {
      setMessages([]);
      setMessagesLoaded(true);
      return;
    }
    setMessagesLoaded(false);
    try {
      const res = await fetchWithRetry(`${API_BASE}/sessions/${sessionId}/messages?limit=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ChatMessage[] = await res.json();
      setMessages(data || []);
    } catch {
      // KOŁO RATUNKOWE: jeśli historia nie załaduje się, zaczynamy czysty czat
      setMessages([]);
    } finally {
      setMessagesLoaded(true);
    }
  }, [sessionId, fetchWithRetry]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);


  // Latch: once boot completes the first time, never go back to "not complete"
  useEffect(() => {
    if (!initialBootDone && modelsLoaded && sessionsLoaded && messagesLoaded) {
      setInitialBootDone(true);
    }
  }, [initialBootDone, modelsLoaded, sessionsLoaded, messagesLoaded]);



  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async () => {
      // NOTE: sendMessage is now deprecated in favor of useChatMutation
    },
    [],
  );

  const newChat = useCallback(() => {
    setSessionId("");
    setMessages([]);
    setMessagesLoaded(true);
    localStorage.removeItem("prawnik_session_id");
  }, []);

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
    setMessagesLoaded(false);
    setMessages([]); // Clear current messages immediately
    setSessionId(id);
    localStorage.setItem("prawnik_session_id", id);
    // Effects will handle loading messages
  }, []);

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

  return {
    messages,
    setMessages,
    sendMessage,
    isLoading,
    setIsLoading,
    clearHistory,
    stopGeneration,
    availableModels,
    selectedModel,
    setSelectedModel: setSelectedModelWithContext,
    sessions,
    sessionId,
    setSessionId,
    newChat,
    switchSession,
    removeSession,
    fetchSessions,
    messagesLoaded,
    sessionsLoaded,
    modelsLoaded,
    isInitialLoadComplete: initialBootDone || (sessionsLoaded && messagesLoaded),
  };

}
