@echo off
cd /d "%~dp0"

echo ==================================================
echo         LexMind - INSTALLATION
echo ==================================================

echo [1/3] Tworzenie srodowiska wirtualnego...
python -m venv .venv
if exist ".venv\Scripts\activate.bat" (
    echo * .venv stworzone
) else (
    echo [BLAD] Nie udalo sie stworzyc .venv
    pause
    exit
)

echo [2/3] Aktywacja .venv i instalacja zaleznosci...
call .venv\Scripts\activate.bat
pip install -r requirements.txt

echo [3/3] Instalacja zaleznosci frontendu...
cd frontend
call npm install --legacy-peer-deps
cd ..

echo.
echo ==================================================
echo INSTALACJA ZAKONCZONA
echo Uruchom uruchom.bat aby wystartowac system
echo ==================================================
pause
