import { getCollection } from '../../../lib/mongodb';
import { getUserPermissions } from '../../../lib/permissions';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const verifyToken = (req) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
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

  const permissions = getUserPermissions(user.role);

  try {
    const suppliersCollection = await getCollection('suppliers');

    switch (method) {
      case 'GET':
        if (!permissions.canManageSuppliers && !permissions.canManagePurchaseOrders) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          search,
          activeOnly = 'true',
          minRating,
          page = 1,
          limit = 50,
          sortBy = 'name',
          sortOrder = 'asc'
        } = req.query;

        let filter = {};
        
        if (activeOnly === 'true') filter.isActive = true;
        if (minRating) filter.rating = { $gte: parseFloat(minRating) };
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { contactPerson: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        const suppliers = await suppliersCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await suppliersCollection.countDocuments(filter);

        res.status(200).json({
          suppliers,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageSuppliers) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          name,
          contactPerson,
          email,
          phone,
          address,
          website,
          paymentTerms,
          creditTerms,
          currency
        } = req.body;

        // Validate required fields
        if (!name || !contactPerson || !phone) {
          return res.status(400).json({ message: 'Name, contact person, and phone are required' });
        }

        // Check for duplicate name
        const existingName = await suppliersCollection.findOne({ 
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
          isActive: true
        });
        if (existingName) {
          return res.status(400).json({ message: 'Supplier name already exists' });
        }

        // Check for duplicate email if provided
        if (email) {
          const existingEmail = await suppliersCollection.findOne({ 
            email: email.toLowerCase(),
            isActive: true 
          });
          if (existingEmail) {
            return res.status(400).json({ message: 'Email already exists' });
          }
        }

        // Check for duplicate phone
        const existingPhone = await suppliersCollection.findOne({ 
          phone: phone.trim(),
          isActive: true 
        });
        if (existingPhone) {
          return res.status(400).json({ message: 'Phone number already exists' });
        }

        const newSupplier = {
          name: name.trim(),
          contactPerson: contactPerson.trim(),
          email: email?.toLowerCase().trim() || '',
          phone: phone.trim(),
          address: address || {},
          website: website?.trim() || '',
          paymentTerms: paymentTerms || 'net_30',
          creditTerms: creditTerms || 'standard',
          currency: currency || 'PKR',
          rating: 0,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };

        const result = await suppliersCollection.insertOne(newSupplier);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_supplier',
          details: `Created supplier: ${name}`,
          entityType: 'Supplier',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newSupplier });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}