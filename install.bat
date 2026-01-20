@echo off
echo ========================================
echo   Remote Cronjob API - Quick Installer
echo ========================================
echo.

echo [1/4] Installing backend dependencies...
cd /d "%~dp0src\backend"
call npm install
if errorlevel 1 (
    echo ERROR: Backend installation failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Installing frontend dependencies...
cd /d "%~dp0src\frontend"
call npm install
if errorlevel 1 (
    echo ERROR: Frontend installation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo IMPORTANT NEXT STEPS (Course Requirements):
echo.
echo 1. GitHub Repository:
echo    - Create a new public repository from template
echo    - Clone it and copy these files into it
echo    - Share the link on Telegram
echo.
echo 2. Start Application:
echo    - Double click "start.bat"
echo    - Login: admin / admin123
echo.
echo ========================================
pause
