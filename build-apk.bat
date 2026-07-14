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

rem Prefer JDK 17 / 21 — Java 25 breaks Gradle for this project
call :FindJava17
if not defined JAVA_HOME (
    echo.
    echo  ERROR: Need JDK 17 or 21. Your Java is too new or missing.
    echo.
    echo  EASY FIX: run this once from the project folder:
    echo    fix-java17.bat
    echo.
    echo  Or download Temurin 17:
    echo    https://adoptium.net/temurin/releases/?version=17
    echo.
    echo  Check current Java:
    echo    java -version
    echo.
    pause
    exit /b 1
)

echo  Using JAVA_HOME=%JAVA_HOME%
set "PATH=%JAVA_HOME%\bin;%PATH%"

if "%ANDROID_HOME%"=="" if "%ANDROID_SDK_ROOT%"=="" (
    if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
)
if "%ANDROID_HOME%"=="" if "%ANDROID_SDK_ROOT%"=="" (
    echo  WARNING: ANDROID_HOME is not set.
    echo  Example: set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
    echo.
) else (
    if "%ANDROID_HOME%"=="" set "ANDROID_HOME=%ANDROID_SDK_ROOT%"
    echo  Using ANDROID_HOME=%ANDROID_HOME%
)

cd /d "%MOBILE%"

echo.
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
    echo  If you see "Unsupported class file major version 69":
    echo    Install JDK 17 and set JAVA_HOME - Java 25 is too new.
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

:FindJava17
rem Keep existing JAVA_HOME if it looks like 17 or 21
if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" (
  "%JAVA_HOME%\bin\java.exe" -version 2>&1 | findstr /i "version \"17\|version \"21" >nul
  if not errorlevel 1 exit /b 0
)

rem Common JDK 17 / 21 install folders
for %%D in (
  "%ProgramFiles%\Eclipse Adoptium"
  "%ProgramFiles%\Java"
  "%ProgramFiles%\Microsoft"
  "%ProgramFiles%\Android\Android Studio\jbr"
  "%LOCALAPPDATA%\Programs\Eclipse Adoptium"
) do (
  if exist %%D (
    for /d %%J in (%%D\jdk-17* %%D\jdk-21* %%D\jdk17* %%D\jdk21*) do (
      if exist "%%J\bin\java.exe" (
        set "JAVA_HOME=%%J"
        exit /b 0
      )
    )
  )
)

rem Android Studio bundled JBR (often 17/21)
if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" (
  set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
  exit /b 0
)
if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr\bin\java.exe" (
  set "JAVA_HOME=%LOCALAPPDATA%\Programs\Android Studio\jbr"
  exit /b 0
)

set "JAVA_HOME="
exit /b 0
