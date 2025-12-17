@echo off
chcp 65001 >nul
title Medical Shop Management Tool

echo.
echo ========================================
echo    Medical Shop Management Tool
echo ========================================
echo.

REM Change to the directory where this script is located
cd /d "%~dp0"

echo Starting Medical Shop Management Tool...

REM Check if package.json exists
if not exist "package.json" (
    echo Error: package.json not found!
    echo Please make sure you're running this script from the Medicine Software folder.
    echo Current directory: %CD%
    pause
    exit /b 1
)
echo Found package.json in: %CD%

REM Check Node.js installation
echo Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Install from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

REM Check npm installation
echo Checking npm installation...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not installed or not in PATH.
    echo Install Node.js again and ensure "Add to PATH" is checked.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo npm version: %NPM_VERSION%

REM Check if MongoDB is running
echo Checking MongoDB status...

REM First check if MongoDB service is running
sc query MongoDB 2>NUL | find "RUNNING" >NUL
if "%ERRORLEVEL%"=="0" (
    echo MongoDB service is running!
    goto :mongodb_ok
)

REM Check if mongod.exe process is running
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo MongoDB is already running!
    goto :mongodb_ok
)

REM MongoDB is not running - try to start the service
echo MongoDB is not running. Attempting to start...

REM Check if MongoDB service exists
sc query MongoDB >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    echo Starting MongoDB service...
    sc start MongoDB >nul 2>&1
    timeout /t 3 /nobreak >nul
    
    sc query MongoDB 2>NUL | find "RUNNING" >NUL
    if "%ERRORLEVEL%"=="0" (
        echo MongoDB service started successfully!
        goto :mongodb_ok
    )
)

REM Service doesn't exist or failed to start - try manual start
echo MongoDB service not found or failed to start. Trying manual start...

set "MONGODB_FOUND=0"
if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" (
    set "MONGODB_PATH=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
    set "MONGODB_FOUND=1"
) else if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
    set "MONGODB_PATH=C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
    set "MONGODB_FOUND=1"
) else if exist "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" (
    set "MONGODB_PATH=C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
    set "MONGODB_FOUND=1"
) else if exist "C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe" (
    set "MONGODB_PATH=C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe"
    set "MONGODB_FOUND=1"
)

if "%MONGODB_FOUND%"=="1" (
    if not exist "C:\data\db" (
        echo Creating MongoDB data directory...
        mkdir "C:\data\db" 2>nul
    )
    echo Starting MongoDB manually...
    start /B "MongoDB" "%MONGODB_PATH%" --dbpath "C:\data\db"
    timeout /t 5 /nobreak >nul
    
    tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
    if "%ERRORLEVEL%"=="0" (
        echo MongoDB started successfully!
        echo.
        echo ⚠️  NOTE: MongoDB is running manually. For auto-start on boot,
        echo    please run setup-mongodb-service.bat as Administrator
        echo    to install MongoDB as a Windows Service.
        echo.
    ) else (
        echo ❌ Failed to start MongoDB.
        echo.
        echo Please ensure MongoDB is installed and try one of these:
        echo 1. Run setup-mongodb-service.bat as Administrator (recommended)
        echo 2. Start MongoDB manually: "%MONGODB_PATH%" --dbpath "C:\data\db"
        echo 3. Install MongoDB from: https://www.mongodb.com/try/download/community
        echo.
    )
) else (
    echo ❌ MongoDB is not installed!
    echo.
    echo Please install MongoDB from: https://www.mongodb.com/try/download/community
    echo Or run auto-install.bat to install automatically.
    echo.
)

:mongodb_ok

REM Install dependencies if not found
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully!
) else (
    echo Dependencies already installed!
)

REM Build app if not built
if not exist ".next" (
    echo Building the application...
    npm run build
    if %errorlevel% neq 0 (
        echo Failed to build the application.
        pause
        exit /b 1
    )
    echo Application built successfully!
) else (
    echo Application already built!
)

REM Start the application
echo ========================================
echo Starting Retail Shop Management Tool
echo ========================================
echo Opening: http://localhost:3000
timeout /t 3 /nobreak >nul
start http://localhost:3000
npm start

echo Application stopped. Press any key to close...
pause