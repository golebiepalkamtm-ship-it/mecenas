@echo off
setlocal enabledelayedexpansion
TITLE LexMind AI - Ultimate Hybrid Boot sequence (V2.7 - SHARP)

:: Configuration
set API_PORT=8003
set FE_PORT=3000
set API_URL=http://127.0.0.1:%API_PORT%

cls
echo ============================================================
echo      LEXMIND AI - PRESTIGE BOOT SEQUENCE (V2.7)
echo ============================================================
echo [SYSTEM] Starting advanced diagnostic and boot sequence...
echo.

:: 1. Cleanup
echo [1/4] Purging ghost processes on ports %API_PORT% and %FE_PORT%...
:: PowerShell method is precise
powershell -Command "Get-NetTCPConnection -LocalPort %API_PORT%,%FE_PORT% -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
:: Force fallback for stubborn node/python instances
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM python.exe /F >nul 2>&1
echo [SUCCESS] Ports and processes cleared.

:: 2. Environment Check
echo [2/4] Verifying Core Engine dependencies...
dir ".venv" >nul 2>&1
if errorlevel 1 (
    echo [CRITICAL ERROR] Virtual environment missing.
    pause
    exit /b
)
echo [SUCCESS] Environment verified.

:: 3. Backend Startup
echo [3/4] Initializing Modular Backend Engine...
start "LexMind Backend" cmd /c ".venv\Scripts\python -m uvicorn api:app --host 127.0.0.1 --port %API_PORT% --reload"

:: 4. Poll for API Readiness
echo [4/4] Authenticating with Backend API at %API_URL%...
set retry_count=0
:poll
curl -s %API_URL%/health >nul
if errorlevel 1 (
    set /a retry_count+=1
    if !retry_count! gtr 25 (
        echo.
        echo [CRITICAL ERROR] Backend synchronization failed.
        pause
        exit /b
    )
    echo | set /p="."
    timeout /t 2 >nul
    goto poll
)

echo.
echo [SUCCESS] Backend linkage established after !retry_count! heartbeats.
echo.

:: 5. Frontend Startup
echo [FINAL] Deploying Ultra-Sharp Frontend Interface...
cd frontend 2>nul || (
    echo [ERROR] Frontend directory missing.
    pause
    exit /b
)
start /b "" cmd /c "npm run dev -- --port %FE_PORT% --strictPort --host 127.0.0.1"
cd ..

timeout /t 4 >nul
start "" "http://127.0.0.1:%FE_PORT%"

echo ============================================================
echo      LEXMIND AI SYSTEM IS NOW ONLINE
echo      ACCESS: http://127.0.0.1:%FE_PORT%
echo ============================================================
echo [SYSTEM] System log stream active. Press Ctrl+C to terminate.
echo.
pause
