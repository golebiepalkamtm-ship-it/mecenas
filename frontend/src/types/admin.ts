/**
 * Typy dla Admin Panelu
 */

export type AdminPanelTab = 'system' | 'users' | 'security' | 'models' | 'payments' | 'analytics' | 'messaging' | 'debugger';

// ============ UŻYTKOWNICY ============
export interface AdminUserDetail {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'moderator' | 'admin' | 'superadmin';
  status: 'active' | 'suspended' | 'banned' | 'deleted';
  subscription_tier: string;
  created_at: string;
  last_login?: string;
  total_chats: number;
  total_documents: number;
  total_tokens_used: number;
  current_month_chats: number;
  is_blocked: boolean;
  notes?: string;
}

export interface UserActionLog {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  performed_by: string;
  created_at: string;
}

// ============ PŁATNOŚCI & ROZLICZENIA ============
export interface PaymentTransaction {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  invoice_id?: string;
  description: string;
  created_at: string;
  updated_at: string;
  processed_by?: string;
}

export interface SubscriptionMetrics {
  total_active_subscriptions: number;
  active_by_tier: Record<string, number>;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churn_rate: number;
  ltv: number; // Lifetime Value
  updated_at: string;
}

export interface RevenueReport {
  period_start: string;
  period_end: string;
  total_revenue: number;
  revenue_by_tier: Record<string, number>;
  new_subscriptions: number;
  cancelled_subscriptions: number;
  refunds: number;
  average_transaction_value: number;
  transactions_count: number;
}

// ============ MONITORING & PERFORMANCE ============
export interface SystemMetric {
  id: string;
  metric_name: string;
  metric_type: 'counter' | 'gauge' | 'histogram';
  value: number;
  unit: string;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface ServiceHealth {
  id: string;
  service_name: string;
  status: 'online' | 'degraded' | 'offline' | 'maintenance';
  latency_ms: number;
  uptime_percentage: number;
  error_rate: number;
  last_check: string;
  message?: string;
}

export interface PlatformAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  service?: string;
  created_at: string;
  resolved_at?: string;
  acknowledged_by?: string;
}

export interface PerformanceMetrics {
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  requests_per_minute: number;
  error_rate: number;
  cache_hit_rate: number;
  database_query_time_ms: number;
  timestamp: string;
}

// ============ ANALYTICS & REPORTS ============
export interface ConversionFunnel {
  step: string;
  users_count: number;
  conversion_rate: number;
}

export interface UserRetention {
  cohort_date: string;
  day_0: number;
  day_1: number;
  day_7: number;
  day_30: number;
  day_90: number;
}

export interface PlatformAnalytics {
  date: string;
  active_users: number;
  new_users: number;
  total_chats: number;
  total_documents_processed: number;
  total_tokens_used: number;
  average_session_duration: number;
  top_models_used: Array<{ model: string; usage_count: number }>;
  geographic_distribution: Record<string, number>;
}

export interface UsageReport {
  period_start: string;
  period_end: string;
  daily_metrics: PlatformAnalytics[];
  conversion_funnel: ConversionFunnel[];
  retention_cohorts: UserRetention[];
  total_summary: {
    total_users: number;
    active_users: number;
    new_users: number;
    total_revenue: number;
    average_tokens_per_user: number;
  };
}

// ============ MESSAGING & NOTIFICATIONS ============
export interface AdminMessage {
  id: string;
  from_admin_id: string;
  to_user_id?: string; // null = broadcast
  subject: string;
  content: string;
  message_type: 'announcement' | 'warning' | 'maintenance' | 'alert' | 'promotional';
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduled_for?: string;
  sent_at?: string;
  read_count?: number;
  click_count?: number;
  created_at: string;
  updated_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  admin_message_id?: string;
  title: string;
  content: string;
  notification_type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  action_url?: string;
  created_at: string;
  read_at?: string;
}

// ============ KONFIGURACJA SYSTEMU ============
export interface SystemConfiguration {
  key: string;
  value: unknown;
  category: 'security' | 'performance' | 'features' | 'notifications' | 'integrations';
  description: string;
  is_mutable: boolean;
  updated_at: string;
  updated_by?: string;
}

export interface RateLimitConfig {
  endpoint: string;
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  enabled: boolean;
  updated_at: string;
}

export interface MaintenanceMode {
  enabled: boolean;
  message: string;
  started_at?: string;
  estimated_duration_minutes?: number;
  allowed_admin_users?: string[];
}

// ============ AUDIT & LOGS ============
export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface SystemLog {
  id: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  context?: Record<string, unknown>;
  stack_trace?: string;
  created_at: string;
}

// ============ AGREGACJA ============
export interface AdminDashboardMetrics {
  total_users: number;
  active_users_today: number;
  new_users_today: number;
  total_revenue_mtd: number;
  active_subscriptions: number;
  churn_rate_monthly: number;
  platform_health: ServiceHealth[];
  critical_alerts: PlatformAlert[];
  system_uptime: number;
  last_updated: string;
}
