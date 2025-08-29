#!/bin/bash

echo "========================================"
echo "    Crane Management System - UAE"
echo "========================================"
echo ""
echo "Starting the system..."
echo ""
echo "Database: crane_management_db"
echo "Admin: superadmin / admin123"
echo ""
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    echo ""
    echo "On macOS with Homebrew:"
    echo "brew install node"
    echo ""
    echo "On Ubuntu/Debian:"
    echo "sudo apt update && sudo apt install nodejs npm"
    exit 1
fi

# Check if MongoDB is running
echo "Checking MongoDB connection..."
if ! node -e "const { MongoClient } = require('mongodb'); MongoClient.connect('mongodb://localhost:27017').then(() => { console.log('MongoDB is running'); process.exit(0); }).catch(() => { console.log('MongoDB is not running'); process.exit(1); });" &> /dev/null; then
    echo "ERROR: MongoDB is not running!"
    echo "Please start MongoDB service first"
    echo ""
    echo "On macOS with Homebrew:"
    echo "brew services start mongodb-community"
    echo ""
    echo "On Ubuntu/Debian:"
    echo "sudo systemctl start mongod"
    echo ""
    exit 1
fi

echo "MongoDB connection successful!"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Start the application
echo "Starting Crane Management System..."
echo ""
echo "Access the system at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
npm run dev
