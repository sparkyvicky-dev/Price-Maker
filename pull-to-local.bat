@echo off
title Price Maker - Pull to D:\New folder
setlocal EnableExtensions

set "PARENT_DIR=D:\New folder"
set "TARGET_DIR=%PARENT_DIR%\price-maker"
set "GIT_URL=https://github.com/sparkyvicky-dev/price-maker.git"
set "BRANCH=cursor/alternative-apk-build-e99b"

echo.
echo  ============================================================
echo   Price Maker - Pull to this PC
echo   Target: %TARGET_DIR%
echo   Repo  : %GIT_URL%
echo  ============================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Git is not installed.
    echo.
    echo  1. Install Git: https://git-scm.com/download/win
    echo  2. Open a NEW Command Prompt
    echo  3. Run this file again
    echo.
    pause
    exit /b 1
)

if not exist "%PARENT_DIR%" (
    echo  Creating folder: %PARENT_DIR%
    mkdir "%PARENT_DIR%" 2>nul
    if not exist "%PARENT_DIR%" (
        echo  ERROR: Could not create %PARENT_DIR%
        echo  Check that drive D: exists.
        pause
        exit /b 1
    )
)

if exist "%TARGET_DIR%\.git" (
    echo  Project found. Updating from GitHub ...
    echo.
    cd /d "%TARGET_DIR%"
    git fetch origin
    git checkout %BRANCH% 2>nul
    if errorlevel 1 (
        echo  Branch %BRANCH% missing — using main...
        set "BRANCH=main"
        git checkout main
        git pull origin main
    ) else (
        git pull origin %BRANCH%
    )
    if errorlevel 1 (
        echo.
        echo  Pull failed. See messages above.
        echo.
        pause
        exit /b 1
    )
    goto :Success
)

if exist "%TARGET_DIR%" (
    echo  Folder exists but is not a git repo:
    echo  %TARGET_DIR%
    echo.
    echo  Move or rename that folder, then run this script again.
    echo.
    pause
    exit /b 1
)

echo  Cloning project for the first time ...
echo.
cd /d "%PARENT_DIR%"
git clone %GIT_URL% price-maker
if errorlevel 1 (
    echo.
    echo  Clone failed. Check internet and GitHub access.
    pause
    exit /b 1
)
cd /d "%TARGET_DIR%"
git fetch origin
git checkout %BRANCH% 2>nul
if errorlevel 1 (
    echo  Staying on main.
    git checkout main
)

:Success
echo.
echo  ============================================================
echo   SUCCESS
echo  ============================================================
echo.
echo  Project folder:
echo    %TARGET_DIR%
echo.
if exist "%TARGET_DIR%\index.html" (
    echo  [OK] PC web app
) else (
    echo  [--] PC web app missing
)
if exist "%TARGET_DIR%\mobile\package.json" (
    echo  [OK] Android mobile app
) else (
    echo  [--] Android app missing
)
echo.
echo  Next:
echo    APK ^(no Expo Go^):  build-apk.bat   or   setup-apk-pc.bat
echo    PC web app:         price maker.bat
echo.

set /p OPEN_FOLDER="Open project folder in Explorer? (Y/N): "
if /I "%OPEN_FOLDER%"=="Y" start "" explorer "%TARGET_DIR%"

pause
exit /b 0
