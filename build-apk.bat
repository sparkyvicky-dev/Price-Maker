@echo off
title Price Maker - Build Android APK
setlocal EnableExtensions

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "MOBILE=%ROOT%\mobile"

echo.
echo  ========================================
echo   Price Maker - Local Android APK Build
echo  ========================================
echo.
echo  This builds a real APK you install on your phone.
echo  No Expo Go needed.
echo.

if not exist "%MOBILE%\package.json" (
    echo  ERROR: mobile folder not found at:
    echo  %MOBILE%
    echo  Run this from F:\New folder\Price-Maker\
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found. Install LTS from https://nodejs.org/
    pause
    exit /b 1
)

where java >nul 2>&1
if errorlevel 1 (
    echo  WARNING: Java not found in PATH.
    echo  Install JDK 17 from https://adoptium.net/
    echo.
)

if "%ANDROID_HOME%"=="" if "%ANDROID_SDK_ROOT%"=="" (
    echo  WARNING: ANDROID_HOME is not set.
    echo  Install Android Studio, then set ANDROID_HOME to your SDK folder.
    echo  Example: set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
    echo.
)

cd /d "%MOBILE%"

echo  [1/4] Installing npm packages...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo  npm install failed.
    pause
    exit /b 1
)

echo.
echo  [2/4] Generating native Android project...
call npx expo prebuild --platform android --clean
if errorlevel 1 (
    echo  prebuild failed.
    pause
    exit /b 1
)

echo.
echo  [3/4] Building release APK with Gradle...
cd /d "%MOBILE%\android"
call gradlew.bat assembleRelease
if errorlevel 1 (
    echo.
    echo  Gradle build failed.
    echo  Make sure Android Studio + SDK + JDK 17 are installed.
    echo  See docs\BUILD-APK-WINDOWS.md
    pause
    exit /b 1
)

set "APK=%MOBILE%\android\app\build\outputs\apk\release\app-release.apk"
if not exist "%APK%" (
    set "APK=%MOBILE%\android\app\build\outputs\apk\release\app-release-unsigned.apk"
)

echo.
echo  [4/4] Done!
echo.
if exist "%APK%" (
    echo  APK ready:
    echo  %APK%
    echo.
    echo  Copy to phone and install, or run:
    echo    adb install -r "%APK%"
    explorer "%MOBILE%\android\app\build\outputs\apk\release"
) else (
    echo  Build finished but APK path not found.
    echo  Check: %MOBILE%\android\app\build\outputs\apk\
)

echo.
pause
exit /b 0
