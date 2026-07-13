@echo off
title Price Maker - Android (Expo)
setlocal

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "APP_DIR=%ROOT%\mobile"

if not exist "%APP_DIR%\package.json" (
    echo.
    echo  Mobile app not set up yet.
    echo  Run setup-mobile.bat once from the price-maker folder.
    echo.
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  Node.js not found. Install from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

cd /d "%APP_DIR%"

if not exist "node_modules\expo\package.json" (
    echo.
    echo  Installing dependencies first...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo  npm install failed.
        pause
        exit /b 1
    )
)

echo.
echo  Starting Price Maker for Android...
echo  1. Install "Expo Go" on your phone ^(Play Store^)
echo  2. Scan the QR code shown below
echo  3. Phone and PC must be on the same Wi-Fi
echo.
echo  Press Ctrl+C to stop.
echo.

call npx expo start

pause
