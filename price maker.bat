@echo off
title Price Maker
setlocal

rem === Change this if your project folder is somewhere else ===
set "APP_DIR=%USERPROFILE%\Desktop\price-maker"
set "PORT=8080"

if not exist "%APP_DIR%\index.html" (
    echo.
    echo  Price Maker was not found at:
    echo  %APP_DIR%
    echo.
    echo  Put the price-maker folder on your Desktop, or edit APP_DIR
    echo  at the top of this file to point to your project folder.
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
