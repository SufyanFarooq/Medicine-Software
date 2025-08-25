import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
	const { method } = req;

	try {
		const { db } = await connectToDatabase();
		const col = db.collection('suppliers');

		switch (method) {
			case 'GET': {
				const suppliers = await col.find({}).sort({ createdAt: -1 }).toArray();
				return res.status(200).json(suppliers);
			}
			case 'POST': {
				const { name, company, phone, email, address, notes } = req.body || {};
				if (!name || !phone) {
					return res.status(400).json({ error: 'Name and phone are required' });
				}
				const payload = {
					name: String(name).trim(),
					company: String(company || '').trim(),
					phone: String(phone).trim(),
					email: String(email || '').trim(),
					address: String(address || '').trim(),
					notes: String(notes || '').trim(),
					createdAt: new Date(),
					updatedAt: new Date(),
				};
				// simple duplicate check by name+phone
				const dup = await col.findOne({ name: payload.name, phone: payload.phone });
				if (dup) {
					return res.status(409).json({ error: 'Supplier with same name and phone already exists' });
				}
				const result = await col.insertOne(payload);
				return res.status(201).json({ ...payload, _id: result.insertedId });
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


