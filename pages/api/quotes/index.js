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
  
  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  try {
    const quotesCollection = await getCollection('quotes');
    const usersCollection = await getCollection('users');
    const leadsCollection = await getCollection('leads');

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          page = 1,
          limit = 50,
          search = '',
          status: statusFilter,
          year: yearFilter,
          leadId: leadIdFilter,
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = { isActive: { $ne: false } }; // Show active quotes

        // Apply filters
        if (statusFilter) filter.status = statusFilter;
        if (yearFilter) filter.year = parseInt(yearFilter);
        if (leadIdFilter) filter.leadId = new ObjectId(leadIdFilter);

        // Apply search
        if (search) {
          filter.$or = [
            { number: { $regex: search, $options: 'i' } },
            { leadName: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } },
            { note: { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        console.log('=== QUOTES GET REQUEST ===');
        console.log('Filter:', JSON.stringify(filter, null, 2));
        console.log('Sort:', { [sortBy]: sortDirection });

        // Get quotes
        const quotes = await quotesCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const totalCount = await quotesCollection.countDocuments(filter);

        // Populate user data for createdBy and lead data
        for (let quote of quotes) {
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
              { projection: { name: 1, email: 1, company: 1, phone: 1 } }
            );
            quote.lead = lead;
          }
        }

        console.log(`Found ${quotes.length} quotes out of ${totalCount} total`);

        res.status(200).json({
          quotes,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(totalCount / parseInt(limit)),
            total: totalCount
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
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

        console.log('=== QUOTE CREATE REQUEST ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Validate required fields
        const requiredFields = [];
        if (!leadId) requiredFields.push('leadId');
        if (!number) requiredFields.push('number');
        if (!year) requiredFields.push('year');
        if (!date) requiredFields.push('date');
        if (!expireDate) requiredFields.push('expireDate');
        if (!items || !Array.isArray(items) || items.length === 0) requiredFields.push('items');

        if (requiredFields.length > 0) {
          console.log('Missing required fields:', requiredFields);
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Get lead information
        const lead = await leadsCollection.findOne({ _id: new ObjectId(leadId) });
        if (!lead) {
          return res.status(400).json({ message: 'Lead not found' });
        }

        // Check for duplicate quote number in the same year
        const existingQuote = await quotesCollection.findOne({ 
          number: number.toString(), 
          year: parseInt(year) 
        });
        if (existingQuote) {
          console.log('Duplicate quote number found:', number, 'for year:', year);
          return res.status(400).json({ message: 'Quote number already exists for this year' });
        }

        // Validate and process items
        const processedItems = items.map(item => ({
          item: item.item || '',
          description: item.description || '',
          quantity: parseFloat(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
          total: (parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0)
        }));

        // Calculate totals
        const subTotal = processedItems.reduce((sum, item) => sum + item.total, 0);
        const taxAmount = (subTotal * (parseFloat(taxRate) || 0)) / 100;
        const discountAmount = (subTotal * (parseFloat(discountRate) || 0)) / 100;
        const total = subTotal + taxAmount - discountAmount;

        const newQuote = {
          leadId: new ObjectId(leadId),
          leadName: lead.name,
          leadEmail: lead.email,
          company: lead.company || '',
          number: number.toString(),
          year: parseInt(year),
          date: new Date(date),
          expireDate: new Date(expireDate),
          currency: currency || 'USD',
          currencySymbol: currencySymbol || '$',
          items: processedItems,
          subTotal,
          taxRate: parseFloat(taxRate) || 0,
          taxAmount,
          discountRate: parseFloat(discountRate) || 0,
          discountAmount,
          total,
          status: status || 'Draft',
          note: note?.trim() || '',
          terms: terms?.trim() || '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: new ObjectId(user.userId)
        };

        console.log('Creating quote:', JSON.stringify(newQuote, null, 2));

        const result = await quotesCollection.insertOne(newQuote);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: new ObjectId(user.userId),
          username: user.username,
          action: 'create_quote',
          details: `Created quote #${number} for ${lead.name} (${lead.email})`,
          entityType: 'Quote',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        console.log('Quote created successfully:', result.insertedId);
        res.status(201).json({ _id: result.insertedId, ...newQuote });
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
