"""
Create platform-specific copies of the Asesor AI project for distribution.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

IGNORE_PATTERNS = shutil.ignore_patterns(
    ".git",
    ".gitignore",
    ".venv*",
    ".mypy_cache",
    ".pytest_cache",
    "__pycache__",
    "dist",
    "node_modules",
    "*.pyc",
    "*.pyo",
    "*.pyd",
    "*.DS_Store",
)

TARGETS: dict[str, dict[str, str]] = {
    "windows": {
        "readme": """
            # Asesor AI — Windows Build

            ## Uruchomienie
            1. Zainstaluj zależności: `pip install -r requirements.txt`
            2. Uruchom `run_windows.bat`
            3. Aplikacja otworzy się w przeglądarce (Streamlit)
        """,
        "launcher": "run_windows.bat",
        "launcher_body": dedent(
            r"""
            @echo off
            call %~dp0\.venv\Scripts\activate 2>nul
            streamlit run app.py --server.port 8502 --server.headless true
            """
        ).strip()
        + "\n",
    },
    "macos": {
        "readme": """
            # Asesor AI — macOS Build

            ## Uruchomienie
            1. Zainstaluj środowisko: `python3 -m venv .venv && source .venv/bin/activate`
            2. Zainstaluj zależności: `pip install -r requirements.txt`
            3. Uruchom `sh run_macos.sh`
        """,
        "launcher": "run_macos.sh",
        "launcher_body": dedent(
            """
            #!/bin/bash
            source "$(dirname "$0")/.venv/bin/activate" 2>/dev/null || true
            streamlit run app.py --server.port 8502 --server.headless true
            """
        ).strip()
        + "\n",
    },
    "android": {
        "readme": """
            # Asesor AI — Android Package

            Kod źródłowy odwzorowany 1:1 do dalszej integracji z Kivy / BeeWare / Flutter WebView.
            - Wykorzystaj `app.py` oraz API LangChain do przygotowania natywnego UI.
            - Do szybkiego wdrożenia użyj `streamlit` jako backendu i `webview` jako kontenera.
        """,
    },
    "ios": {
        "readme": """
            # Asesor AI — iOS Package

            Zestaw plików do integracji z projektem Swift/SwiftUI (WebView + lokalny backend Streamlit).
            - Skorzystaj z `app.py` jako backendu.
            - Dołącz pliki z katalogu `local_storage/knowledge_base/` do bazy wiedzy.
        """,
    },
}


def copy_project(target: str, meta: dict[str, str]) -> None:
    dest = DIST / target
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(ROOT, dest, ignore=IGNORE_PATTERNS)

    readme_text = dedent(meta["readme"]).strip() + "\n"
    (dest / "README_PLATFORM.md").write_text(readme_text, encoding="utf-8")

    launcher = meta.get("launcher")
    launcher_body = meta.get("launcher_body")
    if launcher and launcher_body:
        launcher_path = dest / launcher
        launcher_path.write_text(launcher_body, encoding="utf-8")
        if launcher_path.suffix == ".sh":
            launcher_path.chmod(launcher_path.stat().st_mode | 0o755)


def main() -> None:
    DIST.mkdir(exist_ok=True)
    for target, meta in TARGETS.items():
        print(f"[+] Preparing copy for {target}")
        copy_project(target, meta)
    print("Done. Copies are stored in ./dist/<platform>")


if __name__ == "__main__":
    main()
