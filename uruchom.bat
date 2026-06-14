@echo off
setlocal EnableExtensions
pushd "%~dp0" || (echo [BLAD] Nie mozna ustawic katalogu roboczego & exit /b 1)
set "ROOT_DIR=%CD%"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"

title LexMind System Launcher

if exist "%ROOT_DIR%\.env" (
    for /f "usebackq eol=# tokens=1* delims==" %%A in ("%ROOT_DIR%\.env") do (
        if /i "%%A"=="SUPABASE_URL" set "SUPABASE_URL=%%B"
        if /i "%%A"=="SUPABASE_ANON_KEY" set "SUPABASE_ANON_KEY=%%B"
        if /i "%%A"=="SUPABASE_SERVICE_ROLE_KEY" set "SUPABASE_SERVICE_ROLE_KEY=%%B"
        if /i "%%A"=="OPENROUTER_API_KEY" set "OPENROUTER_API_KEY=%%B"
        if /i "%%A"=="GOOGLE_API_KEY" set "GOOGLE_API_KEY=%%B"
        if /i "%%A"=="MINDEE_API_KEY" set "MINDEE_API_KEY=%%B"
        if /i "%%A"=="MINDEE_OCR_MODEL_ID" set "MINDEE_OCR_MODEL_ID=%%B"
        if /i "%%A"=="OCR_SPACE_API_KEY" set "OCR_SPACE_API_KEY=%%B"
        if /i "%%A"=="COHERE_API_KEY" set "COHERE_API_KEY=%%B"
    )
)

if not defined VITE_SUPABASE_URL if defined SUPABASE_URL set "VITE_SUPABASE_URL=%SUPABASE_URL%"
if not defined VITE_SUPABASE_ANON_KEY if defined SUPABASE_ANON_KEY set "VITE_SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%"

if not defined SUPABASE_URL if defined VITE_SUPABASE_URL set "SUPABASE_URL=%VITE_SUPABASE_URL%"
if not defined SUPABASE_ANON_KEY if defined VITE_SUPABASE_ANON_KEY set "SUPABASE_ANON_KEY=%VITE_SUPABASE_ANON_KEY%"

if not defined VITE_SUPABASE_URL (
    echo [BLAD] Brak VITE_SUPABASE_URL w .env
    echo        Uzupelnij .env i uruchom ponownie uruchom.bat
    exit /b 1
)
if not defined VITE_SUPABASE_ANON_KEY (
    echo [BLAD] Brak VITE_SUPABASE_ANON_KEY w .env
    echo        Uzupelnij .env i uruchom ponownie uruchom.bat
    exit /b 1
)

echo.
echo ==================================================
echo         LexMind - SYSTEM LAUNCHER
echo ==================================================
echo  Backend:   http://localhost:8003
echo  Frontend:  http://localhost:3000

:cleanup_start
echo [1/3] Czyszczenie starych procesow...
taskkill /IM python.exe /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8003 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

:start_services
echo [2/3] Uruchamianie backendu FastAPI (port 8003)...
if exist ".venv\Scripts\python.exe" (
    echo        [INFO] Znaleziono .venv, uzywam srodowiska wirtualnego...
    start "LexMind-Backend" /D "%ROOT_DIR%" cmd /k ".venv\Scripts\python.exe -m uvicorn api:app --host 127.0.0.1 --port 8003 --reload"
) else (
    echo        [WARN] Nie znaleziono .venv, uzywam pythona globalnego...
    start "LexMind-Backend" /D "%ROOT_DIR%" cmd /k "python -m uvicorn api:app --host 127.0.0.1 --port 8003 --reload"
)

echo        Czekanie na gotowość backendu...
:wait_backend
timeout 1 >nul
netstat -ano | findstr :8003 | findstr LISTENING >nul
if errorlevel 1 goto wait_backend
echo        * Backend gotowy.

echo        Sprawdzanie zaleznosci frontendu...
if not exist "frontend\node_modules\" (
    echo        Pierwsza instalacja — npm install...
    pushd "%FRONTEND_DIR%"
    call npm.cmd install --legacy-peer-deps
    popd
)

echo [3/3] Uruchamianie frontendu Vite (port 3000)...
start "LexMind-Frontend" /D "%FRONTEND_DIR%" cmd /k "npm.cmd run dev"

echo        Czekanie na gotowosc frontendu...
:wait_frontend
timeout 1 >nul
netstat -ano | findstr :3000 | findstr LISTENING >nul
if errorlevel 1 goto wait_frontend
echo        * Frontend gotowy.

echo.
echo  * Wszystko uruchomione!
echo    Otwieram przegladarke...
echo.
start "" http://localhost:3000

echo.
echo  =======================================================
echo     DASHBOARD OPERACYJNY LEXMIND (SYSTEM DZIALA)
echo  =======================================================
echo   [1] Status polaczen serwerow (status)
echo   [2] Restartuj serwery (restart)
echo   [3] Zamknij serwery i wyjdz (exit)
echo  =======================================================
echo.

:menu
set "CHOICE="
set /p "CHOICE=LexMind CLI > "

if /i "%CHOICE%"=="1" goto check_status
if /i "%CHOICE%"=="status" goto check_status
if /i "%CHOICE%"=="2" goto restart_system
if /i "%CHOICE%"=="restart" goto restart_system
if /i "%CHOICE%"=="3" goto shutdown
if /i "%CHOICE%"=="exit" goto shutdown

echo [INFO] Nieznane polecenie. Wpisz: 1 (status), 2 (restart) lub 3 (exit).
goto menu

:check_status
echo.
echo =======================================================
echo   RAPORT STANU USLUG LEXMIND
echo =======================================================
netstat -ano | findstr :8003 | findstr LISTENING >nul
if errorlevel 1 (
    echo  [-] BACKEND (Port 8003):  [NIEAKTYWNY] (Blad polaczenia)
) else (
    echo  [+] BACKEND (Port 8003):  [ONLINE] (Dziala prawidlowo)
)

netstat -ano | findstr :3000 | findstr LISTENING >nul
if errorlevel 1 (
    echo  [-] FRONTEND (Port 3000): [NIEAKTYWNY] (Blad polaczenia)
) else (
    echo  [+] FRONTEND (Port 3000): [ONLINE] (Dziala prawidlowo)
)
echo =======================================================
echo.
goto menu

:restart_system
echo.
echo [RESTART] Zamykanie starych serwerow...
taskkill /FI "WINDOWTITLE eq LexMind-Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LexMind-Frontend" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8003 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo [RESTART] Ponowne uruchamianie...
goto start_services

:shutdown
echo.
echo  Zamykanie LexMind...
taskkill /FI "WINDOWTITLE eq LexMind-Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LexMind-Frontend" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8003 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
echo  * Serwery wylaczone. Milego dnia!
timeout /t 2 /nobreak >nul
popd
