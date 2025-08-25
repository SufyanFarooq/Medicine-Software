import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
	const { method, query: { id } } = req;

	try {
		const { db } = await connectToDatabase();
		const poCol = db.collection('purchase_orders');
		const inventoryCol = db.collection('inventory');
		const productsCol = db.collection('products');

		switch (method) {
			case 'GET': {
				const po = await poCol.findOne({ _id: new ObjectId(id) });
				if (!po) return res.status(404).json({ error: 'PO not found' });
				return res.status(200).json(po);
			}
			case 'PUT': {
				const { status, notes, items, cancel } = req.body || {};
				if (cancel) {
					const result = await poCol.updateOne({ _id: new ObjectId(id) }, { $set: { status: 'CANCELLED', notes, updatedAt: new Date() } });
					return result.matchedCount === 0 ? res.status(404).json({ error: 'PO not found' }) : res.status(200).json({ message: 'PO cancelled' });
				}
				// allow editing items when OPEN
				if (items) {
					const normalizedItems = items.map(it => ({
						productId: new ObjectId(it.productId),
						name: it.name,
						orderedQty: Number(it.orderedQty) || Number(it.quantity) || 0,
						receivedQty: Number(it.receivedQty) || 0,
						unitPrice: Number(it.unitPrice) || 0,
						total: ((Number(it.orderedQty) || Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))
					}));
					const subTotal = normalizedItems.reduce((s, it) => s + it.total, 0);
					await poCol.updateOne({ _id: new ObjectId(id) }, { $set: { items: normalizedItems, subTotal, updatedAt: new Date(), ...(notes ? { notes } : {}) } });
					return res.status(200).json({ message: 'PO updated' });
				}
				const result = await poCol.updateOne({ _id: new ObjectId(id) }, { $set: { status, notes, updatedAt: new Date() } });
				if (result.matchedCount === 0) return res.status(404).json({ error: 'PO not found' });
				return res.status(200).json({ message: 'PO updated' });
			}
			case 'POST': {
				// Actions: receive or payment
				const { action } = req.query;
				const po = await poCol.findOne({ _id: new ObjectId(id) });
				if (!po) return res.status(404).json({ error: 'PO not found' });

				if (action === 'receive') {
					const { receiveItems } = req.body || {};
					const itemsToReceive = Array.isArray(receiveItems) && receiveItems.length > 0 ? receiveItems : po.items.map(i => ({ productId: i.productId.toString(), quantity: (i.orderedQty - i.receivedQty), unitPrice: i.unitPrice }));
					
					const priceWarnings = [];
					const updatedProducts = [];
					const priceSuggestions = [];
					
					for (const r of itemsToReceive) {
						const pid = new ObjectId(r.productId);
						const qty = Number(r.quantity) || 0;
						if (qty <= 0) continue;
						const unitPrice = Number(r.unitPrice) || 0;
						
						await inventoryCol.insertOne({
							productId: pid,
							type: 'inflow',
							quantity: qty,
							unitPrice,
							totalAmount: qty * unitPrice,
							supplier: po.supplierName || '',
							notes: `PO ${po.poNumber} partial receive`,
							referenceType: 'purchase',
							referenceId: po._id,
							date: new Date(),
							createdAt: new Date(),
							updatedAt: new Date()
						});
						
						// Weighted-average cost update
						const product = await productsCol.findOne({ _id: pid });
						if (product) {
							const existingQty = Number(product.quantity) || 0;
							const existingCost = Number(product.purchasePrice) || 0;
							const newQty = existingQty + qty;
							const newCost = newQty > 0 ? ((existingQty * existingCost) + (qty * unitPrice)) / newQty : unitPrice;
							
							// Check if new purchase price exceeds selling price
							const sellingPrice = Number(product.sellingPrice) || 0;
							if (newCost > sellingPrice && sellingPrice > 0) {
								const warning = `Product "${product.name}": New purchase price Rs${newCost.toFixed(2)} exceeds selling price Rs${sellingPrice.toFixed(2)}. This may result in selling at a loss.`;
								priceWarnings.push(warning);
								
								// Suggest new selling price (20% markup on new cost)
								const suggestedPrice = newCost * 1.2;
								const suggestion = `Suggested selling price for "${product.name}": Rs${suggestedPrice.toFixed(2)} (20% markup on new cost Rs${newCost.toFixed(2)})`;
								priceSuggestions.push(suggestion);
								
								console.warn(`PO ${po.poNumber} - ${warning}`);
								console.log(`PO ${po.poNumber} - ${suggestion}`);
							}
							
							// Log the calculation
							console.log(`PO ${po.poNumber} - Product: ${product.name}`);
							console.log(`  Old: ${existingQty} units @ Rs${existingCost.toFixed(2)} = Rs${(existingQty * existingCost).toFixed(2)}`);
							console.log(`  New: ${qty} units @ Rs${unitPrice.toFixed(2)} = Rs${(qty * unitPrice).toFixed(2)}`);
							console.log(`  Weighted Avg: ${newQty} units @ Rs${newCost.toFixed(2)} = Rs${(newQty * newCost).toFixed(2)}`);
							
							await productsCol.updateOne({ _id: pid }, { $set: { quantity: newQty, purchasePrice: newCost, updatedAt: new Date() } });
							
							updatedProducts.push({
								name: product.name,
								oldPrice: existingCost,
								newPrice: newCost,
								oldQty: existingQty,
								newQty: newQty,
								sellingPrice: sellingPrice,
								suggestedSellingPrice: newCost * 1.2
							});
						}
						
						// bump receivedQty in PO item
						await poCol.updateOne({ _id: new ObjectId(id), 'items.productId': pid }, { $inc: { 'items.$.receivedQty': qty }, $set: { updatedAt: new Date() } });
					}
					
					// if all received, close PO
					const refreshed = await poCol.findOne({ _id: new ObjectId(id) });
					const fullyReceived = refreshed.items.every(i => i.receivedQty >= i.orderedQty);
					if (fullyReceived) {
						await poCol.updateOne({ _id: new ObjectId(id) }, { $set: { status: 'RECEIVED', updatedAt: new Date() } });
					}
					
					return res.status(200).json({ 
						message: 'Items received', 
						priceWarnings,
						priceSuggestions,
						updatedProducts,
						fullyReceived
					});
				}

				if (action === 'payment') {
					const { amount } = req.body || {};
					const billCol = db.collection('supplier_bills');
					const bill = await billCol.findOne({ poId: new ObjectId(id) });
					if (!bill) return res.status(404).json({ error: 'Supplier bill not found' });
					const paid = (Number(bill.paidAmount) || 0) + (Number(amount) || 0);
					const status = paid >= bill.amount ? 'PAID' : 'PARTIAL';
					await billCol.updateOne({ _id: bill._id }, { $set: { paidAmount: paid, status, updatedAt: new Date() } });
					return res.status(200).json({ message: 'Payment recorded', status });
				}

				if (action === 'check-prices') {
					// Analyze existing PO for price issues without modifying it
					const priceWarnings = [];
					const priceSuggestions = [];
					const productAnalysis = [];
					
					for (const item of po.items) {
						const pid = new ObjectId(item.productId);
						const product = await productsCol.findOne({ _id: pid });
						if (product) {
							const currentPurchasePrice = Number(product.purchasePrice) || 0;
							const sellingPrice = Number(product.sellingPrice) || 0;
							
							if (currentPurchasePrice > sellingPrice && sellingPrice > 0) {
								const warning = `Product "${product.name}": Current purchase price Rs${currentPurchasePrice.toFixed(2)} exceeds selling price Rs${sellingPrice.toFixed(2)}. This may result in selling at a loss.`;
								priceWarnings.push(warning);
								
								// Suggest new selling price (20% markup on current cost)
								const suggestedPrice = currentPurchasePrice * 1.2;
								const suggestion = `Suggested selling price for "${product.name}": Rs${suggestedPrice.toFixed(2)} (20% markup on current cost Rs${currentPurchasePrice.toFixed(2)})`;
								priceSuggestions.push(suggestion);
							}
							
							productAnalysis.push({
								name: product.name,
								currentPurchasePrice,
								sellingPrice,
								quantity: product.quantity,
								suggestedSellingPrice: currentPurchasePrice * 1.2,
								profitMargin: sellingPrice > 0 ? ((sellingPrice - currentPurchasePrice) / currentPurchasePrice * 100).toFixed(1) : 'N/A'
							});
						}
					}
					
					return res.status(200).json({
						message: 'Price analysis completed',
						priceWarnings,
						priceSuggestions,
						productAnalysis
					});
				}

				return res.status(400).json({ error: 'Unsupported action' });
			}
			default: {
				res.setHeader('Allow', ['GET', 'PUT', 'POST']);
				return res.status(405).end(`Method ${method} Not Allowed`);
			}
		}
	} catch (err) {
		return res.status(500).json({ error: 'Database connection failed' });
	}
}


