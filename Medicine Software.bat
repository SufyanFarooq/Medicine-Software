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
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo MongoDB is not running. Checking if MongoDB is installed...

    set "MONGODB_FOUND=0"
    if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
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
        echo Starting MongoDB...
        start /B "MongoDB" "%MONGODB_PATH%" --dbpath "C:\data\db"
        timeout /t 5 /nobreak >nul
        tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
        if "%ERRORLEVEL%"=="0" (
            echo MongoDB started successfully!
        ) else (
            echo Failed to start MongoDB. Please start it manually.
        )
    ) else (
        echo MongoDB is not installed. Install from:
        echo https://www.mongodb.com/try/download/community
    )
) else (
    echo MongoDB is already running!
)

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
echo Starting Medical Shop Management Tool
echo ========================================
echo Opening: http://localhost:3000
timeout /t 3 /nobreak >nul
start http://localhost:3000
npm start

echo Application stopped. Press any key to close...
pause
