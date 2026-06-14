import type { LexIconName } from "../Layout/LexIcon";

export type AdminTab = "system" | "users" | "security" | "models" | "debugger";

export interface UserProfile {
  id: string;
  email: string | null;
  role: string;
  created_at: string;
}

export interface DashboardStats {
  users: number;
  docs: number;
  requests: number;
  tokens: number;
}

export interface AdminTabConfig {
  id: AdminTab;
  label: string;
  lexIcon: LexIconName;
}
