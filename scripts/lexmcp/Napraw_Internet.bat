@echo off
chcp 65001 >nul
echo =========================================
echo       NARZEDZIE DO NAPRAWY DNS I INTERNETU
echo =========================================
echo.

:: Sprawdzanie uprawnien administratora
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Uruchomiono jako Administrator.
) else (
    echo [!] Brak uprawnien. Probuje uruchomic jako Administrator...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~dpnx0\"' -Verb RunAs"
    exit /b
)

echo.
echo Ustawiam ultraszybkie serwery DNS od Google (8.8.8.8, 8.8.4.4)...
powershell -Command "Set-DnsClientServerAddress -InterfaceAlias 'Wi-Fi 2' -ServerAddresses ('8.8.8.8','8.8.4.4')"

echo.
echo Czyszcze zablokowany bufor (cache) DNS...
ipconfig /flushdns

echo.
echo =========================================
echo  ZROBIONE! Strony powinny znowu ladowac
echo  sie blyskawicznie.
echo =========================================
echo.
pause
