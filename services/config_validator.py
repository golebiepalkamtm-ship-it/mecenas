"""
Walidator konfiguracji backendu LexMind.

Moduł odpowiedzialny za:
- Weryfikację wymaganych zmiennych środowiskowych
- Walidację wartości konfiguracyjnych
- Generowanie czytelnych komunikatów błędów
- Opisanie zmiennych dla onboardingu

Klasyfikacja zmiennych:
  LEXMIND_* = konfiguracja aplikacji (główne preferencje, Feature Flags, limity)
  SUPABASE_* = integracja z bazą danych (URL, klucze auth)
  OPENROUTER_* = integracja z API modeli (klucze, endpointy)
  Inne (GOOGLE_API_KEY, COHERE_API_KEY) = integracje trzecich stron

Profile instalacji:
  - core: minimalny setup (local SQLite, bez cloud)
  - ocr: core + OCR capabilities (paddleocr, torch)
  - dev: ocr + development tools (pytest, debuggers)
"""

import os
import sys
import json
from typing import Dict, List, Optional, Tuple


# Domyślne wartości i opisy zmiennych
ENVIRONMENT_SCHEMA = {
    # === Konfiguracja aplikacji (LEXMIND_*) ===
    "LEXMIND_DEFAULT_MODELS": {
        "profile": "core",
        "type": "json_list",
        "required": False,
        "default": '["google/gemini-2.5-flash", "openai/gpt-5-mini"]',
        "description": "Lista domyślnych modeli LLM (JSON array)",
    },
    "LEXMIND_FEATURE_INVESTIGATION_V2": {
        "profile": "core",
        "type": "bool",
        "required": False,
        "default": "false",
        "description": "Włącz Advanced Legal Investigation (rekurencja, hipotezy)",
    },
    "LEXMIND_FEATURE_INVESTIGATION_V2_AUTO": {
        "profile": "core",
        "type": "bool",
        "required": False,
        "default": "true",
        "description": "Auto-trigger investigation dla długich spraw",
    },
    "LEXMIND_RERANK_PROVIDER": {
        "profile": "core",
        "type": "str",
        "required": False,
        "default": "heuristic",
        "allowed_values": ["heuristic", "cohere"],
        "description": "Silnik reranking: 'heuristic' lub 'cohere' (wymaga COHERE_API_KEY)",
    },
    "LEXMIND_FEATURE_CONTEXT_PACKER": {
        "profile": "core",
        "type": "bool",
        "required": False,
        "default": "true",
        "description": "Włącz kompresję kontekstu dla długich dokumentów",
    },
    "LEXMIND_DOCUMENT_CONTEXT_CHARS": {
        "profile": "core",
        "type": "int",
        "required": False,
        "default": "200000",
        "description": "Maksymalna liczba znaków kontekstu dokumentu",
    },
    "LEXMIND_LLM_TIMEOUT_PRIMARY": {
        "profile": "core",
        "type": "float",
        "required": False,
        "default": "60.0",
        "description": "Timeout dla głównych LLM (sekundy)",
    },
    "LEXMIND_LLM_TIMEOUT_FALLBACK": {
        "profile": "core",
        "type": "float",
        "required": False,
        "default": "90.0",
        "description": "Timeout dla fallback LLM (sekundy)",
    },
    "LEXMIND_FEATURE_PIPELINE_TIMING": {
        "profile": "core",
        "type": "bool",
        "required": False,
        "default": "true",
        "description": "Włącz logowanie czasów etapów pipeline (observability)",
    },
    # === Integracja Supabase ===
    "SUPABASE_URL": {
        "profile": "core",
        "type": "url",
        "required": False,  # Opcjonalna — można bez cloud DB
        "description": "URL endpoint Supabase (https://xxx.supabase.co)",
    },
    "SUPABASE_ANON_KEY": {
        "profile": "core",
        "type": "str",
        "required": False,
        "description": "Klucz publiczny Supabase (anon key)",
    },
    "SUPABASE_SERVICE_ROLE_KEY": {
        "profile": "core",
        "type": "str",
        "required": False,
        "description": "Klucz serwisowy Supabase (service role key) — wymaga ostrożności!",
    },
    # === Integracja OpenRouter ===
    "OPENROUTER_API_KEY": {
        "profile": "core",
        "type": "str",
        "required": True,
        "description": "Klucz API OpenRouter (https://openrouter.ai)",
    },
    # === Integracje trzecich stron ===
    "GOOGLE_API_KEY": {
        "profile": "core",
        "type": "str",
        "required": False,
        "description": "Klucz Google API (dla Gemini models)",
    },
    "COHERE_API_KEY": {
        "profile": "core",
        "type": "str",
        "required": False,
        "description": "Klucz Cohere API (jeśli LEXMIND_RERANK_PROVIDER='cohere')",
    },
    # === Konfiguracja OCR (profile: ocr) ===
    "PADDLEOCR_ENABLED": {
        "profile": "ocr",
        "type": "bool",
        "required": False,
        "default": "true",
        "description": "Włącz PaddleOCR dla lokalnej ekstrakcji tekstu z PDF",
    },
    # === Konfiguracja dev ===
    "PYTEST_DEBUG": {
        "profile": "dev",
        "type": "bool",
        "required": False,
        "default": "false",
        "description": "Włącz debug dla pytest",
    },
}


