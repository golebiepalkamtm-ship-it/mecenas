import { useState, useCallback, useEffect, useRef } from "react";
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
 */
export function useKnowledgeBase() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    console.log("[KB] Fetching documents...");
    setIsLoading(true);
    // Absolute maximum fetch time for KB to prevent startup hang
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const { data, error } = await supabase
        .from("unique_legal_documents")
        .select("*")
        .order('name', { ascending: true });

      if (error) {
        console.error("[KB] Knowledge fetch error:", error);
        setDocuments([]);
        return;
      }

      if (data && data.length > 0) {
        setDocuments(
          data.map((d: KnowledgeDocument) => ({
            id: d.id,
            name: d.name,
            chunks: d.chunks,
            status: "ready",
            created_at: d.created_at,
            type: d.type
          })),
        );
        console.log(`[KB] Loaded ${data.length} documents.`);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn("[KB] Knowledge fetch timed out (6s). Continuing without fresh data.");
      } else {
        console.error("[KB] Error in fetchDocuments:", err);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadPDF = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "rag_legal");

        // Use unified upload endpoint
        const res = await fetch(`${API_BASE}/documents/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed on server");

        // Refresh after a small delay to allow background task to start/finish
        setTimeout(fetchDocuments, 2000);
      } catch (error) {
        console.error("PDF Upload failed:", error);
        alert("Błąd wgrywania pliku PDF. Sprawdź czy serwer API działa.");
      } finally {
        setIsUploading(false);
      }
    },
    [fetchDocuments],
  );

  const removeFile = useCallback(
    async (filename: string) => {
      try {
        // Use local API to clean up both local storage and Supabase cloud
        const res = await fetch(`${API_BASE}/documents/${filename}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Delete failed");

        await fetchDocuments();
      } catch (error) {
        console.error("Failed to remove file:", error);
      }
    },
    [fetchDocuments],
  );

  return {
    documents,
    uploadPDF,
    removeFile,
    isUploading,
    isLoading,
    refresh: fetchDocuments,
  };
}


/**
 * Hook do zarządzania dokumentami użytkownika (pełna biblioteka: uploady + pisma AI).
 * TO JEST SEKCJA "DOKUMENTY".
 */
export function useUserLibrary() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      // Pobieramy wszystkie fragmenty z bazy użytkownika
      const { data, error } = await supabase
        .from("knowledge_base_user")
        .select("id, metadata, created_at, content")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (!data) {
        setDocuments([]);
        return;
      }

      // Grupujemy fragmenty w unikalne dokumenty na podstawie nazwy pliku w metadanych
      const docMap = new Map<string, Document>();
      
      data.forEach(item => {
        let metadata = item.metadata;
        if (typeof metadata === 'string') {
          try { 
            metadata = JSON.parse(metadata); 
          } catch { 
            try {
              // Handle potentially double-stringified or poorly formatted JSON
              metadata = JSON.parse(JSON.parse(metadata));
            } catch {
              metadata = {}; 
            }
          }
        }
        
        const filename = metadata?.filename || "Dokument bez nazwy";
        
        if (!docMap.has(filename)) {
          docMap.set(filename, {
            id: filename, // Używamy nazwy jako ID dla unikalności w tej bazie
            title: filename,
            content: item.content, // Pierwszy fragment jako podgląd
            type: metadata?.type || "uploaded",
            created_at: item.created_at,
            chunks: 1
          });
        } else {
          const existing = docMap.get(filename);
          if (existing) (existing.chunks as number) += 1;
        }
      });

      setDocuments(Array.from(docMap.values()));
    } catch (err) {
      console.error("Error fetching user library:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const removeDocument = useCallback(async (id: string, filename?: string) => {
    try {
      const targetFilename = filename || id;
      // Usuwamy wszystkie fragmenty powiązane z danym plikiem (id to nazwa pliku)
      const { error } = await supabase
        .from("knowledge_base_user")
        .delete()
        .filter("metadata->>filename", "eq", targetFilename);
      
      if (error) throw error;
      await fetchDocuments();
    } catch (err) {
      console.error("Failed to remove document:", err);
    }
  }, [fetchDocuments]);

  const uploadUserDocument = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "rag_user");

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      
      // Delay to allow indexing to complete
      setTimeout(fetchDocuments, 2000);
    } catch (error) {
      console.error("User document upload failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchDocuments]);

  return { 
    documents, 
    isLoading, 
    refresh: fetchDocuments, 
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("system_prompt")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setPrompt(data.system_prompt || "");
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
    const saved = localStorage.getItem("prawnik_session_id");
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (saved && !uuidRegex.test(saved)) {
      localStorage.removeItem("prawnik_session_id");
      return "";
    }
    return saved || "";
  });

  const [availableModels, setAvailableModels] = useState<ChatModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(''); // No default model - user must choose

  // Enhanced setSelectedModel that preserves conversation context
  const setSelectedModelWithContext = useCallback(
    (newModel: string) => {
      setSelectedModel(newModel);
      // Store the change timestamp to trigger context refresh on next message
      localStorage.setItem(
        "prawnik_model_change_timestamp",
        Date.now().toString(),
      );
      localStorage.setItem("prawnik_previous_model", selectedModel);
    },
    [selectedModel],
  );

  const fetchModels = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${API_BASE}/models/all`, { signal: controller.signal });
      const data = await res.json();
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
      // Don't log full error for connection refused during boot
    } finally {
      clearTimeout(timeout);
      setModelsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    // Add event listener for settings updates
    window.addEventListener("prawnik_models_updated", fetchModels);
    return () =>
      window.removeEventListener("prawnik_models_updated", fetchModels);
  }, [fetchModels]);

  const fetchSessions = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${API_BASE}/sessions`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ChatSession[] = await res.json();
      setSessions(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[BOOT] Sessions fetch failed: ${message}`);
      setSessions([]);
    } finally {
      clearTimeout(timeoutId);
      setSessionsLoaded(true);
    }
  }, []);

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ChatMessage[] = await res.json();
      setMessages(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[BOOT] Messages fetch failed: ${message}`);
      setMessages([]);
    } finally {
      clearTimeout(timeoutId);
      setMessagesLoaded(true);
    }
  }, [sessionId]);

  // Fetch message history for current session from Backend
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Background retry: if initial fetch failed (backend was starting), retry until data arrives
  useEffect(() => {
    if (!modelsLoaded || !sessionsLoaded || !messagesLoaded) return;
    
    // Stop condition: we have all basic data
    const hasModels = availableModels.length > 3;
    const hasSessions = sessions.length > 0;
    const hasMessages = !sessionId || messages.length > 0 || messagesLoaded;
    
    if (hasModels && hasSessions && hasMessages) return;

    const interval = setInterval(() => {
      if (availableModels.length <= 3) fetchModels();
      if (sessions.length === 0) fetchSessions();
      if (sessionId && messages.length === 0) loadMessages();
    }, 4000);

    return () => clearInterval(interval);
  }, [modelsLoaded, sessionsLoaded, messagesLoaded, availableModels.length, sessions.length, messages.length, sessionId, fetchModels, fetchSessions, loadMessages]);


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
    isInitialLoadComplete: initialBootDone || (modelsLoaded && sessionsLoaded && messagesLoaded),
  };

}
