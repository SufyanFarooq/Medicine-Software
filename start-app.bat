@echo off
chcp 65001 >nul
title Medical Shop Management Tool

echo.
echo ========================================
echo    🏥 Medicine Software
echo    Medical Shop Management Tool
echo ========================================
echo.

REM Change to the directory where this script is located
cd /d "%~dp0"

echo 🏥 Starting Medical Shop Management Tool...

REM Check if we're in the correct directory
if not exist "package.json" (
    echo ❌ Error: package.json not found!
    echo Please make sure you're running this script from the Medicine Software folder.
    echo.
    echo Current directory: %CD%
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Check if MongoDB is running
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo ⚠️  MongoDB is not running. Checking if MongoDB is installed...
    
    REM Check if MongoDB is installed in common locations
    set "MONGODB_FOUND=0"
    if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
        echo ✅ Found MongoDB 6.0, attempting to start...
        set "MONGODB_PATH=C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
        set "MONGODB_FOUND=1"
    ) else if exist "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" (
        echo ✅ Found MongoDB 5.0, attempting to start...
        set "MONGODB_PATH=C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
        set "MONGODB_FOUND=1"
    ) else if exist "C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe" (
        echo ✅ Found MongoDB 4.4, attempting to start...
        set "MONGODB_PATH=C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe"
        set "MONGODB_FOUND=1"
    )
    
    if "%MONGODB_FOUND%"=="1" (
        REM Create data directory if it doesn't exist
        if not exist "C:\data\db" (
            echo Creating MongoDB data directory...
            mkdir "C:\data\db" 2>nul
        )
        
        echo Starting MongoDB...
        start /B "MongoDB" "%MONGODB_PATH%" --dbpath "C:\data\db"
        timeout /t 5 /nobreak >nul
        
        REM Check if MongoDB started successfully
        tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
        if "%ERRORLEVEL%"=="0" (
            echo ✅ MongoDB started successfully!
        ) else (
            echo ❌ Failed to start MongoDB. Please start it manually.
        )
    ) else (
        echo.
        echo ❌ MongoDB is not installed on your system.
        echo.
        echo To install MongoDB:
        echo 1. Visit: https://www.mongodb.com/try/download/community
        echo 2. Download MongoDB Community Server for Windows
        echo 3. Run the installer and follow the setup wizard
        echo 4. Restart this script after installation
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
)

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

REM Start the application
echo 🚀 Starting the application...
echo 📱 The app will open in your browser at: http://localhost:3000
echo 🔄 Press Ctrl+C to stop the application

REM Open browser after a short delay
timeout /t 3 /nobreak >nul
start http://localhost:3000

REM Start the Next.js application
echo.
echo 🚀 Starting the application...
echo 📱 The app will open in your browser at: http://localhost:3000
echo 🔄 Press Ctrl+C to stop the application
echo.

npm start

echo.
echo 🏥 Application stopped. Press any key to close this window...
pause >nul 