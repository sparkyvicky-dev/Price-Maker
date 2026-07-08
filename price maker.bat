@echo off
title Price Maker
setlocal

rem Auto-detect project folder when this file lives inside the repo.
set "APP_DIR=%~dp0"
set "APP_DIR=%APP_DIR:~0,-1%"
set "PORT=8080"

if not exist "%APP_DIR%\index.html" (
    echo.
    echo  Desktop launcher not set up yet.
    echo  Run setup.bat once from your project folder.
    echo.
    pause
    exit /b 1
)

cd /d "%APP_DIR%"

where py >nul 2>&1
if %errorlevel%==0 (
    set "PY=py"
) else (
    set "PY=python"
)

echo.
echo  Starting Price Maker...
echo  Open: http://localhost:%PORT%
echo  Close this window to stop the app.
echo.

start "" "http://localhost:%PORT%"
%PY% -m http.server %PORT%

pause
