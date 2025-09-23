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
    return res.status(400).json({ message: 'Invalid product ID' });
  }

  try {
    const productsCollection = await getCollection('products');
    const activitiesCollection = await getCollection('activities');

    switch (method) {
      case 'GET':
        if (!permissions.canManageProducts && !permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get product from products collection only
        const product = await productsCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json(product);
        break;

      case 'PUT':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get product from products collection only
        const existingProduct = await productsCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!existingProduct) {
          return res.status(404).json({ message: 'Product not found' });
        }

        const {
          name,
          description,
          sku,
          barcode,
          category,
          supplier,
          purchasePrice,
          sellingPrice,
          mrp,
          quantity,
          minStockLevel,
          reorderPoint,
          warehouse,
          location,
          expiryDate,
          batchNumber,
          serialNumber,
          composition,
          dosage,
          unit,
          isTaxable,
          taxRate,
          hasWarranty,
          warrantyPeriod
        } = req.body;

        // Check for duplicate SKU (excluding current product)
        if (sku && sku !== existingProduct.sku) {
          const duplicateSku = await productsCollection.findOne({ 
            sku: sku.trim().toUpperCase(), 
            isActive: true,
            _id: { $ne: new ObjectId(id) }
          });
          if (duplicateSku) {
            return res.status(400).json({ message: 'Product SKU already exists' });
          }
        }

        // Check for duplicate barcode (excluding current product)
        if (barcode && barcode !== existingProduct.barcode) {
          const duplicateBarcode = await productsCollection.findOne({ 
            barcode: barcode.trim(), 
            isActive: true,
            _id: { $ne: new ObjectId(id) }
          });
          if (duplicateBarcode) {
            return res.status(400).json({ message: 'Barcode already exists' });
          }
        }

        const updateData = {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && { description: description.trim() }),
          ...(sku && { sku: sku.trim().toUpperCase() }),
          ...(barcode !== undefined && { barcode: barcode.trim() }),
          ...(category && { category }),
          ...(supplier && { supplier }),
          ...(purchasePrice !== undefined && { purchasePrice: parseFloat(purchasePrice) }),
          ...(sellingPrice !== undefined && { sellingPrice: parseFloat(sellingPrice) }),
          ...(mrp !== undefined && { mrp: parseFloat(mrp) }),
          ...(quantity !== undefined && { quantity: parseInt(quantity) }),
          ...(minStockLevel !== undefined && { minStockLevel: parseInt(minStockLevel) }),
          ...(reorderPoint !== undefined && { reorderPoint: parseInt(reorderPoint) }),
          ...(warehouse && { warehouse }),
          ...(location && { location }),
          ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
          ...(batchNumber !== undefined && { batchNumber: batchNumber.trim() }),
          ...(serialNumber !== undefined && { serialNumber: serialNumber.trim() }),
          ...(composition !== undefined && { composition: composition.trim() }),
          ...(dosage !== undefined && { dosage: dosage.trim() }),
          ...(unit && { unit }),
          ...(isTaxable !== undefined && { isTaxable }),
          ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) }),
          ...(hasWarranty !== undefined && { hasWarranty }),
          ...(warrantyPeriod !== undefined && { warrantyPeriod: parseInt(warrantyPeriod) }),
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        // Update product in products collection
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: 'No changes made to product' });
        }

        // Log activity
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_product',
          details: `Updated product: ${name || existingProduct.name}`,
          entityType: 'Product',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        // Get updated product from products collection
        const updatedProduct = await productsCollection.findOne({ _id: new ObjectId(id) });
        res.status(200).json(updatedProduct);
        break;

      case 'DELETE':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get product from products collection only
        const productToDelete = await productsCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!productToDelete) {
          return res.status(404).json({ message: 'Product not found' });
        }

        // Soft delete - set isActive to false
        await productsCollection.updateOne(
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
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'delete_product',
          details: `Deleted product: ${productToDelete.name}`,
          entityType: 'Product',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Product deleted successfully' });
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