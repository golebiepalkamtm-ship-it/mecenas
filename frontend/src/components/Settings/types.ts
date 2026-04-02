import type { User as AuthUser } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  role?: string;
  subscription_tier?: string;
  favorite_models?: string[];
}

export interface SettingsViewProps {
  user: AuthUser | null;
  profile: Profile | null;
  onUpdateProfile: (updates: Partial<Profile>) => Promise<void>;
  isSaving: boolean;
  successMsg: string;
  onSignOut: () => Promise<void>;
}
