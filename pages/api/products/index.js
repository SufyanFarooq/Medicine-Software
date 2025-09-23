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
    const productsCollection = await getCollection('products');

    switch (method) {
      case 'GET':
        if (!permissions.canManageProducts && !permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          category: categoryFilter, 
          supplier: supplierFilter, 
          warehouse: warehouseFilter,
          lowStock,
          expiring,
          search,
          page = 1,
          limit = 20, // Reduced from 50 to 20 for better performance
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = {}; // Show all products
        
        if (categoryFilter) filter.category = categoryFilter;
        if (supplierFilter) filter.supplier = supplierFilter;
        if (warehouseFilter) filter.warehouse = warehouseFilter;
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { sku: { $regex: search, $options: 'i' } },
            { barcode: { $regex: search, $options: 'i' } }
          ];
        }

        // Low stock filter
        if (lowStock === 'true') {
          filter.$expr = { $lte: ['$quantity', '$minStockLevel'] };
        }

        // Expiring products filter (next 30 days)
        if (expiring === 'true') {
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          filter.expiryDate = { $lte: thirtyDaysFromNow, $gte: new Date() };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        // Performance optimization - Use projection to limit fields
        const projection = {
          name: 1,
          sku: 1,
          code: 1,
          category: 1,
          supplier: 1,
          purchasePrice: 1,
          sellingPrice: 1,
          quantity: 1,
          minStockLevel: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1
        };

        // Get products from products collection only with projection
        const products = await productsCollection
          .find(filter, { projection })
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        // Use estimated count for better performance on large collections
        const total = await productsCollection.estimatedDocumentCount();

        res.status(200).json({
          products,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          name,
          description,
          sku,
          code, // Frontend sends 'code', but API expects 'sku'
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
          batchNo, // Frontend sends 'batchNo'
          serialNumber,
          composition,
          dosage,
          unit,
          isTaxable,
          taxRate,
          hasWarranty,
          warrantyPeriod,
          adminDiscount,
          totalBuyingPrice,
          brand
        } = req.body;

        // Map frontend fields to API fields
        const productCode = sku || code;
        const productBatchNumber = batchNumber || batchNo;

        console.log('=== PRODUCT CREATE REQUEST ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Mapped fields:');
        console.log('- name:', name);
        console.log('- code/sku:', productCode);
        console.log('- category:', category);
        console.log('- purchasePrice:', purchasePrice);
        console.log('- sellingPrice:', sellingPrice);
        console.log('- quantity:', quantity);

        // Validate required fields
        const requiredFields = [];
        if (!name) requiredFields.push('name');
        if (!productCode) requiredFields.push('code/sku');
        if (!category) requiredFields.push('category');
        if (!purchasePrice && purchasePrice !== 0) requiredFields.push('purchasePrice');
        if (!sellingPrice && sellingPrice !== 0) requiredFields.push('sellingPrice');
        if (!quantity && quantity !== 0) requiredFields.push('quantity');

        if (requiredFields.length > 0) {
          console.log('Missing required fields:', requiredFields);
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Check for duplicate code
        const existingProduct = await productsCollection.findOne({ 
          $or: [
            { code: productCode },
            { sku: productCode }
          ]
        });
        if (existingProduct) {
          console.log('Duplicate product code found:', productCode);
          return res.status(400).json({ message: 'Product code already exists' });
        }

        // Check for duplicate barcode if provided
        if (barcode) {
          const existingBarcode = await productsCollection.findOne({ barcode, isActive: true });
          if (existingBarcode) {
            return res.status(400).json({ message: 'Barcode already exists' });
          }
        }

        const newProduct = {
          name: name.trim(),
          description: description?.trim() || '',
          code: productCode.trim().toUpperCase(), // Use mapped code
          sku: productCode.trim().toUpperCase(), // Keep sku for backward compatibility
          barcode: barcode?.trim() || '',
          category,
          supplier: supplier || '',
          brand: brand || '',
          purchasePrice: parseFloat(purchasePrice),
          sellingPrice: parseFloat(sellingPrice),
          adminDiscount: adminDiscount ? parseFloat(adminDiscount) : 0,
          totalBuyingPrice: totalBuyingPrice ? parseFloat(totalBuyingPrice) : parseFloat(purchasePrice) * parseInt(quantity),
          mrp: mrp ? parseFloat(mrp) : parseFloat(sellingPrice),
          quantity: parseInt(quantity),
          minStockLevel: minStockLevel ? parseInt(minStockLevel) : 10,
          reorderPoint: reorderPoint ? parseInt(reorderPoint) : parseInt(minStockLevel) || 10,
          warehouse: warehouse || '',
          location: location || {},
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          batchNumber: productBatchNumber?.trim() || '', // Use mapped batch number
          batchNo: productBatchNumber?.trim() || '', // Keep both for compatibility
          serialNumber: serialNumber?.trim() || '',
          composition: composition?.trim() || '',
          dosage: dosage?.trim() || '',
          unit: unit || 'pcs',
          isTaxable: isTaxable || false,
          taxRate: taxRate ? parseFloat(taxRate) : 0,
          hasWarranty: hasWarranty || false,
          warrantyPeriod: warrantyPeriod ? parseInt(warrantyPeriod) : 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };

        console.log('Creating product:', JSON.stringify(newProduct, null, 2));

        const result = await productsCollection.insertOne(newProduct);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_product',
          details: `Created product: ${name}`,
          entityType: 'Product',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        console.log('Product created successfully:', result.insertedId);
        res.status(201).json({ _id: result.insertedId, ...newProduct });
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