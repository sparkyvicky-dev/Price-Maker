@echo off
title Price Maker - Install JDK 17
setlocal EnableExtensions

echo.
echo  ========================================
echo   Install JDK 17 for APK builds
echo  ========================================
echo.
echo  Your PC currently has Java 25, which breaks Gradle.
echo  This will install Eclipse Temurin JDK 17.
echo.

where winget >nul 2>&1
if errorlevel 1 (
    echo  winget not found.
    echo  Install JDK 17 manually:
    echo    https://adoptium.net/temurin/releases/?version=17
    echo  Then set JAVA_HOME to the jdk-17 folder.
    pause
    exit /b 1
)

echo  Installing Eclipse Temurin JDK 17 via winget...
echo  Approve the installer if Windows asks.
echo.
winget install --id EclipseAdoptium.Temurin.17.JDK -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
    echo.
    echo  Temurin install failed. Trying Microsoft OpenJDK 17...
    winget install --id Microsoft.OpenJDK.17 -e --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
        echo.
        echo  Auto-install failed. Download manually:
        echo    https://adoptium.net/temurin/releases/?version=17
        pause
        exit /b 1
    )
)

echo.
echo  Finding JDK 17 folder...
set "FOUND="

for /d %%J in ("%ProgramFiles%\Eclipse Adoptium\jdk-17*") do (
    if exist "%%J\bin\java.exe" set "FOUND=%%J"
)
for /d %%J in ("%ProgramFiles%\Microsoft\jdk-17*") do (
    if exist "%%J\bin\java.exe" set "FOUND=%%J"
)
for /d %%J in ("%ProgramFiles%\Java\jdk-17*") do (
    if exist "%%J\bin\java.exe" set "FOUND=%%J"
)

if not defined FOUND (
    echo  JDK 17 may be installed but folder not detected yet.
    echo  Close this window, open NEW Command Prompt, run:
    echo    dir "C:\Program Files\Eclipse Adoptium"
    echo  Then set JAVA_HOME to the jdk-17-* folder.
    pause
    exit /b 1
)

echo  Found: %FOUND%
echo.
echo  Setting JAVA_HOME for your user account...
setx JAVA_HOME "%FOUND%" >nul
if errorlevel 1 (
    echo  Could not set JAVA_HOME with setx. Set it manually to:
    echo  %FOUND%
) else (
    echo  JAVA_HOME set to:
    echo  %FOUND%
)

echo.
echo  Also adding JDK 17 bin to user PATH ^(via setx^)...
rem Prepend JAVA_HOME\bin for new terminals - keep it simple for the user
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USERPATH=%%B"
echo %USERPATH% | find /i "%FOUND%\bin" >nul
if errorlevel 1 (
    setx PATH "%FOUND%\bin;%USERPATH%" >nul
    echo  PATH updated.
) else (
    echo  PATH already contains JDK 17 bin.
)

echo.
echo  ========================================
echo   IMPORTANT
echo  ========================================
echo  1. CLOSE this Command Prompt completely
echo  2. Open a NEW Command Prompt
echo  3. Run:
echo       java -version
echo     ^(must show 17.x.x, not 25^)
echo  4. Then:
echo       cd /d "F:\New folder\Price-Maker"
echo       build-apk.bat
echo.
pause
exit /b 0
