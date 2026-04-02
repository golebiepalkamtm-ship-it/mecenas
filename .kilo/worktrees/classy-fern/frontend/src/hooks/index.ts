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

  const uploadFile = async (content: string, filename: string) => {
    setIsUploading(true);
    try {
        const { error } = await supabase.functions.invoke('knowledge-manager', {
            body: { 
                action: 'upload', 
                content, 
                metadata: { filename, type: 'manual' } 
            }
        });
        if (error) throw error;
        await fetchDocuments();
    } catch (error) {
        console.error("Upload failed:", error);
    } finally {
        setIsUploading(false);
    }
  };

  const removeFile = async (id: string) => {
      await supabase.from('knowledge_base').delete().eq('id', id);
      await fetchDocuments();
  };

  return { documents, uploadFile, removeFile, isUploading };
}

/**
 * Klucze API są teraz zarządzane przez Supabase Secrets (Secure Layer).
 * Ten hook jest uproszczony do zarządzania widocznością dostawców w UI.
 */
export function useApiManagement() {
    const [providers, setProviders] = useState<any[]>([
        { id: 'google', name: 'Google Gemini 2.0', active: true, key: '••••••••' },
        { id: 'openrouter', name: 'OpenRouter / Claude', active: true, key: '••••••••' }
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
        // Validation: If it's the old invalid format (session_...), discard it
        if (saved && saved.startsWith('session_')) {
            localStorage.removeItem('prawnik_session_id');
            return '';
        }
        return saved || '';
    });
    const [availableModels, setAvailableModels] = useState<any[]>([
        { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', active: true, provider: 'openrouter', model_id: 'google/gemini-2.5-flash' }
    ]);
    const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.5-flash');

    const fetchModels = useCallback(async () => {
        try {
            const res = await fetch('http://127.0.0.1:8001/models');
            if (res.ok) {
                const data = await res.json();
                const enabledIdsRaw = localStorage.getItem('prawnik_enabled_models');
                const enabledIds = enabledIdsRaw ? JSON.parse(enabledIdsRaw) : [];
                
                let filtered = data;
                if (enabledIds.length > 0) {
                    filtered = data.filter((m: any) => enabledIds.includes(m.id));
                } else {
                    // Default fallback if no settings are saved
                    filtered = data.filter((m: any) => 
                        m.id === 'google/gemini-2.5-flash' || 
                        m.id === 'anthropic/claude-3.5-sonnet' || 
                        m.id === 'openai/gpt-4o-mini'
                    );
                }
                
                if (filtered.length > 0) {
                    setAvailableModels(filtered);
                    // Automatically select a valid model if the current one isn't in the list
                    setSelectedModel(prev => {
                        return filtered.find((m: any) => m.id === prev) ? prev : filtered[0].id;
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch models, using defaults.', err);
            // Fallback
            const defaultModels = [
                { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', active: true, provider: 'openrouter', model_id: 'google/gemini-2.5-flash' },
                { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', active: true, provider: 'openrouter', model_id: 'anthropic/claude-3.5-sonnet' },
                { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', active: true, provider: 'openrouter', model_id: 'openai/gpt-4o-mini' }
            ];
            
            const enabledIdsRaw = localStorage.getItem('prawnik_enabled_models');
            const enabledIds = enabledIdsRaw ? JSON.parse(enabledIdsRaw) : [];
            let filtered = defaultModels;
            if (enabledIds.length > 0) {
                filtered = defaultModels.filter(m => enabledIds.includes(m.id)) as any;
                if(filtered.length === 0) filtered = defaultModels;
            }
            setAvailableModels(filtered);
            setSelectedModel(filtered[0].id);
        }
    }, []);

    useEffect(() => {
        fetchModels();
        const handleUpdate = () => fetchModels();
        window.addEventListener('prawnik_models_updated', handleUpdate);
        return () => window.removeEventListener('prawnik_models_updated', handleUpdate);
    }, [fetchModels]);

    // Fetch sessions from Supabase
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

    const sendMessage = useCallback(async (content: string) => {
        stopGeneration();

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("Musisz być zalogowany, aby wysłać wiadomość.");
            return;
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

        // 2. Add user message locally
        const userMsg = { 
            id: 'temp-' + Date.now(), 
            role: 'user', 
            content,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        try {
            // 3. Ensure fresh auth token
            const { data: { session: freshSession } } = await supabase.auth.refreshSession();
            if (!freshSession) {
                // If refresh fails, force re-login
                await supabase.auth.signOut();
                alert("Sesja wygasła. Zaloguj się ponownie.");
                return;
            }

            // 4. Prepare proper OpenRouter Model ID
            const modelObj = availableModels.find(m => m.id === selectedModel);
            let finalModelId = modelObj ? (modelObj.model_id || modelObj.id) : selectedModel;
            
            // Map legacy/internal IDs to proper OpenRouter IDs
            if (finalModelId === 'gemini') finalModelId = 'google/gemini-2.5-flash';
            if (finalModelId === 'gemini-2.5-flash') finalModelId = 'google/gemini-2.5-flash';
            if (finalModelId === 'multi-agent-consensus') finalModelId = 'google/gemini-2.5-flash';
            if (finalModelId === 'consensus') finalModelId = 'google/gemini-2.5-flash';
            if (finalModelId.startsWith('openrouter-')) finalModelId = finalModelId.replace('openrouter-', '');

            // Call Edge Function
            const res = await supabase.functions.invoke('chat-ai-proxy', {
                body: { 
                    prompt: content,
                    sessionId: currentSessionId,
                    model: finalModelId,
                    history: messages.slice(-5).map(m => ({ role: m.role, content: m.content }))
                }
            });

            if (res.error) {
                let errMsg = res.error.message;
                if (res.error.context && typeof res.error.context.json === 'function') {
                    try {
                        const errBody = await res.error.context.json();
                        errMsg = errBody.error || errMsg;
                    } catch (e) {
                         // Nie udało się przeparsować JSON
                    }
                }
                console.error("Diagnostic error body:", errMsg);
                throw new Error(errMsg);
            }

            // 5. Update messages with the result from function (which already saved to DB)
            setMessages(prev => [...prev.filter(m => m.id !== userMsg.id)]); // Remove temp user msg if needed, or just refresh
            
            // Re-fetch to get both user and assistant messages with DB IDs
            const { data: newMsgs } = await supabase
                .from('messages')
                .select('*')
                .eq('session_id', currentSessionId)
                .order('created_at', { ascending: true });
            
            if (newMsgs) setMessages(newMsgs);
            fetchSessions();

        } catch (error: any) {
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
    }, [messages, selectedModel, stopGeneration, sessionId, fetchSessions, availableModels]);


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
        sendMessage, 
        isLoading, 
        clearHistory,
        stopGeneration,
        availableModels,
        selectedModel,
        setSelectedModel,
        sessions,
        sessionId,
        newChat,
        switchSession,
        removeSession
    };
}
