## 🚀 LexMind: Kompleksowa Implementacja Profilu & Admin Panelu

### ✅ Co Zostało Zrobione (Faza 1-3)

#### **FAZA 1: Typy & Schematy**

**Frontend Types** (`frontend/src/types/`):
- ✅ `profile.ts` - 170+ linii typów dla:
  - Profil użytkownika
  - Subskrypcja & Płatności (SubscriptionPlan, Invoice, Payment)
  - Bezpieczeństwo (Sessions, 2FA, SecuritySettings)
  - Preferencje (UserPreferences, NotificationPreferences)
  - Statystyki & GDPR

- ✅ `admin.ts` - 200+ linii typów dla:
  - Zarządzanie użytkownikami
  - Płatności & Rozliczenia (Revenue, Metrics, Transactions)
  - Monitoring & Performance
  - Analytics & Reports
  - Messaging & Notifications
  - Konfiguracja systemu
  - Audit logs

**Backend Schemas** (`schemas/`):
- ✅ `profile_schemas.py` - 400+ linii schematów Pydantic:
  - UserProfileRequest/Response
  - UserSubscriptionResponse, PaymentResponse, InvoiceResponse
  - SecuritySessionResponse, TwoFactorSetupResponse
  - UserPreferencesRequest/Response
  - NotificationPreferencesRequest/Response
  - DataExportResponse, AccountDeletionResponse

- ✅ `admin_schemas.py` - 500+ linii schematów:
  - AdminUserDetailResponse, AdminUpdateUserRequest
  - PaymentTransactionResponse, SubscriptionMetricsResponse
  - RevenueReportResponse, RefundRequest
  - SystemMetricResponse, ServiceHealthResponse
  - AdminMessageRequest/Response, UserNotificationResponse
  - DashboardMetricsResponse, UsageReportResponse
  - AuditLogResponse, SystemConfigurationResponse

---

#### **FAZA 2: Komponenty React**

**Komponenty Profilu** (`frontend/src/components/Settings/components/`):

1. **SubscriptionTab.tsx** (280 linii)
   - 💳 Wyświetlanie bieżącego planu
   - 📋 Lista dostępnych planów
   - 📊 Historia płatności
   - 🔄 Upgrade/downgrade planu

2. **SecurityTab.tsx** (350 linii)
   - 🔒 Zmiana hasła z validacją siły
   - 📱 Konfiguracja 2FA (TOTP, email, SMS)
   - 👤 Zarządzanie aktywnymi sesjami
   - 🚪 Wylogowywanie z innych urządzeń

3. **PreferencesTab.tsx** (280 linii)
   - 📊 Statystyki użytkownika (czaty, dokumenty, tokeny)
   - 🎨 Preferencje systemu (motyw, język, strefa czasowa)
   - 🔔 Preferencje powiadomień
   - ⚙️ Ustawienia auto-save, analityki

4. **DataGDPRTab.tsx** (250 linii)
   - 📥 Eksport danych (JSON, CSV, PDF)
   - 🗑️ Żądanie usunięcia konta
   - ⏰ Zaplanowane usunięcie z 30-dniowym buforem
   - 🔐 GDPR compliance

**Komponenty Admin** (`frontend/src/components/Admin/components/`):

1. **PaymentsPanel.tsx** (320 linii)
   - 💰 Metryki MRR/ARR/Churn
   - 📋 Lista transakcji z filtrowaniem
   - 📊 Raport przychodów
   - 💳 Obsługa zwrotów pieniędzy

2. **MessagingPanel.tsx** (350 linii)
   - 📧 Komponowanie wiadomości
   - 🎯 Wysyłanie do użytkownika/broadcast
   - ⏰ Planowanie wysyłki
   - 📬 Historia wiadomości

3. **AnalyticsPanel.tsx** (300 linii)
   - 📈 Metryki rzeczywiste (użytkownicy, czaty, dokumenty)
   - 📊 Generator raportów (PDF, CSV, JSON)
   - 🔗 Funnel konwersji
   - 🏆 Top modele

---

#### **FAZA 3: Backend Routes**

**Nowe Endpointy** (`routes/profile.py` - 350 linii):
```python
# Profil
GET    /api/profile              - Pobierz profil
PUT    /api/profile              - Aktualizuj profil

# Statystyki
GET    /api/profile/statistics   - Statystyki użytkownika

# Subskrypcja
GET    /api/profile/subscription - Aktywna subskrypcja
GET    /api/profile/payments     - Historia płatności

# Bezpieczeństwo
GET    /api/profile/security/sessions                    - Aktywne sesje
POST   /api/profile/security/sessions/{id}/revoke        - Wyloguj sesję
POST   /api/profile/security/sessions/revoke-all         - Wyloguj wszystkie inne
POST   /api/profile/security/2fa/setup                   - Konfiguracja 2FA
POST   /api/profile/security/2fa/verify                  - Weryfikacja 2FA
POST   /api/profile/security/password/change             - Zmiana hasła

# Preferencje
GET    /api/profile/preferences                          - Preferencje systemu
PUT    /api/profile/preferences                          - Aktualizuj preferencje
GET    /api/profile/preferences/notifications            - Preferencje powiadomień
PUT    /api/profile/preferences/notifications            - Aktualizuj powiadomienia

# GDPR
POST   /api/profile/gdpr/export                          - Eksport danych
POST   /api/profile/gdpr/delete                          - Żądanie usunięcia
```

