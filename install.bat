@echo off
echo ========================================
echo   Remote Cronjob Manager - Installer
echo ========================================
echo.

echo [1/2] Installing backend dependencies...
cd /d "%~dp0src\backend"
call npm ci
if errorlevel 1 (
    echo ERROR: Backend installation failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Installing frontend dependencies...
cd /d "%~dp0src\frontend"
call npm ci
if errorlevel 1 (
    echo ERROR: Frontend installation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Installation complete
echo ========================================
echo.
echo Next step: double-click "start.bat".
echo On Windows the backend runs in mock mode: the real crontab is not
echo touched and commands are not executed.
echo.
pause
