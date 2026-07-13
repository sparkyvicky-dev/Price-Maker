@echo off
title Price Maker - Check folders on this PC
setlocal EnableExtensions

echo.
echo  Checking common Price Maker locations on this PC ...
echo.

call :Check "D:\Github projects\price-maker"
call :Check "F:\New folder\price-maker"
call :Check "F:\New folder\Price-Maker"
call :Check "C:\Users\12vic\sparky-mobiles-price-manager"
call :Check "C:\Users\12vic\Price-Maker"
call :Check "C:\Users\12vic\price-maker"
call :Check "C:\Users\%USERNAME%\Price-Maker"

echo.
echo  Recommended local path: D:\Github projects\price-maker
echo  First time? Run pull-to-local.bat  ^|  Guide: docs\LOCAL-PC-SETUP.md
echo  If mobile is missing, run setup-mobile.bat (downloads + installs Android app)
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