**Nowe Admin Endpointy** (`routes/admin_extended.py` - 450 linii):
```python
# Płatności
GET    /api/admin/payments/transactions                  - Lista transakcji
POST   /api/admin/payments/refund                        - Zwrot pieniędzy
GET    /api/admin/payments/metrics                       - Metryki subskrypcji
GET    /api/admin/payments/revenue-report                - Raport przychodów

# Komunikacja
POST   /api/admin/messaging/send                         - Wyślij wiadomość
GET    /api/admin/messaging/messages                     - Historia wiadomości
DELETE /api/admin/messaging/messages/{id}                - Usuń wiadomość
GET    /api/admin/messaging/notifications                - Powiadomienia użytkowników

# Analityka
GET    /api/admin/analytics/performance                  - Metryki wydajności
GET    /api/admin/analytics/dashboard                    - Pulpit główny
POST   /api/admin/analytics/report                       - Generuj raport

# Konfiguracja
GET    /api/admin/configuration                          - Config systemu
PUT    /api/admin/configuration/{key}                    - Aktualizuj config
GET    /api/admin/maintenance-mode                       - Status maintenance
POST   /api/admin/maintenance-mode                       - Toggle maintenance

# Audit
GET    /api/admin/audit-logs                             - Logi audytu
```

---

### 📋 Co Jeszcze Trzeba Zrobić (TODO)

#### **Backend - Implementacja Logiki** (60% więcej pracy)

1. **Baza Danych** - Migracje SQL
   - [ ] Tabela `payments` (transactions)
   - [ ] Tabela `invoices`
   - [ ] Tabela `user_sessions` (security sessions)
   - [ ] Tabela `security_settings`
   - [ ] Tabela `user_preferences`
   - [ ] Tabela `notification_preferences`
   - [ ] Tabela `admin_messages`
   - [ ] Tabela `user_notifications`
   - [ ] Tabela `audit_logs`
   - [ ] Tabela `system_config`
   - [ ] Indeksy dla performance

2. **Routes - Faktyczna Logika**
   - [ ] Integracja z Supabase dla query/update
   - [ ] Integracja z Stripe dla płatności
   - [ ] JWT token verification
   - [ ] Email notifications (SendGrid/Resend)
   - [ ] 2FA generator (TOTP - pyotp)
   - [ ] Data export (JSON/CSV generation)
   - [ ] Account deletion scheduling
   - [ ] Analytics aggregation
   - [ ] Message queuing (Celery/Redis)
   - [ ] Audit logging

3. **Services** - Helper utilities
   - [ ] `services/payment_service.py` - Stripe integration
   - [ ] `services/security_service.py` - 2FA, password hashing
   - [ ] `services/notification_service.py` - Email/SMS/Push
   - [ ] `services/audit_service.py` - Logging changes
   - [ ] `services/export_service.py` - Data export

#### **Frontend - Integracja z API** (40% więcej pracy)

1. **Hooks - API Calls**
   - [ ] `useProfile()` - Fetch/update profilu
   - [ ] `useSubscription()` - Subscription management
   - [ ] `usePayments()` - Payment history
   - [ ] `useSecurity()` - Security management
   - [ ] `usePreferences()` - Preferences management
   - [ ] `useAdminPayments()` - Admin payment operations
   - [ ] `useAdminMessaging()` - Admin messaging
   - [ ] `useAdminAnalytics()` - Admin analytics

2. **Settings View - Integracja**
   - [ ] Podpiąć komponenty tab pod rzeczywiste dane z API
   - [ ] Error handling i loading states
   - [ ] Toast notifications dla sukcesu/błędu
   - [ ] Form validation

3. **Admin View - Integracja**
   - [ ] Podpiąć komponenty paneli pod API
   - [ ] Real-time metrics updates
   - [ ] Data pagination
   - [ ] Search/filter functionality
   - [ ] Export functionality

---

### 📊 Opis Komponentów

#### **Settings - 5 Nowych Zakładek**

| Zakładka | Funkcja | Status |
|----------|---------|--------|
| **Profil** | Dane osobowe | ❌ Potrzeba integracji |
| **Subskrypcja** | Plany, płatności | ❌ Potrzeba integracji |
| **Bezpieczeństwo** | Hasło, 2FA, sesje | ❌ Potrzeba integracji |
| **Preferencje** | Ustawienia, powiadomienia | ❌ Potrzeba integracji |
| **Dane & GDPR** | Eksport, usunięcie | ❌ Potrzeba integracji |
| **Modele AI** | Orkiestracja (istniejące) | ✅ Done |

#### **Admin - 3 Nowe Panele**

