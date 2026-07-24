@echo off
title NodeFlow Server Control - RESTART
color 0e
echo ===================================================
echo   🔄 Restarting NodeFlow Server...
echo ===================================================
echo.

setlocal enabledelayedexpansion
set "port=3001"

if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="PORT" set "port=%%b"
    )
)

:: 1. Stop any running instance on configured port
echo 1. Stopping existing instance on port %port%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :%port%') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

:: 2. Boot up new server
echo 2. Booting up new NodeFlow server instance...
start "NodeFlow Server" cmd /k "cd /d %~dp0 && npm run dev"

:: 3. Open browser
timeout /t 3 /nobreak >nul
echo 3. Opening browser at http://localhost:%port%...
start http://localhost:%port%

echo.
echo ✓ NodeFlow server successfully restarted!
echo.
pause
