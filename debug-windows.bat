@echo off
chcp 65001 >nul
title Medicine Software - Debug Mode

echo.
echo ========================================
echo    🐛 Medicine Software - Debug Mode
echo ========================================
echo.

REM Change to the directory where this script is located
cd /d "%~dp0"

echo 📁 Current Directory: %CD%
echo.

echo 🔍 Step 1: Checking if package.json exists...
if exist "package.json" (
    echo ✅ package.json found
) else (
    echo ❌ package.json not found - this is the problem!
    echo Please run this script from the Medicine Software folder
    pause
    exit /b 1
)

echo.
echo 🔍 Step 2: Checking Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do echo ✅ Node.js: %%i
) else (
    echo ❌ Node.js not found
    echo This will cause the script to fail
)

echo.
echo 🔍 Step 3: Checking npm...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo ✅ npm: %%i
) else (
    echo ❌ npm not found
    echo This will cause the script to fail
)

echo.
echo 🔍 Step 4: Checking MongoDB...
mongod --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('mongod --version') do echo ✅ MongoDB: %%i
) else (
    echo ⚠️  MongoDB not found
    echo This will cause the script to fail
)

echo.
echo 🔍 Step 5: Checking if node_modules exists...
if exist "node_modules" (
    echo ✅ node_modules found
) else (
    echo ⚠️  node_modules not found
    echo This will be installed automatically
)

echo.
echo 🔍 Step 6: Checking if .next exists...
if exist ".next" (
    echo ✅ .next found (app is built)
) else (
    echo ⚠️  .next not found
    echo This will be built automatically
)

echo.
echo 🔍 Step 7: Testing npm install...
echo Testing npm install command...
npm install --dry-run >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ npm install command works
) else (
    echo ❌ npm install command failed
    echo This will cause the script to fail
)

echo.
echo 🔍 Step 8: Testing npm run build...
echo Testing npm run build command...
npm run build --dry-run >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ npm run build command works
) else (
    echo ❌ npm run build command failed
    echo This will cause the script to fail
)

echo.
echo ========================================
echo    🐛 Debug Complete
echo ========================================
echo.
echo If you see any ❌ errors above, those are the problems.
echo.
echo Press any key to exit...
pause >nul 