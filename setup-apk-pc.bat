@echo off
title Price Maker - New PC: get code + build APK
setlocal EnableExtensions

rem ============================================================
rem  For a DIFFERENT / NEW Windows PC with nothing installed yet.
rem  Clones the project, gets APK build scripts, then builds.
rem ============================================================

set "PARENT_DIR=D:\Github projects"
set "TARGET_DIR=%PARENT_DIR%\price-maker"
set "GIT_URL=https://github.com/sparkyvicky-dev/price-maker.git"
rem Prefer the APK feature branch; fall back to main if missing
set "BRANCH=cursor/alternative-apk-build-e99b"

echo.
echo  ============================================================
echo   Price Maker — New PC setup + APK build
echo   Target: %TARGET_DIR%
echo  ============================================================
echo.
echo  You need once on this PC:
echo    1. Git     https://git-scm.com/download/win
echo    2. Node.js https://nodejs.org/  ^(LTS^)
echo  Then come back and run this file again if needed.
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Git not found. Install it, open a NEW Command Prompt, retry.
    start https://git-scm.com/download/win
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found. Install LTS, open a NEW Command Prompt, retry.
    start https://nodejs.org/
    pause
    exit /b 1
)

if not exist "%PARENT_DIR%" (
    echo  Creating %PARENT_DIR% ...
    mkdir "%PARENT_DIR%" 2>nul
)

if exist "%TARGET_DIR%\.git" (
    echo  Project already there — updating...
    cd /d "%TARGET_DIR%"
    git fetch origin
    git checkout %BRANCH% 2>nul
    if errorlevel 1 (
        echo  Branch %BRANCH% not found — using main...
        set "BRANCH=main"
        git checkout main
        git pull origin main
    ) else (
        git pull origin %BRANCH%
    )
) else (
    echo  Cloning project...
    git clone %GIT_URL% "%TARGET_DIR%"
    if errorlevel 1 (
        echo  Clone failed. Check internet / GitHub access.
        pause
        exit /b 1
    )
    cd /d "%TARGET_DIR%"
    git fetch origin
    git checkout %BRANCH% 2>nul
    if errorlevel 1 (
        echo  Branch %BRANCH% not found — staying on main.
        set "BRANCH=main"
        git checkout main
    )
)

cd /d "%TARGET_DIR%"
echo.
echo  Branch: 
git branch --show-current
echo.

if not exist "%TARGET_DIR%\mobile\package.json" (
    echo  ERROR: mobile\ folder missing after clone.
    pause
    exit /b 1
)

echo  Installing Android deps once...
cd /d "%TARGET_DIR%\mobile"
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo  npm install failed.
    pause
    exit /b 1
)

echo.
if exist "%TARGET_DIR%\build-apk.bat" (
    echo  Starting APK builder...
    echo.
    call "%TARGET_DIR%\build-apk.bat"
) else (
    echo  build-apk.bat not on this branch yet.
    echo  Run manually:
    echo    cd /d "%TARGET_DIR%\mobile"
    echo    npx eas-cli login
    echo    npx eas-cli build -p android --profile apk
    echo.
    pause
)

exit /b 0
