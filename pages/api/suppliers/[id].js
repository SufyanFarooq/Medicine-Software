import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
	const { method, query: { id } } = req;

	try {
		const { db } = await connectToDatabase();
		const col = db.collection('suppliers');

		switch (method) {
			case 'GET': {
				const doc = await col.findOne({ _id: new ObjectId(id) });
				if (!doc) return res.status(404).json({ error: 'Supplier not found' });
				return res.status(200).json(doc);
			}
			case 'PUT': {
				const { name, company, phone, email, address, notes } = req.body || {};
				const payload = {
					...(name ? { name: String(name).trim() } : {}),
					...(company !== undefined ? { company: String(company).trim() } : {}),
					...(phone ? { phone: String(phone).trim() } : {}),
					...(email !== undefined ? { email: String(email).trim() } : {}),
					...(address !== undefined ? { address: String(address).trim() } : {}),
					...(notes !== undefined ? { notes: String(notes).trim() } : {}),
					updatedAt: new Date(),
				};
				const result = await col.updateOne({ _id: new ObjectId(id) }, { $set: payload });
				if (result.matchedCount === 0) return res.status(404).json({ error: 'Supplier not found' });
				return res.status(200).json({ message: 'Supplier updated' });
			}
			case 'DELETE': {
				const result = await col.deleteOne({ _id: new ObjectId(id) });
				if (result.deletedCount === 0) return res.status(404).json({ error: 'Supplier not found' });
				return res.status(200).json({ message: 'Supplier deleted' });
			}
			default: {
				res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
				return res.status(405).end(`Method ${method} Not Allowed`);
			}
		}
	} catch (err) {
		return res.status(500).json({ error: 'Database connection failed' });
	}
}


