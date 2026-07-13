@echo off
title Price Maker - Android (Expo) Setup
setlocal EnableExtensions

rem Default install path (change if you use a different folder)
set "TARGET_DIR=D:\Github projects\price-maker"
set "GIT_URL=https://github.com/sparkyvicky-dev/price-maker.git"

rem If run from inside the project, use that folder instead
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
if exist "%SCRIPT_DIR%\index.html" set "TARGET_DIR=%SCRIPT_DIR%"

set "MOBILE_DIR=%TARGET_DIR%\mobile"

echo.
echo  Price Maker - Android setup
echo  Project folder: %TARGET_DIR%
echo.

if not exist "%TARGET_DIR%\index.html" (
    echo  Project not found. Downloading to:
    echo  %TARGET_DIR%
    echo.
    if not exist "D:\Github projects" mkdir "D:\Github projects" 2>nul
    where git >nul 2>&1
    if errorlevel 1 (
        echo  ERROR: Git is not installed.
        echo  Install from https://git-scm.com/download/win
        echo  Then run this file again.
        echo.
        pause
        exit /b 1
    )
    if exist "%TARGET_DIR%\.git" (
        echo  Updating existing folder...
        cd /d "%TARGET_DIR%"
        git pull origin main
    ) else (
        echo  Cloning from GitHub...
        git clone %GIT_URL% "%TARGET_DIR%"
    )
    echo.
)

if not exist "%TARGET_DIR%\index.html" (
    echo  ERROR: Could not get price-maker project.
    pause
    exit /b 1
)

if not exist "%MOBILE_DIR%\package.json" (
    echo  mobile folder missing - pulling latest code...
    echo.
    where git >nul 2>&1
    if errorlevel 1 (
        echo  ERROR: Git required to download the Android app.
        echo  Install Git: https://git-scm.com/download/win
        pause
        exit /b 1
    )
    cd /d "%TARGET_DIR%"
    git fetch origin main
    git pull origin main
    if not exist "%MOBILE_DIR%\package.json" (
        echo.
        echo  Still no mobile folder. Try:
        echo    cd /d "%TARGET_DIR%"
        echo    git pull origin main
        echo.
        echo  Or clone fresh:
        echo    cd /d "D:\Github projects"
        echo    rmdir /s /q price-maker
        echo    git clone %GIT_URL% price-maker
        echo.
        pause
        exit /b 1
    )
)

where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js is not installed.
    echo  Download LTS from https://nodejs.org/
    pause
    exit /b 1
)

echo  Installing Android dependencies...
cd /d "%MOBILE_DIR%"
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo  npm install failed.
    pause
    exit /b 1
)

echo.
echo  SUCCESS!
echo  PC app:     %TARGET_DIR%\price maker.bat
echo  Android:    %TARGET_DIR%\start-mobile.bat
echo.

set /p START_NOW="Start Expo now? (Y/N): "
if /I "%START_NOW%"=="Y" start "" "%TARGET_DIR%\start-mobile.bat"

pause
exit /b 0
