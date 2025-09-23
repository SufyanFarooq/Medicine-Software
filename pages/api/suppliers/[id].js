import { getCollection } from '../../../lib/mongodb';
import { getUserPermissions } from '../../../lib/permissions';
import { ObjectId } from 'mongodb';
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
  const { method, query: { id } } = req;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  // Validate ObjectId
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid supplier ID' });
  }

  try {
    const suppliersCollection = await getCollection('suppliers');

    switch (method) {
      case 'GET':
        if (!permissions.canManageSuppliers && !permissions.canManagePurchaseOrders) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { includePurchaseOrders } = req.query;
        
        const supplier = await suppliersCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!supplier) {
          return res.status(404).json({ message: 'Supplier not found' });
        }

        // Include recent purchase orders if requested
        if (includePurchaseOrders === 'true') {
          const purchaseOrdersCollection = await getCollection('purchase_orders');
          const recentOrders = await purchaseOrdersCollection
            .find({ supplier: id })
            .sort({ poDate: -1 })
            .limit(10)
            .toArray();
          
          supplier.recentOrders = recentOrders;
        }

        res.status(200).json(supplier);
        break;

      case 'PUT':
        if (!permissions.canManageSuppliers) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const existingSupplier = await suppliersCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!existingSupplier) {
          return res.status(404).json({ message: 'Supplier not found' });
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
          currency,
          rating
        } = req.body;

        // Check for duplicate name (excluding current supplier)
        if (name && name !== existingSupplier.name) {
          const duplicateName = await suppliersCollection.findOne({ 
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            isActive: true,
            _id: { $ne: new ObjectId(id) }
          });
          if (duplicateName) {
            return res.status(400).json({ message: 'Supplier name already exists' });
          }
        }

        // Check for duplicate email (excluding current supplier)
        if (email && email !== existingSupplier.email) {
          const duplicateEmail = await suppliersCollection.findOne({ 
            email: email.toLowerCase().trim(),
            isActive: true,
            _id: { $ne: new ObjectId(id) }
          });
          if (duplicateEmail) {
            return res.status(400).json({ message: 'Email already exists' });
          }
        }

        // Check for duplicate phone (excluding current supplier)
        if (phone && phone !== existingSupplier.phone) {
          const duplicatePhone = await suppliersCollection.findOne({ 
            phone: phone.trim(),
            isActive: true,
            _id: { $ne: new ObjectId(id) }
          });
          if (duplicatePhone) {
            return res.status(400).json({ message: 'Phone number already exists' });
          }
        }

        const updateData = {
          ...(name && { name: name.trim() }),
          ...(contactPerson && { contactPerson: contactPerson.trim() }),
          ...(email !== undefined && { email: email.toLowerCase().trim() }),
          ...(phone && { phone: phone.trim() }),
          ...(address && { address }),
          ...(website !== undefined && { website: website.trim() }),
          ...(paymentTerms && { paymentTerms }),
          ...(creditTerms && { creditTerms }),
          ...(currency && { currency }),
          ...(rating !== undefined && { rating: Math.max(0, Math.min(5, parseFloat(rating))) }),
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        const result = await suppliersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: 'No changes made to supplier' });
        }

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_supplier',
          details: `Updated supplier: ${name || existingSupplier.name}`,
          entityType: 'Supplier',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        const updatedSupplier = await suppliersCollection.findOne({ _id: new ObjectId(id) });
        res.status(200).json(updatedSupplier);
        break;

      case 'DELETE':
        if (!permissions.canManageSuppliers) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const supplierToDelete = await suppliersCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!supplierToDelete) {
          return res.status(404).json({ message: 'Supplier not found' });
        }

        // Check if supplier has purchase orders
        const purchaseOrdersCollection = await getCollection('purchase_orders');
        const supplierOrders = await purchaseOrdersCollection.countDocuments({ 
          supplier: id
        });

        if (supplierOrders > 0) {
          return res.status(400).json({ 
            message: `Cannot delete supplier. They have ${supplierOrders} purchase orders.` 
          });
        }

        // Check if supplier has products
        const productsCollection = await getCollection('products');
        const supplierProducts = await productsCollection.countDocuments({ 
          supplier: id,
          isActive: true 
        });

        if (supplierProducts > 0) {
          return res.status(400).json({ 
            message: `Cannot delete supplier. They have ${supplierProducts} products.` 
          });
        }

        // Soft delete - set isActive to false
        await suppliersCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              isActive: false,
              updatedAt: new Date(),
              updatedBy: user.userId
            }
          }
        );

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'delete_supplier',
          details: `Deleted supplier: ${supplierToDelete.name}`,
          entityType: 'Supplier',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Supplier deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}