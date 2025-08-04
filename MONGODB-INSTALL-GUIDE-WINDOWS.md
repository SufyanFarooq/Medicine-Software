# MongoDB Installation Guide for Windows

## 🪟 Quick MongoDB Installation for Medicine Software

### Step 1: Download MongoDB
1. **Visit**: https://www.mongodb.com/try/download/community
2. **Select**:
   - **Version**: 6.0 (or latest)
   - **Platform**: Windows
   - **Package**: msi
3. **Click "Download"**

### Step 2: Install MongoDB
1. **Run the downloaded .msi file**
2. **Click "Next"** through the setup wizard
3. **Choose "Complete" installation**
4. **Install MongoDB Compass** (optional but recommended)
5. **Click "Install"**

### Step 3: Verify Installation
1. **Open Command Prompt**
2. **Type**: `mongod --version`
3. **You should see MongoDB version info**

### Step 4: Start MongoDB Service
1. **Open Command Prompt as Administrator**
2. **Run these commands**:
```cmd
cd "C:\Program Files\MongoDB\Server\6.0\bin"
mongod --install --dbpath "C:\data\db"
net start MongoDB
```

### Step 5: Test Medicine Software
1. **Double-click `Start Medicine Software.bat`**
2. **The app should start successfully!**

## 🚨 Troubleshooting

### If MongoDB won't start:
```cmd
# Create data directory manually
mkdir "C:\data\db"

# Start MongoDB manually
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath "C:\data\db"
```

### If you get permission errors:
1. **Run Command Prompt as Administrator**
2. **Try the installation steps again**

### If the service won't start:
1. **Open Services** (services.msc)
2. **Find "MongoDB"**
3. **Right-click → Start**

## ✅ Success Indicators
- ✅ MongoDB service is running
- ✅ Medicine Software starts without errors
- ✅ You can access http://localhost:3000

## 🆘 Need Help?
If you're still having issues:
1. **Check Windows Event Viewer** for MongoDB errors
2. **Ensure you have admin privileges**
3. **Try restarting your computer** after installation 