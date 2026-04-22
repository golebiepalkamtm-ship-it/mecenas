@echo off
pushd "%~dp0" || (echo [BLAD] Nie mozna ustawic katalogu roboczego & exit /b 1)
:: Wymuszenie kodowania UTF-8 dla Pythona, aby uniknąć błędów Unicode
set PYTHONIOENCODING=utf-8
echo [UPLOAD] Uruchamiam upload_kodeksy.py przez .venv...
if not exist ".venv\Scripts\python.exe" (
    echo [BLAD] Brak .venv - uruchom najpierw run_prawnik_ui.bat
    pause
    exit /b 1
)
.venv\Scripts\python upload_kodeksy.py
popd
pause
