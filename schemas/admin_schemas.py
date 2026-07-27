"""
Pydantic schematy dla Admin Panelu
"""

from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from enum import Enum


# ============ ENUMS ============
class AdminAction(str, Enum):
    create_user = "create_user"
    update_user = "update_user"
    delete_user = "delete_user"
    suspend_user = "suspend_user"
    ban_user = "ban_user"
    change_role = "change_role"
    process_payment = "process_payment"
    issue_refund = "issue_refund"
    update_config = "update_config"
    send_message = "send_message"


class PaymentStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class UserStatus(str, Enum):
    active = "active"
    suspended = "suspended"
    banned = "banned"
    deleted = "deleted"


class AlertSeverity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


# ============ ZARZĄDZANIE UŻYTKOWNIKAMI ============
class AdminUserDetailResponse(BaseModel):
    """Szczegóły użytkownika dla admina"""
    id: str
    email: str
    full_name: str
    role: str
    status: UserStatus
    subscription_tier: str
    created_at: datetime
    last_login: Optional[datetime]
    total_chats: int
    total_documents: int
    total_tokens_used: int
    current_month_chats: int
    is_blocked: bool
    notes: Optional[str]

    class Config:
        from_attributes = True


class AdminUpdateUserRequest(BaseModel):
    """Request do aktualizacji użytkownika przez admina"""
    full_name: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(user|moderator|admin)$")
    status: Optional[str] = Field(None, pattern="^(active|suspended|banned|deleted)$")
    notes: Optional[str] = Field(None, max_length=1000)


class AdminUserListResponse(BaseModel):
    """Lista użytkowników dla admina"""
    total_count: int
    page: int
    page_size: int
    users: List[AdminUserDetailResponse]


class UserActionLogResponse(BaseModel):
    """Log akcji użytkownika"""
    id: str
    user_id: str
    action: str
    details: Dict[str, Any]
    performed_by: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============ PŁATNOŚCI & ROZLICZENIA ============
class PaymentTransactionResponse(BaseModel):
    """Transakcja płatności"""
    id: str
    user_id: str
    user_email: str
    amount: float
    currency: str
    status: PaymentStatus
    payment_method: str
    invoice_id: Optional[str]
    description: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaymentTransactionListResponse(BaseModel):
    """Lista transakcji płatności"""
    total_count: int
    page: int
    page_size: int
    transactions: List[PaymentTransactionResponse]
    total_amount: float
    total_completed: float


class SubscriptionMetricsResponse(BaseModel):
    """Metryki subskrypcji"""
    total_active_subscriptions: int
    active_by_tier: Dict[str, int]
    mrr: float  # Monthly Recurring Revenue
    arr: float  # Annual Recurring Revenue
    churn_rate: float
    ltv: float  # Lifetime Value
    updated_at: datetime


class RevenueReportRequest(BaseModel):
    """Request do raportu przychodów"""
    start_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    group_by: str = Field(default="day", pattern="^(day|week|month)$")


class RevenueReportResponse(BaseModel):
    """Raport przychodów"""
    period_start: datetime
    period_end: datetime
    total_revenue: float
    revenue_by_tier: Dict[str, float]
    new_subscriptions: int
    cancelled_subscriptions: int
    refunds: float
    average_transaction_value: float
    transactions_count: int

    class Config:
        from_attributes = True


class RefundRequest(BaseModel):
    """Request do zwrotu pieniędzy"""
    payment_id: str
    amount: Optional[float] = None  # null = full refund
    reason: str = Field(max_length=500)
    notify_user: bool = True


# ============ MONITORING & PERFORMANCE ============
class SystemMetricResponse(BaseModel):
    """Metryka systemowa"""
    id: str
    metric_name: str
    metric_type: str
    value: float
    unit: str
    timestamp: datetime
    tags: Optional[Dict[str, str]]

    class Config:
        from_attributes = True


class ServiceHealthResponse(BaseModel):
    """Status usługi"""
    id: str
    service_name: str
    status: str  # online, degraded, offline, maintenance
    latency_ms: float
    uptime_percentage: float
    error_rate: float
    last_check: datetime
    message: Optional[str]

    class Config:
        from_attributes = True


class PlatformAlertResponse(BaseModel):
    """Alert platformy"""
    id: str
    severity: AlertSeverity
    title: str
    message: str
    service: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]
    acknowledged_by: Optional[str]

    class Config:
        from_attributes = True


