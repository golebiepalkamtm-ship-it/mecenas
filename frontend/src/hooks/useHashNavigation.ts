import { useState, useEffect, useCallback } from "react";
import type { Tab } from "../types/navigation";

const VALID_TABS: Tab[] = [
  "chat",
  "trial",
  "consilium",
  "knowledge",
  "prompts",
  "drafter",
  "documents",
  "judgments",
  "admin",
  "settings"
];

const DEFAULT_TAB: Tab = "chat";

const getTabFromHash = (): Tab => {
  if (typeof window === "undefined") return DEFAULT_TAB;
  const hash = window.location.hash.replace("#", "");
  return VALID_TABS.includes(hash as Tab) ? (hash as Tab) : DEFAULT_TAB;
};

export function useHashNavigation() {
  const [activeTab, setActiveTabState] = useState<Tab>(getTabFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTabState(getTabFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);
    
    // Upewnij się, że URL jest poprawny na starcie (np. brak hasha -> ustawia #chat)
    if (!window.location.hash || !VALID_TABS.includes(window.location.hash.replace("#", "") as Tab)) {
      window.history.replaceState(null, "", `#${DEFAULT_TAB}`);
    }

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const setActiveTab = useCallback((tab: Tab) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  }, []);

  return { activeTab, setActiveTab };
}
