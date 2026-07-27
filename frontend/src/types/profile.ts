/**
 * Typy dla profilu użytkownika i zarządzania kontem
 */

export type SubscriptionTier = 'free' | 'professional' | 'enterprise' | 'custom';
export type NotificationChannel = 'email' | 'in_app' | 'push';
export type SecurityLevel = 'standard' | 'strict';

// ============ PROFIL UŻYTKOWNIKA ============
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  company?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

// ============ SUBSKRYPCJA ============
export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  price_monthly: number;
  price_annually: number;
  features: SubscriptionFeature[];
  limits: SubscriptionLimits;
  stripe_product_id?: string;
  stripe_price_id_monthly?: string;
  stripe_price_id_annually?: string;
}

export interface SubscriptionFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  tier_minimum: SubscriptionTier;
}

export interface SubscriptionLimits {
  monthly_chats: number;
  monthly_documents: number;
  monthly_tokens: number;
  parallel_requests: number;
  storage_gb: number;
  priority_support: boolean;
  custom_models: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  stripe_subscription_id?: string;
  renewal_date?: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  subscription_id?: string;
  invoice_id?: string;
  payment_method?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  stripe_payment_id?: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  pdf_url?: string;
  stripe_invoice_id?: string;
  created_at: string;
  updated_at: string;
}

// ============ BEZPIECZEŃSTWO ============
export interface SecuritySession {
  id: string;
  user_id: string;
  device_name: string;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  ip_address: string;
  user_agent: string;
  last_active: string;
  created_at: string;
  is_current: boolean;
}

export interface TwoFactorMethod {
  id: string;
  user_id: string;
  type: 'totp' | 'email' | 'sms';
  enabled: boolean;
  verified: boolean;
  backup_codes?: string[];
  created_at: string;
}

export interface PasswordHistory {
  id: string;
  user_id: string;
  changed_at: string;
  ip_address: string;
  user_agent: string;
}

export interface SecuritySettings {
  user_id: string;
  two_factor_enabled: boolean;
  session_timeout_minutes: number;
  security_level: SecurityLevel;
  require_password_change: boolean;
  login_alerts_enabled: boolean;
  suspicious_activity_alerts: boolean;
  updated_at: string;
}

// ============ PREFERENCJE ============
export interface NotificationPreferences {
  user_id: string;
  email_marketing: boolean;
  email_updates: boolean;
  email_security: boolean;
  email_billing: boolean;
  in_app_notifications: boolean;
  push_notifications: boolean;
  notification_frequency: 'immediate' | 'daily' | 'weekly' | 'monthly' | 'never';
  updated_at: string;
}

export interface UserPreferences {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: 'pl' | 'en' | 'de';
  timezone: string;
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  default_model: string;
  auto_save_drafts: boolean;
  show_tips: boolean;
  analytics_enabled: boolean;
  updated_at: string;
}

// ============ STATYSTYKI UŻYTKOWNIKA ============
export interface UserStatistics {
  user_id: string;
  total_chats: number;
  total_documents: number;
  total_trials: number;
  total_tokens_used: number;
  total_tokens_available: number;
  average_tokens_per_chat: number;
  last_chat_date?: string;
  most_used_model: string;
  created_at: string;
  current_month_tokens: number;
  current_month_chats: number;
  updated_at: string;
}

// ============ GDPR & DATA ============
export interface DataExportRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'ready' | 'expired';
  download_url?: string;
  created_at: string;
  expires_at: string;
}

export interface DeletionRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'completed';
  reason?: string;
  scheduled_deletion_date?: string;
  created_at: string;
}
