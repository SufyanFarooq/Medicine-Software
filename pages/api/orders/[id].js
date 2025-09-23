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
  const { id } = req.query;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid order ID' });
  }

  try {
    await connectDB();
    const ordersCollection = await getCollection('orders');
    const customersCollection = await getCollection('customers');
    const usersCollection = await getCollection('users');
    const activitiesCollection = await getCollection('activities');

    if (req.method === 'GET') {
      const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Populate related data
      const customer = await customersCollection.findOne({ _id: order.customerId });
      const createdByUser = await usersCollection.findOne({ _id: order.createdBy });
      const updatedByUser = order.updatedBy ? await usersCollection.findOne({ _id: order.updatedBy }) : null;

      const populatedOrder = {
        ...order,
        customer: customer ? {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address
        } : null,
        createdByUser: createdByUser ? {
          _id: createdByUser._id,
          name: createdByUser.name,
          role: createdByUser.role
        } : null,
        updatedByUser: updatedByUser ? {
          _id: updatedByUser._id,
          name: updatedByUser.name,
          role: updatedByUser.role
        } : null
      };

      res.status(200).json(populatedOrder);
    } else if (req.method === 'PUT') {
      const user = await verifyToken(req);
      
      const existingOrder = await ordersCollection.findOne({ _id: new ObjectId(id) });
      if (!existingOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }

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
        deliveryDate
      } = req.body;

      const updateData = {
        ...(customerId && { customerId: new ObjectId(customerId) }),
        ...(customerName && { customerName }),
        ...(customerEmail !== undefined && { customerEmail }),
        ...(customerPhone !== undefined && { customerPhone }),
        ...(customerAddress && { customerAddress }),
        ...(items && {
          items: items.map(item => ({
            productId: new ObjectId(item.productId),
            productName: item.productName,
            productCode: item.productCode,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            discount: parseFloat(item.discount || 0),
            discountType: item.discountType || 'percentage',
            total: parseFloat(item.total)
          }))
        }),
        ...(subTotal !== undefined && { subTotal: parseFloat(subTotal) }),
        ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) }),
        ...(taxAmount !== undefined && { taxAmount: parseFloat(taxAmount) }),
        ...(discountRate !== undefined && { discountRate: parseFloat(discountRate) }),
        ...(discountAmount !== undefined && { discountAmount: parseFloat(discountAmount) }),
        ...(total !== undefined && { total: parseFloat(total) }),
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(shippingAddress !== undefined && { shippingAddress }),
        ...(notes !== undefined && { notes }),
        ...(orderDate && { orderDate: new Date(orderDate) }),
        ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
        updatedBy: new ObjectId(user._id),
        updatedAt: new Date()
      };

      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.modifiedCount === 0) {
        return res.status(400).json({ message: 'No changes made' });
      }

      // Log activity
      await activitiesCollection.insertOne({
        type: 'order_updated',
        entityType: 'order',
        entityId: new ObjectId(id),
        description: `Order ${existingOrder.orderNumber} updated`,
        changes: updateData,
        userId: new ObjectId(user._id),
        timestamp: new Date()
      });

      res.status(200).json({ message: 'Order updated successfully' });
    } else if (req.method === 'DELETE') {
      const user = await verifyToken(req);
      
      const orderToDelete = await ordersCollection.findOne({ _id: new ObjectId(id) });
      if (!orderToDelete) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Allow deletion of most orders, but prevent deletion of delivered orders
      if (orderToDelete.status === 'Delivered') {
        return res.status(400).json({ 
          message: 'Cannot delete delivered orders. Please contact administrator.' 
        });
      }

      const result = await ordersCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Log activity
      await activitiesCollection.insertOne({
        type: 'order_deleted',
        entityType: 'order',
        entityId: new ObjectId(id),
        description: `Order ${orderToDelete.orderNumber} deleted`,
        userId: new ObjectId(user._id),
        timestamp: new Date()
      });

      res.status(200).json({ message: 'Order deleted successfully' });
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling order request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

