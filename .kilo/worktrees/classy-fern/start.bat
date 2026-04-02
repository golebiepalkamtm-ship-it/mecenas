@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

title RADCA AI — Launcher

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║         RADCA AI  —  SYSTEM LAUNCHER         ║
echo  ╠══════════════════════════════════════════════╣
echo  ║  Backend:   http://localhost:8003             ║
echo  ║  Frontend:  http://localhost:3000             ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ─── Czyszczenie starych procesów ───
echo [1/4] Czyszczenie starych procesow...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul

:: ─── Uruchomienie backendu (FastAPI) ───
echo [2/4] Uruchamianie backendu FastAPI (port 8001)...
start "RADCA-AI-Backend" /min cmd /c ".venv\Scripts\uvicorn api:app --host 0.0.0.0 --port 8001 --reload"
timeout /t 3 /nobreak >nul

:: ─── Instalacja zależności frontendu (jeśli potrzeba) ───
echo [3/4] Sprawdzanie zaleznosci frontendu...
if not exist "frontend\node_modules\" (
    echo        Pierwsza instalacja — npm install...
    cd frontend
    call npm install
    cd ..
)

:: ─── Uruchomienie frontendu (Vite) ───
echo [4/4] Uruchamianie frontendu Vite (port 3000)...
start "RADCA-AI-Frontend" /min cmd /c "cd frontend && npm run dev"
timeout /t 3 /nobreak >nul

:: ─── Otwieranie przeglądarki ───
echo.
echo  ✓ Wszystko uruchomione!
echo    Otwieram przegladarke...
echo.
start "" http://localhost:3000

echo  ══════════════════════════════════════════════
echo   Aby zamknac — nacisnij dowolny klawisz.
echo   Zamknie to backend i frontend automatycznie.
echo  ══════════════════════════════════════════════
echo.
pause >nul

:: ─── Zamykanie wszystkiego ───
echo.
echo  Zamykanie RADCA AI...
taskkill /FI "WINDOWTITLE eq RADCA-AI-Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq RADCA-AI-Frontend" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
echo  ✓ Zamknieto. Do zobaczenia!
timeout /t 2 /nobreak >nul
