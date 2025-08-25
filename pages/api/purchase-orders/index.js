import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
	const { method } = req;

	try {
		const { db } = await connectToDatabase();
		const poCol = db.collection('purchase_orders');

		switch (method) {
			case 'GET': {
				const list = await poCol.find({}).sort({ createdAt: -1 }).toArray();
				return res.status(200).json(list);
			}
			case 'POST': {
				const { supplierId, supplierName, items, notes, taxRate = 0, freight = 0, discount = 0 } = req.body || {};
				if (!supplierId || !Array.isArray(items) || items.length === 0) {
					return res.status(400).json({ error: 'supplierId and at least one item are required' });
				}
				const normalizedItems = items.map(it => ({
					productId: new ObjectId(it.productId),
					name: it.name,
					orderedQty: Number(it.quantity) || 0,
					receivedQty: 0,
					unitPrice: Number(it.unitPrice) || 0,
					total: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)
				}));

				const subTotal = normalizedItems.reduce((s, it) => s + it.total, 0);
				const taxAmount = (Number(taxRate) || 0) * subTotal / 100;
				const freightAmount = Number(freight) || 0;
				const discountAmount = Number(discount) || 0;
				const grandTotal = subTotal + taxAmount + freightAmount - discountAmount;

				const po = {
					poNumber: `PO${Date.now()}`,
					supplierId: new ObjectId(supplierId),
					supplierName: supplierName || '',
					items: normalizedItems,
					subTotal,
					taxRate: Number(taxRate) || 0,
					taxAmount,
					freight: freightAmount,
					discount: discountAmount,
					grandTotal,
					notes: notes || '',
					status: 'OPEN',
					createdAt: new Date(),
					updatedAt: new Date()
				};
				const result = await poCol.insertOne(po);

				// create a supplier bill record (unpaid)
				await db.collection('supplier_bills').insertOne({
					poId: result.insertedId,
					supplierId: po.supplierId,
					supplierName: po.supplierName,
					amount: grandTotal,
					paidAmount: 0,
					status: 'UNPAID',
					createdAt: new Date(),
					updatedAt: new Date()
				});
				return res.status(201).json({ ...po, _id: result.insertedId });
			}
			default: {
				res.setHeader('Allow', ['GET', 'POST']);
				return res.status(405).end(`Method ${method} Not Allowed`);
			}
		}
	} catch (err) {
		return res.status(500).json({ error: 'Database connection failed' });
	}
}


