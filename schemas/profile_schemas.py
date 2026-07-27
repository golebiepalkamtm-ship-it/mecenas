"""
Pydantic schematy dla profilu użytkownika, subskrypcji i płatności
"""

from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum


# ============ ENUMS ============
class SubscriptionTier(str, Enum):
    free = "free"
    professional = "professional"
    enterprise = "enterprise"
    custom = "custom"


class PaymentStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class UserRole(str, Enum):
    user = "user"
    moderator = "moderator"
    admin = "admin"
    superadmin = "superadmin"


class UserStatus(str, Enum):
    active = "active"
    suspended = "suspended"
    banned = "banned"
    deleted = "deleted"


# ============ PROFIL & DANE ============
class UserProfileRequest(BaseModel):
    """Request do aktualizacji profilu"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    company: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = Field(None, max_length=1000)
    avatar_url: Optional[str] = Field(None, max_length=2000)

    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "Jan Kowalski",
                "phone": "+48 123 456 789",
                "company": "Kancelaria Pałka",
                "bio": "Prawnik specjalizujący się w prawie karnym"
            }
        }


class UserProfileResponse(BaseModel):
    """Response profilu użytkownika"""
    id: str
    email: str
    full_name: str
    phone: Optional[str]
    avatar_url: Optional[str]
    company: Optional[str]
    bio: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserStatisticsResponse(BaseModel):
    """Statystyki użytkownika"""
    user_id: str
    total_chats: int
    total_documents: int
    total_trials: int
    total_tokens_used: int
    total_tokens_available: int
    current_month_tokens: int
    current_month_chats: int
    average_tokens_per_chat: float
    most_used_model: str
    last_chat_date: Optional[datetime]
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ SUBSKRYPCJA ============
class SubscriptionLimitsSchema(BaseModel):
    """Limity dla planu subskrypcji"""
    monthly_chats: int
    monthly_documents: int
    monthly_tokens: int
    parallel_requests: int
    storage_gb: int
    priority_support: bool
    custom_models: bool

    class Config:
        json_schema_extra = {
            "example": {
                "monthly_chats": 1000,
                "monthly_documents": 100,
                "monthly_tokens": 1000000,
                "parallel_requests": 10,
                "storage_gb": 100,
                "priority_support": True,
                "custom_models": False
            }
        }


class SubscriptionPlanResponse(BaseModel):
    """Plan subskrypcji"""
    id: str
    tier: SubscriptionTier
    name: str
    price_monthly: float
    price_annually: float
    limits: SubscriptionLimitsSchema
    stripe_product_id: Optional[str]

    class Config:
        from_attributes = True


class UserSubscriptionResponse(BaseModel):
    """Subskrypcja użytkownika"""
    id: str
    user_id: str
    tier: SubscriptionTier
    status: str  # active, cancelled, expired
    started_at: datetime
    expires_at: datetime
    auto_renew: bool
    plan: Optional[SubscriptionPlanResponse]
    renewal_date: Optional[datetime]

    class Config:
        from_attributes = True


class PaymentRequest(BaseModel):
    """Request do utworzenia płatności"""
    plan_tier: SubscriptionTier
    billing_cycle: str = Field("monthly", pattern="^(monthly|annually)$")
    payment_method_id: str
    promo_code: Optional[str] = None


class PaymentResponse(BaseModel):
    """Response płatności"""
    id: str
    amount: float
    currency: str
    status: PaymentStatus
    description: str
    invoice_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    """Response faktury"""
    id: str
    user_id: str
    invoice_number: str
    amount: float
    currency: str
    status: str
    invoice_date: datetime
    due_date: datetime
    pdf_url: Optional[str]

    class Config:
        from_attributes = True


# ============ BEZPIECZEŃSTWO ============
class SecuritySessionResponse(BaseModel):
    """Sesja bezpieczeństwa"""
    id: str
    device_name: str
    device_type: str
    ip_address: str
    last_active: datetime
    created_at: datetime
    is_current: bool

    class Config:
        from_attributes = True


class TwoFactorSetupRequest(BaseModel):
    """Request do konfiguracji 2FA"""
    method_type: str = Field(pattern="^(totp|email|sms)$")


class TwoFactorSetupResponse(BaseModel):
    """Response konfiguracji 2FA"""
    setup_token: str
    qr_code_url: Optional[str]
    backup_codes: List[str]


class TwoFactorVerifyRequest(BaseModel):
    """Request do weryfikacji 2FA"""
    setup_token: str
    code: str = Field(min_length=6, max_length=6)


class SecuritySettingsRequest(BaseModel):
    """Request do ustawień bezpieczeństwa"""
    session_timeout_minutes: int = Field(ge=5, le=1440)
    security_level: str = Field(pattern="^(standard|strict)$")
    login_alerts_enabled: bool
    suspicious_activity_alerts: bool


class PasswordChangeRequest(BaseModel):
    """Request do zmiany hasła"""
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str

    @validator("new_password")
    def validate_password_strength(cls, v):
        """Walidacja siły hasła"""
        if not any(c.isupper() for c in v):
            raise ValueError("Hasło musi zawierać co najmniej jedną dużą literę")
        if not any(c.isdigit() for c in v):
            raise ValueError("Hasło musi zawierać co najmniej jedną cyfrę")
        return v

    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("Hasła się nie zgadzają")
        return v


# ============ PREFERENCJE ============
class UserPreferencesRequest(BaseModel):
    """Request do preferencji użytkownika"""
    theme: str = Field(pattern="^(light|dark|system)$")
    language: str = Field(pattern="^(pl|en|de)$")
    timezone: str
    date_format: str = Field(pattern="^(DD/MM/YYYY|MM/DD/YYYY|YYYY-MM-DD)$")
    default_model: Optional[str]
    auto_save_drafts: bool
    show_tips: bool
    analytics_enabled: bool


class UserPreferencesResponse(BaseModel):
    """Response preferencji użytkownika"""
    user_id: str
    theme: str
    language: str
    timezone: str
    date_format: str
    default_model: Optional[str]
    auto_save_drafts: bool
    show_tips: bool
    analytics_enabled: bool
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationPreferencesRequest(BaseModel):
    """Request do preferencji powiadomień"""
    email_marketing: bool
    email_updates: bool
    email_security: bool
    email_billing: bool
    in_app_notifications: bool
    push_notifications: bool
    notification_frequency: str = Field(
        pattern="^(immediate|daily|weekly|monthly|never)$"
    )


class NotificationPreferencesResponse(BaseModel):
    """Response preferencji powiadomień"""
    user_id: str
    email_marketing: bool
    email_updates: bool
    email_security: bool
    email_billing: bool
    in_app_notifications: bool
    push_notifications: bool
    notification_frequency: str
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ GDPR ============
class DataExportRequest(BaseModel):
    """Request do eksportu danych"""
    format: str = Field(default="json", pattern="^(json|csv|pdf)$")


class DataExportResponse(BaseModel):
    """Response eksportu danych"""
    request_id: str
    status: str
    download_url: Optional[str]
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class AccountDeletionRequest(BaseModel):
    """Request do usunięcia konta"""
    password: str
    reason: Optional[str] = Field(None, max_length=500)
    confirm_deletion: bool = Field(default=False)


class AccountDeletionResponse(BaseModel):
    """Response usunięcia konta"""
    request_id: str
    status: str
    scheduled_deletion_date: datetime
    message: str
