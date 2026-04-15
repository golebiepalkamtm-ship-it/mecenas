import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  Eye,
  EyeOff,
  Globe,
  Key,
  Layers,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { useApiManagement, type ApiProvider } from "../../hooks";
import { API_BASE } from "../../config";
import { supabase } from "../../utils/supabaseClient";
import { cn } from "../../utils/cn";

type AdminTab = "system" | "users" | "security" | "models";

interface Model {
  id: string;
  name: string;
  vision: boolean;
  free: boolean;
}

interface UserProfile {
  id: string;
  email: string | null;
  role: string;
  created_at: string;
}

interface DashboardStats {
  users: number;
  docs: number;
  requests: number;
  tokens: number;
}

interface AdminTabConfig {
  id: AdminTab;
  label: string;
  icon: typeof Activity;
}

interface ModelGroupMeta {
  icon: typeof Activity;
  accentClass: string;
  dotClass: string;
}

const ENABLED_MODELS_STORAGE_KEY = "prawnik_enabled_models";

const ADMIN_TABS: AdminTabConfig[] = [
  { id: "system", label: "Status systemu", icon: Activity },
  { id: "users", label: "Uzytkownicy", icon: Users },
  { id: "security", label: "Klucze API", icon: Key },
  { id: "models", label: "Modele AI", icon: Cpu },
];

const MODEL_GROUP_ORDER = [
  "Vision",
  "OpenAI",
  "Anthropic",
  "Meta",
  "Google",
  "Mistral",
  "Free",
  "Other",
] as const;

const MODEL_GROUP_META: Record<string, ModelGroupMeta> = {
  Vision: {
    icon: Eye,
    accentClass: "text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  OpenAI: {
    icon: Cpu,
    accentClass: "text-cyan-700",
    dotClass: "bg-cyan-500",
  },
  Anthropic: {
    icon: Activity,
    accentClass: "text-violet-700",
    dotClass: "bg-violet-500",
  },
  Meta: {
    icon: Users,
    accentClass: "text-blue-700",
    dotClass: "bg-blue-500",
  },
  Google: {
    icon: Globe,
    accentClass: "text-amber-700",
    dotClass: "bg-amber-500",
  },
  Mistral: {
    icon: Layers,
    accentClass: "text-sky-700",
    dotClass: "bg-sky-500",
  },
  Free: {
    icon: Key,
    accentClass: "text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  Other: {
    icon: Database,
    accentClass: "text-black/70",
    dotClass: "bg-black/40",
  },
};

const formatNumber = (value: number): string =>
  new Intl.NumberFormat("pl-PL").format(value);

const mapProfileRow = (row: unknown): UserProfile | null => {
  if (!row || typeof row !== "object") return null;

  const record = row as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  if (!id) return null;

  return {
    id,
    email: typeof record.email === "string" ? record.email : null,
    role: typeof record.role === "string" ? record.role : "user",
    created_at:
      typeof record.created_at === "string"
        ? record.created_at
        : new Date().toISOString(),
  };
};

const mapModelRow = (row: unknown): Model | null => {
  if (!row || typeof row !== "object") return null;

  const record = row as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  if (!id) return null;

  const name =
    typeof record.name === "string" && record.name.trim().length > 0
      ? record.name
      : id;
  const vision = Boolean(record.vision);
  const free = Boolean(record.free) || id.includes(":free");

  return { id, name, vision, free };
};

const getModelGroupName = (model: Model): string => {
  if (model.vision) return "Vision";
  if (model.free) return "Free";

  const id = model.id.toLowerCase();
  if (id.includes("openai/")) return "OpenAI";
  if (id.includes("anthropic/")) return "Anthropic";
  if (id.includes("meta-llama/")) return "Meta";
  if (id.includes("google/")) return "Google";
  if (id.includes("mistralai/")) return "Mistral";
  return "Other";
};

