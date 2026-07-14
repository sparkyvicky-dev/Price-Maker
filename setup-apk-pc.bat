@echo off
title Price Maker - Setup local APK (Android Studio)
setlocal EnableExtensions

rem ============================================================
rem  Pulls to D:\New folder\price-maker and prepares LOCAL APK.
rem  Uses Android Studio / Gradle — not Expo Go, not expo.dev.
rem ============================================================

set "PARENT_DIR=D:\New folder"
set "TARGET_DIR=%PARENT_DIR%\price-maker"
set "GIT_URL=https://github.com/sparkyvicky-dev/price-maker.git"
set "BRANCH=cursor/alternative-apk-build-e99b"

echo.
echo  ================================================
echo   Price Maker — Local APK setup
echo   Path: D:\New folder\price-maker
echo   Android Studio / Gradle  ·  No Expo Go
echo  ================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo  Install Git first: https://git-scm.com/download/win
    start https://git-scm.com/download/win
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo  Install Node.js LTS: https://nodejs.org/
    start https://nodejs.org/
    pause
    exit /b 1
)

if not exist "%PARENT_DIR%" (
    echo  Creating %PARENT_DIR% ...
    mkdir "%PARENT_DIR%" 2>nul
    if not exist "%PARENT_DIR%" (
        echo  ERROR: Could not create %PARENT_DIR% — is D: available?
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
        git checkout main
        git pull origin main
    ) else (
        git pull origin %BRANCH%
    )
) else (
    if exist "%TARGET_DIR%" (
        echo  ERROR: %TARGET_DIR% exists but is not this git repo.
        pause
        exit /b 1
    )
    echo  Cloning into D:\New folder\price-maker ...
    git clone %GIT_URL% "%TARGET_DIR%"
    if errorlevel 1 (
        echo  Clone failed.
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
echo  Ready: %TARGET_DIR%
git branch --show-current
echo.

echo  Installing mobile packages...
cd /d "%TARGET_DIR%\mobile"
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo  npm install failed.
    pause
    exit /b 1
)

echo.
echo  Next you need Android Studio installed once:
echo    https://developer.android.com/studio
echo  Then this script will generate android\ and build the APK.
echo.
echo  Starting local APK builder...
echo.
call "%TARGET_DIR%\build-apk.bat"

exit /b 0