class PerformanceMetricsResponse(BaseModel):
    """Metryki wydajności"""
    avg_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    requests_per_minute: float
    error_rate: float
    cache_hit_rate: float
    database_query_time_ms: float
    timestamp: datetime


class DashboardMetricsResponse(BaseModel):
    """Metryki głównego pulpitu"""
    total_users: int
    active_users_today: int
    new_users_today: int
    total_revenue_mtd: float
    active_subscriptions: int
    churn_rate_monthly: float
    system_uptime: float
    services_health: List[ServiceHealthResponse]
    critical_alerts: List[PlatformAlertResponse]
    last_updated: datetime


# ============ ANALYTICS ============
class ConversionFunnelResponse(BaseModel):
    """Etap funnela konwersji"""
    step: str
    users_count: int
    conversion_rate: float


class UserRetentionResponse(BaseModel):
    """Kohorta retencji użytkowników"""
    cohort_date: datetime
    day_0: int
    day_1: int
    day_7: int
    day_30: int
    day_90: int


class PlatformAnalyticsResponse(BaseModel):
    """Analityka platformy"""
    date: datetime
    active_users: int
    new_users: int
    total_chats: int
    total_documents_processed: int
    total_tokens_used: int
    average_session_duration: float
    top_models_used: List[Dict[str, Union[str, int]]]
    geographic_distribution: Dict[str, int]


class UsageReportResponse(BaseModel):
    """Raport użycia"""
    period_start: datetime
    period_end: datetime
    daily_metrics: List[PlatformAnalyticsResponse]
    conversion_funnel: List[ConversionFunnelResponse]
    retention_cohorts: List[UserRetentionResponse]
    total_users: int
    active_users: int
    new_users: int
    total_revenue: float


# ============ MESSAGING ============
class AdminMessageRequest(BaseModel):
    """Request do wysłania wiadomości przez admina"""
    to_user_id: Optional[str] = None  # null = broadcast
    subject: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=5000)
    message_type: str = Field(pattern="^(announcement|warning|maintenance|alert|promotional)$")
    scheduled_for: Optional[str] = None  # ISO datetime


class AdminMessageResponse(BaseModel):
    """Response wiadomości admina"""
    id: str
    from_admin_id: str
    to_user_id: Optional[str]
    subject: str
    content: str
    message_type: str
    status: str
    sent_at: Optional[datetime]
    read_count: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class UserNotificationResponse(BaseModel):
    """Powiadomienie użytkownika"""
    id: str
    user_id: str
    title: str
    content: str
    notification_type: str
    read: bool
    action_url: Optional[str]
    created_at: datetime
    read_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============ KONFIGURACJA SYSTEMU ============
class SystemConfigurationRequest(BaseModel):
    """Request do zmiany konfiguracji systemu"""
    value: Any
    description: Optional[str] = None


class SystemConfigurationResponse(BaseModel):
    """Konfiguracja systemu"""
    key: str
    value: Any
    category: str
    description: str
    is_mutable: bool
    updated_at: datetime
    updated_by: Optional[str]

    class Config:
        from_attributes = True


class RateLimitConfigRequest(BaseModel):
    """Request do konfiguracji rate limitingu"""
    endpoint: str
    requests_per_minute: int = Field(ge=1, le=10000)
    requests_per_hour: int = Field(ge=1, le=100000)
    requests_per_day: int = Field(ge=1, le=1000000)
    enabled: bool


class RateLimitConfigResponse(BaseModel):
    """Konfiguracja rate limitingu"""
    endpoint: str
    requests_per_minute: int
    requests_per_hour: int
    requests_per_day: int
    enabled: bool
    updated_at: datetime

    class Config:
        from_attributes = True


class MaintenanceModeRequest(BaseModel):
    """Request do włączenia maintenance mode"""
    enabled: bool
    message: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None


class MaintenanceModeResponse(BaseModel):
    """Status maintenance mode"""
    enabled: bool
    message: Optional[str]
    started_at: Optional[datetime]
    estimated_duration_minutes: Optional[int]

    class Config:
        from_attributes = True


# ============ AUDIT & LOGS ============
class AuditLogResponse(BaseModel):
    """Log audytu"""
    id: str
    admin_id: str
    action: str
    resource_type: str
    resource_id: str
    changes: Dict[str, Dict[str, Any]]
    ip_address: str
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Lista logów audytu"""
    total_count: int
    page: int
    page_size: int
    logs: List[AuditLogResponse]


class SystemLogResponse(BaseModel):
    """Log systemowy"""
    id: str
    level: str
    service: str
    message: str
    context: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True
