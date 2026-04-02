 @echo off
REM ---- LexMind AI: Build Windows installer (Tauri) ----
REM Uruchom ten plik z katalogu głównego repozytorium (moj prawnik).

setlocal
set ROOT=%~dp0

echo ===================================================================
echo LexMind AI - budowa aplikacji desktopowej Windows
echo ===================================================================

cd /d "%ROOT%LexMaind AI"
echo 1) Instalacja zaleznosci frontendu
npm install

echo 2) Budowanie frontendu
npm run build

echo 3) Budowanie bundle Tauri
npm run tauri build

echo Gotowe. Znajdz wynik w: src-tauri\target\release\bundle\windows
pause
