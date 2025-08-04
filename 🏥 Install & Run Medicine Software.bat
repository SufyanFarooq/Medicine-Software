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
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found - need to install
    set "NEED_INSTALL=1"
) else (
    echo ✅ Node.js is installed
    set "NEED_INSTALL=0"
)

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found - need to install
    set "NEED_INSTALL=1"
) else (
    echo ✅ npm is installed
)

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
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies.
        pause
        exit /b 1
    )
)

REM Check if the app is built
if not exist ".next" (
    echo 🔨 Building the application...
    npm run build
    if %errorlevel% neq 0 (
        echo ❌ Failed to build the application.
        pause
        exit /b 1
    )
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