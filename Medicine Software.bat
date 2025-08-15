@echo off
chcp 65001 >nul
title Medical Shop Management Tool

echo.
echo ========================================
echo    Medical Shop Management Tool
echo ========================================
echo.

REM -------------------------------------------------
REM Change to the directory where this script is located
REM -------------------------------------------------
cd /d "%~dp0"

echo Starting Medical Shop Management Tool...

REM -------------------------------------------------
REM Sanity: Ensure G: drive exists (for data/backups)
REM -------------------------------------------------
if not exist "G:\" (
    echo Error: Drive G: not found.
    echo Please attach/mount G: or change paths in this script.
    pause
    exit /b 1
)

REM -------------------------------------------------
REM Check if package.json exists
REM -------------------------------------------------
if not exist "package.json" (
    echo Error: package.json not found!
    echo Please make sure you're running this script from the Medicine Software folder.
    echo Current directory: %CD%
    pause
    exit /b 1
)
echo Found package.json in: %CD%

REM -------------------------------------------------
REM Check Node.js installation
REM -------------------------------------------------
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

REM -------------------------------------------------
REM Check npm installation
REM -------------------------------------------------
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

REM -------------------------------------------------
REM Ensure MongoDB is running (or start it with G:\MongoData)
REM -------------------------------------------------
echo Checking MongoDB status...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo MongoDB is not running. Checking if MongoDB is installed...

    set "MONGODB_FOUND=0"
    set "MONGODB_PATH="

    if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
        set "MONGODB_PATH=C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
        set "MONGODB_FOUND=1"
    ) else if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" (
        set "MONGODB_PATH=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
        set "MONGODB_FOUND=1"
    ) else if exist "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" (
        set "MONGODB_PATH=C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
        set "MONGODB_FOUND=1"
    ) else if exist "C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe" (
        set "MONGODB_PATH=C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe"
        set "MONGODB_FOUND=1"
    )

    if "%MONGODB_FOUND%"=="1" (
        if not exist "G:\MongoData" (
            echo Creating MongoDB data directory at G:\MongoData ...
            mkdir "G:\MongoData" 2>nul
        )
        echo Starting MongoDB with G:\MongoData ...
        start /B "MongoDB" "%MONGODB_PATH%" --dbpath "G:\MongoData"
        timeout /t 5 /nobreak >nul
        tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
        if "%ERRORLEVEL%"=="0" (
            echo MongoDB started successfully!
        ) else (
            echo Failed to start MongoDB. Please start it manually (service conflict?).
        )
    ) else (
        echo MongoDB is not installed. Install from:
        echo https://www.mongodb.com/try/download/community
    )
) else (
    echo MongoDB is already running!
)

REM -------------------------------------------------
REM ============ AUTO BACKUP (mongodump) ============
REM Takes a compressed archive dump to G:\MongoBackups
REM Keeps last 7 days (older files auto-removed)
REM -------------------------------------------------
echo.
echo Taking MongoDB backup before starting app...

set "BACKUP_DIR=G:\MongoBackups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set "MONGODUMP_PATH="

REM 1) Try PATH
where mongodump >nul 2>&1
if %errorlevel%==0 (
  for /f "delims=" %%i in ('where mongodump') do set "MONGODUMP_PATH=%%i"
) else (
  REM 2) Try Tools (Database Tools default)
  for /f %%v in ('dir /b /ad "C:\Program Files\MongoDB\Tools" 2^>nul') do (
    if exist "C:\Program Files\MongoDB\Tools\%%v\bin\mongodump.exe" (
      set "MONGODUMP_PATH=C:\Program Files\MongoDB\Tools\%%v\bin\mongodump.exe"
    )
  )
  REM 3) Try Server bin (older bundles)
  if "%MONGODUMP_PATH%"=="" (
    for %%v in (
      "C:\Program Files\MongoDB\Server\7.0\bin\mongodump.exe"
      "C:\Program Files\MongoDB\Server\6.0\bin\mongodump.exe"
      "C:\Program Files\MongoDB\Server\5.0\bin\mongodump.exe"
      "C:\Program Files\MongoDB\Server\4.4\bin\mongodump.exe"
    ) do (
      if exist %%v set "MONGODUMP_PATH=%%~fv"
    )
  )
)

if "%MONGODUMP_PATH%"=="" (
  echo Warning: mongodump not found. Skipping backup. Install "MongoDB Database Tools".
) else (
  for /f %%t in ('powershell -NoProfile -Command "(Get-Date).ToString(\"yyyyMMdd_HHmmss\")"') do set "TS=%%t"
  "%MONGODUMP_PATH%" --uri="mongodb://127.0.0.1:27017" --archive="%BACKUP_DIR%\mongo_%TS%.archive" --gzip
  if %errorlevel% neq 0 (
    echo Warning: mongodump failed (error %errorlevel%). Continuing without backup...
  ) else (
    echo Backup saved to: "%BACKUP_DIR%\mongo_%TS%.archive"
    powershell -NoProfile -Command ^
      "Get-ChildItem -Path '%BACKUP_DIR%\*.archive' | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item -Force" ^
      >nul 2>&1
  )
)
echo.
REM ========== END AUTO BACKUP ==========

REM -------------------------------------------------
REM Install dependencies if not found
REM -------------------------------------------------
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

REM -------------------------------------------------
REM Build app if not built
REM -------------------------------------------------
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

REM -------------------------------------------------
REM Start the application
REM -------------------------------------------------
echo ========================================
echo Starting Medical Shop Management Tool
echo ========================================
echo Opening: http://localhost:3000
timeout /t 3 /nobreak >nul
start http://localhost:3000
npm start

echo Application stopped. Press any key to close...
pause
