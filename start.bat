@echo off
echo ========================================
echo   Starting Remote Cronjob Manager
echo ========================================
echo.

start "Cronjob Backend" /D "%~dp0src\backend" cmd /k "npm start"
start "Cronjob Frontend" /D "%~dp0src\frontend" cmd /k "npm run dev"

echo Waiting for the servers to start...
timeout /t 5 >nul

start http://localhost:5173

echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo Development login: admin / admin123
echo   (applies only while ADMIN_PASSWORD is not set)
echo.
pause
