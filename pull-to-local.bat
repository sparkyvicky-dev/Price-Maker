@echo off
title Price Maker - Pull to D:\Github projects
setlocal EnableExtensions

set "PARENT_DIR=D:\Github projects"
set "TARGET_DIR=%PARENT_DIR%\price-maker"
set "GIT_URL=https://github.com/sparkyvicky-dev/price-maker.git"
set "BRANCH=main"

echo.
echo  ============================================================
echo   Price Maker - Local PC setup
echo   Target: %TARGET_DIR%
echo   Repo  : %GIT_URL%
echo  ============================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Git is not installed.
    echo.
    echo  1. Install Git: https://git-scm.com/download/win
    echo  2. Open a NEW Command Prompt
    echo  3. Run this file again
    echo.
    echo  Full guide: docs\LOCAL-PC-SETUP.md
    echo.
    pause
    exit /b 1
)

if not exist "%PARENT_DIR%" (
    echo  Creating folder: %PARENT_DIR%
    mkdir "%PARENT_DIR%" 2>nul
    if not exist "%PARENT_DIR%" (
        echo  ERROR: Could not create %PARENT_DIR%
        echo  Check drive D: exists or change PARENT_DIR in this script.
        pause
        exit /b 1
    )
)

if exist "%TARGET_DIR%\.git" (
    echo  Project found. Pulling latest from %BRANCH% ...
    echo.
    cd /d "%TARGET_DIR%"
    git fetch origin %BRANCH%
    git pull origin %BRANCH%
    if errorlevel 1 (
        echo.
        echo  Pull failed. See messages above.
        echo  If you have local changes, commit or stash them first:
        echo    git stash
        echo    git pull origin %BRANCH%
        echo.
        pause
        exit /b 1
    )
    goto :Success
)

if exist "%TARGET_DIR%" (
    echo  Folder exists but is not a git repo:
    echo  %TARGET_DIR%
    echo.
    echo  Move or rename that folder, then run this script again.
    echo  Or clone manually:
    echo    cd /d "%PARENT_DIR%"
    echo    git clone %GIT_URL% price-maker
    echo.
    pause
    exit /b 1
)

echo  Cloning project for the first time ...
echo.
cd /d "%PARENT_DIR%"
git clone %GIT_URL% price-maker
if errorlevel 1 (
    echo.
    echo  Clone failed. Check internet and GitHub access.
    pause
    exit /b 1
)

:Success
echo.
echo  ============================================================
echo   SUCCESS
echo  ============================================================
echo.
echo  Project folder:
echo    %TARGET_DIR%
echo.
if exist "%TARGET_DIR%\index.html" (
    echo  [OK] PC web app
) else (
    echo  [--] PC web app missing - try git pull again
)
if exist "%TARGET_DIR%\mobile\package.json" (
    echo  [OK] Android mobile app
) else (
    echo  [--] Android app missing - run: git pull origin main
)
echo.
echo  Next steps:
echo    1. Read docs\LOCAL-PC-SETUP.md
echo    2. PC app     : run setup.bat, then use desktop "price maker.bat"
echo    3. Android    : run setup-mobile.bat once, then start-mobile.bat
echo    4. After edits: git add . ^&^& git commit -m "..." ^&^& git push
echo.

set /p OPEN_FOLDER="Open project folder in Explorer? (Y/N): "
if /I "%OPEN_FOLDER%"=="Y" start "" explorer "%TARGET_DIR%"

pause
exit /b 0
