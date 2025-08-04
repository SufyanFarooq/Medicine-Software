@echo off
chcp 65001 >nul
title Medical Shop Management Tool

echo 🏥 Starting Medical Shop Management Tool...

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
    echo ⚠️  MongoDB is not running. Attempting to start MongoDB...
    
    REM Try to start MongoDB from common installation paths
    if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
        echo Starting MongoDB from Program Files...
        start /B "MongoDB" "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath "C:\data\db"
        timeout /t 5 /nobreak >nul
    ) else if exist "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" (
        echo Starting MongoDB from Program Files...
        start /B "MongoDB" "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" --dbpath "C:\data\db"
        timeout /t 5 /nobreak >nul
    ) else if exist "C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe" (
        echo Starting MongoDB from Program Files...
        start /B "MongoDB" "C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe" --dbpath "C:\data\db"
        timeout /t 5 /nobreak >nul
    ) else (
        echo ❌ MongoDB is not installed or not found in common locations.
        echo Please install MongoDB and ensure it's running.
        echo Visit: https://docs.mongodb.com/manual/installation/
        echo.
        echo Press any key to continue anyway...
        pause >nul
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
npm start

pause 