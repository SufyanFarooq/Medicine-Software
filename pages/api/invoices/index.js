import { getCollection } from '../../../lib/mongodb';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const invoicesCollection = await getCollection('invoices');

    switch (method) {
      case 'GET':
        const invoices = await invoicesCollection.find({}).sort({ date: -1 }).toArray();
        res.status(200).json(invoices);
        break;

      case 'POST':
        const { invoiceNumber, items, subtotal, discount, total, date } = req.body;

        // Validate required fields
        if (!invoiceNumber || !items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        const newInvoice = {
          invoiceNumber,
          items,
          subtotal: parseFloat(subtotal),
          discount: parseFloat(discount),
          total: parseFloat(total),
          date: new Date(date),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await invoicesCollection.insertOne(newInvoice);
        res.status(201).json({ _id: result.insertedId, ...newInvoice });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 