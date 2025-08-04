#!/bin/bash

# Medical Shop Management Tool - Startup Script
# For Mac/Linux systems

echo "🏥 Starting Medical Shop Management Tool..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Starting MongoDB..."
    
    # Try to start MongoDB (common locations)
    if command -v brew &> /dev/null; then
        # macOS with Homebrew
        brew services start mongodb-community 2>/dev/null || brew services start mongodb 2>/dev/null
    elif [ -f "/usr/local/bin/mongod" ]; then
        # Manual installation
        /usr/local/bin/mongod --fork --logpath /tmp/mongod.log
    elif [ -f "/opt/homebrew/bin/mongod" ]; then
        # Apple Silicon Homebrew
        /opt/homebrew/bin/mongod --fork --logpath /tmp/mongod.log
    else
        echo "❌ MongoDB is not installed or not found in common locations."
        echo "Please install MongoDB and ensure it's running."
        echo "Visit: https://docs.mongodb.com/manual/installation/"
        exit 1
    fi
    
    # Wait a moment for MongoDB to start
    sleep 3
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies."
        exit 1
    fi
fi

# Check if the app is built
if [ ! -d ".next" ]; then
    echo "🔨 Building the application..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Failed to build the application."
        exit 1
    fi
fi

# Start the application
echo "🚀 Starting the application..."
echo "📱 The app will open in your browser at: http://localhost:3000"
echo "🔄 Press Ctrl+C to stop the application"

# Open browser after a short delay
(sleep 3 && open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null || echo "🌐 Please open http://localhost:3000 in your browser") &

# Start the Next.js application
npm start

# Keep terminal open if there's an error or user stops the app
echo ""
echo "🏥 Application stopped. Press any key to close this window..."
read -n 1 -s 
