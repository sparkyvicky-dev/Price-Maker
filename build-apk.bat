@echo off
title Price Maker - Build APK (NO Expo Go)
setlocal EnableExtensions

rem ============================================================
rem  Standalone .apk for the phone. Not Expo Go.
rem  Usage:
rem    build-apk.bat          → asks cloud vs local
rem    build-apk.bat cloud    → cloud APK only (default for new PC)
rem ============================================================

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "MOBILE_DIR=%ROOT%\mobile"
set "MODE=%~1"

echo.
echo  ========================================
echo   Price Maker — Build APK
echo   Result = .apk file on your phone
echo   Expo Go = NOT used
echo  ========================================
echo.
echo  Project: %ROOT%
echo.

if not exist "%MOBILE_DIR%\package.json" (
    echo  ERROR: mobile\ folder not found.
    echo  On a new PC run setup-apk-pc.bat instead.
    echo  Or pull to D:\New folder:
    echo    git clone https://github.com/sparkyvicky-dev/price-maker.git "D:\New folder\price-maker"
    echo.
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not installed.
    echo  Download LTS: https://nodejs.org/
    start https://nodejs.org/
    pause
    exit /b 1
)

cd /d "%MOBILE_DIR%"

if not exist "node_modules\expo\package.json" (
    echo  Installing dependencies...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo  npm install failed.
        pause
        exit /b 1
    )
    echo.
)

if /I "%MODE%"=="cloud" goto CLOUD
if /I "%MODE%"=="1" goto CLOUD
if /I "%MODE%"=="local" goto LOCAL
if /I "%MODE%"=="2" goto LOCAL

echo  Build the installable APK ^(pick one^):
echo.
echo    1  Cloud APK  — recommended ^(no Android Studio^)
echo    2  Local APK  — needs Android Studio on this PC
echo    3  Cancel
echo.
echo  Note: Cloud build waits ~10–20 min once. Then phone installs
echo  the .apk forever — you do NOT open Expo Go.
echo.
set /p CHOICE="Enter 1, 2 or 3: "

if "%CHOICE%"=="1" goto CLOUD
if "%CHOICE%"=="2" goto LOCAL
goto CANCEL

:CLOUD
echo.
echo  --- Cloud APK build ---
echo  Free Expo website account is only to QUEUE the build.
echo  That is NOT the Expo Go phone app.
echo.
echo  Steps after login:
echo    - Wait for build link / open expo.dev Builds
echo    - Download .apk
echo    - Tap it on phone → Install
echo.

call npx --yes eas-cli@latest login
if errorlevel 1 (
    echo  Login failed or cancelled.
    pause
    exit /b 1
)

echo.
echo  Building Android APK now...
echo.
call npx --yes eas-cli@latest build -p android --profile apk --non-interactive
if errorlevel 1 (
    echo.
    echo  Retrying with prompts...
    echo.
    call npx --yes eas-cli@latest build -p android --profile apk
)

echo.
echo  DONE waiting? Use the URL in the log, or:
echo  https://expo.dev  → your project → Builds → Download APK
echo.
echo  Install on phone. Expo Go is not required.
echo.
pause
exit /b 0

:LOCAL
echo.
echo  --- Local APK ^(Android Studio required^) ---
set /p CONFIRM="Continue? (Y/N): "
if /I not "%CONFIRM%"=="Y" goto CANCEL

echo.
call npx expo prebuild --platform android --clean
if errorlevel 1 (
    echo  prebuild failed.
    pause
    exit /b 1
)

cd /d "%MOBILE_DIR%\android"
call gradlew.bat assembleRelease
if errorlevel 1 (
    echo  Gradle failed. Open mobile\android in Android Studio.
    pause
    exit /b 1
)

echo.
echo  APK file:
echo  %MOBILE_DIR%\android\app\build\outputs\apk\release\app-release.apk
echo  Copy to phone and install.
echo.
pause
exit /b 0

:CANCEL
echo  Cancelled.
pause
exit /b 0
