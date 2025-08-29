import { connectToDatabase } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      const { db } = await connectToDatabase();
      
      // Get customer details
      const customersCollection = db.collection('customers');
      const customer = await customersCollection.findOne({ _id: new ObjectId(id) });
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Get all crane rentals for this customer
      const rentalsCollection = db.collection('crane_rentals');
      const rentals = await rentalsCollection.find({ 
        customerId: new ObjectId(id) 
      }).sort({ startDate: -1 }).toArray();

      // Get all invoices for this customer
      const invoicesCollection = db.collection('invoices');
      const invoices = await invoicesCollection.find({ 
        customerId: new ObjectId(id) 
      }).sort({ createdAt: -1 }).toArray();

      // Get all returns for this customer (if any)
      const returnsCollection = db.collection('returns');
      const returns = await returnsCollection.find({ 
        customerId: new ObjectId(id) 
      }).sort({ createdAt: -1 }).toArray();

      // Calculate customer statistics
      const totalRentals = rentals.length;
      const totalInvoices = invoices.length;
      const totalSpent = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const totalOutstanding = invoices
        .filter(inv => inv.status === 'Pending' || inv.status === 'Partial')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      // Get project summary
      const projects = {};
      rentals.forEach(rental => {
        const projectKey = rental.projectName || 'Unknown Project';
        if (!projects[projectKey]) {
          projects[projectKey] = {
            name: projectKey,
            location: rental.projectLocation,
            totalRentals: 0,
            totalSpent: 0,
            firstRental: rental.startDate,
            lastRental: rental.startDate
          };
        }
        projects[projectKey].totalRentals++;
        projects[projectKey].totalSpent += rental.totalAmount || 0;
        if (rental.startDate < projects[projectKey].firstRental) {
          projects[projectKey].firstRental = rental.startDate;
        }
        if (rental.startDate > projects[projectKey].lastRental) {
          projects[projectKey].lastRental = rental.startDate;
        }
      });

      const projectList = Object.values(projects);

      // Get crane usage summary
      const craneUsage = {};
      rentals.forEach(rental => {
        const craneKey = rental.craneName || 'Unknown Crane';
        if (!craneUsage[craneKey]) {
          craneUsage[craneKey] = {
            name: craneKey,
            code: rental.craneCode,
            totalRentals: 0,
            totalHours: 0,
            totalDays: 0,
            totalSpent: 0
          };
        }
        craneUsage[craneKey].totalRentals++;
        if (rental.billingType === 'hourly') {
          craneUsage[craneKey].totalHours += rental.totalHours || 0;
        } else {
          craneUsage[craneKey].totalDays += rental.totalDays || 0;
        }
        craneUsage[craneKey].totalSpent += rental.totalAmount || 0;
      });

      const craneUsageList = Object.values(craneUsage);

      // Get monthly spending trends
      const monthlySpending = {};
      invoices.forEach(invoice => {
        const month = invoice.createdAt.toISOString().substring(0, 7); // YYYY-MM format
        if (!monthlySpending[month]) {
          monthlySpending[month] = 0;
        }
        monthlySpending[month] += invoice.totalAmount || 0;
      });

      const monthlyTrends = Object.entries(monthlySpending)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const customerServices = {
        customer: {
          _id: customer._id,
          companyName: customer.companyName,
          contactPerson: customer.contactPerson,
          email: customer.email,
          phone: customer.phone,
          address: customer.address
        },
        statistics: {
          totalRentals,
          totalInvoices,
          totalSpent,
          totalOutstanding,
          averageRentalValue: totalRentals > 0 ? totalSpent / totalRentals : 0
        },
        projects: projectList,
        craneUsage: craneUsageList,
        monthlyTrends,
        recentActivity: [
          ...rentals.slice(0, 10).map(rental => ({
            type: 'rental',
            date: rental.startDate,
            description: `Crane rental: ${rental.craneName} for ${rental.projectName}`,
            amount: rental.totalAmount,
            status: rental.status
          })),
          ...invoices.slice(0, 10).map(invoice => ({
            type: 'invoice',
            date: invoice.createdAt,
            description: `Invoice ${invoice.invoiceNumber} for ${invoice.projectName}`,
            amount: invoice.totalAmount,
            status: invoice.status
          }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20)
      };

      res.status(200).json(customerServices);
    } catch (error) {
      console.error('Error fetching customer services:', error);
      res.status(500).json({ error: 'Failed to fetch customer services' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
