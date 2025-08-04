@echo off
chcp 65001 >nul
title Medicine Software - System Check

echo.
echo ========================================
echo    🏥 Medicine Software - System Check
echo ========================================
echo.

REM Change to the directory where this script is located
cd /d "%~dp0"

echo 📁 Current Directory: %CD%
echo.

REM Check if package.json exists
if exist "package.json" (
    echo ✅ package.json found
) else (
    echo ❌ package.json not found
    echo Please run this script from the Medicine Software folder
    pause
    exit /b 1
)

REM Check Node.js
echo.
echo 🔍 Checking Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do echo ✅ Node.js: %%i
) else (
    echo ❌ Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
)

REM Check npm
echo.
echo 🔍 Checking npm...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo ✅ npm: %%i
) else (
    echo ❌ npm is not installed
)

REM Check MongoDB
echo.
echo 🔍 Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if %errorlevel% equ 0 (
    echo ✅ MongoDB is running
) else (
    echo ⚠️  MongoDB is not running
    echo Checking if MongoDB is installed...
    
    if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
        echo ✅ MongoDB 6.0 found (not running)
    ) else if exist "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" (
        echo ✅ MongoDB 5.0 found (not running)
    ) else if exist "C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe" (
        echo ✅ MongoDB 4.4 found (not running)
    ) else (
        echo ❌ MongoDB is not installed
        echo Please install MongoDB from https://www.mongodb.com/try/download/community
    )
)

echo.
echo ========================================
echo    System Check Complete
echo ========================================
echo.
echo Press any key to close...
pause >nul 