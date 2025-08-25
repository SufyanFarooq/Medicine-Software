import { connectToDatabase } from '../../../lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
};

export default async function handler(req, res) {
  const { method } = req;
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(`Method ${method} Not Allowed`); }

  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // normalize
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      dateFilter = { createdAt: { $gte: start, $lte: end } };
    }

    const { db } = await connectToDatabase();
    const invoicesCol = db.collection('invoices');
    const productsCol = db.collection('products');
    const returnsCol = db.collection('returns');

    const invoices = await invoicesCol.find({ ...dateFilter, status: { $ne: 'cancelled' } }).toArray();
    const returns = await returnsCol.find({ ...dateFilter }).toArray();

    let totalRevenue = 0; // sum of item subtotals before tax and discounts
    let totalCost = 0;    // based on purchase price
    let totalTaxes = 0;
    let totalDiscounts = 0;
    let totalSales = 0;

    const productSales = {};
    const categorySales = {};

    for (const invoice of invoices) {
      for (const item of (invoice.items || [])) {
        if (!item) continue;
        const quantity = Number(item.quantity) || 0;
        const sell = Number(item.sellingPrice) || 0;
        const buy = Number(item.purchasePrice) || 0;
        const tax = Number(item.taxAmount) || 0;
        const disc = Number(item.discountAmount) || 0;

        const lineSubtotal = quantity * sell; // gross line
        totalRevenue += lineSubtotal;
        totalCost += quantity * buy;
        totalTaxes += tax;
        totalDiscounts += disc;
        totalSales += quantity;

        const pid = item.productId;
        if (pid) {
          if (!productSales[pid]) productSales[pid] = { quantity: 0, revenue: 0, cost: 0, profit: 0 };
          productSales[pid].quantity += quantity;
          productSales[pid].revenue += lineSubtotal;
          productSales[pid].cost += quantity * buy;
          productSales[pid].profit = productSales[pid].revenue - productSales[pid].cost;
        }

        const cat = item.category || 'Uncategorized';
        if (!categorySales[cat]) categorySales[cat] = { revenue: 0, cost: 0, profit: 0, productCount: 0, products: new Set() };
        categorySales[cat].revenue += lineSubtotal;
        categorySales[cat].cost += quantity * buy;
        categorySales[cat].profit = categorySales[cat].revenue - categorySales[cat].cost;
        if (pid) categorySales[cat].products.add(pid);
      }
    }

    // apply returns (subtract)
    for (const ret of returns) {
      for (const item of (ret.items || [])) {
        const quantity = Number(item.quantity) || 0;
        const sell = Number(item.price) || 0;
        const buy = Number(item.purchasePrice) || 0;
        const lineSubtotal = quantity * sell;
        totalRevenue = Math.max(0, totalRevenue - lineSubtotal);
        totalCost = Math.max(0, totalCost - quantity * buy);
        totalSales = Math.max(0, totalSales - quantity);

        const pid = item.productId;
        if (pid && productSales[pid]) {
          productSales[pid].quantity = Math.max(0, productSales[pid].quantity - quantity);
          productSales[pid].revenue = Math.max(0, productSales[pid].revenue - lineSubtotal);
          productSales[pid].cost = Math.max(0, productSales[pid].cost - quantity * buy);
          productSales[pid].profit = Math.max(0, productSales[pid].revenue - productSales[pid].cost);
        }
      }
    }

    // map product details
    const productIds = Object.keys(productSales).filter(id => { try { new ObjectId(id); return true; } catch { return false; } });
    const prodDocs = productIds.length ? await productsCol.find({ _id: { $in: productIds.map(id => new ObjectId(id)) } }).toArray() : [];
    const prodMap = {}; prodDocs.forEach(p => prodMap[p._id.toString()] = p);

    const topProducts = Object.entries(productSales)
      .map(([id, s]) => ({
        productId: id,
        name: (prodMap[id]?.name) || 'Unknown',
        code: (prodMap[id]?.code) || 'N/A',
        category: (prodMap[id]?.category) || 'Uncategorized',
        quantity: s.quantity,
        revenue: s.revenue,
        profit: s.profit,
      }))
      .filter(p => p.quantity > 0)
      .sort((a,b) => b.revenue - a.revenue)
      .slice(0,20);

    const categoryPerformance = Object.entries(categorySales).map(([name, s]) => ({
      name,
      revenue: s.revenue,
      cost: s.cost,
      profit: s.profit,
      productCount: s.products.size,
      profitMargin: s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0,
    })).sort((a,b) => b.revenue - a.revenue);

    const grossProfit = Math.max(0, totalRevenue - totalCost);
    const netSales = Math.max(0, totalRevenue - totalDiscounts); // to match invoices page metric
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const averageTaxRate = totalRevenue > 0 ? (totalTaxes / totalRevenue) * 100 : 0;

    return res.status(200).json({
      totalRevenue,
      netSales,
      totalSales,
      grossProfit,
      profitMargin,
      costOfGoodsSold: totalCost,
      operatingExpenses: 0,
      totalTaxes,
      totalDiscounts,
      averageTaxRate,
      taxableSales: totalRevenue,
      topProducts,
      categoryPerformance,
    });
  } catch (e) {
    console.error('Reports API Error:', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
}
