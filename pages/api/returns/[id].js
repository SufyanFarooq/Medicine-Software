import { getCollection } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  try {
    const returnsCollection = await getCollection('returns');
    const medicinesCollection = await getCollection('medicines');

    switch (method) {
      case 'GET':
        const returnItem = await returnsCollection.findOne({ _id: new ObjectId(id) });
        if (!returnItem) {
          return res.status(404).json({ message: 'Return not found' });
        }
        res.status(200).json(returnItem);
        break;

      case 'PUT':
        const { status } = req.body;

        if (!status || !['Pending', 'Approved', 'Rejected'].includes(status)) {
          return res.status(400).json({ message: 'Invalid status' });
        }

        const returnToUpdate = await returnsCollection.findOne({ _id: new ObjectId(id) });
        if (!returnToUpdate) {
          return res.status(404).json({ message: 'Return not found' });
        }

        // If approving the return, update medicine inventory
        if (status === 'Approved' && returnToUpdate.status === 'Pending') {
          // Update medicine quantity (add back to inventory)
          const medicine = await medicinesCollection.findOne({ _id: new ObjectId(returnToUpdate.medicineId) });
          if (medicine) {
            const newQuantity = medicine.quantity + returnToUpdate.quantity;
            await medicinesCollection.updateOne(
              { _id: new ObjectId(returnToUpdate.medicineId) },
              { $set: { quantity: newQuantity, updatedAt: new Date() } }
            );
          }
        }

        // Update return status
        const result = await returnsCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              status,
              updatedAt: new Date(),
              ...(status === 'Approved' && { approvedAt: new Date() }),
              ...(status === 'Rejected' && { rejectedAt: new Date() })
            } 
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Return not found' });
        }

        res.status(200).json({ message: 'Return status updated successfully' });
        break;

      case 'DELETE':
        const deleteResult = await returnsCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ message: 'Return not found' });
        }

        res.status(200).json({ message: 'Return deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 