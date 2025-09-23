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
    return res.status(400).json({ message: 'Invalid customer ID' });
  }

  try {
    const customersCollection = await getCollection('customers');

    switch (method) {
      case 'GET':
        if (!permissions.canGenerateInvoices && !permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { includeOrders } = req.query;
        
        const customer = await customersCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!customer) {
          return res.status(404).json({ message: 'Customer not found' });
        }

        // Include recent orders if requested
        if (includeOrders === 'true') {
          const invoicesCollection = await getCollection('invoices');
          const recentOrders = await invoicesCollection
            .find({ customerId: id })
            .sort({ invoiceDate: -1 })
            .limit(10)
            .toArray();
          
          customer.recentOrders = recentOrders;
        }

        res.status(200).json(customer);
        break;

      case 'PUT':
        if (!permissions.canGenerateInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const existingCustomer = await customersCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!existingCustomer) {
          return res.status(404).json({ message: 'Customer not found' });
        }

        const {
          customerType,
          firstName,
          lastName,
          companyName,
          email,
          phone,
          address,
          creditLimit,
          paymentTerms
        } = req.body;

        // Check for duplicate email (excluding current customer)
        if (email && email !== existingCustomer.email) {
          const duplicateEmail = await customersCollection.findOne({ 
            email: email.toLowerCase().trim(),
            isActive: true,
            _id: { $ne: new ObjectId(id) }
          });
          if (duplicateEmail) {
            return res.status(400).json({ message: 'Email already exists' });
          }
        }

        // Check for duplicate phone (excluding current customer)
        if (phone && phone !== existingCustomer.phone) {
          const duplicatePhone = await customersCollection.findOne({ 
            phone: phone.trim(),
            isActive: true,
            _id: { $ne: new ObjectId(id) }
          });
          if (duplicatePhone) {
            return res.status(400).json({ message: 'Phone number already exists' });
          }
        }

        const updateData = {
          ...(customerType && { customerType }),
          ...(firstName !== undefined && { firstName: firstName.trim() }),
          ...(lastName !== undefined && { lastName: lastName.trim() }),
          ...(companyName !== undefined && { companyName: companyName.trim() }),
          ...(email !== undefined && { email: email.toLowerCase().trim() }),
          ...(phone !== undefined && { phone: phone.trim() }),
          ...(address && { address }),
          ...(creditLimit !== undefined && { creditLimit: parseFloat(creditLimit) }),
          ...(paymentTerms && { paymentTerms }),
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        const result = await customersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: 'No changes made to customer' });
        }

        // Log activity
        const activitiesCollection = await getCollection('activities');
        const customerName = companyName || `${firstName || existingCustomer.firstName} ${lastName || existingCustomer.lastName}`;
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_customer',
          details: `Updated customer: ${customerName}`,
          entityType: 'Customer',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        const updatedCustomer = await customersCollection.findOne({ _id: new ObjectId(id) });
        res.status(200).json(updatedCustomer);
        break;

      case 'DELETE':
        if (!permissions.canGenerateInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const customerToDelete = await customersCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!customerToDelete) {
          return res.status(404).json({ message: 'Customer not found' });
        }

        // Check if customer has invoices
        const invoicesCollection = await getCollection('invoices');
        const customerInvoices = await invoicesCollection.countDocuments({ 
          customerId: id
        });

        if (customerInvoices > 0) {
          return res.status(400).json({ 
            message: `Cannot delete customer. They have ${customerInvoices} invoices.` 
          });
        }

        // Soft delete - set isActive to false
        await customersCollection.updateOne(
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
        const customerName = customerToDelete.companyName || `${customerToDelete.firstName} ${customerToDelete.lastName}`;
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'delete_customer',
          details: `Deleted customer: ${customerName}`,
          entityType: 'Customer',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Customer deleted successfully' });
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