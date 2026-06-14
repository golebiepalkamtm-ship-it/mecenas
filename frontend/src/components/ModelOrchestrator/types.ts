export type OrchestratorMode = 'single' | 'moa';

export type ModelTag = 'vision' | 'cheap' | 'fast' | 'most-powerful' | 'coding' | 'long-context' | 'reasoning';

export type CostTier = 1 | 2 | 3 | 4 | 5;
export type SpeedTier = 1 | 2 | 3 | 4 | 5;

export interface OrchestratorModel {
  id: string;
  name: string;
  provider: string;
  active: boolean;
  vision: boolean;
  description?: string;
  model_id?: string;
  tags: ModelTag[];
  costTier: CostTier;
  speedTier: SpeedTier;
  contextLength?: number;
  isRecent?: boolean;
  isRecommended?: boolean;
}

export interface MOAPreset {
  id: string;
  name: string;
  description: string;
  icon: 'zap' | 'shield' | 'settings';
  expertIds: string[];
  judgeId: string;
  estimatedTimeSeconds: number;
  isCustom: boolean;
}

export interface OrchestratorState {
  mode: OrchestratorMode;
  singleModelId: string;
  moaExpertIds: string[];
  moaJudgeId: string;
  activePresetId: string | null;
  recentModelIds: string[];
  searchQuery: string;
  filterTag: ModelTag | 'all';
  filterVendor: string;
}
