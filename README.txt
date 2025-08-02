🏥 MEDICAL SHOP MANAGEMENT TOOL
================================

A complete offline medical shop management system built with Next.js and MongoDB.

FEATURES
--------
✅ Medicine Management (CRUD operations)
✅ Search medicines by name or code
✅ Customer invoice generation with 3% discount
✅ Printable invoices (PDF format)
✅ Local MongoDB database
✅ Offline operation after initial setup
✅ Responsive design with Tailwind CSS
✅ Stock management and expiry tracking

PREREQUISITES
-------------
1. Node.js (v16 or higher) - https://nodejs.org/
2. MongoDB (v4.4 or higher) - https://docs.mongodb.com/manual/installation/

INSTALLATION & SETUP
--------------------

1. INSTALL MONGODB:
   - Download and install MongoDB from the official website
   - Start MongoDB service:
     * Windows: Run "mongod" in command prompt or install as service
     * Mac: brew services start mongodb-community
     * Linux: sudo systemctl start mongod

2. CLONE/EXTRACT THE PROJECT:
   - Extract all files to a folder on your computer

3. FIRST-TIME SETUP:
   - Open terminal/command prompt in the project folder
   - Run: npm install
   - Run: npm run build

4. START THE APPLICATION:
   
   WINDOWS:
   - Double-click "start-app.bat"
   
   MAC/LINUX:
   - Make the script executable: chmod +x start-app.sh
   - Double-click "start-app.sh" or run: ./start-app.sh

   MANUAL START:
   - Run: npm start
   - Open browser to: http://localhost:3000

USAGE GUIDE
-----------

DASHBOARD:
- View total medicines, low stock items, expiring medicines
- Quick access to all features
- Sales overview

MEDICINES:
- Add new medicines with auto-generated codes
- Edit existing medicines
- Delete medicines
- Search by name or code
- View stock status and expiry dates

INVOICE GENERATION:
- Select medicines from available stock
- Adjust quantities
- Automatic 3% discount calculation
- Generate and print invoices
- Automatic stock reduction after sale

DATABASE STRUCTURE
------------------
Database: medical_shop
Collections:
- medicines: Medicine inventory data
- invoices: Customer invoice records

MEDICINE FIELDS:
- name: Medicine name
- code: Unique identifier (auto-generated)
- quantity: Available stock
- purchasePrice: Cost price
- sellingPrice: Retail price
- expiryDate: Expiration date
- batchNo: Batch number (optional)

INVOICE FIELDS:
- invoiceNumber: Unique invoice ID
- items: Array of sold medicines
- subtotal: Total before discount
- discount: 3% discount amount
- total: Final amount
- date: Invoice date

TROUBLESHOOTING
---------------

1. "MongoDB connection failed":
   - Ensure MongoDB is running
   - Check if MongoDB is installed correctly
   - Verify connection string in lib/mongodb.js

2. "Port 3000 already in use":
   - Close other applications using port 3000
   - Or change port in package.json scripts

3. "Module not found errors":
   - Run: npm install
   - Delete node_modules and package-lock.json, then run npm install

4. "Build errors":
   - Ensure Node.js version is 16 or higher
   - Clear .next folder and run npm run build

5. "Script not executable (Mac/Linux)":
   - Run: chmod +x start-app.sh

OFFLINE OPERATION
-----------------
After initial setup, the application runs completely offline:
- No internet connection required
- All data stored locally in MongoDB
- Can be used in remote locations
- Data persists between sessions

BACKUP & DATA MANAGEMENT
------------------------
- Database files are stored in MongoDB data directory
- Regular backups recommended
- Can export data using MongoDB tools
- Data can be transferred to other systems

SECURITY NOTES
--------------
- This is a local application, no external connections
- Database runs on localhost only
- No user authentication (single-user system)
- Keep backup copies of your data

SUPPORT
--------
For issues or questions:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure MongoDB is running
4. Check console for error messages

VERSION: 1.0.0
BUILT WITH: Next.js, MongoDB, Tailwind CSS
LICENSE: MIT 