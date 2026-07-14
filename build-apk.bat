@echo off
title Price Maker - Build Android APK (no Expo Go)
setlocal EnableExtensions

rem ============================================================
rem  Build a standalone APK you install like a normal app.
rem  No Expo Go required on the phone.
rem ============================================================

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "MOBILE_DIR=%ROOT%\mobile"

echo.
echo  ========================================
echo   Price Maker — Build APK
echo   (standalone install — no Expo Go)
echo  ========================================
echo.
echo  Project: %ROOT%
echo.

if not exist "%MOBILE_DIR%\package.json" (
    echo  ERROR: mobile\ folder not found.
    echo  Run setup-mobile.bat first, or:
    echo    git pull origin main
    echo.
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js is not installed.
    echo  Download LTS: https://nodejs.org/
    echo.
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

echo  Choose how to build the APK:
echo.
echo    1  Cloud build ^(EAS — recommended, no Android Studio^)
echo    2  Local build ^(needs Android Studio + SDK on this PC^)
echo    3  Open build guide
echo    4  Cancel
echo.
set /p CHOICE="Enter 1, 2, 3 or 4: "

if "%CHOICE%"=="1" goto CLOUD
if "%CHOICE%"=="2" goto LOCAL
if "%CHOICE%"=="3" goto GUIDE
if "%CHOICE%"=="4" goto CANCEL
echo  Invalid choice.
pause
exit /b 1

:CLOUD
echo.
echo  --- Cloud EAS build (APK) ---
echo  1. You need a free Expo account: https://expo.dev/signup
echo  2. When asked, log in in this window
echo  3. Build usually takes 10–20 minutes in the cloud
echo  4. When done, open the link and download the .apk
echo  5. On phone: allow Install from unknown sources if asked
echo.
echo  Starting login / build...
echo.

call npx --yes eas-cli@latest login
if errorlevel 1 (
    echo  Login failed or cancelled.
    pause
    exit /b 1
)

echo.
echo  Building Android APK profile "apk"...
echo.
call npx --yes eas-cli@latest build -p android --profile apk --non-interactive
if errorlevel 1 (
    echo.
    echo  Non-interactive build failed — retrying with prompts...
    echo.
    call npx --yes eas-cli@latest build -p android --profile apk
)

echo.
echo  When the build finishes, Expo prints a download URL.
echo  Or open: https://expo.dev/accounts/[you]/projects/price-maker/builds
echo.
echo  Install the APK on your phone — Expo Go is NOT needed.
echo.
pause
exit /b 0

:LOCAL
echo.
echo  --- Local APK build ---
echo  Requires Android Studio with Android SDK + JDK 17.
echo  Guide: docs\BUILD-APK.md
echo.
set /p CONFIRM="Continue with local prebuild + Gradle? (Y/N): "
if /I not "%CONFIRM%"=="Y" goto CANCEL

echo.
echo  Generating native Android project...
call npx expo prebuild --platform android --clean
if errorlevel 1 (
    echo  expo prebuild failed.
    pause
    exit /b 1
)

echo.
echo  Building release APK with Gradle...
cd /d "%MOBILE_DIR%\android"
call gradlew.bat assembleRelease
if errorlevel 1 (
    echo.
    echo  Gradle build failed.
    echo  Install Android Studio, open mobile\android, then Build ^> Build APK.
    echo  See docs\BUILD-APK.md
    echo.
    pause
    exit /b 1
)

echo.
echo  SUCCESS — APK should be here:
echo  %MOBILE_DIR%\android\app\build\outputs\apk\release\app-release.apk
echo.
echo  Copy that file to your phone and open it to install.
echo.
pause
exit /b 0

:GUIDE
echo.
echo  Opening docs\BUILD-APK.md ...
if exist "%ROOT%\docs\BUILD-APK.md" (
    start "" "%ROOT%\docs\BUILD-APK.md"
) else (
    echo  File missing. Pull latest: git pull origin main
)
echo.
pause
exit /b 0

:CANCEL
echo  Cancelled.
pause
exit /b 0
