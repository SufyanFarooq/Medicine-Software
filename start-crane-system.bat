@echo off
echo ========================================
echo    Crane Management System - UAE
echo ========================================
echo.
echo Starting the system...
echo.
echo Database: crane_management_db
echo Admin: superadmin / admin123
echo.
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if MongoDB is running
echo Checking MongoDB connection...
node -e "const { MongoClient } = require('mongodb'); MongoClient.connect('mongodb://localhost:27017').then(() => { console.log('MongoDB is running'); process.exit(0); }).catch(() => { console.log('MongoDB is not running'); process.exit(1); });" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: MongoDB is not running!
    echo Please start MongoDB service first
    echo.
    echo To start MongoDB on Windows:
    echo net start MongoDB
    echo.
    pause
    exit /b 1
)

echo MongoDB connection successful!
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Start the application
echo Starting Crane Management System...
echo.
echo Access the system at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.
npm run dev

pause
