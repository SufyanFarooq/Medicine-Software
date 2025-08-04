@echo off
chcp 65001 >nul
title Medicine Software - Medical Shop Management Tool

echo.
echo ========================================
echo    🏥 Medicine Software
echo    Medical Shop Management Tool
echo ========================================
echo.

REM Change to the directory where this script is located
cd /d "%~dp0"

REM Run the main startup script
call start-app.bat

echo.
echo 🏥 Application stopped. Press any key to close this window...
pause >nul 