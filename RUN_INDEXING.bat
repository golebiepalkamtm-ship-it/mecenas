@echo off
title LEXMIND - INDEKSOWANIE WSZYSTKICH KODEKSÓW
echo ======================================================================
echo 🚀 LEXMIND AI: URUCHAMIANIE PEŁNEGO INDEKSOWANIA (MULTI-CORE)
echo ======================================================================
echo.
echo [1/2] Aktywacja środowiska wirtualnego...
set VENV_PATH=%~dp0.venv\Scripts\python.exe
if not exist "%VENV_PATH%" (
    echo [!] BZAD: Nie znaleziono srodowiska wirtualnego w .venv
    pause
    exit /b
)

echo [2/2] Uruchamianie skryptu indeksujacego...
"%VENV_PATH%" index_all_codes.py

echo.
echo ======================================================================
echo ✅ PROCES ZAKOŃCZONY LUB PRZERWANY
echo ======================================================================
pause
