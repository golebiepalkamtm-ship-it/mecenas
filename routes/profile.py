"""
Endpointy API dla profilu użytkownika, subskrypcji i bezpieczeństwa
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional, Dict, Any, List
from datetime import datetime
from functools import lru_cache

from schemas.profile_schemas import (
    UserProfileRequest,
    UserProfileResponse,
    UserStatisticsResponse,
    UserSubscriptionResponse,
    PaymentResponse,
    SecuritySessionResponse,
    TwoFactorSetupResponse,
    PasswordChangeRequest,
    UserPreferencesRequest,
    UserPreferencesResponse,
    NotificationPreferencesRequest,
    NotificationPreferencesResponse,
    DataExportResponse,
    AccountDeletionResponse,
)

router = APIRouter(prefix="/api/profile", tags=["profile"])


# ============ SECURITY ============
def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Dependency do pobrania ID obecnego użytkownika"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Brak autoryzacji")
    # TODO: Weryfikacja JWT token z Supabase
    # Tymczasowo: mock
    return "test-user-id"


# ============ PROFIL ============
@router.get("/", response_model=UserProfileResponse)
async def get_user_profile(user_id: str = Depends(get_current_user_id)):
    """Pobierz profil bieżącego użytkownika"""
    try:
        # TODO: Pobrać z bazy Supabase
        return {
            "id": user_id,
            "email": f"user+{user_id[:5]}@palkamtm.pl",
            "full_name": "Jan Kowalski",
            "phone": None,
            "avatar_url": None,
            "company": None,
            "bio": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/", response_model=UserProfileResponse)
async def update_user_profile(
    req: UserProfileRequest, user_id: str = Depends(get_current_user_id)
):
    """Aktualizuj profil użytkownika"""
    try:
        # TODO: Aktualizuj w bazie Supabase
        return {
            "id": user_id,
            "email": f"user+{user_id[:5]}@palkamtm.pl",
            "full_name": req.full_name or "Jan Kowalski",
            "phone": req.phone,
            "avatar_url": req.avatar_url,
            "company": req.company,
            "bio": req.bio,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ STATYSTYKI ============
@router.get("/statistics", response_model=UserStatisticsResponse)
async def get_user_statistics(user_id: str = Depends(get_current_user_id)):
    """Pobierz statystyki użytkownika"""
    try:
        # TODO: Pobrać z bazy
        return {
            "user_id": user_id,
            "total_chats": 42,
            "total_documents": 15,
            "total_trials": 8,
            "total_tokens_used": 1250000,
            "total_tokens_available": 10000000,
            "current_month_tokens": 150000,
            "current_month_chats": 12,
            "average_tokens_per_chat": 29761,
            "most_used_model": "deepseek-v4-flash",
            "last_chat_date": datetime.now(),
            "updated_at": datetime.now(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ SUBSKRYPCJA ============
@router.get("/subscription", response_model=Optional[UserSubscriptionResponse])
async def get_user_subscription(user_id: str = Depends(get_current_user_id)):
    """Pobierz subskrypcję użytkownika"""
    try:
        # TODO: Pobrać z bazy
        return {
            "id": f"sub_{user_id}",
            "user_id": user_id,
            "tier": "professional",
            "status": "active",
            "started_at": datetime.now(),
            "expires_at": datetime.now(),
            "auto_renew": True,
            "plan": None,
            "renewal_date": datetime.now(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payments", response_model=List[PaymentResponse])
async def get_user_payments(user_id: str = Depends(get_current_user_id)):
    """Pobierz historię płatności użytkownika"""
    try:
        # TODO: Pobrać z bazy
        return [
            {
                "id": f"pay_1_{user_id}",
                "amount": 29.99,
                "currency": "EUR",
                "status": "completed",
                "description": "Professional Plan - Monthly",
                "invoice_id": None,
                "created_at": datetime.now(),
            }
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ BEZPIECZEŃSTWO ============
@router.get("/security/sessions", response_model=List[SecuritySessionResponse])
async def get_security_sessions(user_id: str = Depends(get_current_user_id)):
    """Pobierz aktywne sesje"""
    try:
        # TODO: Pobrać z bazy
        return [
            {
                "id": "session_1",
                "device_name": "MacBook Pro",
                "device_type": "desktop",
                "ip_address": "192.168.1.1",
                "last_active": datetime.now(),
                "created_at": datetime.now(),
                "is_current": True,
            },
            {
                "id": "session_2",
                "device_name": "iPhone 15",
                "device_type": "mobile",
                "ip_address": "192.168.1.2",
                "last_active": datetime.now(),
                "created_at": datetime.now(),
                "is_current": False,
            },
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/security/sessions/{session_id}/revoke")
async def revoke_session(
    session_id: str, user_id: str = Depends(get_current_user_id)
):
    """Wyloguj z konkretnej sesji"""
    try:
        # TODO: Wyloguj sesję
        return {"success": True, "message": f"Sesja {session_id} wycofana"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/security/sessions/revoke-all")
async def revoke_all_sessions_except_current(user_id: str = Depends(get_current_user_id)):
    """Wyloguj wszystkie inne sesje"""
    try:
        # TODO: Wyloguj wszystkie sesje oprócz bieżącej
        return {
            "success": True,
            "message": "Wszystkie inne sesje wycofane",
            "sessions_revoked": 3,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/security/2fa/setup", response_model=TwoFactorSetupResponse)
async def setup_two_factor(user_id: str = Depends(get_current_user_id)):
    """Początkowa konfiguracja 2FA"""
    try:
        # TODO: Wygeneruj setup token i backup codes
        return {
            "setup_token": "setup_token_xyz",
            "qr_code_url": "https://example.com/qr_code.png",
            "backup_codes": ["CODE1", "CODE2", "CODE3", "CODE4", "CODE5"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/security/2fa/verify")
async def verify_two_factor(
    setup_token: str, code: str, user_id: str = Depends(get_current_user_id)
):
    """Weryfikacja 2FA"""
    try:
        # TODO: Weryfikuj kod i zaaktywuj 2FA
        return {"success": True, "message": "2FA aktywny"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/security/password/change")
async def change_password(
    req: PasswordChangeRequest, user_id: str = Depends(get_current_user_id)
):
    """Zmień hasło"""
    try:
        # TODO: Weryfikuj stare hasło i ustaw nowe
        if req.new_password != req.confirm_password:
            raise HTTPException(status_code=400, detail="Hasła się nie zgadzają")

        return {"success": True, "message": "Hasło zmienione"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ PREFERENCJE ============
@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_user_preferences(user_id: str = Depends(get_current_user_id)):
    """Pobierz preferencje użytkownika"""
    try:
        # TODO: Pobrać z bazy
        return {
            "user_id": user_id,
            "theme": "dark",
            "language": "pl",
            "timezone": "Europe/Warsaw",
            "date_format": "DD/MM/YYYY",
            "default_model": "deepseek-v4-flash",
            "auto_save_drafts": True,
            "show_tips": True,
            "analytics_enabled": True,
            "updated_at": datetime.now(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/preferences", response_model=UserPreferencesResponse)
async def update_user_preferences(
    req: UserPreferencesRequest, user_id: str = Depends(get_current_user_id)
):
    """Aktualizuj preferencje użytkownika"""
    try:
        # TODO: Aktualizuj w bazie
        return {
            "user_id": user_id,
            "theme": req.theme,
            "language": req.language,
            "timezone": req.timezone,
            "date_format": req.date_format,
            "default_model": req.default_model,
            "auto_save_drafts": req.auto_save_drafts,
            "show_tips": req.show_tips,
            "analytics_enabled": req.analytics_enabled,
            "updated_at": datetime.now(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preferences/notifications", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(user_id: str = Depends(get_current_user_id)):
    """Pobierz preferencje powiadomień"""
    try:
        # TODO: Pobrać z bazy
        return {
            "user_id": user_id,
            "email_marketing": False,
            "email_updates": True,
            "email_security": True,
            "email_billing": True,
            "in_app_notifications": True,
            "push_notifications": False,
            "notification_frequency": "daily",
            "updated_at": datetime.now(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/preferences/notifications", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    req: NotificationPreferencesRequest, user_id: str = Depends(get_current_user_id)
):
    """Aktualizuj preferencje powiadomień"""
    try:
        # TODO: Aktualizuj w bazie
        return {
            "user_id": user_id,
            "email_marketing": req.email_marketing,
            "email_updates": req.email_updates,
            "email_security": req.email_security,
            "email_billing": req.email_billing,
            "in_app_notifications": req.in_app_notifications,
            "push_notifications": req.push_notifications,
            "notification_frequency": req.notification_frequency,
            "updated_at": datetime.now(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ GDPR ============
@router.post("/gdpr/export", response_model=DataExportResponse)
async def request_data_export(user_id: str = Depends(get_current_user_id)):
    """Wyślij żądanie eksportu danych (GDPR)"""
    try:
        # TODO: Utwórz zadanie eksportu, wyślij email potwierdzający
        return {
            "request_id": f"export_{user_id}",
            "status": "processing",
            "download_url": None,
            "expires_at": datetime.now(),
            "created_at": datetime.now(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gdpr/delete", response_model=AccountDeletionResponse)
async def request_account_deletion(password: str, user_id: str = Depends(get_current_user_id)):
    """Wyślij żądanie usunięcia konta (GDPR)"""
    try:
        # TODO: Weryfikuj hasło, zaplanuj usunięcie, wyślij potwierdzenie
        return {
            "request_id": f"delete_{user_id}",
            "status": "pending",
            "scheduled_deletion_date": datetime.now(),
            "message": "Żądanie usunięcia zostało zaplanowane na 30 dni od dzisiaj.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
