@echo off
title Price Maker - Check folders on this PC
setlocal EnableExtensions

echo.
echo  Checking Price Maker locations on this PC ...
echo.

call :Check "D:\New folder\price-maker"
call :Check "D:\Github projects\price-maker"
call :Check "F:\New folder\price-maker"
call :Check "C:\Users\%USERNAME%\Documents\price-maker"
call :Check "C:\Users\%USERNAME%\price-maker"

echo.
echo  Recommended on this PC: D:\New folder\price-maker
echo  Pull: run pull-to-local.bat
echo  APK:  run setup-apk-pc.bat  ^(no Expo Go^)
echo.
pause
exit /b 0

:Check
set "PATH1=%~1"
if exist "%PATH1%" (
    echo  [FOUND] %PATH1%
    if exist "%PATH1%\index.html" echo         - Web app: YES
    if exist "%PATH1%\mobile\package.json" echo         - Android mobile app: YES
    if exist "%PATH1%\setup.bat" echo         - PC launcher setup: YES
) else (
    echo  [ --- ] %PATH1%
)
echo.
exit /b 0
