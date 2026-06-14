@echo off
git config --global user.name "Mecenas Agent"
git config --global user.email "agent@mecenas.local"
git remote add origin https://github.com/golebiepalkamtm-ship-it/mecenas
git add .
git commit -m "Aktualizacja kodu (Orchestrator v2, interfejs QuickIntelligencePanel i helpers)"
git branch -M main
git push -u origin main
echo.
echo Gotowe! Mozesz zamknac to okno.
pause
