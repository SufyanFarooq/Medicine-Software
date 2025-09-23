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
    const purchaseOrdersCollection = await getCollection('purchase_orders');

    switch (method) {
      case 'GET':
        if (!permissions.canManagePurchaseOrders) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          supplier: supplierFilter,
          status,
          paymentStatus,
          priority: priorityFilter,
          overdue,
          startDate,
          endDate,
          search,
          page = 1,
          limit = 50,
          sortBy = 'poDate',
          sortOrder = 'desc'
        } = req.query;

        let filter = {};
        
        if (supplierFilter) filter.supplier = supplierFilter;
        if (status) filter.status = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;
        if (priorityFilter) filter.priority = priorityFilter;
        
        if (overdue === 'true') {
          filter.expectedDeliveryDate = { $lt: new Date() };
          filter.status = { $in: ['sent', 'acknowledged'] };
        }

        if (startDate || endDate) {
          filter.poDate = {};
          if (startDate) filter.poDate.$gte = new Date(startDate);
          if (endDate) filter.poDate.$lte = new Date(endDate);
        }

        if (search) {
          filter.$or = [
            { poNumber: { $regex: search, $options: 'i' } },
            { supplierReference: { $regex: search, $options: 'i' } },
            { requisitionNumber: { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        const purchaseOrders = await purchaseOrdersCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await purchaseOrdersCollection.countDocuments(filter);

        res.status(200).json({
          purchaseOrders,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManagePurchaseOrders) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          supplier,
          expectedDeliveryDate,
          subtotal,
          discountType,
          discountValue,
          taxRate,
          shippingCost,
          paymentTerms,
          deliveryAddress,
          notes,
          priority,
          supplierReference,
          requisitionNumber
        } = req.body;

        // Validate required fields
        if (!supplier || !subtotal) {
          return res.status(400).json({ message: 'Supplier and subtotal are required' });
        }

        // Calculate totals
        const discountAmount = discountType === 'percentage' 
          ? (parseFloat(subtotal) * parseFloat(discountValue || 0)) / 100
          : parseFloat(discountValue || 0);
        
        const afterDiscount = parseFloat(subtotal) - discountAmount;
        const taxAmount = (afterDiscount * parseFloat(taxRate || 0)) / 100;
        const total = afterDiscount + taxAmount + parseFloat(shippingCost || 0);

        const newPurchaseOrder = {
          poDate: new Date(),
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          supplier,
          subtotal: parseFloat(subtotal),
          discountType: discountType || 'percentage',
          discountValue: parseFloat(discountValue || 0),
          discountAmount,
          taxRate: parseFloat(taxRate || 0),
          taxAmount,
          shippingCost: parseFloat(shippingCost || 0),
          total,
          status: 'draft',
          paymentStatus: 'pending',
          paymentTerms: paymentTerms || 'credit_30',
          paidAmount: 0,
          deliveryAddress: deliveryAddress || {},
          notes: notes?.trim() || '',
          priority: priority || 'medium',
          supplierReference: supplierReference?.trim() || '',
          requisitionNumber: requisitionNumber?.trim() || '',
          currency: 'PKR',
          exchangeRate: 1,
          requestedBy: user.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId,
          updatedBy: user.userId
        };

        const result = await purchaseOrdersCollection.insertOne(newPurchaseOrder);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_purchase_order',
          details: `Created purchase order: ${newPurchaseOrder.poNumber || 'Draft'}`,
          entityType: 'PurchaseOrder',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newPurchaseOrder });
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