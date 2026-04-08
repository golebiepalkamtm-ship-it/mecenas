from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import List, Tuple

from cryptography.fernet import Fernet
from dotenv import load_dotenv


load_dotenv(override=True)


def _split_csv(value: str | None, fallback: List[str]) -> List[str]:
    if not value:
        return fallback
    parts = [entry.strip() for entry in value.split(",")]
    cleaned = [entry for entry in parts if entry]
    return cleaned or fallback


def _ensure_fernet_key(raw_key: str | None, path_value: str | None) -> Tuple[bytes, str, Path]:
    """
    Returns a tuple of (key_bytes, key_b64_string, key_path).
    If raw_key is provided it must be a valid Fernet key.
    Otherwise we load or generate it at APP_ENCRYPTION_KEY_PATH.
    """
    target_path = Path(path_value or "cache/secrets/app.key")

    def _validate(key_bytes: bytes) -> None:
        try:
            Fernet(key_bytes)
        except Exception as exc:  # pragma: no cover - validation guard
            raise RuntimeError("APP_ENCRYPTION_KEY is not a valid Fernet key") from exc

    if raw_key:
        key_bytes = raw_key.strip().encode()
        _validate(key_bytes)
        return key_bytes, raw_key.strip(), target_path

    if target_path.exists():
        key_bytes = target_path.read_bytes().strip()
        _validate(key_bytes)
        return key_bytes, key_bytes.decode(), target_path

    target_path.parent.mkdir(parents=True, exist_ok=True)
    key_bytes = Fernet.generate_key()
    target_path.write_bytes(key_bytes)
    return key_bytes, key_bytes.decode(), target_path


@dataclass(frozen=True)
class AppSettings:
    environment: str
    frontend_allowed_origins: List[str]
    global_rate_limit: str
    chat_rate_limit: str
    doc_rate_limit: str
    openrouter_api_key: str
    google_api_key: str
    mixedbread_api_key: str
    supabase_url: str
    supabase_anon_key: str
    supabase_import_url: str
    encryption_key: bytes
    encryption_key_b64: str
    encryption_key_path: Path


@lru_cache(maxsize=1)
def get_settings() -> AppSettings:
    env = os.getenv("APP_ENV", "development").lower()

    frontend_origins = _split_csv(
        os.getenv("FRONTEND_ALLOWED_ORIGINS", ""),
        [
            "http://localhost:3000", "http://127.0.0.1:3000",
            "http://localhost:5173", "http://127.0.0.1:5173",
            "http://localhost:8000", "http://127.0.0.1:8000"
        ],
    )

    global_rate_limit = os.getenv("GLOBAL_RATE_LIMIT", "120/minute")
    chat_rate_limit = os.getenv("CHAT_RATE_LIMIT", "60/minute")
    doc_rate_limit = os.getenv("DOC_RATE_LIMIT", "20/minute")

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "").strip()
    if not supabase_url:
        raise RuntimeError("SUPABASE_URL must be provided via environment variables")
    if not supabase_anon_key:
        raise RuntimeError("SUPABASE_ANON_KEY must be provided via environment variables")

    supabase_import_url = f"{supabase_url.rstrip('/')}/functions/v1/import-knowledge"

    openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not openrouter_key:
        raise RuntimeError("OPENROUTER_API_KEY must be set before starting the backend")

    google_key = os.getenv("GOOGLE_API_KEY", "").strip()

    mixedbread_key = os.getenv("MIXEDBREAD_API_KEY", "").strip()

    encryption_key_bytes, encryption_key_b64, encryption_path = _ensure_fernet_key(
        os.getenv("APP_ENCRYPTION_KEY"),
        os.getenv("APP_ENCRYPTION_KEY_PATH"),
    )

    return AppSettings(
        environment=env,
        frontend_allowed_origins=frontend_origins,
        global_rate_limit=global_rate_limit,
        chat_rate_limit=chat_rate_limit,
        doc_rate_limit=doc_rate_limit,
        openrouter_api_key=openrouter_key,
        google_api_key=google_key,
        mixedbread_api_key=mixedbread_key,
        supabase_url=supabase_url,
        supabase_anon_key=supabase_anon_key,
        supabase_import_url=supabase_import_url,
        encryption_key=encryption_key_bytes,
        encryption_key_b64=encryption_key_b64,
        encryption_key_path=encryption_path,
    )
