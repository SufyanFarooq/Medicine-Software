@echo off
chcp 65001 >nul
title Medicine Software - One Click Install & Run

echo.
echo ========================================
echo    🏥 Medicine Software
echo    One Click Install & Run
echo ========================================
echo.

REM Change to the directory where this script is located
cd /d "%~dp0"

echo 🔍 Checking if everything is installed...

REM Check if Node.js, npm, and MongoDB are installed
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found - need to install
    set "NEED_INSTALL=1"
) else (
    echo ✅ Node.js is installed
    set "NEED_INSTALL=0"
)

echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found - need to install
    set "NEED_INSTALL=1"
) else (
    echo ✅ npm is installed
)

echo Checking MongoDB...
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MongoDB not found - need to install
    set "NEED_INSTALL=1"
) else (
    echo ✅ MongoDB is installed
)

echo.

if "%NEED_INSTALL%"=="1" (
    echo 📦 Some components need to be installed.
    echo.
    echo This will:
    echo - Download and install Node.js
    echo - Download and install MongoDB
    echo - Set up everything automatically
    echo.
    echo ⚠️  This requires Administrator privileges
    echo.
    echo Press any key to start installation...
    pause >nul
    
    REM Run the auto-installer
    echo Starting auto-installer...
    call auto-install-windows.bat
    
    echo.
    echo 🔄 Refreshing environment...
    timeout /t 3 /nobreak >nul
) else (
    echo ✅ All components are already installed!
)

echo.
echo 🚀 Starting Medicine Software...
echo.

REM Check if dependencies are installed
echo Checking dependencies...
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies.
        echo Please check your internet connection and try again.
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
) else (
    echo ✅ Dependencies already installed
)

REM Check if the app is built
echo Checking if app is built...
if not exist ".next" (
    echo 🔨 Building the application...
    npm run build
    if %errorlevel% neq 0 (
        echo ❌ Failed to build the application.
        echo Please check the error messages above.
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    echo ✅ Application built successfully
) else (
    echo ✅ Application already built
)

REM Start MongoDB if not running
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if %errorlevel% neq 0 (
    echo 🔧 Starting MongoDB...
    net start MongoDB 2>nul || (
        echo ⚠️  Could not start MongoDB service
        echo Trying to start manually...
        "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath "C:\data\db" &
        timeout /t 5 /nobreak >nul
    )
)

REM Start the application
echo 🏥 Starting Medicine Software...
echo 📱 The app will open in your browser at: http://localhost:3000
echo 🔄 Press Ctrl+C to stop the application
echo.

REM Open browser after a short delay
timeout /t 3 /nobreak >nul
start http://localhost:3000

REM Start the Next.js application
npm start

echo.
echo 🏥 Application stopped. Press any key to close this window...
pause >nul 