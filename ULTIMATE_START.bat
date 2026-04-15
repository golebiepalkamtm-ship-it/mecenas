@echo off
setlocal
title RADCA AI - ULTIMATE LAUNCHER

echo ======================================================
echo          RADCA AI - ATOMOWE CZYSZCZENIE I START
echo ======================================================

:: 1. ZAMYKANIE PROCESOW NA PORTACH (Uzywamy PowerShell dla niezawodnosci)
echo [1/4] Czyszczenie portow 8003 i 3000...
powershell -NoProfile -Command "8003, 3000 | ForEach-Object { $port = $_; Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object { $procId = $_.OwningProcess; if ($procId) { Write-Host \"   - Znaleziono proces na porcie $port (PID: $procId). Zabijanie...\"; Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } } }"

:: 2. ZAMYKANIE PROCESOW NODE I PYTHON
echo [2/4] Zamykanie wszystkich instancji Node i Python...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
timeout /t 1 /nobreak >nul

:: 3. URUCHAMIANIE BACKENDU
echo [3/4] Uruchamianie Backendu (FastAPI)...
:: Sprawdzamy czy .venv istnieje
if not exist ".venv\Scripts\python.exe" (
    echo [!] Blad: Nie znaleziono .venv\Scripts\python.exe
    pause
    exit /b 1
)

start "RADCA-AI-Backend" cmd /k ".venv\Scripts\python.exe -m uvicorn api:app --host 127.0.0.1 --port 8003 --reload"

:: CZEKANIE NA BACKEND
echo    - Czekanie na gotowosc portu 8003...
:wait_backend
timeout /t 1 /nobreak >nul
netstat -an | findstr :8003 | findstr LISTENING >nul
if errorlevel 1 goto wait_backend
echo    - Backend [OK]

:: 4. URUCHAMIANIE FRONTENDU
echo [4/4] Uruchamianie Frontendu (Vite)...
if not exist "frontend\package.json" (
    echo [!] Blad: Nie znaleziono folderu frontend lub package.json
    pause
    exit /b 1
)

pushd frontend
start "RADCA-AI-Frontend" cmd /k "npm run dev"
popd

:: CZEKANIE NA FRONTEND
echo    - Czekanie na gotowosc portu 3000...
:wait_frontend
timeout /t 1 /nobreak >nul
netstat -an | findstr :3000 | findstr LISTENING >nul
if errorlevel 1 goto wait_frontend
echo    - Frontend [OK]

echo ======================================================
echo    SYSTEM URUCHOMIONY POMYSLNIE!
echo ======================================================
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8003
echo ======================================================
echo    Okno zamyka sie za 5 sekund...
timeout /t 5
exit
