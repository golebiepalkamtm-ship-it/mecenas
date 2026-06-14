# Naprawa: auth timeout / brak tokenow agenta (Cursor 3.5.x, Windows)
# Uruchom: prawy przycisk -> Run with PowerShell (lub w terminalu: powershell -ExecutionPolicy Bypass -File "E:\moj prawnik\fix-cursor-now.ps1")

$ErrorActionPreference = "Stop"
$wsId = "926947ac035ae2a4be26868adf0e8c88"
$wsPath = "$env:APPDATA\Cursor\User\workspaceStorage\$wsId"
$projPath = "$env:USERPROFILE\.cursor\projects\e-moj-prawnik"
$projectFolder = "E:\moj prawnik"

Write-Host "Zamykanie wszystkich instancji Cursor..."
Get-Process -Name "Cursor" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

if (Test-Path $wsPath) {
    Write-Host "Usuwanie workspace storage: $wsPath"
    Remove-Item -LiteralPath $wsPath -Recurse -Force
}

if (Test-Path $projPath) {
    Write-Host "Usuwanie cache projektu: $projPath"
    Remove-Item -LiteralPath $projPath -Recurse -Force
}

Write-Host "Gotowe. Otwieram projekt..."
$cursorExe = @(
    "$env:LOCALAPPDATA\Programs\cursor\Cursor.exe",
    "${env:ProgramFiles}\Cursor\Cursor.exe",
    "C:\Program Files\cursor\Cursor.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($cursorExe) {
    Start-Process -FilePath $cursorExe -ArgumentList "`"$projectFolder`""
} else {
    Write-Host "Nie znaleziono Cursor.exe. Otworz recznie folder: $projectFolder"
}

Write-Host ""
Write-Host "Po starcie: Settings -> zaloguj sie ponownie jesli trzeba."
Write-Host "Otwieraj tylko JEDNO okno naraz, poczekaj az Source Control sie zaladuje."
