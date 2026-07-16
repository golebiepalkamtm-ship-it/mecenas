@echo off
REM LexMind AI - Setup Helper Script (Windows)
REM Helps setup the project for different installation profiles

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR:~0,-1%"
for %%i in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~dpi"
set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

echo.
echo ================================================
echo LexMind AI - Setup Helper
echo ================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.8+
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] Found %PYTHON_VERSION%

cd /d "%PROJECT_ROOT%"

REM Check if venv exists
if not exist ".venv" (
    echo [WARNING] Virtual environment not found. Creating...
    python -m venv .venv
    echo [OK] Virtual environment created
)

REM Activate venv
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    echo [OK] Virtual environment activated
)

REM Check .env
if not exist ".env" (
    echo [WARNING] .env not found. Creating from .env.example...
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK] .env created
        echo [WARNING] Please edit .env and add your API keys!
    ) else (
        echo [ERROR] .env.example not found
        exit /b 1
    )
) else (
    echo [OK] .env exists
)

REM Menu
echo.
echo Select Installation Profile:
echo.
echo 1 - CORE   (Minimal setup: LexMind + FastAPI)
echo 2 - OCR    (Core + OCR: torch, paddleocr)
echo 3 - DEV    (OCR + Tools: pytest, linters)
echo 4 - VALIDATE (Only check configuration)
echo.
set /p CHOICE="Choose [1-4]: "

if "%CHOICE%"=="1" (
    echo.
    echo ================================================
    echo Installing CORE Profile
    echo ================================================
    echo.
    python -m pip install --upgrade pip
    pip install -r requirements-core.txt
    echo.
    echo [OK] CORE profile installed
    echo.
    echo ================================================
    echo Next Steps
    echo ================================================
    echo.
    echo 1. Edit .env with your API keys
    echo 2. Run: python api.py
    echo.
) else if "%CHOICE%"=="2" (
    echo.
    echo ================================================
    echo Installing OCR Profile
    echo ================================================
    echo.
    python -m pip install --upgrade pip
    pip install -r requirements-core.txt -r requirements-ocr.txt
    echo.
    echo [OK] OCR profile installed
    echo.
    echo [WARNING] PyTorch CPU version installed.
    echo For GPU support, run:
    echo   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
    echo.
    echo ================================================
    echo Next Steps
    echo ================================================
    echo.
    echo 1. Edit .env with your API keys
    echo 2. Run: python api.py
    echo.
) else if "%CHOICE%"=="3" (
    echo.
    echo ================================================
    echo Installing DEV Profile
    echo ================================================
    echo.
    python -m pip install --upgrade pip
    pip install -r requirements-core.txt -r requirements-ocr.txt -r requirements-dev.txt
    echo.
    echo [OK] DEV profile installed
    echo.
    echo ================================================
    echo Next Steps
    echo ================================================
    echo.
    echo Run tests: pytest tests/ -v
    echo Run API:   python api.py
    echo.
) else if "%CHOICE%"=="4" (
    echo.
    echo ================================================
    echo Validating Configuration
    echo ================================================
    echo.
    python -c "from services.config_validator import ConfigValidator; validator = ConfigValidator(profile='core'); is_valid, errors, warnings = validator.validate_all(); validator.print_report(verbose=True)"
    echo.
) else (
    echo [ERROR] Invalid choice
    exit /b 1
)

endlocal
