import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { pruneOversizedPersistedState } from "./utils/safeStorage";

pruneOversizedPersistedState();

{
  const w = window.innerWidth;
  const h = window.innerHeight;
  const desktop = w >= 1024;
  const compact = desktop && (w < 1536 || h < 900);
  document.documentElement.setAttribute(
    "data-density",
    compact ? "compact" : desktop ? "comfortable" : "mobile",
  );
}

// Precise load start tracking
window.__prawnik_load_start = Date.now();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
