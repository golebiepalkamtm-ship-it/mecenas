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
echo [1/4] Czyszczenie starych procesow (Python/Node)...
taskkill /IM python.exe /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8003 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

:: ─── Uruchomienie backendu (FastAPI) ───
echo [2/4] Uruchamianie backendu FastAPI (port 8003)...
start "RADCA-AI-Backend" cmd /k ".venv\Scripts\uvicorn api:app --host 127.0.0.1 --port 8003 --reload"

echo        Czekanie na gotowość backendu...
:wait_backend
timeout /t 1 /nobreak >nul
netstat -ano | findstr :8003 | findstr LISTENING >nul
if errorlevel 1 goto wait_backend
echo        ✓ Backend gotowy.

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
start "RADCA-AI-Frontend" cmd /k "cd frontend && npm run dev"
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
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8003 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
echo  ✓ Zamknieto. Do zobaczenia!
timeout /t 2 /nobreak >nul
