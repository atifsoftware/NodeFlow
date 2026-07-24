@echo off
title NodeFlow Server Control - START
color 0b
echo ===================================================
echo   🚀 Starting NodeFlow Development Server...
echo ===================================================
echo.

set "port=3001"

:: Parse PORT from .env if present
if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="PORT" set "port=%%b"
    )
)

:: Launch the development server in a new window
start "NodeFlow Server" cmd /k "cd /d %~dp0 && npm run dev"

:: Wait for server bootup
timeout /t 3 /nobreak >nul

:: Open browser automatically
echo 🌐 Opening browser at http://localhost:%port%...
start http://localhost:%port%

echo.
echo ✓ NodeFlow server successfully launched!
echo.
pause
