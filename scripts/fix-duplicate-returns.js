const { MongoClient } = require('mongodb');

async function fixDuplicateReturns() {
	const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/business_management';
	const client = new MongoClient(uri);
	
	try {
		await client.connect();
		console.log('Connected to MongoDB');
		
		const db = client.db('medical_shop');
		const returnsCollection = db.collection('returns');
		
		console.log('🔍 Checking for duplicate returns...');
		
		// Find all returns
		const allReturns = await returnsCollection.find({}).toArray();
		console.log(`Found ${allReturns.length} total returns`);
		
		// Group returns by invoiceId
		const returnsByInvoice = {};
		allReturns.forEach(ret => {
			if (ret.invoiceId) {
				const invoiceId = ret.invoiceId.toString();
				if (!returnsByInvoice[invoiceId]) {
					returnsByInvoice[invoiceId] = [];
				}
				returnsByInvoice[invoiceId].push(ret);
			}
		});
		
		// Find invoices with multiple returns
		const duplicateInvoices = Object.entries(returnsByInvoice)
			.filter(([invoiceId, returns]) => returns.length > 1)
			.map(([invoiceId, returns]) => ({ invoiceId, returns }));
		
		console.log(`Found ${duplicateInvoices.length} invoices with multiple returns`);
		
		// Process each duplicate invoice
		for (const { invoiceId, returns } of duplicateInvoices) {
			console.log(`\n📋 Processing invoice ${invoiceId} with ${returns.length} returns:`);
			
			// Group returns by product
			const returnsByProduct = {};
			returns.forEach(ret => {
				ret.items.forEach(item => {
					const productId = item.productId.toString();
					if (!returnsByProduct[productId]) {
						returnsByProduct[productId] = [];
					}
					returnsByProduct[productId].push({
						returnId: ret._id,
						returnNumber: ret.returnNumber,
						quantity: item.quantity,
						date: ret.createdAt
					});
				});
			});
			
			// Check each product for duplicates
			for (const [productId, productReturns] of Object.entries(returnsByProduct)) {
				if (productReturns.length > 1) {
					console.log(`  ⚠️ Product ${productId} has ${productReturns.length} returns:`);
					productReturns.forEach(pr => {
						console.log(`    - ${pr.returnNumber}: ${pr.quantity} items on ${pr.date}`);
					});
					
					// Keep the first return, mark others as duplicates
					const sortedReturns = productReturns.sort((a, b) => new Date(a.date) - new Date(b.date));
					const keepReturn = sortedReturns[0];
					const duplicateReturns = sortedReturns.slice(1);
					
					console.log(`  ✅ Keeping return ${keepReturn.returnNumber}`);
					console.log(`  🗑️ Marking ${duplicateReturns.length} returns as duplicates`);
					
					// Mark duplicate returns
					for (const dupReturn of duplicateReturns) {
						await returnsCollection.updateOne(
							{ _id: dupReturn.returnId },
							{ 
								$set: { 
									status: 'duplicate',
									notes: 'Automatically marked as duplicate return',
									updatedAt: new Date()
								}
							}
						);
					}
				}
			}
		}
		
		console.log('\n🎯 Duplicate return cleanup completed!');
		
		// Show final stats
		const finalStats = await returnsCollection.aggregate([
			{ $group: { _id: '$status', count: { $sum: 1 } } }
		]).toArray();
		
		console.log('\n📊 Final Return Status:');
		finalStats.forEach(stat => {
			console.log(`  ${stat._id || 'active'}: ${stat.count}`);
		});
		
	} catch (error) {
		console.error('Error fixing duplicate returns:', error);
	} finally {
		await client.close();
		console.log('Disconnected from MongoDB');
	}
}

// Run the script
fixDuplicateReturns().catch(console.error);
