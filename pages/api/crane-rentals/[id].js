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

      // If contract status is being updated to Completed/Cancelled, update ALL crane statuses to Available
      if (updateData.status === 'Completed' || updateData.status === 'Cancelled' || updateData.contractStatus === 'Completed' || updateData.contractStatus === 'Cancelled') {
        const rental = await rentalsCollection.findOne({ _id: new ObjectId(id) });
        if (rental && rental.craneRentals && Array.isArray(rental.craneRentals)) {
          const cranesCollection = db.collection('cranes');
          // Update ALL cranes to Available when contract is completed/cancelled
          for (const craneRental of rental.craneRentals) {
            await cranesCollection.updateOne(
              { _id: new ObjectId(craneRental.craneId) },
              { $set: { status: 'Available', updatedAt: new Date() } }
            );
          }
          
          // Also update the craneRentals array in the rental document
          const updatedCraneRentals = rental.craneRentals.map(crane => ({
            ...crane,
            craneStatus: 'Completed',
            completionDate: new Date()
          }));
          
          updateData.craneRentals = updatedCraneRentals;
        }
      }

      // If contract status is being updated to Active, update ALL crane statuses to In Use
      if (updateData.status === 'Active' || updateData.contractStatus === 'Active') {
        const rental = await rentalsCollection.findOne({ _id: new ObjectId(id) });
        if (rental && rental.craneRentals && Array.isArray(rental.craneRentals)) {
          const cranesCollection = db.collection('cranes');
          // Update ALL cranes to In Use when contract is active
          for (const craneRentals of rental.craneRentals) {
            await cranesCollection.updateOne(
              { _id: new ObjectId(craneRentals.craneId) },
              { $set: { status: 'In Use', updatedAt: new Date() } }
            );
          }
          
          // Also update the craneRentals array in the rental document
          const updatedCraneRentals = rental.craneRentals.map(crane => ({
            ...crane,
            craneStatus: 'Active',
            completionDate: null
          }));
          
          updateData.craneRentals = updatedCraneRentals;
        }
      }

      // Handle individual crane status updates
      if (updateData.craneRentals) {
        const cranesCollection = db.collection('cranes');
        for (const craneRental of updateData.craneRentals) {
          if (craneRental.craneStatus === 'Completed') {
            await cranesCollection.updateOne(
              { _id: new ObjectId(craneRental.craneId) },
              { $set: { status: 'Available', updatedAt: new Date() } }
            );
          } else if (craneRental.craneStatus === 'Active') {
            await cranesCollection.updateOne(
              { _id: new ObjectId(craneRental.craneId) },
              { $set: { status: 'In Use', updatedAt: new Date() } }
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
