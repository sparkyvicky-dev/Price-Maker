@echo off
title Price Maker - Android (Expo) Setup
setlocal EnableExtensions

rem ============================================================
rem  Put this file inside your price-maker folder, e.g.:
rem  F:\New folder\price-maker\setup-mobile.bat
rem ============================================================

set "REPO_DIR=%~dp0"
set "REPO_DIR=%REPO_DIR:~0,-1%"
set "MOBILE_DIR=%REPO_DIR%\mobile"

echo.
echo  Price Maker - Android setup
echo  Project folder: %REPO_DIR%
echo.

if not exist "%REPO_DIR%\index.html" (
    echo  ERROR: This does not look like the price-maker folder.
    echo  Expected index.html in: %REPO_DIR%
    echo.
    echo  Your folder should look like:
    echo    F:\New folder\price-maker\index.html     ^(PC web app^)
    echo    F:\New folder\price-maker\mobile\         ^(Android app^)
    echo.
    pause
    exit /b 1
)

if not exist "%MOBILE_DIR%\package.json" (
    echo  ERROR: mobile folder not found.
    echo  Expected: %MOBILE_DIR%\package.json
    echo.
    echo  Pull the latest code from GitHub:
    echo    cd /d "%REPO_DIR%"
    echo    git pull
    echo.
    echo  Or clone fresh:
    echo    cd /d "F:\New folder"
    echo    git clone https://github.com/sparkyvicky-dev/Price-Maker.git price-maker
    echo.
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js is not installed.
    echo  Download from https://nodejs.org/ ^(LTS^), install, then run this again.
    echo.
    pause
    exit /b 1
)

echo  Installing Android app dependencies...
echo.
cd /d "%MOBILE_DIR%"
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo.
    echo  npm install failed.
    pause
    exit /b 1
)

echo.
echo  Done! Android app is ready in:
echo  %MOBILE_DIR%
echo.
echo  PC web app ^(browser^): double-click "price maker.bat" or open index.html
echo  Android app ^(phone^):  run "start-mobile.bat" and scan QR in Expo Go
echo.

set /p START_NOW="Start Expo now for phone testing? (Y/N): "
if /I "%START_NOW%"=="Y" (
    cd /d "%REPO_DIR%"
    start "" "%REPO_DIR%\start-mobile.bat"
)

echo.
pause
exit /b 0
