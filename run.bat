@echo off
title ASESOR AI - DESKTOP
echo Zamykanie poprzednich sesji...
taskkill /F /IM streamlit.exe >nul 2>&1
taskkill /F /IM python.exe /FI "WINDOWTITLE eq ASESOR AI - DESKTOP" >nul 2>&1
timeout /t 2 /nobreak >nul
echo STARTOWANIE ASESOR AI (DESKTOP MOD)...
.\.venv\Scripts\python.exe main.py
pause
