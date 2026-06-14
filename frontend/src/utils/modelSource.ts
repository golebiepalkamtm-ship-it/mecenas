import type { Model } from "../components/Chat/types";

export type ResolvedModelSource = "openrouter" | "google_native" | "direct";

function normalizeProvider(value: string | undefined): string {
  return (value || "").trim().toLowerCase();
}

export function getResolvedModelSource(model: Pick<Model, "api_source" | "provider" | "id">): ResolvedModelSource {
  const apiSource = normalizeProvider(model.api_source);
  const provider = normalizeProvider(model.provider);
  const modelId = normalizeProvider(model.id);

  if (apiSource === "google_native") return "google_native";
  if (apiSource === "openrouter") return "openrouter";

  if (provider === "google" && !modelId.includes("/")) {
    return "google_native";
  }

  return "direct";
}

export function getNormalizedProviderId(model: Pick<Model, "provider" | "id">): string {
  const provider = normalizeProvider(model.provider);
  const modelId = normalizeProvider(model.id);

  if (provider) return provider;
  if (modelId.includes("/")) return modelId.split("/")[0];
  return "unknown";
}

export function isModelVisibleForProviders(
  model: Pick<Model, "api_source" | "provider" | "id" | "free">,
  activeProviders: string[],
): boolean {
  if (model.free) return true;

  const normalizedActiveProviders = activeProviders.map((value) => normalizeProvider(value));
  const source = getResolvedModelSource(model);
  const provider = getNormalizedProviderId(model);

  if (source === "google_native") {
    return normalizedActiveProviders.includes("google");
  }

  if (source === "openrouter") {
    return normalizedActiveProviders.includes("openrouter");
  }

  return normalizedActiveProviders.includes(provider);
}

export function getAdminModelGroupName(model: Pick<Model, "api_source" | "provider" | "id">): string {
  const source = getResolvedModelSource(model);
  const provider = getNormalizedProviderId(model).toUpperCase();

  if (source === "google_native") return "GOOGLE API";
  if (source === "openrouter" && provider === "GOOGLE") return "GOOGLE / OPENROUTER";
  if (source === "direct") return `${provider} API`;

  return provider;
}

export function getModelSourceBadge(model: Pick<Model, "api_source" | "provider" | "id">): string {
  const source = getResolvedModelSource(model);

  if (source === "google_native") return "GOOGLE API";
  if (source === "openrouter") return "OPENROUTER";

  return `${getNormalizedProviderId(model).toUpperCase()} API`;
}
