import { useState, useEffect } from "react";
import { 
  XCircle, 
  Database, 
  RefreshCw, 
  Server, 
  Activity, 
  Wifi, 
} from "lucide-react";
import { SectionHeading, AdminPanel, StatCard, AdminLoading } from "./Shared";
import { API_BASE } from "../../../config";
import { supabase } from "../../../utils/supabaseClient";

interface DebugData {
  timestamp: string;
  total_latency_ms: number;
  system_info: {
    os: string;
    os_release: string;
    python_version: string;
    cpu_usage: number;
    memory_usage: number;
    time: string;
    uptime_ms: number;
  };
  env_vars: Record<string, { status: "SET" | "MISSING"; value: string | null }>;
  sqlite_status: {
    status: "OK" | "ERROR" | "unknown";
    profiles_count: number;
    settings_count: number;
    integrity: string;
    error?: string;
  };
  supabase_status: {
    status: string;
    ping_ms: number;
    api_response_code: number;
    error?: string;
  };
  openrouter_status: {
    status: string;
    ping_ms: number;
    limit?: number;
    usage?: number;
    error?: string;
  };
}

export function DebuggerPanel() {
  const [data, setData] = useState<DebugData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Interactive test statuses
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{
    running: boolean;
    result: {
      success?: boolean;
      error?: string;
      status?: string;
      latency_ms?: number;
      message?: string;
    } | null;
  }>({ running: false, result: null });

  const [cacheClearStatus, setCacheClearStatus] = useState<{
    running: boolean;
    result: {
      success?: boolean;
      cleared_items?: string[];
      errors?: string[];
    } | null;
  }>({ running: false, result: null });

  const fetchDebugData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      
      const res = await fetch(`${API_BASE}/admin/debug`, { headers });
      if (!res.ok) {
        throw new Error(`Błąd serwera (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || "Nieznany błąd podczas diagnostyki.");
      }
    } catch (err: unknown) {
      console.error("Failed to fetch debug data:", err);
      setError(err instanceof Error ? err.message : "Błąd komunikacji z serwerem diagnostycznym.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  const handleTestSupabase = async () => {
    setSupabaseTestStatus({ running: true, result: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`${API_BASE}/admin/test-supabase`, {
        method: "POST",
        headers
      });
      const json = await res.json();
      setSupabaseTestStatus({ running: false, result: json });
      fetchDebugData();
    } catch (err: unknown) {
      setSupabaseTestStatus({
        running: false,
        result: { success: false, error: err instanceof Error ? err.message : "Błąd połączenia." }
      });
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm("Czy na pewno chcesz wyczyścić pliki pamięci podręcznej modeli?")) return;
    setCacheClearStatus({ running: true, result: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`${API_BASE}/admin/debug/clear-cache`, {
        method: "POST",
        headers
      });
      const json = await res.json();
      setCacheClearStatus({ running: false, result: json });
      setTimeout(() => setCacheClearStatus({ running: false, result: null }), 5000);
      fetchDebugData();
    } catch (err: unknown) {
      setCacheClearStatus({
        running: false,
        result: { success: false, errors: [err instanceof Error ? err.message : "Błąd połączenia."] }
      });
    }
  };

  if (isLoading && !data) {
    return <AdminLoading message="Generowanie raportu diagnostycznego…" />;
  }

  if (error && !data) {
    return (
      <div className="library-view-panel p-10 border-red-300/40 bg-red-50/30 space-y-6 text-center max-w-xl mx-auto">
        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h4 className="text-sm font-black uppercase tracking-widest text-red-600">Błąd diagnostyki</h4>
        <p className="text-xs text-black/60 leading-relaxed font-semibold">{error}</p>
        <button
          onClick={fetchDebugData}
          className="glass-prestige bg-white px-6 py-3 rounded-2xl border border-black/10 text-[9px] font-black uppercase tracking-widest text-black hover:bg-black hover:text-white transition-all shadow-md"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Czas diagnostyki"
          value={data?.total_latency_ms ?? 0}
          icon={<Activity size={16} />}
          delay={0}
        />
        <div className="library-view-cell p-3.5 flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${
              data?.supabase_status.status === 'CONNECTED'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-600'
            }`}
          >
            <Database size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-admin-mono font-semibold text-black uppercase truncate">
              {data?.supabase_status.status}
            </p>
            <span className="text-[7px] font-black uppercase tracking-widest text-black/35 block mt-1 font-outfit">
              Supabase · {data?.supabase_status.ping_ms}ms
            </span>
          </div>
        </div>
        <div className="library-view-cell p-3.5 flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${
              data?.openrouter_status.status === 'AUTHORIZED'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                : 'bg-red-500/10 border-red-500/20 text-red-600'
            }`}
          >
            <Wifi size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-admin-mono font-semibold text-black uppercase truncate">
              {data?.openrouter_status.status}
            </p>
            <span className="text-[7px] font-black uppercase tracking-widest text-black/35 block mt-1 font-outfit">
              OpenRouter · {data?.openrouter_status.ping_ms}ms
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Connections and Local Status */}
        <div className="space-y-8">
          {/* Active Services Monitor */}
          <AdminPanel>
            <SectionHeading title="Monitor połączeń" subtitle="Szczegółowe czasy odpowiedzi" />
            
            <div className="space-y-4 mt-8">
              {/* Supabase Status Row */}
              <div className="library-view-cell p-4 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-black">Supabase API</span>
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    data?.supabase_status.status === "CONNECTED" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                  }`}>
                    {data?.supabase_status.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[8px] font-semibold text-black/50">
                  <span>Czas odpowiedzi: <strong>{data?.supabase_status.ping_ms}ms</strong></span>
                  <span>Kod HTTP: <strong>{data?.supabase_status.api_response_code}</strong></span>
                </div>
                {data?.supabase_status.error && (
                  <p className="text-[8px] text-red-500 font-bold bg-red-500/5 p-2 rounded-lg border border-red-500/10 mt-1 font-mono">
                    {data.supabase_status.error}
                  </p>
                )}
              </div>

              {/* OpenRouter API Row */}
              <div className="library-view-cell p-4 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wifi size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-black">OpenRouter Core</span>
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    data?.openrouter_status.status === "AUTHORIZED" ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                  }`}>
                    {data?.openrouter_status.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[8px] font-semibold text-black/50">
                  <span>Czas odpowiedzi: <strong>{data?.openrouter_status.ping_ms}ms</strong></span>
                  {data?.openrouter_status.limit && (
                    <span>Maksymalny limit: <strong>${data.openrouter_status.limit.toFixed(2)}</strong></span>
                  )}
                </div>
                {data?.openrouter_status.error && (
                  <p className="text-[8px] text-red-500 font-bold bg-red-500/5 p-2 rounded-lg border border-red-500/10 mt-1 font-mono">
                    {data.openrouter_status.error}
                  </p>
                )}
              </div>

              {/* SQLite DB Row */}
              <div className="library-view-cell p-4 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server size={16} className="text-gold-primary" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-black">Lokalna Baza SQLite</span>
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    data?.sqlite_status.status === "OK" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                  }`}>
                    {data?.sqlite_status.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[8px] font-semibold text-black/50">
                  <span>Profile: <strong>{data?.sqlite_status.profiles_count}</strong></span>
                  <span>Ustawienia: <strong>{data?.sqlite_status.settings_count}</strong></span>
                  <span>Spójność: <strong>{data?.sqlite_status.integrity}</strong></span>
                </div>
              </div>
            </div>
          </AdminPanel>
        </div>

        <div className="space-y-5">
          <AdminPanel delay={0.05}>
            <SectionHeading title="Serwer i zasoby" subtitle="CPU, RAM i system operacyjny" />
            
            <div className="space-y-6 mt-8">
              {/* CPU Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-black">
                  <span>Obciążenie CPU</span>
                  <span>{data?.system_info.cpu_usage.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden border border-black/5">
                  <div 
                    className="h-full bg-gold-primary transition-all duration-1000" 
                    style={{ width: `${data?.system_info.cpu_usage || 0}%` }}
                  />
                </div>
              </div>

              {/* Memory Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-black">
                  <span>Zużycie Pamięci RAM</span>
                  <span>{data?.system_info.memory_usage.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden border border-black/5">
                  <div 
                    className="h-full bg-gold-deep transition-all duration-1000" 
                    style={{ width: `${data?.system_info.memory_usage || 0}%` }}
                  />
                </div>
              </div>

              {/* Info Details List */}
              <div className="grid grid-cols-2 gap-4 mt-6 text-[8px] font-semibold text-black/60 pt-4 border-t border-black/5">
                <div>
                  <span className="block text-[6px] font-black uppercase tracking-widest text-black/30">System Operacyjny</span>
                  <strong className="text-black">{data?.system_info.os} ({data?.system_info.os_release})</strong>
                </div>
                <div>
                  <span className="block text-[6px] font-black uppercase tracking-widest text-black/30">Wersja Python</span>
                  <strong className="text-black truncate block" title={data?.system_info.python_version}>
                    {data?.system_info.python_version.split(" ")[0]}
                  </strong>
                </div>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel delay={0.1}>
            <SectionHeading title="Zmienne środowiskowe" subtitle="Status kluczy API (.env)" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {data && Object.entries(data.env_vars).map(([key, info]) => (
                <div key={key} className="library-view-cell p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[8px] font-black uppercase tracking-wider text-black/70 block truncate">{key}</span>
                    <span className="text-[8px] text-black/40 font-mono tracking-tighter truncate block mt-0.5">
                      {info.value || "Brak wartości"}
                    </span>
                  </div>
                  <span className={`text-[6px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 border ${
                    info.status === "SET" 
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                      : "bg-red-500/10 text-red-600 border-red-500/20"
                  }`}>
                    {info.status === "SET" ? "SKONFIGUROWANY" : "BRAK"}
                  </span>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>

      </div>

      <AdminPanel delay={0.12}>
        <SectionHeading title="Narzędzia diagnostyczne" subtitle="Testy i czyszczenie cache w czasie rzeczywistym" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Refetch All Diagnostics */}
          <button
            onClick={fetchDebugData}
            disabled={isLoading}
            className="library-view-cell hover:bg-black hover:text-white text-black p-5 flex flex-col items-center justify-center text-center gap-3 transition-all group active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw size={22} className={`text-gold-primary group-hover:rotate-180 transition-all duration-700 ${isLoading ? "animate-spin" : ""}`} />
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest block">Odśwież Statystyki</span>
              <span className="text-[7px] text-black/40 uppercase tracking-widest block mt-1 font-semibold group-hover:text-white/40">Uruchom pełny skan</span>
            </div>
          </button>

          {/* Active Supabase Ping Query */}
          <button
            onClick={handleTestSupabase}
            disabled={supabaseTestStatus.running}
            className="library-view-cell hover:bg-black hover:text-white text-black p-5 flex flex-col items-center justify-center text-center gap-3 transition-all group active:scale-[0.98] disabled:opacity-50"
          >
            <Activity size={24} className={`text-emerald-500 ${supabaseTestStatus.running ? "animate-pulse" : ""}`} />
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest block">Testuj Bazy Danych</span>
              <span className="text-[7px] text-black/40 uppercase tracking-widest block mt-1 font-semibold group-hover:text-white/40">Zmierzenie dokładnej latencji</span>
            </div>
          </button>

          {/* Clear Cache */}
          <button
            onClick={handleClearCache}
            disabled={cacheClearStatus.running}
            className="library-view-cell hover:bg-black hover:text-white text-black p-5 flex flex-col items-center justify-center text-center gap-3 transition-all group active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw size={24} className={`text-amber-500 ${cacheClearStatus.running ? "animate-spin" : ""}`} />
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest block">Wyczyść Cache</span>
              <span className="text-[7px] text-black/40 uppercase tracking-widest block mt-1 font-semibold group-hover:text-white/40">Usunięcie pamięci cache modeli</span>
            </div>
          </button>
        </div>

        {/* Dynamic Interactive Outputs */}
        {(supabaseTestStatus.result || cacheClearStatus.result) && (
          <div className="mt-6 p-5 rounded-xl lex-view-pass font-admin-mono text-[9px] text-white/75 space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <span className="font-bold uppercase tracking-wider text-gold-bright">Log konsoli</span>
              <span className="text-white/35">{new Date().toLocaleTimeString()}</span>
            </div>

            {/* Supabase Test Result */}
            {supabaseTestStatus.result && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="font-bold text-black uppercase">Weryfikacja Bazy Chmurowej:</span>
                  <span className={supabaseTestStatus.result.success ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                    {supabaseTestStatus.result.status}
                  </span>
                </div>
                <p>Latencja zapytania: <strong>{supabaseTestStatus.result.latency_ms}ms</strong></p>
                <p>Odpowiedź serwera: <span className="text-black/60">{supabaseTestStatus.result.message || supabaseTestStatus.result.error}</span></p>
              </div>
            )}

            {/* Cache Clear Result */}
            {cacheClearStatus.result && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="font-bold text-black uppercase">Czyszczenie Pamięci Podręcznej:</span>
                  <span className={cacheClearStatus.result.success ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                    {cacheClearStatus.result.success ? "POMYŚLNE" : "BŁĄD"}
                  </span>
                </div>
                {cacheClearStatus.result.cleared_items && cacheClearStatus.result.cleared_items.length > 0 && (
                  <p>Wyczyszczone zasoby: <strong>{cacheClearStatus.result.cleared_items.join(", ")}</strong></p>
                )}
                {cacheClearStatus.result.errors && cacheClearStatus.result.errors.length > 0 && (
                  <p className="text-red-500 font-semibold">Błędy: {cacheClearStatus.result.errors.join(", ")}</p>
                )}
              </div>
            )}
          </div>
        )}
      </AdminPanel>

    </div>
  );
}