const readEnabledModels = (): string[] => {
  try {
    const raw = window.localStorage.getItem(ENABLED_MODELS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};

const saveEnabledModels = (modelIds: string[]): void => {
  window.localStorage.setItem(
    ENABLED_MODELS_STORAGE_KEY,
    JSON.stringify(modelIds),
  );
  window.dispatchEvent(new CustomEvent("prawnik_models_updated"));
};

export function AdminView() {
  const [activeTab, setActiveTab] = useState<AdminTab>("system");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    docs: 0,
    requests: 12_480,
    tokens: 4_500_000,
  });
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isDeduplicating, setIsDeduplicating] = useState(false);

  const { providers, toggleProvider, updateKey } = useApiManagement();

  const loadAdminData = useCallback(async () => {
    setIsLoadingData(true);
    setDataError(null);

    try {
      const [profilesResponse, kbCountResponse] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase
          .from("unique_legal_documents")
          .select("id", { count: "exact", head: true }),
      ]);

      const mappedUsers = (profilesResponse.data ?? [])
        .map(mapProfileRow)
        .filter((row): row is UserProfile => row !== null);

      setUsers(mappedUsers);
      setStats((prev) => ({
        ...prev,
        users: mappedUsers.length,
        docs: typeof kbCountResponse.count === "number" ? kbCountResponse.count : 0,
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nie udalo sie pobrac danych administracyjnych.";
      setDataError(message);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleDeduplicate = async (): Promise<void> => {
    const accepted = window.confirm(
      "Uruchomic deduplikacje dokumentow w bazie?",
    );
    if (!accepted) return;

    setIsDeduplicating(true);
    try {
      const response = await fetch(`${API_BASE}/dedupe-db`);
      const payload = (await response.json()) as
        | { status?: string; message?: string }
        | null;

      if (!response.ok || payload?.status !== "success") {
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }

      window.alert("Deduplikacja zakonczona pomyslnie.");
      await loadAdminData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nieznany blad deduplikacji.";
      window.alert(`Deduplikacja nie powiodla sie: ${message}`);
    } finally {
      setIsDeduplicating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 lg:p-10 space-y-6 overflow-hidden bg-transparent relative pt-[80px] lg:pt-[100px]">
      <div className="absolute inset-0 noise-overlay opacity-20 pointer-events-none" />

      <header className="shrink-0 glass-liquid-convex rounded-[1.75rem] p-4 lg:p-5 border border-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-black leading-none font-outfit">
              Centrum administracyjne
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/40 mt-2">
              Zarzadzanie uzytkownikami, modelami i infrastruktura
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAdminData()}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl glass-prestige text-[10px] font-black uppercase tracking-widest text-black/70 hover:text-black transition-all"
            disabled={isLoadingData}
          >
            <RefreshCw
              size={14}
              className={cn(isLoadingData && "animate-spin")}
            />
            Odswiez dane
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {ADMIN_TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </header>

      <section className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4 pb-24"
          >
            {activeTab === "system" && (
              <SystemPanel
                stats={stats}
                isLoading={isLoadingData}
                errorMessage={dataError}
                isDeduplicating={isDeduplicating}
                onDeduplicate={handleDeduplicate}
              />
            )}

            {activeTab === "users" && <UsersPanel users={users} isLoading={isLoadingData} />}

            {activeTab === "security" && (
              <SecurityPanel
                providers={providers}
                onToggleProvider={toggleProvider}
                onUpdateKey={updateKey}
              />
            )}

            {activeTab === "models" && <ModelsPanel />}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: AdminTabConfig;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center gap-2.5 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
        active
          ? "glass-liquid-convex text-black shadow-xl scale-[1.02]"
          : "glass-prestige text-black/50 hover:text-black/80",
      )}
    >
      <Icon size={14} className={cn(active ? "text-black" : "text-black/50")} />
      <span>{tab.label}</span>
    </button>
  );
}

function SystemPanel({
  stats,
  isLoading,
  errorMessage,
  isDeduplicating,
  onDeduplicate,
}: {
  stats: DashboardStats;
  isLoading: boolean;
  errorMessage: string | null;
  isDeduplicating: boolean;
  onDeduplicate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="Aktywni uzytkownicy"
          value={stats.users}
          icon={<Users size={16} className="text-blue-700" />}
        />
        <StatCard
          label="Dokumenty RAG"
          value={stats.docs}
          icon={<Database size={16} className="text-emerald-700" />}
        />
        <StatCard
          label="Zapytania AI"
          value={stats.requests}
          icon={<BarChart3 size={16} className="text-amber-700" />}
        />
        <StatCard
          label="Zuzyte tokeny"
          value={stats.tokens}
          icon={<Activity size={16} className="text-violet-700" />}
        />
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-[11px] font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-liquid-convex rounded-[1.75rem] p-5 border border-black/10">
          <SectionHeading
            title="Wezly systemowe"
            subtitle="Biezacy stan uslug backendowych"
            badge={
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                ONLINE
              </span>
            }
          />

          <div className="mt-4 space-y-2.5">
            <HealthRow icon={<Database size={14} />} label="Supabase DB" status="online" ping="12ms" />
            <HealthRow icon={<Globe size={14} />} label="Edge Functions" status="online" ping="45ms" />
            <HealthRow icon={<Shield size={14} />} label="FastAPI Core" status="online" ping="8ms" />
            <HealthRow icon={<Cpu size={14} />} label="Embedding Engine" status="online" ping="120ms" />
          </div>
        </div>

        <div className="glass-liquid-convex rounded-[1.75rem] p-5 border border-black/10 flex flex-col">
          <SectionHeading
            title="Operacje techniczne"
            subtitle="Dzialania administracyjne o podwyzszonym ryzyku"
          />

          <div className="mt-4 p-3 rounded-xl bg-black/6 border border-black/10 text-[10px] font-semibold text-black/65 leading-relaxed">
            Zmiany w tej sekcji dotykaja calego systemu LexMind. Operacje powinny byc
            wykonywane przez administratora po weryfikacji skutkow.
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              className="h-11 px-4 rounded-xl glass-prestige text-[10px] font-black uppercase tracking-widest text-black/65 hover:text-black transition-all"
              disabled
            >
              Reindeksacja
            </button>

            <button
              type="button"
              onClick={onDeduplicate}
              disabled={isDeduplicating}
              className="h-11 px-4 rounded-xl glass-liquid-convex text-[10px] font-black uppercase tracking-widest text-black inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Layers
                size={14}
                className={cn(isDeduplicating && "animate-spin")}
              />
              {isDeduplicating ? "Analiza" : "Deduplikacja"}
            </button>

            <button
              type="button"
              className="h-11 px-4 rounded-xl border border-red-500/25 bg-red-500/8 text-[10px] font-black uppercase tracking-widest text-red-700 hover:bg-red-500/15 transition-all"
              disabled
            >
              Wyczyść cache
            </button>
          </div>

          {isLoading && (
            <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-black/35 inline-flex items-center gap-2">
              <RefreshCw size={12} className="animate-spin" />
              Odswiezanie danych systemowych
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersPanel({ users, isLoading }: { users: UserProfile[]; isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="glass-liquid-convex rounded-[1.75rem] p-5 border border-black/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-black">
              Zarzadzanie uzytkownikami
            </h3>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40 mt-1">
              Konta: {formatNumber(users.length)}
            </p>
          </div>

          <button
            type="button"
            className="h-10 px-4 rounded-xl glass-prestige text-[10px] font-black uppercase tracking-widest text-black/65 inline-flex items-center gap-2"
            disabled
          >
            <UserPlus size={14} />
            Zaproszenie
          </button>
        </div>

        {isLoading ? (
          <div className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-black/35 inline-flex items-center gap-2">
            <RefreshCw size={12} className="animate-spin" />
            Pobieranie listy uzytkownikow
          </div>
        ) : users.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-black/15 px-4 py-8 text-center text-[11px] font-semibold text-black/45">
            Brak danych o profilach.
          </div>
        ) : (
          <>
            <div className="hidden lg:block mt-5 overflow-x-auto rounded-xl border border-black/10 bg-white/25">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-black/5">
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-black/45">
                      Uzytkownik
                    </th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-black/45">
                      Rola
                    </th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-black/45">
                      Rejestracja
                    </th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-black/45 text-right">
                      Akcje
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/8">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-black/[0.04] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-black/8 border border-black/10 flex items-center justify-center text-[10px] font-black uppercase text-black/70 shrink-0">
                            {(user.email || user.role || "u").slice(0, 2)}
                          </div>
                          <span className="text-[11px] font-semibold text-black truncate">
                            {user.email || "Brak adresu e-mail"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <RoleBadge role={user.role} />
                      </td>

                      <td className="px-4 py-3 text-[10px] font-semibold text-black/55">
                        {formatDate(user.created_at)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-black/35 hover:text-red-700 hover:bg-red-500/10 transition-all"
                          disabled
                          aria-label={`Usun konto ${user.email || user.id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 lg:hidden space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl glass-prestige p-3 border border-black/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-black truncate">
                        {user.email || "Brak adresu e-mail"}
                      </p>
                      <p className="text-[9px] font-semibold text-black/45 uppercase tracking-widest mt-1">
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                    <RoleBadge role={user.role} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SecurityPanel({
  providers,
  onToggleProvider,
  onUpdateKey,
}: {
  providers: ApiProvider[];
  onToggleProvider: (id: string) => void;
  onUpdateKey: (id: string, key: string) => void;
}) {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const toggleKeyVisibility = (providerId: string): void => {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  return (
    <div className="space-y-4">
      <div className="glass-liquid-convex rounded-[1.75rem] p-5 border border-black/10">
        <SectionHeading
          title="Klucze API"
          subtitle="Bramka autoryzacyjna dla providerow modeli"
        />

        <div className="mt-4 space-y-3">
          {providers.map((provider) => {
            const hasKey = provider.key.trim().length > 0;
            const isVisible = Boolean(showKeys[provider.id]);

            return (
              <div
                key={provider.id}
                className={cn(
                  "rounded-2xl border p-4 transition-all",
                  provider.active
                    ? "glass-liquid-convex border-emerald-500/30"
                    : "glass-prestige border-black/10",
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="w-10 h-10 rounded-xl bg-black/8 border border-black/10 flex items-center justify-center text-black/65 shrink-0">
                    {provider.name.toLowerCase().includes("google") ? (
                      <Globe size={16} />
                    ) : (
                      <Cpu size={16} />
                    )}
                  </div>

                  <div className="min-w-0 lg:w-52">
                    <p className="text-[11px] font-black uppercase tracking-wide text-black truncate">
                      {provider.name}
                    </p>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-black/45 mt-1 inline-flex items-center gap-1.5">
                      {hasKey ? (
                        <CheckCircle2 size={12} className="text-emerald-700" />
                      ) : (
                        <AlertCircle size={12} className="text-amber-700" />
                      )}
                      {hasKey ? "Klucz zapisany" : "Brak klucza"}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0 relative">
                    <Key
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35"
                    />
                    <input
                      type={isVisible ? "text" : "password"}
                      defaultValue={provider.key}
                      onChange={(event) =>
                        onUpdateKey(provider.id, event.target.value)
                      }
                      placeholder="Wprowadz klucz API"
                      className="w-full h-11 rounded-xl glass-prestige-input pl-10 pr-10 text-[11px] font-mono text-black placeholder:text-black/35 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility(provider.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-black/35 hover:text-black transition-colors"
                      aria-label={
                        isVisible ? "Ukryj klucz API" : "Pokaz klucz API"
                      }
                    >
                      {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleProvider(provider.id)}
                    className={cn(
                      "h-11 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all min-w-[120px]",
                      provider.active
                        ? "border border-red-500/25 bg-red-500/8 text-red-700 hover:bg-red-500/15"
                        : "glass-liquid-convex text-black",
                    )}
                  >
                    {provider.active ? "Dezaktywuj" : "Aktywuj"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ModelsPanel() {
  const [models, setModels] = useState<Model[]>([]);
  const [enabledModels, setEnabledModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterVisionOnly, setFilterVisionOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_BASE}/models/admin`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      const mapped = Array.isArray(payload)
        ? payload
            .map(mapModelRow)
            .filter((model): model is Model => model !== null)
        : [];

      setModels(mapped);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nie udalo sie pobrac listy modeli.";
      setErrorMessage(message);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setEnabledModels(readEnabledModels());
    void loadModels();
  }, [loadModels]);

  const toggleModel = (modelId: string): void => {
    const next = enabledModels.includes(modelId)
      ? enabledModels.filter((id) => id !== modelId)
      : [...enabledModels, modelId];

    setEnabledModels(next);
    saveEnabledModels(next);
  };

  const visibleModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return models.filter((model) => {
      if (filterVisionOnly && !model.vision) return false;
      if (!normalizedQuery) return true;

      const searchable = `${model.name} ${model.id}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [models, filterVisionOnly, query]);

  const groupedModels = useMemo(() => {
    const groups = new Map<string, Model[]>();

    for (const model of visibleModels) {
      const groupName = getModelGroupName(model);
      const existing = groups.get(groupName) ?? [];
      groups.set(groupName, [...existing, model]);
    }

    return MODEL_GROUP_ORDER.map((groupName) => {
      const grouped = groups.get(groupName) ?? [];
      const sorted = [...grouped].sort((a, b) =>
        a.name.localeCompare(b.name, "pl", { sensitivity: "base" }),
      );

      return {
        groupName,
        models: sorted,
        enabledCount: sorted.filter((model) => enabledModels.includes(model.id)).length,
      };
    }).filter((group) => group.models.length > 0);
  }, [visibleModels, enabledModels]);

  const totalVision = models.filter((model) => model.vision).length;
  const totalEnabled = enabledModels.length;

  return (
    <div className="space-y-4">
      <div className="glass-liquid-convex rounded-[1.75rem] p-5 border border-black/10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SectionHeading
              title="Arsenal modeli"
              subtitle="Konfiguracja modeli dostepnych w module czatu"
            />

            <button
              type="button"
              onClick={() => void loadModels()}
              className="h-10 px-4 rounded-xl glass-prestige text-[10px] font-black uppercase tracking-widest text-black/70 hover:text-black inline-flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
              Odswiez liste
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-2.5">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Szukaj modelu po nazwie lub ID"
              className="h-11 rounded-xl glass-prestige-input px-4 text-[11px] font-semibold text-black placeholder:text-black/35 outline-none"
            />

            <button
              type="button"
              onClick={() => setFilterVisionOnly((prev) => !prev)}
              className={cn(
                "h-11 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filterVisionOnly
                  ? "glass-liquid-convex text-black"
                  : "glass-prestige text-black/55 hover:text-black",
              )}
            >
              Vision ({formatNumber(totalVision)})
            </button>

            <div className="h-11 px-4 rounded-xl glass-prestige text-[10px] font-black uppercase tracking-widest text-black/55 inline-flex items-center justify-center">
              Aktywne: {formatNumber(totalEnabled)}
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-[11px] font-semibold text-red-700">
              Blad pobierania modeli: {errorMessage}
            </div>
          )}

          {!isLoading && visibleModels.length === 0 && !errorMessage && (
            <div className="rounded-xl border border-dashed border-black/15 px-4 py-8 text-center text-[11px] font-semibold text-black/45">
              Brak modeli pasujacych do aktualnych filtrow.
            </div>
          )}

          <div className="space-y-2">
            {groupedModels.map((group) => {
              const meta = MODEL_GROUP_META[group.groupName] ?? MODEL_GROUP_META.Other;
              const GroupIcon = meta.icon;
              const isOpen = expandedGroups[group.groupName] ?? true;

              return (
                <div key={group.groupName} className="rounded-xl border border-black/10 bg-white/15">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroups((prev) => ({
                        ...prev,
                        [group.groupName]: !(prev[group.groupName] ?? true),
                      }))
                    }
                    className="w-full flex items-center justify-between gap-3 p-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-black/8 border border-black/10 flex items-center justify-center shrink-0">
                        <GroupIcon size={14} className={meta.accentClass} />
                      </div>
                      <div className="text-left min-w-0">
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", meta.accentClass)}>
                          {group.groupName}
                        </p>
                        <p className="text-[9px] font-semibold text-black/45 uppercase tracking-widest mt-1">
                          {group.enabledCount}/{group.models.length} aktywnych
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-black/35 transition-transform",
                        isOpen && "rotate-90",
                      )}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-1.5">
                          {group.models.map((model) => {
                            const active = enabledModels.includes(model.id);
                            return (
                              <button
                                key={model.id}
                                type="button"
                                onClick={() => toggleModel(model.id)}
                                className={cn(
                                  "w-full rounded-lg border px-3 py-2.5 text-left transition-all flex items-center justify-between gap-3",
                                  active
                                    ? "border-emerald-500/35 bg-emerald-500/10"
                                    : "border-black/10 bg-black/[0.03] hover:bg-black/[0.06]",
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[11px] font-semibold text-black truncate">
                                      {model.name}
                                    </span>
                                    {model.vision && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-[8px] font-black uppercase tracking-widest text-emerald-700">
                                        Vision
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[9px] font-semibold text-black/40 mt-1 truncate">
                                    {model.id}
                                  </p>
                                </div>

                                <div className="shrink-0 flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-black/45">
                                    {active ? "Wl." : "Wyl."}
                                  </span>
                                  <div
                                    className={cn(
                                      "w-9 h-5 rounded-full border flex items-center px-0.5",
                                      active
                                        ? "bg-emerald-500/70 border-emerald-600/40 justify-end"
                                        : "bg-black/15 border-black/15 justify-start",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "block w-4 h-4 rounded-full transition-colors",
                                        active ? "bg-white" : "bg-white/70",
                                      )}
                                    />
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-black">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {badge}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="glass-liquid-convex rounded-2xl p-4 border border-black/10">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black/45">
          {label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-black/8 border border-black/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-black text-black leading-none tracking-tight font-outfit">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function HealthRow({
  icon,
  label,
  status,
  ping,
}: {
  icon: ReactNode;
  label: string;
  status: "online" | "offline";
  ping: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-7 h-7 rounded-lg bg-black/8 border border-black/10 flex items-center justify-center text-black/60 shrink-0">
          {icon}
        </span>
        <span className="text-[11px] font-semibold text-black truncate">{label}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            status === "online" ? "bg-emerald-500" : "bg-red-500",
          )}
        />
        <span className="text-[10px] font-black uppercase tracking-widest text-black/50">
          {ping}
        </span>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role.toLowerCase() === "admin";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
        isAdmin
          ? "bg-amber-500/15 border border-amber-500/30 text-amber-800"
          : "bg-black/8 border border-black/12 text-black/65",
      )}
    >
      {role}
    </span>
  );
}

function formatDate(raw: string): string {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "Brak daty";
  return parsed.toLocaleDateString("pl-PL");
}
