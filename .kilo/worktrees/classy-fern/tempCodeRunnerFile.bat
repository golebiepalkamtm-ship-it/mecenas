@echo off
setlocal
Status Systemu
ONLINE
AES-XTS-512

cd /d "%~dp0"

echo [SYSTEM] Uruchamianie RADCA AI v3.1 ULTRA CORE...

:: Kill any previous sessions on ports 8001 and 3000
echo [SYSTEM] Czyszczenie starych procesow...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul

:: Start Backend (FastAPI) in background
echo [SYSTEM] Startowanie silnika RAG (FastAPI:8001)...
start /b cmd /c ".venv\Scripts\uvicorn api:app --host 0.0.0.0 --port 8001 --reload"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend (Vite)
echo [SYSTEM] Przygotowanie interfejsu (Vite:3000)...
cd frontend
if not exist "node_modules\" (
    echo [SYSTEM] Pierwsze uruchomienie: Instalacja zaleznosci...
    call npm install
)

echo [SYSTEM] Otwieranie interfejsu uzytkownika...
call npm run dev

pause
