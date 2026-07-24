@echo off
title NodeFlow Server Control - STOP
color 0c
echo ===================================================
echo   🛑 Stopping NodeFlow Server...
echo ===================================================
echo.

setlocal enabledelayedexpansion
set "port=3001"

if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="PORT" set "port=%%b"
    )
)

set "found=0"

:: Search process ID listening on configured port
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :%port%') do (
    set "pid=%%a"
    if not "!pid!"=="" (
        set /a "found+=1"
        echo ⏳ Found running Node instance [PID: !pid!]. Stopping it...
        taskkill /F /PID !pid! >nul 2>&1
    )
)

if !found! equ 0 (
    echo i No active NodeFlow process found listening on port %port%.
) else (
    echo ✓ Successfully stopped NodeFlow server on port %port%.
)

echo.
pause
