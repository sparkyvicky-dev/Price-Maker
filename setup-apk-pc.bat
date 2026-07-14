@echo off
title Price Maker - Get APK (D:\New folder)
setlocal EnableExtensions

rem ============================================================
rem  Pulls to D:\New folder\price-maker and builds installable APK.
rem  Does NOT use Expo Go.
rem ============================================================

set "PARENT_DIR=D:\New folder"
set "TARGET_DIR=%PARENT_DIR%\price-maker"
set "GIT_URL=https://github.com/sparkyvicky-dev/price-maker.git"
set "BRANCH=cursor/alternative-apk-build-e99b"

echo.
echo  ================================================
echo   Price Maker — Installable APK
echo   NO Expo Go
echo  ================================================
echo.
echo  Folder on this PC:
echo    %TARGET_DIR%
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo  Git is missing. Opening download page...
    start https://git-scm.com/download/win
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo  Node.js is missing. Opening download page...
    echo  Install "LTS", then run this file again.
    start https://nodejs.org/
    pause
    exit /b 1
)

if not exist "%PARENT_DIR%" (
    echo  Creating %PARENT_DIR% ...
    mkdir "%PARENT_DIR%" 2>nul
    if not exist "%PARENT_DIR%" (
        echo  ERROR: Could not create %PARENT_DIR%
        echo  Make sure drive D: exists.
        pause
        exit /b 1
    )
)

if exist "%TARGET_DIR%\.git" (
    echo  Updating project...
    cd /d "%TARGET_DIR%"
    git fetch origin
    git checkout %BRANCH% 2>nul
    if errorlevel 1 (
        echo  Using main branch...
        git checkout main
        git pull origin main
    ) else (
        git pull origin %BRANCH%
    )
) else (
    if exist "%TARGET_DIR%" (
        echo  ERROR: Folder exists but is not this project:
        echo  %TARGET_DIR%
        echo  Rename or delete it, then run again.
        pause
        exit /b 1
    )
    echo  Downloading project to D:\New folder ...
    git clone %GIT_URL% "%TARGET_DIR%"
    if errorlevel 1 (
        echo  Download failed. Check internet.
        pause
        exit /b 1
    )
    cd /d "%TARGET_DIR%"
    git fetch origin
    git checkout %BRANCH% 2>nul
    if errorlevel 1 git checkout main
)

cd /d "%TARGET_DIR%"
echo.
echo  Ready at: %TARGET_DIR%
git branch --show-current
echo.

if not exist "%TARGET_DIR%\mobile\package.json" (
    echo  ERROR: mobile app folder missing.
    pause
    exit /b 1
)

echo  Installing app packages ^(first time only^)...
cd /d "%TARGET_DIR%\mobile"
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo  npm install failed.
    pause
    exit /b 1
)

echo.
echo  Starting cloud APK build ^(no Expo Go on phone^)...
echo.
if exist "%TARGET_DIR%\build-apk.bat" (
    call "%TARGET_DIR%\build-apk.bat" cloud
) else (
    call npx --yes eas-cli@latest login
    call npx --yes eas-cli@latest build -p android --profile apk
    pause
)

exit /b 0
