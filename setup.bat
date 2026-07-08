@echo off
title Price Maker Setup
setlocal EnableDelayedExpansion

set "REPO_DIR=%~dp0"
set "REPO_DIR=%REPO_DIR:~0,-1%"
set "DESKTOP=%USERPROFILE%\Desktop"
set "LAUNCHER=%DESKTOP%\price maker.bat"
set "PORT=8080"

if not exist "%REPO_DIR%\index.html" (
    echo.
    echo  This setup file must stay inside the Price Maker project folder.
    echo.
    pause
    exit /b 1
)

echo.
echo  Installing desktop launcher...
echo  Project: %REPO_DIR%
echo  Desktop: %LAUNCHER%
echo.

(
echo @echo off
echo title Price Maker
echo setlocal
echo.
echo set "APP_DIR=%REPO_DIR%"
echo set "PORT=%PORT%"
echo.
echo if not exist "%%APP_DIR%%\index.html" ^(
echo     echo.
echo     echo  Price Maker folder not found at:
echo     echo  %%APP_DIR%%
echo     echo.
echo     echo  Run setup.bat again from your project folder.
echo     echo.
echo     pause
echo     exit /b 1
echo ^)
echo.
echo cd /d "%%APP_DIR%%"
echo.
echo where py ^>nul 2^>^&1
echo if %%errorlevel%%==0 ^(
echo     set "PY=py"
echo ^) else ^(
echo     set "PY=python"
echo ^)
echo.
echo echo.
echo echo  Starting Price Maker...
echo echo  Open: http://localhost:%%PORT%%
echo echo  Close this window to stop the app.
echo echo.
echo.
echo start "" "http://localhost:%%PORT%%"
echo %%PY%% -m http.server %%PORT%%
echo.
echo pause
) > "%LAUNCHER%"

if not exist "%LAUNCHER%" (
    echo  Failed to create desktop launcher.
    pause
    exit /b 1
)

echo  Done! "price maker.bat" is now on your Desktop.
echo.
echo  Double-click it anytime to start the app.
echo.

choice /C YN /M "Start Price Maker now"
if errorlevel 2 goto :end
if errorlevel 1 start "" "%LAUNCHER%"

:end
echo.
pause