| Panel | Funkcja | Status |
|-------|---------|--------|
| **System** | Status (istniejący) | ✅ Done |
| **Użytkownicy** | Management (istniejący) | ✅ Done |
| **Bezpieczeństwo** | API Keys (istniejący) | ✅ Done |
| **Modele** | AI Models (istniejący) | ✅ Done |
| **Płatności** | Rozliczenia, metryki | ❌ Potrzeba integracji |
| **Komunikacja** | Messaging | ❌ Potrzeba integracji |
| **Analityka** | Raporty, metryki | ❌ Potrzeba integracji |
| **Diagnostyka** | Logs (istniejący) | ✅ Done |

---

### 🔧 Instrukcje Integracji

#### **Krok 1: Migracje Bazy Danych**

```bash
# Utwórz plik migracji
touch supabase/migrations/20260718_profile_payments.sql

# Dodaj SQL (patrz: MIGRATION_TEMPLATE.md)
# Zawiera: payments, invoices, sessions, preferences, etc.

# Uruchom migrację
supabase db push
```

#### **Krok 2: Implementuj Services**

```python
# services/payment_service.py
# - Stripe integration
# - Invoice generation
# - Refund handling

# services/security_service.py
# - 2FA generation (pyotp)
# - Password hashing (bcrypt)
# - Session management

# services/notification_service.py
# - Email (SendGrid/Resend)
# - Push notifications
# - SMS (twilio)
```

#### **Krok 3: Uzupełnij Routes**

```python
# routes/profile.py - Zamień TODO na implementacje
# routes/admin_extended.py - Zamień TODO na implementacje

# Klucze integracji:
# - SUPABASE_URL, SUPABASE_KEY - Database
# - STRIPE_API_KEY - Payments
# - SENDGRID_API_KEY - Email
# - OPENAI_API_KEY (optional) - Chat features
```

#### **Krok 4: Dodaj Hooks w Frontendie**

```typescript
// frontend/src/hooks/useProfile.ts
export function useProfile() {
  const { data, isLoading, error, mutate } = useSWR('/api/profile', fetcher);
  const updateProfile = async (updates) => {
    const res = await fetch('/api/profile', { method: 'PUT', body: JSON.stringify(updates) });
    mutate();
  };
  return { profile: data, isLoading, error, updateProfile };
}

// Dodaj dla wszystkich sekcji profilu i admina
```

#### **Krok 5: Test & Deploy**

```bash
# Frontend
npm run dev
# Test: http://localhost:5173 > Settings > każda zakładka

# Backend
python api.py
# Test: http://localhost:8000/docs > każdy endpoint

# Deploy
npm run build
python -m gunicorn api:app --workers 4
```

---

### 📦 Struktura Plików

```
✅ DONE:
├── frontend/src/types/
│   ├── profile.ts (170 linii)
│   └── admin.ts (200 linii)
├── frontend/src/components/Settings/
│   ├── components/
│   │   ├── SubscriptionTab.tsx
│   │   ├── SecurityTab.tsx
│   │   ├── PreferencesTab.tsx
│   │   └── DataGDPRTab.tsx
│   └── settingsTabs.ts (updated)
├── frontend/src/components/Admin/
│   ├── components/
│   │   ├── PaymentsPanel.tsx
│   │   ├── MessagingPanel.tsx
│   │   └── AnalyticsPanel.tsx
│   └── index.tsx (updated)
├── schemas/
│   ├── profile_schemas.py (400 linii)
│   └── admin_schemas.py (500 linii)
├── routes/
│   ├── profile.py (350 linii)
│   └── admin_extended.py (450 linii)
└── api.py (updated)

❌ TODO:
├── supabase/migrations/
│   └── 20260718_profile_payments.sql
├── services/
│   ├── payment_service.py
│   ├── security_service.py
│   ├── notification_service.py
│   └── audit_service.py
└── frontend/src/hooks/
    ├── useProfile.ts
    ├── useSubscription.ts
    ├── useSecurity.ts
    ├── usePreferences.ts
    ├── useAdminPayments.ts
    ├── useAdminMessaging.ts
    └── useAdminAnalytics.ts
```

---

### 🎯 Estymacja Pracy

| Faza | Zarobione | Pozostało | Czas |
|------|-----------|-----------|------|
| Typy & Schematy | ✅ 100% | - | ✅ Done |
| Komponenty React | ✅ 100% | - | ✅ Done |
| Backend Routes | ✅ 100% | Logika | ⏳ 6-8h |
| Baza Danych | - | ✅ 100% | ⏳ 4-6h |
| Hooks/Integracja | - | ✅ 100% | ⏳ 8-10h |
| Testy | - | ✅ 100% | ⏳ 4-6h |
| **RAZEM** | **~2300 linii** | **~1200 linii** | **⏳ 22-36h** |

---

### 💡 Następne Kroki

1. **Priorytet:** Migracje SQL + Payment Service (płatności = kluczowe)
2. **Potem:** Security Service (2FA, hasła)
3. **Następnie:** Notification Service (email)
4. **Na koniec:** Frontend hooks + integration

**Szacunek:** ~1 tydzień intensywnej pracy na 1 dewelopera

---

**Dokument przygotowany:** 2026-07-18
**Wersja:** 1.0
**Status:** Ready for implementation ✅
