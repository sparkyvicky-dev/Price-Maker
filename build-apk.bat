@echo off
title Price Maker - Build APK with Android Studio (local)
setlocal EnableExtensions

rem ============================================================
rem  LOCAL APK only — Android Studio / Gradle on this PC.
rem  No Expo Go. No expo.dev cloud.
rem  Folder: D:\New folder\price-maker
rem ============================================================

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "MOBILE_DIR=%ROOT%\mobile"
set "MODE=%~1"

echo.
echo  ========================================
echo   Price Maker — Local APK
echo   Android Studio / Gradle on this PC
echo   No Expo Go · No expo.dev cloud
echo  ========================================
echo.
echo  Project: %ROOT%
echo.

if not exist "%MOBILE_DIR%\package.json" (
    echo  ERROR: mobile\ folder not found.
    echo  First pull the project:
    echo    mkdir "D:\New folder"
    echo    cd /d "D:\New folder"
    echo    git clone https://github.com/sparkyvicky-dev/price-maker.git
    echo    cd price-maker
    echo    git checkout cursor/alternative-apk-build-e99b
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
if /I "%MODE%"=="studio" goto STUDIO_ONLY
if /I "%MODE%"=="gradle" goto GRADLE

echo  How to build ^(local Android Studio — recommended^):
echo.
echo    1  Generate Android project + build APK with Gradle
echo    2  Only generate project, then open in Android Studio
echo    3  Cloud build ^(expo.dev — optional, skip if you want local only^)
echo    4  Cancel
echo.
set /p CHOICE="Enter 1, 2, 3 or 4: "

if "%CHOICE%"=="1" goto GRADLE
if "%CHOICE%"=="2" goto STUDIO_ONLY
if "%CHOICE%"=="3" goto CLOUD
goto CANCEL

:GRADLE
echo.
echo  --- Step 1: generate native Android folder ---
call npx expo prebuild --platform android --clean
if errorlevel 1 (
    echo  prebuild failed.
    pause
    exit /b 1
)

echo.
echo  --- Step 2: Gradle assembleRelease ---
echo  If this fails, open Android Studio once:
echo    File → Open → D:\New folder\price-maker\mobile\android
echo  Let it download SDK, then run this script again or use
echo  Build → Build Bundle^(s^) / APK^(s^) → Build APK^(s^)
echo.
cd /d "%MOBILE_DIR%\android"
if not exist "gradlew.bat" (
    echo  ERROR: gradlew.bat missing after prebuild.
    pause
    exit /b 1
)

call gradlew.bat assembleRelease
if errorlevel 1 (
    echo.
    echo  Gradle failed. Use Android Studio UI instead ^(option 2^).
    echo.
    pause
    exit /b 1
)

echo.
echo  SUCCESS — APK:
echo  %MOBILE_DIR%\android\app\build\outputs\apk\release\app-release.apk
echo.
echo  Copy that file to your phone and install it.
echo  No Expo Go needed.
echo.
set /p OPEN_APK="Open APK folder in Explorer? (Y/N): "
if /I "%OPEN_APK%"=="Y" start "" explorer "%MOBILE_DIR%\android\app\build\outputs\apk\release"
pause
exit /b 0

:STUDIO_ONLY
echo.
echo  Generating Android project for Android Studio...
call npx expo prebuild --platform android --clean
if errorlevel 1 (
    echo  prebuild failed.
    pause
    exit /b 1
)

echo.
echo  Open this folder in Android Studio:
echo    %MOBILE_DIR%\android
echo.
echo  Then: Build → Build Bundle^(s^) / APK^(s^) → Build APK^(s^)
echo  APK will be under app\build\outputs\apk\
echo.
set /p OPEN_AS="Open android folder now? (Y/N): "
if /I "%OPEN_AS%"=="Y" start "" explorer "%MOBILE_DIR%\android"
pause
exit /b 0

:CLOUD
echo.
echo  Optional cloud path ^(expo.dev^). Not required for Android Studio.
echo.
call npx --yes eas-cli@latest login
call npx --yes eas-cli@latest build -p android --profile apk
pause
exit /b 0

:CANCEL
echo  Cancelled.
pause
exit /b 0
