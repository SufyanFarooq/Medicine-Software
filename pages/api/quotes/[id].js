import { connectToDatabase, getCollection } from '../../../lib/mongodb';
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
  const { method } = req;
  const { id } = req.query;
  
  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  // Validate ObjectId
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid quote ID' });
  }

  try {
    const quotesCollection = await getCollection('quotes');
    const activitiesCollection = await getCollection('activities');

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get quote
        const quote = await quotesCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!quote) {
          return res.status(404).json({ message: 'Quote not found' });
        }

        // Populate user data and lead data
        const usersCollection = await getCollection('users');
        const leadsCollection = await getCollection('leads');
        
        if (quote.createdBy) {
          const createdByUser = await usersCollection.findOne(
            { _id: new ObjectId(quote.createdBy) },
            { projection: { username: 1, firstName: 1, lastName: 1, role: 1 } }
          );
          quote.createdByUser = createdByUser;
        }
        
        if (quote.leadId) {
          const lead = await leadsCollection.findOne(
            { _id: new ObjectId(quote.leadId) },
            { projection: { name: 1, email: 1, company: 1, phone: 1, country: 1 } }
          );
          quote.lead = lead;
        }

        res.status(200).json(quote);
        break;

      case 'PUT':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get existing quote
        const existingQuote = await quotesCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!existingQuote) {
          return res.status(404).json({ message: 'Quote not found' });
        }

        const {
          leadId,
          number,
          year,
          date,
          expireDate,
          currency,
          currencySymbol,
          items,
          taxRate,
          discountRate,
          note,
          terms,
          status
        } = req.body;

        console.log('=== QUOTE UPDATE REQUEST ===');
        console.log('Quote ID:', id);
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Check for duplicate quote number (excluding current quote)
        if (number && year) {
          const duplicateQuote = await quotesCollection.findOne({ 
            number: number.toString(),
            year: parseInt(year),
            _id: { $ne: new ObjectId(id) }
          });
          if (duplicateQuote) {
            return res.status(400).json({ message: 'Quote number already exists for this year' });
          }
        }

        // Get lead information if leadId is provided
        let leadInfo = {};
        if (leadId) {
          const leadsCollection = await getCollection('leads');
          const lead = await leadsCollection.findOne({ _id: new ObjectId(leadId) });
          if (!lead) {
            return res.status(400).json({ message: 'Lead not found' });
          }
          leadInfo = {
            leadId: new ObjectId(leadId),
            leadName: lead.name,
            leadEmail: lead.email,
            company: lead.company || ''
          };
        }

        // Process items if provided
        let processedItems = existingQuote.items;
        let subTotal = existingQuote.subTotal;
        let taxAmount = existingQuote.taxAmount;
        let discountAmount = existingQuote.discountAmount;
        let total = existingQuote.total;

        if (items && Array.isArray(items)) {
          processedItems = items.map(item => ({
            item: item.item || '',
            description: item.description || '',
            quantity: parseFloat(item.quantity) || 1,
            price: parseFloat(item.price) || 0,
            total: (parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0)
          }));

          // Recalculate totals
          subTotal = processedItems.reduce((sum, item) => sum + item.total, 0);
          taxAmount = (subTotal * (parseFloat(taxRate) || existingQuote.taxRate)) / 100;
          discountAmount = (subTotal * (parseFloat(discountRate) || existingQuote.discountRate)) / 100;
          total = subTotal + taxAmount - discountAmount;
        }

        const updateData = {
          ...leadInfo,
          ...(number !== undefined && { number: number.toString() }),
          ...(year !== undefined && { year: parseInt(year) }),
          ...(date !== undefined && { date: new Date(date) }),
          ...(expireDate !== undefined && { expireDate: new Date(expireDate) }),
          ...(currency !== undefined && { currency }),
          ...(currencySymbol !== undefined && { currencySymbol }),
          ...(items !== undefined && { items: processedItems }),
          subTotal,
          ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) }),
          taxAmount,
          ...(discountRate !== undefined && { discountRate: parseFloat(discountRate) }),
          discountAmount,
          total,
          ...(status !== undefined && { status }),
          ...(note !== undefined && { note: note?.trim() || '' }),
          ...(terms !== undefined && { terms: terms?.trim() || '' }),
          updatedAt: new Date(),
          updatedBy: new ObjectId(user.userId)
        };

        console.log('Update data:', JSON.stringify(updateData, null, 2));

        // Update quote
        const result = await quotesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: 'No changes made to quote' });
        }

        // Log activity
        await activitiesCollection.insertOne({
          userId: new ObjectId(user.userId),
          username: user.username,
          action: 'update_quote',
          details: `Updated quote #${updateData.number || existingQuote.number} for ${updateData.leadName || existingQuote.leadName}`,
          entityType: 'Quote',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        // Get updated quote
        const updatedQuote = await quotesCollection.findOne({ _id: new ObjectId(id) });
        console.log('Quote updated successfully');
        res.status(200).json(updatedQuote);
        break;

      case 'DELETE':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get quote to delete
        const quoteToDelete = await quotesCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!quoteToDelete) {
          return res.status(404).json({ message: 'Quote not found' });
        }

        // Soft delete - set isActive to false
        await quotesCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              isActive: false,
              updatedAt: new Date(),
              updatedBy: new ObjectId(user.userId)
            }
          }
        );

        // Log activity
        await activitiesCollection.insertOne({
          userId: new ObjectId(user.userId),
          username: user.username,
          action: 'delete_quote',
          details: `Deleted quote #${quoteToDelete.number} for ${quoteToDelete.leadName}`,
          entityType: 'Quote',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        console.log('Quote deleted successfully (soft delete)');
        res.status(200).json({ message: 'Quote deleted successfully' });
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
