@echo off
REM ---- LexMind AI: Windows Desktop helper (Tauri + FastAPI) ----
REM Uruchom ten plik z katalogu głównego repozytorium (moj prawnik).

setlocal enabledelayedexpansion
set ROOT=%~dp0

echo ===================================================================
echo LexMind AI - uruchamianie backend + Tauri desktop (Windows)
echo ===================================================================

echo Krok 1/2: Uruchom backend (FastAPI) w oddzielnym oknie
start "LexMind AI Backend" cmd /k "cd /d "%ROOT%" && if exist .venv\Scripts\activate (call .venv\Scripts\activate) else (echo Brak .venv\Scripts\activate, sprawdz sciezke) && uvicorn api:app --host 127.0.0.1 --port 8001 --reload"

echo Krok 2/2: Uruchom Tauri desktop w oddzielnym oknie
start "LexMind AI Desktop Dev" cmd /k "cd /d "%ROOT%LexMaind AI" && npm install && npm run tauri dev"

echo Wszystkie procesy zostaly wystartowane. Sprawdz otwarte okna.
pause
