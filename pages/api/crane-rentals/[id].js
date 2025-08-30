import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Rental ID is required' });
  }

  try {
    const { db } = await connectToDatabase();
    const rentalsCollection = db.collection('crane_rentals');

    if (req.method === 'GET') {
      // Get individual rental
      const rental = await rentalsCollection.findOne({ _id: new ObjectId(id) });
      
      if (!rental) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      res.status(200).json(rental);
    } else if (req.method === 'PATCH') {
      // Update rental
      const updateData = req.body;
      
      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.rentalNumber;
      delete updateData.createdAt;

      // If status is being updated to Completed, update crane status to Available
      if (updateData.status === 'Completed') {
        const rental = await rentalsCollection.findOne({ _id: new ObjectId(id) });
        if (rental && rental.craneId) {
          const cranesCollection = db.collection('cranes');
          await cranesCollection.updateOne(
            { _id: new ObjectId(rental.craneId) },
            { $set: { status: 'Available' } }
          );
        }
      }

      // If status is being updated to Active, update crane status to In Use
      if (updateData.status === 'Active') {
        const rental = await rentalsCollection.findOne({ _id: new ObjectId(id) });
        if (rental && rental.craneId) {
          const cranesCollection = db.collection('cranes');
          await cranesCollection.updateOne(
            { _id: new ObjectId(rental.craneId) },
            { $set: { status: 'In Use' } }
          );
        }
      }

      // Handle multiple cranes status updates
      if (updateData.craneRentals) {
        const cranesCollection = db.collection('cranes');
        for (const craneRental of updateData.craneRentals) {
          if (craneRental.craneStatus === 'Completed') {
            await cranesCollection.updateOne(
              { _id: new ObjectId(craneRental.craneId) },
              { $set: { status: 'Available' } }
            );
          } else if (craneRental.craneStatus === 'Active') {
            await cranesCollection.updateOne(
              { _id: new ObjectId(craneRental.craneId) },
              { $set: { status: 'In Use' } }
            );
          }
        }
      }

      const result = await rentalsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      // Return updated rental
      const updatedRental = await rentalsCollection.findOne({ _id: new ObjectId(id) });
      res.status(200).json(updatedRental);
    } else if (req.method === 'DELETE') {
      // Delete rental
      const result = await rentalsCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      res.status(200).json({ message: 'Rental deleted successfully' });
    } else {
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error handling crane rental:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
