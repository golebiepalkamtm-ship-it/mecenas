@echo off
chcp 65001 >nul
setlocal
pushd "%~dp0" || (echo [BLAD] Nie mozna ustawic katalogu roboczego & exit /b 1)
set "ROOT_DIR=%CD%"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"

title LexMind — Launcher

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║         LexMind  —  SYSTEM LAUNCHER         ║
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
start "RADCA-AI-Backend" /D "%ROOT_DIR%" cmd /k ".venv\Scripts\uvicorn api:app --host 127.0.0.1 --port 8003 --reload"

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
    pushd "%FRONTEND_DIR%"
    call npm.cmd install
    popd
)

:: ─── Uruchomienie frontendu (Vite) ───
echo [4/4] Uruchamianie frontendu Vite (port 3000)...
start "RADCA-AI-Frontend" /D "%FRONTEND_DIR%" cmd /k "npm.cmd run dev"

echo        Czekanie na gotowosc frontendu...
:wait_frontend
timeout /t 1 /nobreak >nul
netstat -ano | findstr :3000 | findstr LISTENING >nul
if errorlevel 1 goto wait_frontend
echo        ✓ Frontend gotowy.

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
echo  Zamykanie LexMind...
taskkill /FI "WINDOWTITLE eq RADCA-AI-Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq RADCA-AI-Frontend" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8003 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
echo  ✓ Zamknieto. Do zobaczenia!
timeout /t 2 /nobreak >nul
popd
