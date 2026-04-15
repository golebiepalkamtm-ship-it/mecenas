import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Gavel,
  Calendar,
  MapPin,
  Hash,
  ExternalLink,
  ChevronRight,
  Loader2,
  Filter,
  RefreshCw,
  X,
  Sparkles,
  Save,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { API_BASE } from "../../config";

interface IdNameOption {
  id: number;
  name: string;
  type?: string;
}

interface JudgmentLink {
  rel?: string;
  href?: string;
}

interface JudgmentDivision {
  id?: number;
  href?: string;
  name?: string;
  code?: string;
  court?: {
    id?: number;
    href?: string;
    code?: string;
    name?: string;
    type?: string;
  };
  chamber?: {
    id?: number;
    href?: string;
    name?: string;
  };
}

interface SaosKeywordItem {
  id?: number;
  name?: string;
}

interface JudgmentListItem {
  id?: number;
  href?: string;
  content: string;
  source: string;
  similarity: number;
  optimized_query?: string | null;
  courtType?: string;
  judgmentType?: string;
  judgmentDate?: string;
  caseNumber?: string;
  courtName?: string;
  keywords?: string[];
  division?: JudgmentDivision;
}

interface JudgmentDetails {
  id?: number;
  href?: string;
  courtType?: string;
  judgmentType?: string;
  judgmentDate?: string;
  courtCases?: Array<{ caseNumber?: string }>;
  judges?: Array<{
    name?: string;
    function?: string;
    specialRoles?: string[] | string;
  }>;
  source?: {
    code?: string;
    judgmentUrl?: string;
    judgmentId?: string;
    publisher?: string;
    reviser?: string;
    publicationDate?: string;
  };
  summary?: string;
  decision?: string;
  textContent?: string;
  legalBases?: string[] | string;
  keywords?: string[];
  personnelType?: string;
  judgmentForm?: string | { name?: string };
  division?: JudgmentDivision;
  chambers?: Array<{ id?: number; href?: string; name?: string }>;
}

interface JudgmentSearchResponse {
  items: JudgmentListItem[];
  links?: JudgmentLink[];
  queryTemplate?: Record<string, unknown>;
  info?: {
    totalResults?: number;
  };
  optimizedQuery?: string | null;
}

interface JudgmentFacetsResponse {
  sortingFields: string[];
  sortingDirections: string[];
  ccCourtTypes: string[];
  scPersonnelTypes: string[];
  judgmentTypes: string[];
  commonCourts: IdNameOption[];
  scChambers: IdNameOption[];
  scJudgmentForms: IdNameOption[];
}

interface JudgmentsFilters {
  useAi: boolean;
  pageSize: number;
  sortingField: string;
  sortingDirection: "ASC" | "DESC";
  legalBase: string;
  referencedRegulation: string;
  lawJournalEntryCode: string;
  judgeName: string;
  caseNumber: string;
  courtType: string;
  ccCourtId: number | null;
  ccDivisionId: number | null;
  ccIncludeDependentCourtJudgments: boolean;
  scPersonnelType: string;
  scJudgmentForm: string;
  scChamberId: number | null;
  scDivisionId: number | null;
  judgmentTypes: string[];
  keywords: string[];
  judgmentDateFrom: string;
  judgmentDateTo: string;
}

const DEFAULT_FILTERS: JudgmentsFilters = {
  useAi: true,
  pageSize: 20,
  sortingField: "JUDGMENT_DATE",
  sortingDirection: "DESC",
  legalBase: "",
  referencedRegulation: "",
  lawJournalEntryCode: "",
  judgeName: "",
  caseNumber: "",
  courtType: "",
  ccCourtId: null,
  ccDivisionId: null,
  ccIncludeDependentCourtJudgments: false,
  scPersonnelType: "",
  scJudgmentForm: "",
  scChamberId: null,
  scDivisionId: null,
  judgmentTypes: [],
  keywords: [],
  judgmentDateFrom: "",
  judgmentDateTo: "",
};

const INPUT_CLASS =
  "w-full rounded-xl glass-prestige-input px-4 py-3 text-xs font-semibold text-black placeholder:text-black/35 focus:outline-none transition-all";
const LABEL_CLASS =
  "text-[9px] font-black uppercase tracking-[0.2em] text-black/45 mb-1 block";

const stripHtml = (text: string): string =>
  text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const extractIdFromSource = (source: string): number | null => {
  const match = source.match(/ID:\s*(\d+)/i);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
};

const parseSourceFallback = (source: string): { courtName: string; caseNumber: string } => {
  const match = source.match(/\((.*),\s*(.*)\)/);
  if (!match) {
    return { courtName: "Sąd", caseNumber: "N/A" };
  }
  return {
    courtName: match[1] || "Sąd",
    caseNumber: match[2] || "N/A",
  };
};

const formatDate = (raw?: string): string => {
  if (!raw) return "N/A";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleDateString("pl-PL");
};

