@echo off
chcp 65001 >nul
title Medicine Software - Auto Installer

echo.
echo ========================================
echo    🏥 Medicine Software - Auto Installer
echo    Installing Node.js, npm, and MongoDB
echo ========================================
echo.

REM Change to the directory where this script is located
cd /d "%~dp0"

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ This script requires Administrator privileges.
    echo Please right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo ✅ Running as Administrator
echo.

REM Create temporary directory for downloads
if not exist "temp" mkdir temp
cd temp

echo 🔍 Checking current installations...

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do echo ✅ Node.js already installed: %%i
    set "NODE_INSTALLED=1"
) else (
    echo ❌ Node.js not found - will install
    set "NODE_INSTALLED=0"
)

REM Check npm
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo ✅ npm already installed: %%i
    set "NPM_INSTALLED=1"
) else (
    echo ❌ npm not found - will install
    set "NPM_INSTALLED=0"
)

REM Check MongoDB
mongod --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('mongod --version') do echo ✅ MongoDB already installed: %%i
    set "MONGO_INSTALLED=1"
) else (
    echo ❌ MongoDB not found - will install
    set "MONGO_INSTALLED=0"
)

echo.

REM Install Node.js if needed
if "%NODE_INSTALLED%"=="0" (
    echo 📥 Downloading Node.js...
    echo This may take a few minutes...
    
    REM Download Node.js LTS
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.19.0/node-v18.19.0-x64.msi' -OutFile 'nodejs-installer.msi'}"
    
    if exist "nodejs-installer.msi" (
        echo ✅ Node.js downloaded successfully
        echo 🔧 Installing Node.js...
        msiexec /i nodejs-installer.msi /quiet /norestart
        echo ⏳ Waiting for installation to complete...
        timeout /t 30 /nobreak >nul
        
        REM Refresh environment variables
        call refreshenv.cmd 2>nul || (
            echo Refreshing PATH...
            set "PATH=%PATH%;C:\Program Files\nodejs"
        )
        
        echo ✅ Node.js installation completed
    ) else (
        echo ❌ Failed to download Node.js
        echo Please check your internet connection
        pause
        exit /b 1
    )
)

REM Install MongoDB if needed
if "%MONGO_INSTALLED%"=="0" (
    echo.
    echo 📥 Downloading MongoDB...
    echo This may take a few minutes...
    
    REM Download MongoDB Community Server
    powershell -Command "& {Invoke-WebRequest -Uri 'https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-6.0.14-signed.msi' -OutFile 'mongodb-installer.msi'}"
    
    if exist "mongodb-installer.msi" (
        echo ✅ MongoDB downloaded successfully
        echo 🔧 Installing MongoDB...
        msiexec /i mongodb-installer.msi /quiet /norestart
        echo ⏳ Waiting for installation to complete...
        timeout /t 60 /nobreak >nul
        
        echo ✅ MongoDB installation completed
        
        REM Create data directory
        if not exist "C:\data\db" (
            echo 📁 Creating MongoDB data directory...
            mkdir "C:\data\db"
        )
        
        REM Install MongoDB as a service
        echo 🔧 Setting up MongoDB service...
        "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --install --dbpath "C:\data\db"
        net start MongoDB
        
        echo ✅ MongoDB service started
    ) else (
        echo ❌ Failed to download MongoDB
        echo Please check your internet connection
        pause
        exit /b 1
    )
)

REM Go back to original directory
cd /d "%~dp0"

REM Clean up temporary files
if exist "temp" (
    echo 🧹 Cleaning up temporary files...
    rmdir /s /q temp
)

echo.
echo ========================================
echo    ✅ Installation Complete!
echo ========================================
echo.

REM Refresh environment variables
echo 🔄 Refreshing environment variables...
call refreshenv.cmd 2>nul || (
    echo Setting PATH manually...
    set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files\MongoDB\Server\6.0\bin"
)

REM Final verification
echo 🔍 Verifying installations...

node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do echo ✅ Node.js: %%i
) else (
    echo ❌ Node.js verification failed
)

npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo ✅ npm: %%i
) else (
    echo ❌ npm verification failed
)

tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if %errorlevel% equ 0 (
    echo ✅ MongoDB service is running
) else (
    echo ⚠️  MongoDB service not running - attempting to start...
    net start MongoDB 2>nul
)

echo.
echo 🏥 Now you can run your Medicine Software!
echo.
echo Next steps:
echo 1. Run: test-windows.bat
echo 2. Run: Start Medicine Software.bat
echo.

echo Press any key to exit...
pause >nul 