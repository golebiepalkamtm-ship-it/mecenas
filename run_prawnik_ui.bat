@echo off
setlocal
cd /d "%~dp0"

echo [SYSTEM] LEXMIND AI v4.1 - INITIALIZING ASYNC CORE...

:: Check for virtual environment
if not exist ".venv" (
    echo [SYSTEM] Creating virtual environment...
    python -m venv .venv
)

:: Skip automatic pip install to prevent hanging if the user already has dependencies installed.
echo [SYSTEM] Skipping automatic pip install (using uv or pre-installed dependencies)...

:: Kill any previous sessions on ports 8003 and 3000
echo [SYSTEM] Purging ghost processes...
echo [SYSTEM] Attempting to free port 8003...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8003 ^| findstr LISTENING') do (
    taskkill /F /PID %%a /T >nul 2>&1
)
echo [SYSTEM] Attempting to free port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a /T >nul 2>&1
)
timeout /t 2 /nobreak >nul

:: Prepare Frontend (Vite:3000)
echo [SYSTEM] Preparing UI Layer (Vite:3000)...
if not exist "frontend\node_modules\" (
    echo [SYSTEM] Initial run detect: installing node_modules...
    cd frontend && call npm install && cd ..
)

:: Start Backend and Frontend in parallel to speed up initialization
echo [SYSTEM] Starting RAG Engine (FastAPI:8003) and Frontend server (Vite:3000) in parallel...
start /b "" .venv\Scripts\python -m uvicorn api:app --host 127.0.0.1 --port 8003
start /b "" cmd /c "cd frontend && npm run dev -- --port 3000 --strictPort --host 127.0.0.1"

:: Wait once for both to initialize
echo [SYSTEM] Waiting for services to initialize...
timeout /t 5 /nobreak >nul

:: Start Browser
echo [SYSTEM] Launching Interface...
start "" "http://127.0.0.1:3000"

echo [SYSTEM] LexMind AI is running! Beide processes are working in background.
pause
