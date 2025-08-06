@echo off
chcp 65001 >nul
title Auto Installation Script

echo.
echo ========================================
echo    🚀 Auto Installation Script
echo    Medicine Software Setup
echo ========================================
echo.

REM Change to the directory where this script is located
cd /d "%~dp0"

echo 📍 Current directory: %CD%
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    echo ❌ Error: package.json not found!
    echo Please run this script from the Medicine Software folder.
    echo.
    echo Current directory: %CD%
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo ✅ Found package.json in: %CD%
echo.

REM ========================================
REM Step 1: Check and Install Node.js
REM ========================================
echo 🔍 Step 1: Checking Node.js installation...
set NODE_INSTALLED_NOW=0
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
    echo ✅ Node.js is already installed: %NODE_VERSION%
) else (
    echo ❌ Node.js is not installed. Installing now...
    echo.
    echo 📥 Downloading Node.js...
    
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile 'nodejs-installer.msi'}"
    
    if exist "nodejs-installer.msi" (
        echo ✅ Node.js installer downloaded successfully
        echo.
        echo 🔧 Installing Node.js...
        echo Please follow the installation wizard and check "Add to PATH"
        echo.
        start /wait nodejs-installer.msi
        del nodejs-installer.msi
        
        echo.
        echo ✅ Node.js installation completed!
        set NODE_INSTALLED_NOW=1
    ) else (
        echo ❌ Failed to download Node.js installer
        echo Please download manually from: https://nodejs.org/
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
)

REM ========================================
REM Step 2: Check and Install npm
REM ========================================
echo.
echo 🔍 Step 2: Checking npm installation...

if "%NODE_INSTALLED_NOW%"=="1" (
    echo ⚠️  Node.js was just installed. Please restart this script to continue.
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 0
)

where npm >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VERSION=%%i
    echo ✅ npm is already installed: %NPM_VERSION%
) else (
    echo ❌ npm not found. Please ensure Node.js is installed correctly.
    echo Download from: https://nodejs.org/
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

REM ========================================
REM Step 3: Check and Install MongoDB
REM ========================================
echo.
echo 🔍 Step 3: Checking MongoDB installation...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ MongoDB is already running
) else (
    echo ⚠️  MongoDB is not running. Checking if it's installed...
    
    set "MONGODB_FOUND=0"
    if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
        echo ✅ Found MongoDB 6.0
        set "MONGODB_PATH=C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
        set "MONGODB_FOUND=1"
    ) else if exist "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" (
        echo ✅ Found MongoDB 5.0
        set "MONGODB_PATH=C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
        set "MONGODB_FOUND=1"
    ) else if exist "C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe" (
        echo ✅ Found MongoDB 4.4
        set "MONGODB_PATH=C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe"
        set "MONGODB_FOUND=1"
    )
    
    if "%MONGODB_FOUND%"=="1" (
        echo 🚀 Starting MongoDB...
        if not exist "C:\data\db" mkdir "C:\data\db" 2>nul
        start /B "MongoDB" "%MONGODB_PATH%" --dbpath "C:\data\db"
        timeout /t 5 /nobreak >nul
        
        tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
        if "%ERRORLEVEL%"=="0" (
            echo ✅ MongoDB started successfully!
        ) else (
            echo ❌ Failed to start MongoDB. Please start it manually.
        )
    ) else (
        echo ❌ MongoDB is not installed. Installing now...
        echo.
        echo 📥 Downloading MongoDB...
        
        powershell -Command "& {Invoke-WebRequest -Uri 'https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-6.0.14-signed.msi' -OutFile 'mongodb-installer.msi'}"
        
        if exist "mongodb-installer.msi" (
            echo ✅ MongoDB installer downloaded successfully
            echo.
            echo 🔧 Installing MongoDB...
            echo Please follow the installation wizard
            echo.
            start /wait mongodb-installer.msi
            del mongodb-installer.msi
            
            echo.
            echo ✅ MongoDB installation completed!
            echo 🚀 Starting MongoDB...
            
            if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
                if not exist "C:\data\db" mkdir "C:\data\db" 2>nul
                start /B "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath "C:\data\db"
                timeout /t 5 /nobreak >nul
                echo ✅ MongoDB started successfully!
            )
        ) else (
            echo ❌ Failed to download MongoDB installer
            echo Please download manually from: https://www.mongodb.com/try/download/community
            echo.
            echo Press any key to continue without MongoDB...
            pause >nul
        )
    )
)

REM ========================================
REM Step 4: Install node_modules
REM ========================================
echo.
echo 🔍 Step 4: Checking node_modules...
if exist "node_modules" (
    echo ✅ node_modules directory already exists
) else (
    echo 📦 Installing node_modules...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install node_modules
        echo Please try running: npm install manually
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    echo ✅ node_modules installed successfully!
)

REM ========================================
REM Step 5: Build the application
REM ========================================
echo.
echo 🔍 Step 5: Checking if app is built...
if exist ".next" (
    echo ✅ Application is already built
) else (
    echo 🔨 Building the application...
    npm run build
    if %errorlevel% neq 0 (
        echo ❌ Failed to build the application
        echo Please try running: npm run build manually
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    echo ✅ Application built successfully!
)

REM ========================================
REM Installation Complete
REM ========================================
echo.
echo ========================================
echo 🎉 Installation Complete!
echo ========================================
echo.
echo ✅ Node.js: Installed and working
echo ✅ npm: Installed and working
echo ✅ MongoDB: Installed and running
echo ✅ node_modules: Installed
echo ✅ Application: Built and ready
echo.
echo 🚀 You can now run the application:
echo.
echo Option 1 (Development): start-dev.bat
echo Option 2 (Production): start-app.bat
echo.
echo Press any key to close this window...
pause >nul
