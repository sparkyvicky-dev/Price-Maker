@echo off
title Price Maker Setup
setlocal EnableExtensions

set "REPO_DIR=%~dp0"
set "REPO_DIR=%REPO_DIR:~0,-1%"
set "PORT=8080"
set "LAUNCHER_NAME=price maker.bat"

if not exist "%REPO_DIR%\index.html" (
    echo.
    echo  Run this file from inside your Price Maker project folder.
    echo.
    pause
    exit /b 1
)

call :FindDesktop
if not defined DESKTOP (
    echo.
    echo  Could not find your Desktop folder.
    echo  Create a Desktop folder or sign in to Windows, then try again.
    echo.
    pause
    exit /b 1
)

set "LAUNCHER=%DESKTOP%\%LAUNCHER_NAME%"

echo.
echo  Installing desktop launcher...
echo  Project : %REPO_DIR%
echo  Desktop : %DESKTOP%
echo  Launcher: %LAUNCHER%
echo.

call :WriteLauncher

if not exist "%LAUNCHER%" (
    echo.
    echo  Failed to create the desktop launcher.
    echo  Try running setup.bat as Administrator, or check Desktop permissions.
    echo.
    pause
    exit /b 1
)

echo  Done! "%LAUNCHER_NAME%" is on your Desktop.
echo  Double-click it anytime to start Price Maker.
echo.

set /p START_NOW="Start Price Maker now? (Y/N): "
if /I "%START_NOW%"=="Y" start "" "%LAUNCHER%"

echo.
pause
exit /b 0

:FindDesktop
set "DESKTOP="

rem Best option on modern Windows (OneDrive Desktop, localized names, etc.)
for /f "usebackq delims=" %%D in (`powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')" 2^>nul`) do set "DESKTOP=%%D"

if defined DESKTOP if exist "%DESKTOP%\" exit /b 0

if exist "%USERPROFILE%\Desktop\" (
    set "DESKTOP=%USERPROFILE%\Desktop"
    exit /b 0
)

if exist "%USERPROFILE%\OneDrive\Desktop\" (
    set "DESKTOP=%USERPROFILE%\OneDrive\Desktop"
    exit /b 0
)

if exist "%USERPROFILE%\OneDrive - Personal\Desktop\" (
    set "DESKTOP=%USERPROFILE%\OneDrive - Personal\Desktop"
    exit /b 0
)

exit /b 0

:WriteLauncher
if exist "%LAUNCHER%" del /f /q "%LAUNCHER%" >nul 2>&1

> "%LAUNCHER%" echo @echo off
>> "%LAUNCHER%" echo title Price Maker
>> "%LAUNCHER%" echo setlocal
>> "%LAUNCHER%" echo.
>> "%LAUNCHER%" echo set "APP_DIR=%REPO_DIR%"
>> "%LAUNCHER%" echo set "PORT=%PORT%"
>> "%LAUNCHER%" echo.
>> "%LAUNCHER%" echo if not exist "%%APP_DIR%%\index.html" ^(
>> "%LAUNCHER%" echo     echo.
>> "%LAUNCHER%" echo     echo  Price Maker folder not found at:
>> "%LAUNCHER%" echo     echo  %%APP_DIR%%
>> "%LAUNCHER%" echo     echo.
>> "%LAUNCHER%" echo     echo  Run setup.bat again from your project folder.
>> "%LAUNCHER%" echo     echo.
>> "%LAUNCHER%" echo     pause
>> "%LAUNCHER%" echo     exit /b 1
>> "%LAUNCHER%" echo ^)
>> "%LAUNCHER%" echo.
>> "%LAUNCHER%" echo cd /d "%%APP_DIR%%"
>> "%LAUNCHER%" echo.
>> "%LAUNCHER%" echo where py ^>nul 2^>^&1
>> "%LAUNCHER%" echo if %%errorlevel%%==0 ^(
>> "%LAUNCHER%" echo     set "PY=py"
>> "%LAUNCHER%" echo ^) else ^(
>> "%LAUNCHER%" echo     set "PY=python"
>> "%LAUNCHER%" echo ^)
>> "%LAUNCHER%" echo.
>> "%LAUNCHER%" echo echo.
>> "%LAUNCHER%" echo echo  Starting Price Maker...
>> "%LAUNCHER%" echo echo  Open: http://localhost:%%PORT%%
>> "%LAUNCHER%" echo echo  Close this window to stop the app.
>> "%LAUNCHER%" echo echo.
>> "%LAUNCHER%" echo.
>> "%LAUNCHER%" echo start "" "http://localhost:%%PORT%%"
>> "%LAUNCHER%" echo %%PY%% -m http.server %%PORT%%
>> "%LAUNCHER%" echo.
>> "%LAUNCHER%" echo pause
exit /b 0
