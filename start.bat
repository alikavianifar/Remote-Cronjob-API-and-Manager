@echo off
echo ========================================
echo   Starting Remote Cronjob Manager
echo ========================================
echo.

start "Cronjob Backend" /D "%~dp0src\backend" cmd /c "npm start"
start "Cronjob Frontend" /D "%~dp0src\frontend" cmd /c "npm run dev"

echo Waiting for servers to start...
timeout /t 5 >nul

echo Opening Dashboard...
start http://localhost:5173

echo.
echo Application is running!
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Login: admin / admin123
echo.
pause
