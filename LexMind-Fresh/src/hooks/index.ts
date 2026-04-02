/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';


/**
 * Hook do zarządzania bazą wiedzy (RAG) przez Supabase.
 */
export function useKnowledgeBase() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
      // Paginate to bypass Supabase's 1000-row default per-request limit
      let allData: any[] = [];
      let from = 0;
      const step = 1000;
      
      while (true) {
          const { data, error } = await supabase
              .from('knowledge_base')
              .select('id, metadata, created_at')
              .range(from, from + step - 1);
          
          if (error) { console.error('Knowledge fetch error:', error); break; }
          if (!data || data.length === 0) break;
          
          allData = allData.concat(data);
          if (data.length < step) break;
          from += step;
      }
      
      if (allData.length > 0) {
          // Group by filename — always accumulate chunk count
          const docMap = new Map<string, { id: string; name: string; chunks: number; created_at: string }>();
          
          for (const d of allData) {
              const filename = d.metadata?.filename || "Dokument bez nazwy";
              const existing = docMap.get(filename);
              if (!existing) {
                  docMap.set(filename, {
                      id: d.id,
                      name: filename,
                      chunks: 1,
                      created_at: d.created_at
                  });
              } else {
                  docMap.set(filename, {
                      ...existing,
                      chunks: existing.chunks + 1,
                      created_at: d.created_at < existing.created_at ? d.created_at : existing.created_at
                  });
              }
          }
          
          const docs = Array.from(docMap.values()).sort((a, b) => 
              a.name.localeCompare(b.name, 'pl')
          );
          
          setDocuments(docs.map(d => ({
              id: d.id,
              name: d.name,
              chunks: d.chunks,
              status: 'ready',
              created_at: d.created_at
          })));
      }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadPDF = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        // Use local API for PDF processing (it handles background embeddings)
        const res = await fetch('http://localhost:8003/upload', {
            method: 'POST',
            body: formData
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
  }, [fetchDocuments]);

  const removeFile = useCallback(async (filename: string) => {
      try {
          // Use local API to clean up both local storage and Supabase cloud
          const res = await fetch(`http://localhost:8003/documents/${filename}`, {
              method: 'DELETE'
          });
          if (!res.ok) throw new Error("Delete failed");
          
          await fetchDocuments();
      } catch (error) {
          console.error("Failed to remove file:", error);
      }
  }, [fetchDocuments]);

  return { documents, uploadPDF, removeFile, isUploading, refresh: fetchDocuments };
}

/**
 * Klucze API są teraz zarządzane przez Supabase Secrets (Secure Layer).
 * Ten hook jest uproszczony do zarządzania widocznością dostawców w UI.
 */
