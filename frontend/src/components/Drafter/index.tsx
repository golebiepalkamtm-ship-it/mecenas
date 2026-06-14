import { useState, useRef, useEffect, useCallback } from "react";

import { motion } from "framer-motion";

import { supabase } from "../../utils/supabaseClient";

import { DRAFTING_PROMPTS, DOCUMENT_TYPES } from "./constants";
import { getDocumentCatalogItem } from "./documentCatalog";

import { useChatSettingsStore } from "../../store/useChatSettingsStore";

import type { ExpertModeKey } from "./types";

import { LexIcon } from "../Layout/LexIcon";

import { useSharedChat } from "../../context/useSharedChat";

import { DrafterConfigSidebar } from "./components/DrafterConfigSidebar";

import { DocumentPreview } from "./components/DocumentPreview";

import { downloadAsDocx, downloadAsMarkdown } from "../../utils/exportUtils";
import { API_BASE } from "../../config";
import {
  PLACE_CITY_OPTIONS,
  RECIPIENT_ORGAN_OPTIONS,
  findPresetById,
} from "./formalPresets";
import {
  applyRecipientPreset,
  buildPlaceDateLine,
  resolveInitialFormalState,
  saveDrafterFormalPrefs,
  toIsoDateLocal,
} from "./utils";
import { DRAFTER_SHELL, LibraryHero, LibraryStatPill } from "../Library/shared";

