import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';
import LexMindApp from './App.lexmind';

interface Todo {
  id: string | number;
  name: string;
  created_at?: string;
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoName, setNewTodoName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hash, setHash] = useState(window.location.hash);

  // Monitor routing hash to switch view modes
  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    // Only query if we are actually viewing the todos screen
    if (hash !== '#todos') return;

    async function getTodos() {
      try {
        const { data: todosData, error } = await supabase.from('todos').select();

        if (error) {
          throw error;
        }

        if (todosData) {
          setTodos(todosData);
        }
      } catch (err: unknown) {
        console.error('Error fetching todos:', err);
        setErrorMsg('Brak tabeli "todos" w bazie Supabase. Upewnij się, że tabela została utworzona.');
        // Beautiful fallback values
        setTodos([
          { id: 1, name: 'Utworzyć tabelę "todos" w panelu Supabase', created_at: new Date().toISOString() },
          { id: 2, name: 'Zastąpić [YOUR-PASSWORD] rzeczywistym hasłem w pliku .env', created_at: new Date().toISOString() },
          { id: 3, name: 'Zbudować luksusowy interfejs Todo w stylu Awwwards', created_at: new Date().toISOString() },
        ]);
      }
    }

    getTodos();
  }, [hash]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const tempId = Math.random().toString(36).substring(2, 9);
    const newTodo: Todo = { id: tempId, name: newTodoName.trim(), created_at: new Date().toISOString() };

    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{ name: newTodoName.trim() }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setTodos((prev) => [...prev, data[0]]);
      } else {
        setTodos((prev) => [...prev, newTodo]);
      }
      setNewTodoName('');
    } catch (err: unknown) {
      console.warn('Real Supabase insert failed, adding to local state for demo:', err);
      setTodos((prev) => [...prev, newTodo]);
      setNewTodoName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTodo = async (id: string | number) => {
    try {
      await supabase.from('todos').delete().eq('id', id);
    } catch (err) {
      console.warn('Delete failed:', err);
    }
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  // DEFAULT VIEW: LexMind AI Portal
  if (hash !== '#todos') {
    return <LexMindApp />;
  }

  // SECONDARY VIEW: Supabase Todo Verification Dashboard (Accessible via #todos)
  return (
    <div className="min-h-screen w-full bg-[#030307] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#00f2fe]/30 selection:text-white animate-fadeIn">
      {/* Glow overlays */}
      <div className="absolute top-[-20%] left-[-10%] w-150 h-150 rounded-full bg-linear-to-br from-[#7000ff]/20 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-150 h-150 rounded-full bg-linear-to-tr from-[#00f2fe]/10 to-transparent blur-[120px] pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none opacity-20" />

      {/* Main Container */}
      <div className="w-full max-w-lg z-10 backdrop-blur-xl bg-white/3 border border-white/8 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-linear-to-r from-transparent via-[#00f2fe]/50 to-transparent" />

        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-[#7000ff] to-[#00f2fe] p-px flex items-center justify-center shadow-lg shadow-[#7000ff]/20 mb-4 hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-[#030307] rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-[#00f2fe]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
            Supabase Task Monitor
          </h1>
          <p className="text-xs text-gray-500 mt-2 font-mono uppercase tracking-widest">
            Baza Danych: todos
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-xs flex gap-3 items-start animate-fadeIn">
            <svg className="w-5 h-5 shrink-0 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAddTodo} className="flex gap-3 mb-6 relative">
          <input
            type="text"
            value={newTodoName}
            onChange={(e) => setNewTodoName(e.target.value)}
            placeholder="Dodaj nowe zadanie..."
            disabled={isSubmitting}
            className="flex-1 bg-white/4 hover:bg-white/6 focus:bg-white/8 border border-white/10 focus:border-[#00f2fe]/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300 shadow-inner"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newTodoName.trim()}
            className="bg-linear-to-r from-[#7000ff] to-[#00f2fe] hover:opacity-90 disabled:opacity-50 text-white rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 shadow-md shadow-[#7000ff]/20 hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              'Dodaj'
            )}
          </button>
        </form>

        <div className="max-h-75 overflow-y-auto pr-1 custom-scrollbar">
          {todos.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Brak zadań w bazie danych Supabase.
            </div>
          ) : (
            <ul className="space-y-3">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/2 hover:bg-white/4 border border-white/5 hover:border-white/10 transition-all duration-300 group animate-slideIn"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-linear-to-r from-[#7000ff] to-[#00f2fe] shadow-[0_0_8px_rgba(0,242,254,0.5)]" />
                    <span className="text-sm text-gray-200 group-hover:text-white transition-colors duration-200">
                      {todo.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-500 p-1 rounded-lg hover:bg-white/5 transition-all duration-300"
                    title="Usuń zadanie"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Return to main app button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => window.location.hash = ''}
          className="px-5 py-3 rounded-2xl backdrop-blur-xl bg-white/4 hover:bg-white/8 border border-white/10 hover:border-[#00f2fe]/40 text-xs font-semibold tracking-wider text-gray-300 hover:text-white transition-all duration-300 shadow-xl flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-px"
        >
          <svg className="w-3.5 h-3.5 text-[#00f2fe] rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
          <span>Uruchom Portal LexMind</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-slideIn {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
