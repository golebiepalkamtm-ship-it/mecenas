import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import { API_BASE } from "../config";

interface KnowledgeDocument {
  id: string;
  name: string;
  chunks: number;
  status: string;
  created_at: string;
  type?: 'document' | 'image';
  content?: string;
}

interface KnowledgeBaseRow {
  id: string;
  metadata: {
    filename?: string;
  };
  created_at: string;
}

interface ApiProvider {
  id: string;
  name: string;
  active: boolean;
  key: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
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

  const fetchDocuments = useCallback(async () => {
    // Paginate to bypass Supabase's 1000-row default per-request limit
    let allData: KnowledgeBaseRow[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
      console.log(`[KB] Fetching range ${from}-${from + step - 1} from knowledge_base_legal...`);
      const query = supabase
        .from("knowledge_base_legal")
        .select("id, metadata, created_at")
        .range(from, from + step - 1)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("[KB] Knowledge fetch error:", error);
        break;
      }
      
      console.log(`[KB] Received ${data?.length || 0} rows`);
      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      if (data.length < step) break;
      from += step;
    }
    
    console.log(`[KB] Total rows collected: ${allData.length}`);

    if (allData.length > 0) {
        // Group by filename — always accumulate chunk count
        const docMap = new Map<
          string,
          { id: string; name: string; chunks: number; created_at: string; type: 'document' | 'image' }
        >();

        for (const d of allData) {
          let metadata = d.metadata;
          if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
          }
          
          const filename = metadata?.filename || "Dokument bez nazwy";
          const extension = filename.split('.').pop()?.toLowerCase() || '';
          
          const isDoc = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension);
          const isImg = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'].includes(extension);
          
          if (!isDoc && !isImg) {
            console.log(`[KB] Skipping file: ${filename} (Ext: ${extension})`);
            continue; 
          }

          const fileType = isImg ? 'image' : 'document';
          const existing = docMap.get(filename);
          
          if (!existing) {
            docMap.set(filename, {
              id: d.id,
              name: filename,
              chunks: 1,
              created_at: d.created_at,
              type: fileType
            });
          } else {
            docMap.set(filename, {
              ...existing,
              chunks: existing.chunks + 1,
              created_at:
                d.created_at < existing.created_at
                  ? d.created_at
                  : existing.created_at,
            });
          }
        }

      const docs = Array.from(docMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "pl"),
      );

      setDocuments(
        docs.map((d) => ({
          id: d.id,
          name: d.name,
          chunks: d.chunks,
          status: "ready",
          created_at: d.created_at,
          type: d.type
        })),
      );
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
    refresh: fetchDocuments,
  };
}

/**
 * Hook do zarządzania dokumentami wygenerowanymi przez użytkownika (Dokumenty / Pisma).
 * Oddzielone od centralnej bazy wiedzy RAG.
 */
export function useUserDocuments() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("knowledge_base_user")
        .select("id, metadata, created_at");

      if (error) throw error;

      const docMap = new Map();
      (data || []).forEach(d => {
          const filename = d.metadata?.filename || "Dokument";
          if(!docMap.has(filename)) {
              docMap.set(filename, {
                  id: d.id,
                  name: filename,
                  chunks: 1,
                  status: "ready",
                  created_at: d.created_at,
                  type: 'document'
              });
          } else {
              const existing = docMap.get(filename);
              existing.chunks += 1;
          }
      });

      setDocuments(Array.from(docMap.values()));
    } catch (err) {
      console.error("Error fetching user documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadUserDocument = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "user_docs");

      const res = await fetch(`${API_BASE}/upload-document`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      setTimeout(fetchDocuments, 1500);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchDocuments]);

  const removeDocument = useCallback(async (id: string) => {
      console.log("Remove document requested for id:", id);
  }, []);

  return {
    documents,
    isLoading,
    refresh: fetchDocuments,
    removeDocument,
    uploadUserDocument,
  };
}export function useAIDrafts() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (err) {
      console.error("Error fetching AI drafts:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  return { drafts, isLoading, refresh: fetchDrafts };
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

  const [availableModels, setAvailableModels] = useState<ChatModel[]>([
    {
      id: "google/gemini-2.5-flash",
      name: "Google: Gemini 2.5 Flash",
      active: true,
      provider: "openrouter",
      vision: true,
    },
    {
      id: "openai/gpt-4o-2024-11-20",
      name: "OpenAI: GPT-4o",
      active: true,
      provider: "openrouter",
      vision: true,
    },
    {
      id: "anthropic/claude-3.7-sonnet",
      name: "Anthropic: Claude 3.7 Sonnet",
      active: true,
      provider: "openrouter",
      vision: true,
    },
  ]);
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
    console.log("🔄 Fetching models from API...");
    try {
      const res = await fetch(`${API_BASE}/models/all`);
      const data = await res.json();
      console.log("📦 Models received:", data.length, "models");

      if (Array.isArray(data) && data.length > 0) {
        // For chat: show ALL vision models regardless of admin filters
        // Admin panel can still filter, but chat gets full access for legal docs
        const formatted = data.map((m: ChatModel) => ({
          id: m.id,
          name: `${m.id.split("/")[0].toUpperCase()}: ${m.name || m.id.split("/").slice(-1)[0]}`.trim(),
          active: true,
          provider: "openrouter",
          vision: m.vision || false,
        }));

        console.log(
          "✅ Models updated successfully:",
          formatted.length,
          "models available",
        );
        setAvailableModels(formatted);
        setSelectedModel((prev) => {
          const firstAvailable = formatted[0]?.id || "google/gemini-2.5-flash";
          const prevExists = formatted.find((m: ChatModel) => m.id === prev);
          const selected = prevExists ? prev : firstAvailable;
          console.log("🎯 Selected model:", selected);
          return selected;
        });
        setModelsLoaded(true);
      }
    } catch (error) {
      console.error("Failed to fetch models, using defaults.", error);
      setModelsLoaded(true); // Still consider loaded even if failed
    }
  }, []);

  useEffect(() => {
    console.log("🚀 Initializing chat hook - fetching models...");
    console.log("🔗 API Base URL:", API_BASE);
    fetchModels();
    // Add event listener for settings updates
    window.addEventListener("prawnik_models_updated", fetchModels);
    return () =>
      window.removeEventListener("prawnik_models_updated", fetchModels);
  }, [fetchModels]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data: ChatSession[] = await res.json();
      setSessions(data || []);
      setSessionsLoaded(true);
    } catch (err) {
      console.error("fetchSessions error:", err);
      setSessionsLoaded(true); // Don't block app even if history fails
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Fetch message history for current session from Backend
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`);
        if (!res.ok) throw new Error("Failed to load messages");
        const data: ChatMessage[] = await res.json();
        setMessages(data || []);
      } catch (err) {
        console.error("loadMessages error:", err);
      }
    };

    loadMessages();
  }, [sessionId]);

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
      console.warn("useChat.sendMessage is deprecated. Use useChatMutation instead.");
    },
    [],
  );

  const newChat = useCallback(() => {
    setSessionId("");
    setMessages([]);
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
    isInitialLoadComplete: modelsLoaded && sessionsLoaded,
  };
}