export function DrafterView() {
  const { messages: globalMessages } = useSharedChat();

  const { drafterModel } = useChatSettingsStore();

  const currentMessages = globalMessages.map((m) => ({
    role: m.role,

    content:
      typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));

  const [showConfig, setShowConfig] = useState(true);

  const [instructions, setInstructions] = useState("");

  const [selectedType, setSelectedType] = useState("pozew-zaplata");

  const [generatedDocument, setGeneratedDocument] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);

  const [copied, setCopied] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);

  const [error, setError] = useState("");

  const initialFormal = resolveInitialFormalState();

  const [isStructured, setIsStructured] = useState(true);

  const [senderInfo, setSenderInfo] = useState("");

  const [recipientInfo, setRecipientInfo] = useState(() =>
    applyRecipientPreset(
      RECIPIENT_ORGAN_OPTIONS,
      initialFormal.recipientPresetId,
    ),
  );

  const [recipientPresetId, setRecipientPresetId] = useState(
    initialFormal.recipientPresetId,
  );

  const [placeCity, setPlaceCity] = useState(initialFormal.placeCity);

  const [placeCityPresetId, setPlaceCityPresetId] = useState(
    initialFormal.placeCityPresetId,
  );

  const [documentDateIso, setDocumentDateIso] = useState(
    initialFormal.documentDateIso,
  );

  const [selectedPrompt, setSelectedPrompt] =
    useState<ExpertModeKey>("drafter");

  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!documentDateIso) {
      setDocumentDateIso(toIsoDateLocal());
    }
  }, [documentDateIso]);

  useEffect(() => {
    saveDrafterFormalPrefs({
      placeCity,
      placeCityPresetId,
      documentDateIso: documentDateIso || toIsoDateLocal(),
      recipientPresetId,
    });
  }, [placeCity, placeCityPresetId, documentDateIso, recipientPresetId]);

  const handleRecipientPresetChange = useCallback((id: string) => {
    setRecipientPresetId(id);
    if (!id) return;
    const preset = findPresetById(RECIPIENT_ORGAN_OPTIONS, id);
    if (preset && id !== "custom-recipient") {
      setRecipientInfo(preset.value);
    } else if (id === "custom-recipient") {
      setRecipientInfo("");
    }
  }, []);

  const handlePlaceCityPresetChange = useCallback((id: string) => {
    setPlaceCityPresetId(id);
    if (!id) return;
    const preset = findPresetById(PLACE_CITY_OPTIONS, id);
    if (preset && id !== "custom-city") {
      setPlaceCity(preset.value);
    } else if (id === "custom-city") {
      setPlaceCity("");
    }
  }, []);

  useEffect(() => {
    if (documentRef.current && generatedDocument) {
      documentRef.current.scrollTop = documentRef.current.scrollHeight;
    }
  }, [generatedDocument]);

  const handleGenerate = useCallback(async () => {
    if (!instructions.trim() && currentMessages.length === 0) {
      setError("Podaj instrukcje lub przeprowadź najpierw rozmowę w czacie.");

      return;
    }

    setIsGenerating(true);

    setError("");

    setGeneratedDocument("");

    try {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!initialSession?.access_token) {
        setError("Musisz być zalogowany.");
        setIsGenerating(false);
        return;
      }

      const { data: refreshed } = await supabase.auth.refreshSession();
      const session = refreshed.session ?? initialSession;

      const placeDateLine = buildPlaceDateLine(placeCity, documentDateIso);
      const selectedTemplate = getDocumentCatalogItem(selectedType);
      const mergedInstructions = selectedTemplate?.defaultInstructions
        ? `${selectedTemplate.defaultInstructions}\n\nDane od uzytkownika:\n${instructions || "(brak dodatkowych instrukcji)"}`.trim()
        : instructions;

      const draftBody = {
        system_prompt: DRAFTING_PROMPTS[selectedPrompt].prompt,
        user_instructions: mergedInstructions,
        structured_data: isStructured
          ? {
              sender: senderInfo,
              recipient: recipientInfo,
              placeDate: placeDateLine,
            }
          : null,
        document_type: selectedType,
        model: drafterModel,
        history: currentMessages.slice(-10),
      };

      let serverError: string | undefined;

      const tryLocalDraft = async (): Promise<string | undefined> => {
        const localRes = await fetch(`${API_BASE}/documents/draft-document`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftBody),
        });
        const localData = (await localRes.json()) as {
          content?: string;
          error?: string;
          detail?: string;
        };
        if (localRes.ok && localData.content) {
          return localData.content;
        }
        serverError =
          localData.error ||
          localData.detail ||
          serverError ||
          `Lokalny backend (HTTP ${localRes.status})`;
        return undefined;
      };

      const tryEdgeDraft = async (): Promise<string | undefined> => {
        const { data: edgeData, error: fnError } = await supabase.functions.invoke(
          "draft-document",
          {
            body: draftBody,
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );
        if (!fnError && edgeData?.content) {
          return edgeData.content;
        }
        if (edgeData?.error) {
          serverError = edgeData.error;
        } else if (fnError) {
          serverError = fnError.message;
        }
        return undefined;
      };

      const isLocalDev =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      const content = isLocalDev
        ? (await tryLocalDraft()) ?? (await tryEdgeDraft())
        : (await tryEdgeDraft()) ?? (await tryLocalDraft());

      if (!content) {
        throw new Error(serverError || "Generowanie nie powiodło się.");
      }

      if (content) setGeneratedDocument(content);
      else if (serverError) setError(serverError);
    } catch (err: unknown) {
      setError(
        `Błąd generowania: ${err instanceof Error ? err.message : "Nieznany błąd"}`,
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    instructions,
    currentMessages,
    selectedPrompt,
    selectedType,
    isStructured,
    senderInfo,
    recipientInfo,
    placeCity,
    documentDateIso,
    drafterModel,
  ]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(generatedDocument);

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  }, [generatedDocument]);

  const handleDownload = useCallback(() => {
    const docType = DOCUMENT_TYPES.find((d) => d.id === selectedType);
    const baseName = `${docType?.label || "pismo"}_${new Date().toISOString().split("T")[0]}`;
    downloadAsMarkdown(baseName, generatedDocument);
  }, [generatedDocument, selectedType]);

  const handleDownloadDocx = useCallback(async () => {
    if (!generatedDocument) return;
    setIsDownloadingDocx(true);
    setError("");
    try {
      const docType = DOCUMENT_TYPES.find((d) => d.id === selectedType);
      const baseName = `${docType?.label || "pismo"}_${new Date().toISOString().split("T")[0]}`;
      const placeDateLine = buildPlaceDateLine(placeCity, documentDateIso);
      await downloadAsDocx(baseName, generatedDocument, {
        sender: isStructured ? senderInfo : "",
        recipient: isStructured ? recipientInfo : "",
        placeDate: isStructured ? placeDateLine : "",
      });
    } catch (err: unknown) {
      setError(
        `Błąd eksportu DOCX: ${err instanceof Error ? err.message : "Nieznany błąd"}`,
      );
    } finally {
      setIsDownloadingDocx(false);
    }
  }, [
    generatedDocument,
    selectedType,
    placeCity,
    documentDateIso,
    isStructured,
    senderInfo,
    recipientInfo,
  ]);

  const handleSave = useCallback(async () => {
    if (!generatedDocument) return;

    setIsSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Musisz być zalogowany.");

      const firstLine = generatedDocument
        .split("\n")[0]
        .replace(/[#*]/g, "")
        .trim();

      const currentDocType = DOCUMENT_TYPES.find((d) => d.id === selectedType);

      const docTitle =
        firstLine ||
        `${currentDocType?.label || "Pismo"} - ${new Date().toLocaleDateString("pl-PL")}`;

      const res = await fetch(`${API_BASE}/documents/save-draft`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          document_text: generatedDocument,

          question: docTitle,

          model: drafterModel,
        }),
      });

      if (!res.ok) throw new Error("Failed to save draft on server");

      setSaveSuccess(true);

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError(
        `Błąd zapisu: ${err instanceof Error ? err.message : "Nieznany błąd"}`,
      );
    } finally {
      setIsSaving(false);
    }
  }, [generatedDocument, selectedType, drafterModel]);

  const selectedTypeLabel =
    DOCUMENT_TYPES.find((t) => t.id === selectedType)?.label ?? "Pismo";

  useEffect(() => {
    const selectedTemplate = getDocumentCatalogItem(selectedType);
    if (!selectedTemplate?.recipientPresetId) return;
    if (recipientPresetId === selectedTemplate.recipientPresetId) return;
    handleRecipientPresetChange(selectedTemplate.recipientPresetId);
  }, [selectedType, recipientPresetId, handleRecipientPresetChange]);

  return (
    <div className="h-full w-full min-h-0 flex flex-col overflow-hidden px-4 sm:px-6 lg:px-8 pt-1 pb-3 sm:pb-4 font-outfit">
      <div className={DRAFTER_SHELL}>
        <LibraryHero
          variant="documents"
          ornament="Generator · Dokumenty procesowe"
          title="Kreator pism"
          subtitle="Typ pisma, tryb ekspercki, dane formalne i wytyczne — podgląd na żywo."
          badge={
            <>
              <LibraryStatPill label="Kontekst" value={currentMessages.length} />
              <LibraryStatPill label="Typ" value={selectedTypeLabel} />
            </>
          }
        />

        <div className="flex-1 min-h-0 flex overflow-hidden">
      <DrafterConfigSidebar
        showConfig={showConfig}
        setShowConfig={setShowConfig}
        contextMessageCount={currentMessages.length}
        selectedType={selectedType}
        onSelectType={setSelectedType}
        selectedPrompt={selectedPrompt}
        onSelectPrompt={setSelectedPrompt}
        isStructured={isStructured}
        setIsStructured={setIsStructured}
        senderInfo={senderInfo}
        setSenderInfo={setSenderInfo}
        recipientInfo={recipientInfo}
        setRecipientInfo={setRecipientInfo}
        recipientPresetId={recipientPresetId}
        onRecipientPresetChange={handleRecipientPresetChange}
        placeCity={placeCity}
        setPlaceCity={setPlaceCity}
        placeCityPresetId={placeCityPresetId}
        onPlaceCityPresetChange={handlePlaceCityPresetChange}
        documentDateIso={documentDateIso}
        setDocumentDateIso={setDocumentDateIso}
        instructions={instructions}
        setInstructions={setInstructions}
        error={error}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
      />

      <div className="flex-1 flex flex-col relative h-full min-w-0 min-h-0 overflow-hidden bg-white/90 border-l border-gold-primary/10">
        {!showConfig && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setShowConfig(true)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-3 lg:p-4 rounded-full library-view-cell border-gold-primary/30 text-gold-deep hover:text-black hover:scale-105 transition-all shadow-lg group/config"
            title="Pokaż konfigurację kreatora"
          >
            <LexIcon
              name="drafter"
              size={20}
              className="group-hover/config:rotate-12 transition-transform"
            />
          </motion.button>
        )}

        <div className="flex-1 min-h-0 overflow-hidden relative z-10">
          <DocumentPreview
            generatedDocument={generatedDocument}
            copied={copied}
            onCopy={handleCopy}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
            onSave={handleSave}
            onDownload={handleDownload}
            onDownloadDocx={handleDownloadDocx}
            isDownloadingDocx={isDownloadingDocx}
            documentRef={documentRef}
            isGenerating={isGenerating}
          />
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
