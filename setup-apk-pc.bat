@echo off
title Price Maker - Get APK (any PC)
setlocal EnableExtensions

rem ============================================================
rem  Works on ANY Windows PC — no D: drive needed.
rem  Puts the project in Documents and builds a real APK.
rem  Does NOT use Expo Go.
rem ============================================================

set "TARGET_DIR=%USERPROFILE%\Documents\price-maker"
set "GIT_URL=https://github.com/sparkyvicky-dev/price-maker.git"
set "BRANCH=cursor/alternative-apk-build-e99b"

echo.
echo  ================================================
echo   Price Maker — Installable APK
echo   NO Expo Go. Just install the .apk on your phone.
echo  ================================================
echo.
echo  Folder on this PC:
echo    %TARGET_DIR%
echo.
echo  Need once: Git + Node.js ^(scripts open download pages if missing^)
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo  Git is missing. Opening download page...
    echo  Install Git, then double-click this file again.
    start https://git-scm.com/download/win
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo  Node.js is missing. Opening download page...
    echo  Install "LTS", then double-click this file again.
    start https://nodejs.org/
    pause
    exit /b 1
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
    echo  Downloading project to Documents...
    if not exist "%USERPROFILE%\Documents" mkdir "%USERPROFILE%\Documents" 2>nul
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
echo  Next: cloud builds the APK ^(about 10–20 min, one time^).
echo  You get a download link. Install that .apk on your phone.
echo  After that: open Price Maker like any app — no Expo Go ever.
echo.
if exist "%TARGET_DIR%\build-apk.bat" (
    call "%TARGET_DIR%\build-apk.bat" cloud
) else (
    echo  Starting cloud APK build...
    call npx --yes eas-cli@latest login
    call npx --yes eas-cli@latest build -p android --profile apk
    pause
)

exit /b 0
