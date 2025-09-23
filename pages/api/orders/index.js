import { connectDB, getCollection } from '../../../lib/db';
import { ObjectId } from 'mongodb';

// Local verifyToken function
const verifyToken = async (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    throw new Error('No token provided');
  }
  
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      throw new Error('Token verification failed');
    }
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectDB();
      const ordersCollection = await getCollection('orders');
      const customersCollection = await getCollection('customers');
      const usersCollection = await getCollection('users');

      const { 
        status: statusFilter, 
        customer: customerFilter, 
        paymentStatus: paymentStatusFilter,
        search, 
        page = 1, 
        limit = 50, 
        sortBy = 'orderDate', 
        sortOrder = 'desc' 
      } = req.query;

      let filter = {};
      
      if (statusFilter) filter.status = statusFilter;
      if (customerFilter) filter.customerId = new ObjectId(customerFilter);
      if (paymentStatusFilter) filter.paymentStatus = paymentStatusFilter;
      
      if (search) {
        filter.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { customerEmail: { $regex: search, $options: 'i' } },
          { customerPhone: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      
      const orders = await ordersCollection
        .find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await ordersCollection.countDocuments(filter);

      // Populate customer and createdBy data
      const populatedOrders = await Promise.all(
        orders.map(async (order) => {
          const customer = await customersCollection.findOne({ _id: order.customerId });
          const createdByUser = await usersCollection.findOne({ _id: order.createdBy });
          
          return {
            ...order,
            customer: customer ? {
              _id: customer._id,
              name: customer.name,
              email: customer.email,
              phone: customer.phone
            } : null,
            createdByUser: createdByUser ? {
              _id: createdByUser._id,
              name: createdByUser.name,
              role: createdByUser.role
            } : null
          };
        })
      );

      res.status(200).json({
        orders: populatedOrders,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const user = await verifyToken(req);
      await connectDB();
      const ordersCollection = await getCollection('orders');
      const customersCollection = await getCollection('customers');

      const {
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        items,
        subTotal,
        taxRate,
        taxAmount,
        discountRate,
        discountAmount,
        total,
        status,
        paymentStatus,
        paymentMethod,
        shippingAddress,
        notes,
        orderDate,
        deliveryDate,
        year
      } = req.body;

      console.log('=== ORDER CREATE REQUEST ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));

      // Validate required fields
      const requiredFields = [];
      if (!customerId) requiredFields.push('customerId');
      if (!customerName) requiredFields.push('customerName');
      if (!items || !Array.isArray(items) || items.length === 0) requiredFields.push('items');
      if (!subTotal) requiredFields.push('subTotal');
      if (!total) requiredFields.push('total');

      if (requiredFields.length > 0) {
        console.log('Missing required fields:', requiredFields);
        return res.status(400).json({ 
          message: `Missing required fields: ${requiredFields.join(', ')}`, 
          missingFields: requiredFields 
        });
      }

      // Validate customer exists
      const customer = await customersCollection.findOne({ _id: new ObjectId(customerId) });
      if (!customer) {
        return res.status(400).json({ message: 'Customer not found' });
      }

      const orderData = {
        customerId: new ObjectId(customerId),
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        items: items.map(item => ({
          productId: new ObjectId(item.productId),
          productName: item.productName,
          productCode: item.productCode,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: parseFloat(item.discount || 0),
          discountType: item.discountType || 'percentage',
          total: parseFloat(item.total)
        })),
        subTotal: parseFloat(subTotal),
        taxRate: parseFloat(taxRate || 0),
        taxAmount: parseFloat(taxAmount || 0),
        discountRate: parseFloat(discountRate || 0),
        discountAmount: parseFloat(discountAmount || 0),
        total: parseFloat(total),
        status: status || 'Draft',
        paymentStatus: paymentStatus || 'Unpaid',
        paymentMethod,
        shippingAddress,
        notes,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        year: year || new Date().getFullYear(),
        createdBy: new ObjectId(user._id)
      };

      console.log('Creating order with data:', JSON.stringify(orderData, null, 2));

      const result = await ordersCollection.insertOne(orderData);
      
      console.log('Order created successfully:', result.insertedId);

      res.status(201).json({
        message: 'Order created successfully',
        orderId: result.insertedId
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ message: 'Method not allowed' });
  }
}

