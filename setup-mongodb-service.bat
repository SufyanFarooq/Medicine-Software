@echo off
chcp 65001 >nul
title MongoDB Service Setup

echo.
echo ========================================
echo    MongoDB Windows Service Setup
echo ========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ This script requires Administrator privileges!
    echo.
    echo Please right-click and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo ✅ Running with Administrator privileges
echo.

REM Find MongoDB installation
set "MONGODB_FOUND=0"
set "MONGODB_PATH="
set "MONGODB_VERSION="

if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" (
    set "MONGODB_PATH=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
    set "MONGODB_VERSION=7.0"
    set "MONGODB_FOUND=1"
) else if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
    set "MONGODB_PATH=C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
    set "MONGODB_VERSION=6.0"
    set "MONGODB_FOUND=1"
) else if exist "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" (
    set "MONGODB_PATH=C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
    set "MONGODB_VERSION=5.0"
    set "MONGODB_FOUND=1"
) else if exist "C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe" (
    set "MONGODB_PATH=C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe"
    set "MONGODB_VERSION=4.4"
    set "MONGODB_FOUND=1"
)

if "%MONGODB_FOUND%"=="0" (
    echo ❌ MongoDB is not installed!
    echo.
    echo Please install MongoDB from: https://www.mongodb.com/try/download/community
    echo.
    pause
    exit /b 1
)

echo ✅ Found MongoDB %MONGODB_VERSION% at: %MONGODB_PATH%
echo.

REM Check if data directory exists
if not exist "C:\data\db" (
    echo Creating MongoDB data directory...
    mkdir "C:\data\db" 2>nul
    if %errorlevel% neq 0 (
        echo ❌ Failed to create data directory. Please create C:\data\db manually.
        pause
        exit /b 1
    )
    echo ✅ Data directory created: C:\data\db
) else (
    echo ✅ Data directory exists: C:\data\db
)
echo.

REM Check if MongoDB service already exists
sc query MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    echo MongoDB service already exists.
    echo.
    echo Options:
    echo 1. Remove existing service and reinstall
    echo 2. Start existing service
    echo 3. Exit
    echo.
    set /p choice="Enter choice (1-3): "
    
    if "!choice!"=="1" (
        echo.
        echo Removing existing MongoDB service...
        sc stop MongoDB >nul 2>&1
        timeout /t 2 /nobreak >nul
        sc delete MongoDB >nul 2>&1
        timeout /t 2 /nobreak >nul
        echo ✅ Service removed
        echo.
    ) else if "!choice!"=="2" (
        echo.
        echo Starting MongoDB service...
        sc start MongoDB
        sc config MongoDB start= auto
        echo.
        echo ✅ MongoDB service configured to auto-start!
        echo.
        pause
        exit /b 0
    ) else (
        exit /b 0
    )
)

REM Install MongoDB as Windows Service
echo Installing MongoDB as Windows Service...
echo.
echo Service Name: MongoDB
echo Service Path: %MONGODB_PATH%
echo Data Path: C:\data\db
echo.

REM Create log directory if it doesn't exist
if not exist "C:\data\log" mkdir "C:\data\log" 2>nul

REM Install the service
sc create MongoDB binPath= "\"%MONGODB_PATH%\" --service --serviceName MongoDB --serviceDisplayName \"MongoDB\" --serviceDescription \"MongoDB Database Server\" --dbpath \"C:\data\db\" --logpath \"C:\data\log\mongod.log\" --logappend" start= auto

if %errorlevel% equ 0 (
    echo ✅ MongoDB service installed successfully!
    echo.
    echo Starting MongoDB service...
    sc start MongoDB
    timeout /t 3 /nobreak >nul
    
    sc query MongoDB | find "RUNNING" >nul
    if %errorlevel% equ 0 (
        echo ✅ MongoDB service is now running!
    ) else (
        echo ⚠️  Service installed but may need manual start
        echo Try running: sc start MongoDB
    )
    
    echo.
    echo ✅ MongoDB is configured to start automatically on Windows boot!
    echo.
) else (
    echo ❌ Failed to install MongoDB service
    echo.
    echo You can try installing manually:
    echo "%MONGODB_PATH%" --install --serviceName MongoDB --serviceDisplayName "MongoDB" --dbpath "C:\data\db"
    echo.
)

pause

