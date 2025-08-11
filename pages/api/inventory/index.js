import { getCollection } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to verify token
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export default async function handler(req, res) {
  const { method } = req;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const inventoryCollection = await getCollection('inventory');
    const medicinesCollection = await getCollection('medicines');

    switch (method) {
      case 'GET':
        // Get inventory transactions with optional filters
        const { medicineId: queryMedicineId, startDate, endDate, type: queryType, limit = 100 } = req.query;
        
        let filter = {};
        
        if (queryMedicineId) {
          filter.medicineId = queryMedicineId;
        }
        
        if (queryType) {
          filter.type = queryType; // 'add', 'sale', 'return', 'adjustment'
        }
        
        if (startDate || endDate) {
          filter.createdAt = {};
          if (startDate) {
            filter.createdAt.$gte = new Date(startDate);
          }
          if (endDate) {
            filter.createdAt.$lte = new Date(endDate);
          }
        }

        const inventory = await inventoryCollection
          .find(filter)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .toArray();

        // Populate medicine details
        const populatedInventory = await Promise.all(
          inventory.map(async (item) => {
            const medicine = await medicinesCollection.findOne({ _id: new ObjectId(item.medicineId) });
            return {
              ...item,
              medicine: medicine ? {
                name: medicine.name,
                code: medicine.code,
                currentStock: medicine.quantity
              } : null
            };
          })
        );

        res.status(200).json(populatedInventory);
        break;

      case 'POST':
        const { 
          medicineId, 
          type, 
          quantity, 
          previousStock, 
          newStock, 
          reason, 
          batchNo, 
          expiryDate,
          purchasePrice,
          notes 
        } = req.body;

        // Validate required fields
        if (!medicineId || !type || quantity === undefined || previousStock === undefined || newStock === undefined) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        // Get medicine details
        const medicine = await medicinesCollection.findOne({ _id: new ObjectId(medicineId) });
        if (!medicine) {
          return res.status(404).json({ message: 'Medicine not found' });
        }

        const inventoryTransaction = {
          medicineId,
          medicineName: medicine.name,
          medicineCode: medicine.code,
          type, // 'add', 'sale', 'return', 'adjustment'
          quantity: parseInt(quantity),
          previousStock: parseInt(previousStock),
          newStock: parseInt(newStock),
          reason: reason || '',
          batchNo: batchNo || '',
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
          notes: notes || '',
          userId: user.userId,
          username: user.username,
          createdAt: new Date()
        };

        const result = await inventoryCollection.insertOne(inventoryTransaction);
        res.status(201).json({ _id: result.insertedId, ...inventoryTransaction });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Inventory API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
