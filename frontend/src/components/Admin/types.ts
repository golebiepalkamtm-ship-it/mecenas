import { Activity } from "lucide-react";
import type { Model } from "../Chat/types";

export type AdminTab = "system" | "users" | "security" | "models";

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
  icon: typeof Activity;
}
