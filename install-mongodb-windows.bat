@echo off
chcp 65001 >nul
title MongoDB Installation Helper

echo.
echo ========================================
echo    🍃 MongoDB Installation Helper
echo ========================================
echo.

echo 🔍 Checking if MongoDB is already installed...

REM Check if mongod command is available
mongod --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ MongoDB is already installed!
    for /f "tokens=*" %%i in ('mongod --version') do echo Version: %%i
    echo.
    echo Press any key to continue...
    pause >nul
    exit /b 0
)

echo ❌ MongoDB is not installed.
echo.

echo 📥 Downloading MongoDB...
echo Please visit: https://www.mongodb.com/try/download/community
echo.
echo Or use these direct links:
echo 64-bit: https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-6.0.14-signed.msi
echo 32-bit: https://fastdl.mongodb.org/windows/mongodb-windows-i386-6.0.14-signed.msi
echo.

echo 📋 Installation Steps:
echo 1. Download the .msi file from the link above
echo 2. Double-click the downloaded file
echo 3. Click "Next" through the setup wizard
echo 4. Choose "Complete" installation
echo 5. Install MongoDB Compass (optional)
echo 6. Click "Install"
echo.

echo 🔧 After Installation:
echo 1. Open Command Prompt as Administrator
echo 2. Run: cd "C:\Program Files\MongoDB\Server\6.0\bin"
echo 3. Run: mongod --install --dbpath "C:\data\db"
echo 4. Run: net start MongoDB
echo.

echo 🌐 Alternative: Use MongoDB Atlas (Cloud)
echo If you don't want to install locally, you can use:
echo https://www.mongodb.com/atlas/database
echo.

echo Press any key to open MongoDB download page...
pause >nul

REM Open MongoDB download page
start https://www.mongodb.com/try/download/community

echo.
echo 🏥 After installing MongoDB, come back and run:
echo test-windows.bat
echo.
echo Press any key to exit...
pause >nul 