class ConfigError(Exception):
    """Błąd konfiguracji aplikacji."""

    pass


class ConfigValidator:
    """Walidator zmiennych środowiskowych i konfiguracji."""

    def __init__(self, profile: str = "core"):
        """
        Args:
            profile: 'core', 'ocr', lub 'dev'
        """
        self.profile = profile
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def validate_all(self) -> Tuple[bool, List[str], List[str]]:
        """
        Waliduj wszystkie zmienne dla profilu.

        Returns:
            (is_valid, errors, warnings)
        """
        # 1. Waliduj zmienne wymagane
        for var_name, schema in ENVIRONMENT_SCHEMA.items():
            if schema.get("profile") not in ("core", self.profile):
                continue

            value = os.getenv(var_name)

            if schema.get("required") and not value:
                self.errors.append(
                    f"MISSING REQUIRED: {var_name}\n"
                    f"  Description: {schema.get('description')}\n"
                    f"  Profile: {schema.get('profile')}"
                )
                continue

            if value:
                # Waliduj typ
                validation_error = self._validate_value(var_name, value, schema)
                if validation_error:
                    self.errors.append(validation_error)

        # 2. Waliduj zależności
        self._validate_dependencies()

        # 3. Sprawdzaj warningi
        self._check_warnings()

        is_valid = len(self.errors) == 0
        return is_valid, self.errors, self.warnings

    def _validate_value(self, var_name: str, value: str, schema: Dict) -> Optional[str]:
        """Waliduj typ zmiennej."""
        var_type = schema.get("type", "str")

        try:
            if var_type == "bool":
                if value.lower() not in ("true", "false", "1", "0", "yes", "no"):
                    return f"INVALID TYPE: {var_name}={value}\n  Expected: bool (true/false/1/0/yes/no)"
            elif var_type == "int":
                int(value)
            elif var_type == "float":
                float(value)
            elif var_type == "url":
                if not (value.startswith("http://") or value.startswith("https://")):
                    return f"INVALID URL: {var_name}={value}\n  Expected: URL (http:// or https://)"
            elif var_type == "json_list":
                json.loads(value)
            # 'str' — brak walidacji typu

            # Waliduj dozwolone wartości
            if "allowed_values" in schema:
                if value not in schema["allowed_values"]:
                    return (
                        f"INVALID VALUE: {var_name}={value}\n"
                        f"  Allowed: {schema['allowed_values']}"
                    )

        except (ValueError, json.JSONDecodeError) as e:
            return f"INVALID TYPE: {var_name}={value}\n  Error: {str(e)}"

        return None

    def _validate_dependencies(self):
        """Waliduj zależności między zmiennymi."""
        rerank_provider = os.getenv("LEXMIND_RERANK_PROVIDER", "heuristic")
        if rerank_provider == "cohere" and not os.getenv("COHERE_API_KEY"):
            self.errors.append(
                "MISSING DEPENDENCY: COHERE_API_KEY\n"
                "  Reason: LEXMIND_RERANK_PROVIDER='cohere' requires COHERE_API_KEY"
            )

        if os.getenv("LEXMIND_FEATURE_INVESTIGATION_V2") == "true":
            if not os.getenv("OPENROUTER_API_KEY"):
                self.errors.append(
                    "MISSING DEPENDENCY: OPENROUTER_API_KEY\n"
                    "  Reason: LEXMIND_FEATURE_INVESTIGATION_V2=true requires LLM provider"
                )

    def _check_warnings(self):
        """Sprawdzaj ostrzeżenia (non-blocking)."""
        # Ostrzeż, jeśli nie ma cloud DB, ale są zmienne Supabase
        has_supabase = all(
            [
                os.getenv("SUPABASE_URL"),
                os.getenv("SUPABASE_ANON_KEY"),
            ]
        )

        if not has_supabase:
            self.warnings.append(
                "NO CLOUD DATABASE: Supabase not fully configured\n"
                "  → Running in local-only mode (SQLite)\n"
                "  → To enable cloud DB, set SUPABASE_URL and SUPABASE_ANON_KEY"
            )

        # Ostrzeż, jeśli SERVICE_ROLE_KEY ustawiony w .env
        if os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
            self.warnings.append(
                "SECURITY WARNING: SUPABASE_SERVICE_ROLE_KEY in .env\n"
                "  → Use carefully — never commit .env to version control!\n"
                "  → Prefer loading from secure secret manager"
            )

    def print_report(self, verbose: bool = False):
        """Wydrukuj raport walidacji."""
        print("\n" + "=" * 70)
        print(f"CONFIG VALIDATION REPORT (profile: {self.profile})")
        print("=" * 70)

        if not self.errors and not self.warnings:
            print("[OK] All configuration valid!")
            return

        if self.errors:
            print(f"\n[ERROR] ERRORS ({len(self.errors)}):\n")
            for i, error in enumerate(self.errors, 1):
                print(f"{i}. {error}\n")

        if self.warnings:
            print(f"\n[WARN] WARNINGS ({len(self.warnings)}):\n")
            for i, warning in enumerate(self.warnings, 1):
                print(f"{i}. {warning}\n")

        if verbose:
            self._print_schema()

        print("=" * 70)

    def _print_schema(self):
        """Wydrukuj dostępne zmienne dla profilu."""
        print(f"\n[SCHEMA] AVAILABLE VARIABLES FOR PROFILE '{self.profile}':\n")
        for var_name, schema in ENVIRONMENT_SCHEMA.items():
            if schema.get("profile") not in ("core", self.profile):
                continue
            required = "REQUIRED" if schema.get("required") else "optional"
            default = schema.get("default", "—")
            print(f"  {var_name:<40} [{required:<10}]")
            print(f"    {schema.get('description')}")
            if default != "—":
                print(f"    Default: {default}")
            print()

    @staticmethod
    def print_quick_reference():
        """Wydrukuj szybki referencyjny przewodnik zmiennych."""
        print("\n" + "=" * 70)
        print("ENVIRONMENT VARIABLES QUICK REFERENCE")
        print("=" * 70)

        profiles = {"core": [], "ocr": [], "dev": []}
        for var_name, schema in ENVIRONMENT_SCHEMA.items():
            profile = schema.get("profile")
            if profile in profiles:
                profiles[profile].append((var_name, schema))

        for profile_name, vars_list in profiles.items():
            if not vars_list:
                continue
            print(f"\n### {profile_name.upper()} Profile\n")
            for var_name, schema in vars_list:
                required = "[REQ]" if schema.get("required") else "[OPT]"
                print(f"  {required} {var_name}")
                print(f"      {schema.get('description')}")
                if schema.get("allowed_values"):
                    print(f"      Allowed: {schema.get('allowed_values')}")
                print()

        print("=" * 70)


def validate_on_startup(profile: str = "core", exit_on_error: bool = True) -> bool:
    """
    Waliduj konfigurację przy starcie aplikacji.

    Args:
        profile: Profil instalacji ('core', 'ocr', 'dev')
        exit_on_error: Czy exit() jeśli są błędy

    Returns:
        True jeśli konfiguracja OK, False jeśli ostrzeżenia/błędy
    """
    validator = ConfigValidator(profile=profile)
    is_valid, errors, warnings = validator.validate_all()

    validator.print_report(verbose=False)

    if not is_valid:
        if exit_on_error:
            sys.exit(1)
        return False

    return True
