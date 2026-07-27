import logging
import os
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(override=True)

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

import database
from services.config_validator import validate_on_startup
from schemas.response_models import HealthCheckResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

# --- APP INITIALIZATION ---
app = FastAPI(title="LexMind LegalTech AI — V2 Orchestrator")

_default_cors = [
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_extra_cors = [
    o.strip()
    for o in (os.getenv("CORS_ORIGINS") or "").split(",")
    if o.strip()
]
_cors_origins = _default_cors + [o for o in _extra_cors if o not in _default_cors]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SECURITY MIDDLEWARE (Localhost Binding Only Guard) ---
from fastapi.responses import JSONResponse


@app.middleware("http")
async def host_validation_middleware(request: Request, call_next):
    host = request.headers.get("host", "")
    client_ip = request.client.host if request.client else ""

    # Dopuszczamy również prywatne podsieci (LAN / WSL)
    def is_local(ip_str: str) -> bool:
        if not ip_str:
            return False
        if ip_str in ["localhost", "127.0.0.1", "::1"]:
            return True
        if (
            ip_str.startswith("192.168.")
            or ip_str.startswith("10.")
            or ip_str.startswith("172.")
        ):
            return True
        return False

    host_name = host.split(":")[0] if host else ""

    if not is_local(host_name) and not is_local(client_ip):
        return JSONResponse(
            status_code=403,
            content={
                "detail": "Dostęp zablokowany: Dozwolony wyłącznie ruch lokalny (Localhost Only Guard)"
            },
        )

    return await call_next(request)


# Routes (V2)
from config import settings
from routes.admin import router as admin_router
from routes.admin_extended import router as admin_extended_router
from routes.analytics import router as analytics_router
from routes.chat_v2 import router as chat_router
from routes.core import router as core_router
from routes.database import router as database_router
from routes.documents import router as documents_router
from routes.health import router as health_router
from routes.judgments import router as judgments_router
from routes.models import router as models_router
from routes.profile import router as profile_router

app.include_router(core_router, tags=["core"])
app.include_router(chat_router, tags=["chat"])
app.include_router(judgments_router, prefix="/judgments", tags=["judgments"])
app.include_router(models_router, prefix="/models", tags=["models"])
app.include_router(database_router, tags=["database"])
app.include_router(health_router, prefix="/health", tags=["health"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])
app.include_router(admin_extended_router, tags=["admin-extended"])
app.include_router(documents_router, prefix="/documents", tags=["documents"])
app.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
app.include_router(profile_router, tags=["profile"])

if settings.trial_enabled:
    from routes.trial_room import router as trial_room_router

    app.include_router(trial_room_router, tags=["trial-room"])


@app.on_event("startup")
async def startup_event():
    """Inicjalizacja nowej architektury."""
    print("\n" + "=" * 50)
    print("LEXMIND V3 ENGINE INITIALIZED (OpenRouter)")
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    try:
        # 0. Walidacja konfiguracji (Environment variables)
        print("\n[STARTUP] Walidacja konfiguracji...")
        validate_on_startup(profile="core", exit_on_error=True)
        print("[STARTUP] ✓ Konfiguracja poprawna.")

        # 1. Inicjalizacja bazy danych (SQLite)
        database.init_db()
        print("[STARTUP] ✓ Baza danych SQLite zainicjalizowana.")

        # Inicjalizacja innych serwisów V2 w przyszłości...

    except Exception as e:
        print(f"[ERROR] [STARTUP ERROR] {e}")


@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    return {"status": "ok", "engine": "v2-multi-stage", "timestamp": time.time()}


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)


if __name__ == "__main__":
    import uvicorn

    # Canonical dev port — matches uruchom.bat (8003)
    uvicorn.run(app, host="127.0.0.1", port=8003)