export function useApiManagement() {
    const [providers, setProviders] = useState<any[]>([
        { id: 'openrouter', name: 'OpenRouter (Master Engine)', active: true, key: '••••••••' }
    ]);

    const toggleProvider = (id: string) => {
        setProviders(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
    };
    
    const updateKey = async (id: string, key: string) => {
        setProviders(prev => prev.map(p => p.id === id ? { ...p, key } : p));
    };

    return { providers, toggleProvider, updateKey };
}


/**
 * Hook do zarządzania instrukcjami systemowymi (System Prompt) przez Supabase.
 */
export function useSystemPrompt() {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchPrompt = async () => {
             const { data: { user } } = await supabase.auth.getUser();
             if (!user) return;

             const { data, error } = await supabase
                .from('profiles')
                .select('system_prompt')
                .eq('id', user.id)
                .single();
            
            if (!error && data) {
                setPrompt(data.system_prompt || '');
            }
        };
        fetchPrompt();
    }, []);

    const savePrompt = useCallback(async (newPrompt: string) => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from('profiles')
                .update({ system_prompt: newPrompt })
                .eq('id', user.id);
            
            if (error) throw error;
            setPrompt(newPrompt);
        } catch (error: any) {
            console.error("Save prompt failed:", error);
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
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    
    // Sessions & Models
    const [sessions, setSessions] = useState<any[]>([]);
    const [sessionId, setSessionId] = useState<string>(() => {
        const saved = localStorage.getItem('prawnik_session_id');
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (saved && !uuidRegex.test(saved)) {
            localStorage.removeItem('prawnik_session_id');
            return '';
        }
        return saved || '';
    });

    const [availableModels, setAvailableModels] = useState<any[]>([
        { id: 'google/gemini-2.5-flash', name: 'Google: Gemini 2.5 Flash', active: true, provider: 'openrouter', vision: true },
        { id: 'openai/gpt-4o-2024-11-20', name: 'OpenAI: GPT-4o', active: true, provider: 'openrouter', vision: true },
        { id: 'anthropic/claude-3.7-sonnet', name: 'Anthropic: Claude 3.7 Sonnet', active: true, provider: 'openrouter', vision: true }
    ]);
    const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-4o-2024-11-20'); // Force vision model

    // Enhanced setSelectedModel that preserves conversation context
    const setSelectedModelWithContext = useCallback((newModel: string) => {
        setSelectedModel(newModel);
        
        // Store the change timestamp to trigger context refresh on next message
        localStorage.setItem('prawnik_model_change_timestamp', Date.now().toString());
        localStorage.setItem('prawnik_previous_model', selectedModel);
    }, [selectedModel]);

    const fetchModels = useCallback(async () => {
        console.log("🔄 Fetching models from API...");
        try {
            const res = await fetch('http://localhost:8003/models/all');
            const data = await res.json();
            console.log("📦 Models received:", data.length, "models");
            
            if (Array.isArray(data) && data.length > 0) {
                // For chat: show ALL vision models regardless of admin filters
                // Admin panel can still filter, but chat gets full access for legal docs
                const formatted = data.map((m: any) => ({
                    id: m.id,
                    name: `${m.id.split('/')[0].toUpperCase()}: ${m.name || m.id.split('/').pop()}`,
                    active: true,
                    provider: 'openrouter',
                    vision: m.vision || false
                }));

                console.log("✅ Models updated successfully:", formatted.length, "models available");
                setAvailableModels(formatted);
                setSelectedModel(prev => {
                    const firstAvailable = formatted[0]?.id || 'google/gemini-2.5-flash';
                    const prevExists = formatted.find((m: any) => m.id === prev);
                    const selected = prevExists ? prev : firstAvailable;
                    console.log("🎯 Selected model:", selected);
                    return selected;
                });
            }
        } catch (error) {
            console.error("Failed to fetch models, using defaults.", error);
        }
    }, []);

    useEffect(() => {
        console.log("🚀 Initializing chat hook - fetching models...");
        fetchModels();
        // Add event listener for settings updates
        window.addEventListener('prawnik_models_updated', fetchModels);
        return () => window.removeEventListener('prawnik_models_updated', fetchModels);
    }, [fetchModels]);

    // Force refresh models on component mount
    useEffect(() => {
        const forceRefresh = async () => {
            console.log("🔄 Force refreshing models...");
            await fetchModels();
        };
        forceRefresh();
    }, [fetchModels]);
    const fetchSessions = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!error && data) {
            setSessions(data);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    // Fetch message history for current session from Supabase
    useEffect(() => {
        if (!sessionId) return;
        
        const loadMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });
            
            if (!error && data) {
                setMessages(data);
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

    const sendMessage = useCallback(async (content: string, attachments?: File[]) => {
        stopGeneration();

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("Musisz być zalogowany, aby wysłać wiadomość.");
            return;
        }

        // Check if model was recently changed and adjust history accordingly
        const modelChangeTimestamp = localStorage.getItem('prawnik_model_change_timestamp');
        const previousModel = localStorage.getItem('prawnik_previous_model');
        let historyMessages = messages;
        let useFullHistory = false;
        
        if (modelChangeTimestamp && previousModel && previousModel !== selectedModel) {
            // Model was changed - include full conversation history for context
            const changeTime = parseInt(modelChangeTimestamp);
            const timeSinceChange = Date.now() - changeTime;
            
            // If model was changed recently (within last 5 minutes), use full history
            if (timeSinceChange < 300000) { // 5 minutes
                console.log(`Model changed from ${previousModel} to ${selectedModel}, using full conversation history`);
                historyMessages = messages; // Keep all messages for context
                useFullHistory = true;
                
                // Clear the model change flag after using it
                localStorage.removeItem('prawnik_model_change_timestamp');
                localStorage.removeItem('prawnik_previous_model');
            } else {
                // Clear old model change data
                localStorage.removeItem('prawnik_model_change_timestamp');
                localStorage.removeItem('prawnik_previous_model');
            }
        }

        // Convert files to base64
        const attachmentData: { name: string; type: string; content: string }[] = [];
        if (attachments && attachments.length > 0) {
            for (const file of attachments) {
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                attachmentData.push({
                    name: file.name,
                    type: file.type,
                    content: base64
                });
            }
        }

        // 1. Create session if doesn't exist
        let currentSessionId = sessionId;
        if (!currentSessionId) {
            const { data, error } = await supabase
                .from('sessions')
                .insert({ 
                    user_id: session.user.id,
                    title: content.substring(0, 40) + "..."
                })
                .select()
                .single();
            
            if (error) {
                console.error("Błąd tworzenia sesji:", error);
                return;
            }
            currentSessionId = data.id;
            setSessionId(data.id);
            localStorage.setItem('prawnik_session_id', data.id);
        }

        // 2. Add user message locally with attachments
        const userMsg = { 
            id: 'temp-' + Date.now(), 
            role: 'user', 
            content,
            attachments: attachmentData,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        try {
            // Use local API instead of Supabase invoke to hit our optimized RAG + Consensus engine
            const res = await fetch('http://localhost:8003/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: content,
                    sessionId: currentSessionId,
                    model: selectedModel,
                    history: useFullHistory ? historyMessages.map(m => ({ role: m.role, content: m.content })) : historyMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
                    attachments: attachmentData,
                    use_full_history: useFullHistory
                }),
                signal: controller.signal
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Server Error");
            }

            const data = await res.json();

            // Robust Cloud Sync: Let Supabase handle IDs to prevent 400 errors (22P02)
            const { error: syncError } = await supabase.from('messages').insert([
                { 
                    session_id: currentSessionId, 
                    role: 'user', 
                    content: content || " " 
                },
                { 
                    session_id: currentSessionId, 
                    role: 'assistant', 
                    content: data.content || "Błąd generowania odpowiedz.", 
                    sources: Array.isArray(data.sources) ? data.sources : [] 
                }
            ]);

            if (syncError) {
                console.error("Cloud Sync 400 Fix Log:", syncError);
                // Try a fallback with no sources if it still fails
                if (syncError.code === '22P02') {
                    await supabase.from('messages').insert({ session_id: currentSessionId, role: 'assistant', content: data.content });
                }
            }

            // Get the latest assistant message from response and add it locally (keeping attachments)
            const assistantMsg = {
                id: data.id || 'assistant-' + Date.now(),
                role: 'assistant',
                content: data.content,
                sources: data.sources || [],
                attachments: data.attachments || [],
                created_at: new Date().toISOString()
            };
            
            // Update messages locally instead of refetching from DB (to keep attachments)
            setMessages(prev => [...prev, assistantMsg]);
            fetchSessions();

        } catch (error: any) {
            if (error.name === 'AbortError') return;
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { 
                id: Date.now().toString(), 
                role: 'assistant', 
                content: `Błąd komunikacji: ${error.message || "Brak szczegółów."}`, 
                sources: [] 
            }]);
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [messages, selectedModel, stopGeneration, sessionId, fetchSessions]);


    const clearHistory = useCallback(async () => {
        stopGeneration();
        try {
            await supabase.from('messages').delete().eq('session_id', sessionId);
            setMessages([]);
            fetchSessions();
        } catch (error) {
            console.error("Failed to clear messages:", error);
        }
    }, [sessionId, stopGeneration, fetchSessions]);

    const newChat = useCallback(() => {
        setSessionId('');
        setMessages([]);
        localStorage.removeItem('prawnik_session_id');
    }, []);

    const switchSession = useCallback(async (id: string) => {
        setMessages([]); // Clear current messages immediately
        setSessionId(id);
        localStorage.setItem('prawnik_session_id', id);
        // Explicitly load messages for the new session
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('session_id', id)
            .order('created_at', { ascending: true });
        if (data) setMessages(data);
    }, []);

    const removeSession = useCallback(async (id: string) => {
        const confirmed = window.confirm('Czy na pewno chcesz usunąć tę sesję? Wszystkie wiadomości zostaną utracone.');
        if (!confirmed) return;
        try {
            await supabase.from('messages').delete().eq('session_id', id);
            await supabase.from('sessions').delete().eq('id', id);
            if (sessionId === id) {
                newChat();
            }
            fetchSessions();
        } catch (error) {
            console.error("Failed to delete session:", error);
        }
    }, [sessionId, newChat, fetchSessions]);

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
        newChat,
        switchSession,
        removeSession
    };
}