export const JudgmentsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<JudgmentsFilters>({ ...DEFAULT_FILTERS });
  const [loading, setLoading] = useState(false);
  const [facetsLoading, setFacetsLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [results, setResults] = useState<JudgmentListItem[]>([]);
  const [links, setLinks] = useState<JudgmentLink[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [activeOptimizedQuery, setActiveOptimizedQuery] = useState<string | null>(null);
  const [selectedJudgment, setSelectedJudgment] = useState<JudgmentListItem | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<JudgmentDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingJudgment, setIsSavingJudgment] = useState(false);
  const [saveJudgmentStatus, setSaveJudgmentStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [facets, setFacets] = useState<JudgmentFacetsResponse | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [commonCourtDivisions, setCommonCourtDivisions] = useState<IdNameOption[]>([]);
  const [scChamberDivisions, setScChamberDivisions] = useState<IdNameOption[]>([]);

  const [keywordInput, setKeywordInput] = useState("");
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);

  const selectedJudgmentId =
    selectedJudgment?.id ??
    (selectedJudgment?.source ? extractIdFromSource(selectedJudgment.source) : null);

  const selectedCourtAndCase = useMemo(() => {
    if (!selectedJudgment) {
      return { courtName: "Sąd", caseNumber: "N/A" };
    }

    const fallback = parseSourceFallback(selectedJudgment.source);

    const detailsCourtName =
      selectedDetails?.division?.court?.name ||
      selectedDetails?.division?.chamber?.name ||
      selectedDetails?.chambers?.[0]?.name;

    const detailsCaseNumber = selectedDetails?.courtCases?.[0]?.caseNumber;

    return {
      courtName: selectedJudgment.courtName || detailsCourtName || fallback.courtName,
      caseNumber: selectedJudgment.caseNumber || detailsCaseNumber || fallback.caseNumber,
    };
  }, [selectedJudgment, selectedDetails]);

  const selectedTextContent = useMemo(() => {
    const fromDetails = selectedDetails?.textContent;
    if (typeof fromDetails === "string" && fromDetails.trim()) {
      return stripHtml(fromDetails);
    }
    return selectedJudgment?.content || "";
  }, [selectedDetails, selectedJudgment]);

  const selectedExternalUrl = useMemo(() => {
    return (
      selectedDetails?.source?.judgmentUrl ||
      selectedDetails?.href ||
      selectedJudgment?.href ||
      (selectedJudgmentId
        ? `https://www.saos.org.pl/api/judgments/${selectedJudgmentId}`
        : null)
    );
  }, [selectedDetails, selectedJudgment, selectedJudgmentId]);

  const selectedJudges = useMemo(() => {
    const judges = selectedDetails?.judges;
    if (!Array.isArray(judges) || judges.length === 0) return "Brak danych";
    return judges
      .map((judge) => {
        const name = judge.name || "Sędzia";
        const fn = judge.function ? ` (${judge.function})` : "";
        return `${name}${fn}`;
      })
      .join(", ");
  }, [selectedDetails]);

  const selectedLegalBases = useMemo(() => {
    const legalBases = selectedDetails?.legalBases;
    if (Array.isArray(legalBases)) {
      return legalBases.join("; ");
    }
    if (typeof legalBases === "string") {
      return legalBases;
    }
    return "";
  }, [selectedDetails]);

  const createJudgmentDocumentName = (): string => {
    const rawCaseNumber = selectedCourtAndCase.caseNumber || "bez_sygnatury";
    const normalizedCaseNumber = rawCaseNumber
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const suffix = selectedJudgmentId ? String(selectedJudgmentId) : String(Date.now());
    return `Orzeczenie_SAOS_${normalizedCaseNumber || "bez_sygnatury"}_${suffix}`;
  };

  const buildJudgmentDocumentMarkdown = (): string => {
    const keywords = (selectedDetails?.keywords || selectedJudgment?.keywords || []).join(", ");
    const judgmentDate = formatDate(
      selectedDetails?.judgmentDate || selectedJudgment?.judgmentDate,
    );
    const judgmentType =
      selectedDetails?.judgmentType || selectedJudgment?.judgmentType || "Brak danych";
    const courtType = selectedDetails?.courtType || selectedJudgment?.courtType || "Brak danych";
    const summary = selectedDetails?.summary?.trim();
    const decision = selectedDetails?.decision?.trim();

    return [
      "# Orzeczenie sądowe (SAOS)",
      "",
      "## Metadane",
      `- Sygnatura: ${selectedCourtAndCase.caseNumber}`,
      `- Sąd: ${selectedCourtAndCase.courtName}`,
      `- Data orzeczenia: ${judgmentDate}`,
      `- Typ orzeczenia: ${judgmentType}`,
      `- Typ organu: ${courtType}`,
      `- Sędziowie: ${selectedJudges}`,
      `- Podstawy prawne: ${selectedLegalBases || "Brak danych"}`,
      `- Słowa kluczowe: ${keywords || "Brak danych"}`,
      `- Źródło: ${selectedExternalUrl || "Brak"}`,
      "",
      ...(summary ? ["## Podsumowanie", summary, ""] : []),
      ...(decision ? ["## Rozstrzygnięcie", decision, ""] : []),
      "## Treść",
      selectedTextContent || "Brak treści orzeczenia.",
      "",
      `---\nZapisano z modułu Orzeczenia SAOS (${new Date().toLocaleString("pl-PL")}).`,
    ].join("\n");
  };

  const updateFilter = <K extends keyof JudgmentsFilters>(
    key: K,
    value: JudgmentsFilters[K],
  ): void => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let isMounted = true;

    const loadFacets = async (): Promise<void> => {
      setFacetsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/judgments/search/facets`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as JudgmentFacetsResponse;
        if (!isMounted) return;

        setFacets(data);
        if (Array.isArray(data.sortingFields) && data.sortingFields.length > 0) {
          setFilters((prev) => {
            if (data.sortingFields.includes(prev.sortingField)) {
              return prev;
            }
            return { ...prev, sortingField: data.sortingFields[0] };
          });
        }
      } catch (error) {
        console.error("Nie udało się pobrać filtrów SAOS:", error);
      } finally {
        if (isMounted) {
          setFacetsLoading(false);
        }
      }
    };

    void loadFacets();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!filters.ccCourtId) {
      setCommonCourtDivisions([]);
      return;
    }

    let isMounted = true;

    const loadDivisions = async (): Promise<void> => {
      try {
        const response = await fetch(
          `${API_BASE}/judgments/search/common-courts/${filters.ccCourtId}/divisions`,
        );
        if (!response.ok) return;
        const data = (await response.json()) as { items?: IdNameOption[] };
        if (!isMounted) return;
        setCommonCourtDivisions(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        console.error("Nie udało się pobrać wydziałów sądu:", error);
      }
    };

    void loadDivisions();

    return () => {
      isMounted = false;
    };
  }, [filters.ccCourtId]);

  useEffect(() => {
    if (!filters.scChamberId) {
      setScChamberDivisions([]);
      return;
    }

    let isMounted = true;

    const loadDivisions = async (): Promise<void> => {
      try {
        const response = await fetch(
          `${API_BASE}/judgments/search/sc-chambers/${filters.scChamberId}/divisions`,
        );
        if (!response.ok) return;
        const data = (await response.json()) as { items?: IdNameOption[] };
        if (!isMounted) return;
        setScChamberDivisions(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        console.error("Nie udało się pobrać wydziałów izby SN:", error);
      }
    };

    void loadDivisions();

    return () => {
      isMounted = false;
    };
  }, [filters.scChamberId]);

  useEffect(() => {
    const prefix = keywordInput.trim();
    if (prefix.length < 2) {
      setKeywordSuggestions([]);
      setKeywordsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setKeywordsLoading(true);
      try {
        const response = await fetch(
          `${API_BASE}/judgments/search/keywords?prefix=${encodeURIComponent(prefix)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setKeywordSuggestions([]);
          return;
        }

        const data = (await response.json()) as {
          items?: SaosKeywordItem[];
        };

        const suggestions = (data.items || [])
          .map((item) => (typeof item.name === "string" ? item.name.trim() : ""))
          .filter((name) => name.length > 0);

        setKeywordSuggestions(suggestions);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Nie udało się pobrać słów kluczowych:", error);
          setKeywordSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setKeywordsLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [keywordInput]);

  useEffect(() => {
    if (!selectedJudgmentId) {
      setSelectedDetails(null);
      setDetailsLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadDetails = async (): Promise<void> => {
      setDetailsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/judgments/${selectedJudgmentId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setSelectedDetails(null);
          return;
        }

        const payload = (await response.json()) as { data?: JudgmentDetails };
        if (!controller.signal.aborted) {
          setSelectedDetails(payload.data || null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Nie udało się pobrać szczegółów orzeczenia:", error);
          setSelectedDetails(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setDetailsLoading(false);
        }
      }
    };

    void loadDetails();

    return () => {
      controller.abort();
    };
  }, [selectedJudgmentId]);

  useEffect(() => {
    setSaveJudgmentStatus(null);
    setIsSavingJudgment(false);
  }, [selectedJudgmentId]);

  const addKeyword = (rawValue: string): void => {
    const value = rawValue.trim();
    if (!value) return;
    setFilters((prev) => {
      if (prev.keywords.includes(value)) return prev;
      return { ...prev, keywords: [...prev.keywords, value] };
    });
    setKeywordInput("");
    setKeywordSuggestions([]);
  };

  const removeKeyword = (value: string): void => {
    setFilters((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((keyword) => keyword !== value),
    }));
  };

  const toggleJudgmentType = (type: string): void => {
    setFilters((prev) => {
      const exists = prev.judgmentTypes.includes(type);
      if (exists) {
        return {
          ...prev,
          judgmentTypes: prev.judgmentTypes.filter((item) => item !== type),
        };
      }
      return {
        ...prev,
        judgmentTypes: [...prev.judgmentTypes, type],
      };
    });
  };

  const buildRequestBody = (): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      query: query.trim(),
      pageSize: filters.pageSize,
      pageNumber: 0,
      use_ai: filters.useAi,
      sortingField: filters.sortingField,
      sortingDirection: filters.sortingDirection,
      ccIncludeDependentCourtJudgments: filters.ccIncludeDependentCourtJudgments,
    };

    if (filters.legalBase.trim()) body.legalBase = filters.legalBase.trim();
    if (filters.referencedRegulation.trim()) {
      body.referencedRegulation = filters.referencedRegulation.trim();
    }
    if (filters.lawJournalEntryCode.trim()) {
      body.lawJournalEntryCode = filters.lawJournalEntryCode.trim();
    }
    if (filters.judgeName.trim()) body.judgeName = filters.judgeName.trim();
    if (filters.caseNumber.trim()) body.caseNumber = filters.caseNumber.trim();
    if (filters.courtType) body.courtType = filters.courtType;

    if (filters.ccCourtId !== null) body.ccCourtId = filters.ccCourtId;
    if (filters.ccDivisionId !== null) body.ccDivisionId = filters.ccDivisionId;

    if (filters.scPersonnelType) body.scPersonnelType = filters.scPersonnelType;
    if (filters.scJudgmentForm) body.scJudgmentForm = filters.scJudgmentForm;
    if (filters.scChamberId !== null) body.scChamberId = filters.scChamberId;
    if (filters.scDivisionId !== null) body.scDivisionId = filters.scDivisionId;

    if (filters.judgmentTypes.length > 0) body.judgmentTypes = filters.judgmentTypes;
    if (filters.keywords.length > 0) body.keywords = filters.keywords;
    if (filters.judgmentDateFrom) body.judgmentDateFrom = filters.judgmentDateFrom;
    if (filters.judgmentDateTo) body.judgmentDateTo = filters.judgmentDateTo;

    return body;
  };

  const executeSearch = async (): Promise<void> => {
    setLoading(true);
    setErrorMessage(null);
    setActiveOptimizedQuery(null);

    try {
      const response = await fetch(`${API_BASE}/judgments/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { detail?: string }
          | null;
        throw new Error(payload?.detail || `Błąd wyszukiwania (HTTP ${response.status})`);
      }

      const data = (await response.json()) as JudgmentSearchResponse;

      const items = Array.isArray(data.items) ? data.items : [];
      setResults(items);
      setLinks(Array.isArray(data.links) ? data.links : []);
      setTotalResults(data.info?.totalResults ?? items.length);

      const optimized =
        data.optimizedQuery ||
        (items.length > 0 && items[0].optimized_query ? items[0].optimized_query : null);
      setActiveOptimizedQuery(optimized);

      if (selectedJudgment) {
        const stillExists = items.find((item) => item.id === selectedJudgment.id);
        if (!stillExists) {
          setSelectedJudgment(null);
          setSelectedDetails(null);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nieznany błąd";
      setErrorMessage(message);
      setResults([]);
      setLinks([]);
      setTotalResults(0);
      setSelectedJudgment(null);
      setSelectedDetails(null);
      console.error("Wyszukiwanie orzeczeń nie powiodło się:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault();
    await executeSearch();
  };

  const handleResetFilters = (): void => {
    setQuery("");
    setFilters({ ...DEFAULT_FILTERS });
    setResults([]);
    setLinks([]);
    setTotalResults(0);
    setActiveOptimizedQuery(null);
    setSelectedJudgment(null);
    setSelectedDetails(null);
    setKeywordInput("");
    setKeywordSuggestions([]);
    setCommonCourtDivisions([]);
    setScChamberDivisions([]);
    setErrorMessage(null);
  };

  const closeJudgmentModal = (): void => {
    setSelectedJudgment(null);
    setSelectedDetails(null);
    setSaveJudgmentStatus(null);
    setIsSavingJudgment(false);
  };

  const handleSaveJudgmentToDocuments = async (
    event?: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    event?.preventDefault();
    event?.stopPropagation();

    if (!selectedJudgment || isSavingJudgment) return;

    const documentName = createJudgmentDocumentName();
    const documentContent = buildJudgmentDocumentMarkdown();

    setIsSavingJudgment(true);
    setSaveJudgmentStatus(null);

    try {
      const response = await fetch(`${API_BASE}/documents/save-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_text: documentContent,
          question: documentName,
          model: "qwen/qwen3.6-plus:free",
          use_rag: true,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; filename?: string; error?: string; detail?: string }
        | null;

      if (!response.ok || !payload?.success) {
        const detail =
          payload?.detail ||
          payload?.error ||
          `Nie udało się zapisać orzeczenia (HTTP ${response.status})`;
        throw new Error(detail);
      }

      await queryClient.invalidateQueries({ queryKey: ["user_library"] });

      setSaveJudgmentStatus({
        type: "success",
        message: `Zapisano do Dokumentów własnych jako ${payload.filename || `${documentName}.md`}.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nie udało się zapisać orzeczenia.";
      setSaveJudgmentStatus({ type: "error", message });
    } finally {
      setIsSavingJudgment(false);
    }
  };

  const handleShareJudgment = async (
    event?: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    event?.preventDefault();
    event?.stopPropagation();

    if (!selectedExternalUrl) return;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: `Orzeczenie ${selectedCourtAndCase.caseNumber}`,
          text: selectedCourtAndCase.courtName,
          url: selectedExternalUrl,
        });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }

    if (!selectedExternalUrl) return;
    window.open(selectedExternalUrl, "_blank", "noopener,noreferrer");
  };

  const nextPageHref = links.find((link) => link.rel === "next")?.href;

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden pt-0">
      <div className="px-6 pb-8 pt-2 lg:px-8 lg:pb-8 lg:pt-3 border-b border-black/5 overflow-y-auto max-h-[48vh] custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl glass-liquid-convex flex items-center justify-center text-black">
              <Gavel size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-black uppercase font-outfit leading-none mb-1">
                Baza Orzecznictwa
              </h2>
              <p className="text-[10px] font-bold text-black/30 uppercase tracking-[0.3em]">
                SAOS • Zaawansowane wyszukiwanie i filtrowanie
              </p>
            </div>
          </div>

          <form onSubmit={(e) => void handleSearch(e)} className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Fraza ogólna (obsługuje cudzysłowy, OR oraz minus, np. "dobra osobiste" OR zniesławienie -internet)'
                className="w-full h-16 glass-prestige-input rounded-2xl px-6 py-5 text-sm lg:text-base font-semibold text-black placeholder:text-black/30 focus:outline-none transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl glass-liquid-convex text-black flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-all shadow-xl"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <Search size={24} />
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                className="px-4 py-2 rounded-xl glass-liquid-convex text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-2"
              >
                <Filter size={14} />
                {showAdvancedFilters ? "Ukryj Filtry" : "Pokaż Filtry"}
              </button>

              <button
                type="button"
                onClick={() => updateFilter("useAi", !filters.useAi)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  filters.useAi
                    ? "glass-liquid-convex text-emerald-700"
                    : "glass-prestige text-black/50",
                )}
              >
                <Sparkles size={14} />
                {filters.useAi ? "AI: WŁ." : "AI: WYŁ."}
              </button>

              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl glass-prestige text-[10px] font-black uppercase tracking-widest text-black/60 flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Reset
              </button>

              <div className="ml-auto text-[10px] font-black uppercase tracking-widest text-black/40">
                Wyniki: {totalResults}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {showAdvancedFilters && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-4 lg:p-6 rounded-2xl glass-prestige space-y-5 border border-black/5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className={LABEL_CLASS}>Sygnatura akt</label>
                      <input
                        value={filters.caseNumber}
                        onChange={(e) => updateFilter("caseNumber", e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="np. II AKa 12/23"
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Sędzia</label>
                      <input
                        value={filters.judgeName}
                        onChange={(e) => updateFilter("judgeName", e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="np. Jan Kowalski"
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Podstawa prawna</label>
                      <input
                        value={filters.legalBase}
                        onChange={(e) => updateFilter("legalBase", e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="np. art. 415 kc"
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Powołany przepis</label>
                      <input
                        value={filters.referencedRegulation}
                        onChange={(e) => updateFilter("referencedRegulation", e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="np. art. 233 kpc"
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Kod Dziennika Ustaw</label>
                      <input
                        value={filters.lawJournalEntryCode}
                        onChange={(e) => updateFilter("lawJournalEntryCode", e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="np. 2008/141"
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Typ sądu powszechnego</label>
                      <select
                        value={filters.courtType}
                        onChange={(e) => updateFilter("courtType", e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">Dowolny</option>
                        {(facets?.ccCourtTypes || []).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Sąd powszechny</label>
                      <select
                        value={filters.ccCourtId ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const parsed = raw ? Number(raw) : null;
                          updateFilter("ccCourtId", Number.isFinite(parsed) ? parsed : null);
                          updateFilter("ccDivisionId", null);
                          updateFilter("ccIncludeDependentCourtJudgments", false);
                        }}
                        className={INPUT_CLASS}
                      >
                        <option value="">Dowolny</option>
                        {(facets?.commonCourts || []).map((court) => (
                          <option key={court.id} value={court.id}>
                            {court.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Wydział sądu powszechnego</label>
                      <select
                        value={filters.ccDivisionId ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const parsed = raw ? Number(raw) : null;
                          updateFilter("ccDivisionId", Number.isFinite(parsed) ? parsed : null);
                        }}
                        className={INPUT_CLASS}
                        disabled={!filters.ccCourtId}
                      >
                        <option value="">Dowolny</option>
                        {commonCourtDivisions.map((division) => (
                          <option key={division.id} value={division.id}>
                            {division.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-xl glass-prestige text-[10px] font-black uppercase tracking-widest text-black/70 w-full h-[42px]">
                        <input
                          type="checkbox"
                          checked={filters.ccIncludeDependentCourtJudgments}
                          onChange={(e) =>
                            updateFilter(
                              "ccIncludeDependentCourtJudgments",
                              e.target.checked,
                            )
                          }
                          className="w-3.5 h-3.5"
                          disabled={!filters.ccCourtId}
                        />
                        Sądy podrzędne
                      </label>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Skład SN</label>
                      <select
                        value={filters.scPersonnelType}
                        onChange={(e) => updateFilter("scPersonnelType", e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">Dowolny</option>
                        {(facets?.scPersonnelTypes || []).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Izba SN</label>
                      <select
                        value={filters.scChamberId ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const parsed = raw ? Number(raw) : null;
                          updateFilter("scChamberId", Number.isFinite(parsed) ? parsed : null);
                          updateFilter("scDivisionId", null);
                        }}
                        className={INPUT_CLASS}
                      >
                        <option value="">Dowolna</option>
                        {(facets?.scChambers || []).map((chamber) => (
                          <option key={chamber.id} value={chamber.id}>
                            {chamber.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Wydział izby SN</label>
                      <select
                        value={filters.scDivisionId ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const parsed = raw ? Number(raw) : null;
                          updateFilter("scDivisionId", Number.isFinite(parsed) ? parsed : null);
                        }}
                        className={INPUT_CLASS}
                        disabled={!filters.scChamberId}
                      >
                        <option value="">Dowolny</option>
                        {scChamberDivisions.map((division) => (
                          <option key={division.id} value={division.id}>
                            {division.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Forma orzeczenia SN</label>
                      <select
                        value={filters.scJudgmentForm}
                        onChange={(e) => updateFilter("scJudgmentForm", e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">Dowolna</option>
                        {(facets?.scJudgmentForms || []).map((form) => (
                          <option key={form.id} value={form.name || ""}>
                            {form.name || ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Data od</label>
                      <input
                        type="date"
                        value={filters.judgmentDateFrom}
                        onChange={(e) => updateFilter("judgmentDateFrom", e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Data do</label>
                      <input
                        type="date"
                        value={filters.judgmentDateTo}
                        onChange={(e) => updateFilter("judgmentDateTo", e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Sortowanie</label>
                      <select
                        value={filters.sortingField}
                        onChange={(e) => updateFilter("sortingField", e.target.value)}
                        className={INPUT_CLASS}
                      >
                        {(facets?.sortingFields || ["JUDGMENT_DATE"]).map((field) => (
                          <option key={field} value={field}>
                            {field}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Kierunek</label>
                      <select
                        value={filters.sortingDirection}
                        onChange={(e) =>
                          updateFilter(
                            "sortingDirection",
                            (e.target.value as "ASC" | "DESC") || "DESC",
                          )
                        }
                        className={INPUT_CLASS}
                      >
                        {(facets?.sortingDirections || ["DESC", "ASC"]).map((direction) => (
                          <option key={direction} value={direction}>
                            {direction}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>Liczba wyników</label>
                      <select
                        value={filters.pageSize}
                        onChange={(e) => updateFilter("pageSize", Number(e.target.value))}
                        className={INPUT_CLASS}
                      >
                        {[10, 20, 50, 100].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                      <label className={LABEL_CLASS}>Typ orzeczenia (wielokrotny wybór)</label>
                      <div className="flex flex-wrap gap-2">
                        {(facets?.judgmentTypes || []).map((type) => {
                          const active = filters.judgmentTypes.includes(type);
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => toggleJudgmentType(type)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                active
                                  ? "glass-liquid-convex text-black"
                                  : "glass-prestige text-black/50 hover:text-black",
                              )}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                      <label className={LABEL_CLASS}>Słowa kluczowe (logika AND)</label>
                      <div className="relative">
                        <input
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addKeyword(keywordInput);
                            }
                          }}
                          className={INPUT_CLASS}
                          placeholder="Wpisz słowo kluczowe i Enter"
                        />
                        {keywordsLoading && (
                          <Loader2
                            size={14}
                            className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-black/40"
                          />
                        )}

                        {keywordSuggestions.length > 0 && (
                          <div className="absolute z-30 mt-1 w-full p-2 rounded-xl bg-white/90 border border-black/10 shadow-xl max-h-44 overflow-y-auto custom-scrollbar">
                            {keywordSuggestions.map((keyword) => (
                              <button
                                key={keyword}
                                type="button"
                                onClick={() => addKeyword(keyword)}
                                className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold text-black/80 hover:bg-black/5"
                              >
                                {keyword}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {filters.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {filters.keywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-xl glass-liquid-convex text-[10px] font-black uppercase tracking-widest text-black"
                            >
                              {keyword}
                              <button
                                type="button"
                                onClick={() => removeKeyword(keyword)}
                                className="text-black/50 hover:text-black"
                                aria-label={`Usuń słowo kluczowe ${keyword}`}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-black/5 bg-black/[0.03] p-3 text-[10px] font-semibold text-black/55 leading-relaxed">
                    Składnia SAOS: użyj cudzysłowu dla dokładnej frazy,
                    <span className="font-black text-black/65"> OR </span>
                    dla alternatyw oraz
                    <span className="font-black text-black/65"> -słowo </span>
                    do wykluczeń.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <AnimatePresence>
            {activeOptimizedQuery && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-2 glass-prestige rounded-xl border-emerald-500/20"
              >
                <div className="flex gap-1">
                  {[1, 2, 3].map((index) => (
                    <motion.div
                      key={index}
                      animate={{ scale: [1, 1.45, 1] }}
                      transition={{ repeat: Infinity, duration: 1, delay: index * 0.2 }}
                      className="w-1 h-1 rounded-full bg-emerald-500"
                    />
                  ))}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                  AI Optimized Query:
                </span>
                <span className="text-[10px] font-bold text-emerald-600 italic">
                  "{activeOptimizedQuery}"
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {facetsLoading && (
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/35 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" />
              Ładowanie słowników filtrów
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          {errorMessage && (
            <div className="mb-4 rounded-xl p-3 glass-prestige border border-red-500/20 text-xs font-semibold text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="max-w-4xl mx-auto space-y-4">
            {nextPageHref && (
              <div className="text-[10px] font-semibold text-black/35 break-all">next: {nextPageHref}</div>
            )}

            {results.length === 0 && !loading && (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center opacity-20 pointer-events-none">
                <Gavel size={80} strokeWidth={1} className="mb-6" />
                <p className="text-lg font-semibold">Skonfiguruj filtry i uruchom wyszukiwanie SAOS</p>
              </div>
            )}

            {loading && (
              <div className="h-full min-h-[300px] flex items-center justify-center">
                <div className="glass-prestige rounded-2xl px-6 py-4 flex items-center gap-3 text-black/70 text-xs font-black uppercase tracking-[0.2em]">
                  <Loader2 size={16} className="animate-spin" />
                  Wyszukiwanie orzeczeń
                </div>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {results.map((item, idx) => {
                const fallback = parseSourceFallback(item.source);
                const courtName = item.courtName || fallback.courtName;
                const caseNo = item.caseNumber || fallback.caseNumber;

                return (
                  <motion.div
                    key={`${item.id || item.source}-${idx}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setSelectedJudgment(item)}
                    className={cn(
                      "group relative p-5 transition-all duration-300 cursor-pointer rounded-2xl glass-liquid-convex",
                      selectedJudgment?.id === item.id && selectedJudgment?.source === item.source
                        ? "scale-[1.01] z-10 shadow-2xl"
                        : "opacity-85 hover:opacity-100",
                    )}
                  >
                    <div className="flex justify-between items-start mb-3 gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-black/40 truncate">
                          <Hash size={12} className="shrink-0" />
                          <span className="truncate">{caseNo}</span>
                        </div>
                        <h4 className="text-sm font-bold text-black uppercase font-outfit leading-tight line-clamp-2">
                          {courtName}
                        </h4>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-black/20 group-hover:text-black group-hover:translate-x-1 transition-all shrink-0"
                      />
                    </div>

                    <p className="text-sm text-black/65 line-clamp-3 leading-relaxed font-medium">
                      {item.content}
                    </p>

                    <div className="mt-4 pt-4 border-t border-black/5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-black/35">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {formatDate(item.judgmentDate)}
                      </span>
                      <span className="bg-black/5 px-2 py-1 rounded uppercase tracking-widest font-black">
                        {item.judgmentType || "ORZECZENIE"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {selectedJudgment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] p-4 lg:p-10 flex items-center justify-center"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  closeJudgmentModal();
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                transition={{ type: "spring", damping: 28, stiffness: 260 }}
                className="w-full max-w-5xl h-[92vh] max-h-[940px] rounded-[28px] bg-[#f8f6f1] border border-black/20 shadow-[0_30px_80px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="relative p-5 border-b border-black/10 flex items-center justify-between bg-white/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-black/40">
                      Dokument orzeczenia SAOS
                    </span>
                    <span className="text-sm font-bold text-black/75 truncate max-w-[60vw]">
                      {selectedCourtAndCase.caseNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void handleSaveJudgmentToDocuments(event);
                      }}
                      disabled={isSavingJudgment}
                      className="p-3 rounded-xl border border-emerald-500/70 bg-emerald-500/10 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.45)] hover:shadow-[0_0_20px_rgba(16,185,129,0.85)] transition-all duration-200 disabled:opacity-35 disabled:shadow-none disabled:border-emerald-500/40"
                      title="Zapisz do dokumentów własnych"
                      aria-label="Zapisz do dokumentów własnych"
                    >
                      {isSavingJudgment ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void handleShareJudgment(event);
                      }}
                      disabled={!selectedExternalUrl}
                      className="p-3 rounded-xl border border-cyan-500/70 bg-cyan-500/10 text-cyan-600 hover:text-cyan-500 hover:bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.45)] hover:shadow-[0_0_20px_rgba(6,182,212,0.85)] transition-all duration-200 disabled:opacity-35 disabled:shadow-none disabled:border-cyan-500/40"
                      title="Udostępnij orzeczenie"
                      aria-label="Udostępnij orzeczenie"
                    >
                      <ExternalLink size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        closeJudgmentModal();
                      }}
                      className="p-3 rounded-xl border border-red-500/70 bg-red-500/10 text-red-600 hover:text-red-500 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.45)] hover:shadow-[0_0_20px_rgba(239,68,68,0.85)] transition-all duration-200"
                      title="Zamknij dokument"
                      aria-label="Zamknij dokument"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {saveJudgmentStatus && (
                  <div
                    className={cn(
                      "mx-5 mt-4 rounded-xl border px-4 py-3 text-xs font-semibold",
                      saveJudgmentStatus.type === "success"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                        : "border-red-500/40 bg-red-500/10 text-red-700",
                    )}
                  >
                    {saveJudgmentStatus.message}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-5 lg:p-8 custom-scrollbar bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_rgba(0,0,0,0.03))]">
                  <div className="max-w-3xl mx-auto bg-white/80 border border-black/10 rounded-2xl p-6 lg:p-9 shadow-[0_10px_35px_rgba(0,0,0,0.12)] space-y-8">
                    <header className="space-y-4">
                      <span className="px-3 py-1 glass-prestige text-black/60 border-black/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Szczegóły orzeczenia
                      </span>

                      <h3 className="text-2xl lg:text-3xl font-black text-black font-outfit leading-tight uppercase">
                        {selectedCourtAndCase.courtName}
                      </h3>

                      <div className="flex flex-wrap gap-5 text-sm text-black/45 font-semibold pt-1">
                        <div className="flex items-center gap-2">
                          <Hash size={16} className="text-black/60" />
                          {selectedCourtAndCase.caseNumber}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-black/60" />
                          {formatDate(
                            selectedDetails?.judgmentDate || selectedJudgment.judgmentDate,
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-black/60" />
                          Polska
                        </div>
                      </div>
                    </header>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-black/5 bg-black/[0.03] p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">
                          Typ orzeczenia
                        </p>
                        <p className="font-semibold text-black/75">
                          {selectedDetails?.judgmentType || selectedJudgment.judgmentType || "Brak"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-black/5 bg-black/[0.03] p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">
                          Typ organu
                        </p>
                        <p className="font-semibold text-black/75">
                          {selectedDetails?.courtType || selectedJudgment.courtType || "Brak"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-black/5 bg-black/[0.03] p-3 md:col-span-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">
                          Sędziowie
                        </p>
                        <p className="font-semibold text-black/75">{selectedJudges}</p>
                      </div>

                      {selectedLegalBases && (
                        <div className="rounded-xl border border-black/5 bg-black/[0.03] p-3 md:col-span-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">
                            Podstawy prawne
                          </p>
                          <p className="font-semibold text-black/75 leading-relaxed">
                            {selectedLegalBases}
                          </p>
                        </div>
                      )}
                    </section>

                    {(selectedDetails?.summary || selectedDetails?.decision) && (
                      <section className="space-y-3">
                        {selectedDetails?.summary && (
                          <div>
                            <h4 className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] mb-2">
                              Podsumowanie
                            </h4>
                            <p className="text-sm text-black/70 font-medium leading-relaxed">
                              {selectedDetails.summary}
                            </p>
                          </div>
                        )}

                        {selectedDetails?.decision && (
                          <div>
                            <h4 className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] mb-2">
                              Rozstrzygnięcie
                            </h4>
                            <p className="text-sm text-black/70 font-medium leading-relaxed">
                              {selectedDetails.decision}
                            </p>
                          </div>
                        )}
                      </section>
                    )}

                    <section className="space-y-3">
                      <h4 className="text-[10px] font-black text-black/20 uppercase tracking-[0.4em] border-b border-black/5 pb-2">
                        Treść orzeczenia
                      </h4>

                      {detailsLoading ? (
                        <div className="rounded-xl border border-black/5 bg-black/[0.03] p-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black/45">
                          <Loader2 size={14} className="animate-spin" />
                          Ładowanie pełnej treści
                        </div>
                      ) : (
                        <div className="text-sm lg:text-base text-black/80 leading-relaxed font-medium whitespace-pre-wrap selection:bg-black/10">
                          {selectedTextContent || "Brak treści orzeczenia."}
                        </div>
                      )}
                    </section>

                    <div className="p-5 glass-liquid-convex border-emerald-500/10 space-y-3 shadow-none">
                      <h4 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                        <Search size={14} />
                        Wskazówka analityczna
                      </h4>
                      <p className="text-sm text-black/65 leading-relaxed font-semibold">
                        Pracujesz na oficjalnym źródle SAOS z pełnym filtrowaniem metadanych.
                        Łącz frazy ogólne, sygnaturę akt, sędziego i zakres dat, aby szybciej
                        zawęzić linię orzeczniczą.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
