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

:: Kill any previous sessions on ports 8001 and 3000
echo [SYSTEM] Purging ghost processes...
echo [SYSTEM] Attempting to free port 8001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a /T >nul 2>&1
)
echo [SYSTEM] Attempting to free port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a /T >nul 2>&1
)
timeout /t 2 /nobreak >nul

:: Start Backend (FastAPI:8001)
echo [SYSTEM] Starting RAG Engine (FastAPI:8001)...
start /b cmd /c ".venv\Scripts\uvicorn api:app --host 0.0.0.0 --port 8001"

:: Prepare Frontend (Vite:3000)
echo [SYSTEM] Preparing UI Layer (Vite:3000)...
cd frontend
if not exist "node_modules\" (
    echo [SYSTEM] Initial run detect: installing node_modules...
    call npm install
)

:: Start Browser
echo [SYSTEM] Launching Interface...
start "" "http://localhost:3000"

:: Start Frontend dev server
call npm run dev -- --port 3000 --strictPort --force

pause
