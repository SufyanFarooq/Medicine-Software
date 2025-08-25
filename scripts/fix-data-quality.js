const { MongoClient } = require('mongodb');

async function fixDataQuality() {
	const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/business_management';
	const client = new MongoClient(uri);
	
	try {
		await client.connect();
		console.log('Connected to MongoDB');
		
		const db = client.db('medical_shop');
		const productsCollection = db.collection('products');
		
		console.log('🔍 Checking data quality...');
		
		// 1. Fix null names
		const nullNameProducts = await productsCollection.find({ name: null }).toArray();
		console.log(`Found ${nullNameProducts.length} products with null names`);
		
		for (const product of nullNameProducts) {
			let newName = '';
			if (product.code && product.code !== '') {
				newName = `Product-${product.code}`;
			} else if (product.barcode && product.barcode !== '') {
				newName = `Product-${product.barcode.slice(-6)}`;
			} else {
				newName = `Product-${product._id.toString().slice(-6)}`;
			}
			
			await productsCollection.updateOne(
				{ _id: product._id },
				{ $set: { name: newName, updatedAt: new Date() } }
			);
			console.log(`✅ Fixed: ${product._id} -> "${newName}"`);
		}
		
		// 2. Fix empty names
		const emptyNameProducts = await productsCollection.find({ name: '' }).toArray();
		console.log(`Found ${emptyNameProducts.length} products with empty names`);
		
		for (const product of emptyNameProducts) {
			let newName = '';
			if (product.code && product.code !== '') {
				newName = `Product-${product.code}`;
			} else if (product.barcode && product.barcode !== '') {
				newName = `Product-${product.barcode.slice(-6)}`;
			} else {
				newName = `Product-${product._id.toString().slice(-6)}`;
			}
			
			await productsCollection.updateOne(
				{ _id: product._id },
				{ $set: { name: newName, updatedAt: new Date() } }
			);
			console.log(`✅ Fixed: ${product._id} -> "${newName}"`);
		}
		
		// 3. Fix missing adminDiscount field
		const missingDiscountProducts = await productsCollection.find({ adminDiscount: { $exists: false } }).toArray();
		console.log(`Found ${missingDiscountProducts.length} products missing adminDiscount field`);
		
		if (missingDiscountProducts.length > 0) {
			await productsCollection.updateMany(
				{ adminDiscount: { $exists: false } },
				{ $set: { adminDiscount: 0, updatedAt: new Date() } }
			);
			console.log(`✅ Added adminDiscount: 0 to ${missingDiscountProducts.length} products`);
		}
		
		// 4. Fix missing unit field
		const missingUnitProducts = await productsCollection.find({ unit: { $exists: false } }).toArray();
		console.log(`Found ${missingUnitProducts.length} products missing unit field`);
		
		if (missingUnitProducts.length > 0) {
			await productsCollection.updateMany(
				{ unit: { $exists: false } },
				{ $set: { unit: 'pcs', updatedAt: new Date() } }
			);
			console.log(`✅ Added unit: 'pcs' to ${missingUnitProducts.length} products`);
		}
		
		// 5. Fix missing quantity field
		const missingQuantityProducts = await productsCollection.find({ quantity: { $exists: false } }).toArray();
		console.log(`Found ${missingQuantityProducts.length} products missing quantity field`);
		
		if (missingQuantityProducts.length > 0) {
			await productsCollection.updateMany(
				{ quantity: { $exists: false } },
				{ $set: { quantity: 0, updatedAt: new Date() } }
			);
			console.log(`✅ Added quantity: 0 to ${missingQuantityProducts.length} products`);
		}
		
		// 6. Fix missing purchasePrice field
		const missingPurchasePriceProducts = await productsCollection.find({ purchasePrice: { $exists: false } }).toArray();
		console.log(`Found ${missingPurchasePriceProducts.length} products missing purchasePrice field`);
		
		if (missingPurchasePriceProducts.length > 0) {
			await productsCollection.updateMany(
				{ purchasePrice: { $exists: false } },
				{ $set: { purchasePrice: 0, updatedAt: new Date() } }
			);
			console.log(`✅ Added purchasePrice: 0 to ${missingPurchasePriceProducts.length} products`);
		}
		
		// 7. Fix missing sellingPrice field
		const missingSellingPriceProducts = await productsCollection.find({ sellingPrice: { $exists: false } }).toArray();
		console.log(`Found ${missingSellingPriceProducts.length} products missing sellingPrice field`);
		
		if (missingSellingPriceProducts.length > 0) {
			await productsCollection.updateMany(
				{ sellingPrice: { $exists: false } },
				{ $set: { sellingPrice: 0, updatedAt: new Date() } }
			);
			console.log(`✅ Added sellingPrice: 0 to ${missingSellingPriceProducts.length} products`);
		}
		
		// 8. Fix missing category field
		const missingCategoryProducts = await productsCollection.find({ category: { $exists: false } }).toArray();
		console.log(`Found ${missingCategoryProducts.length} products missing category field`);
		
		if (missingCategoryProducts.length > 0) {
			await productsCollection.updateMany(
				{ category: { $exists: false } },
				{ $set: { category: 'General', updatedAt: new Date() } }
			);
			console.log(`✅ Added category: 'General' to ${missingCategoryProducts.length} products`);
		}
		
		// 9. Fix missing createdAt field
		const missingCreatedAtProducts = await productsCollection.find({ createdAt: { $exists: false } }).toArray();
		console.log(`Found ${missingCreatedAtProducts.length} products missing createdAt field`);
		
		if (missingCreatedAtProducts.length > 0) {
			await productsCollection.updateMany(
				{ createdAt: { $exists: false } },
				{ $set: { createdAt: new Date(), updatedAt: new Date() } }
			);
			console.log(`✅ Added createdAt and updatedAt to ${missingCreatedAtProducts.length} products`);
		}
		
		// 10. Fix missing updatedAt field
		const missingUpdatedAtProducts = await productsCollection.find({ updatedAt: { $exists: false } }).toArray();
		console.log(`Found ${missingUpdatedAtProducts.length} products missing updatedAt field`);
		
		if (missingUpdatedAtProducts.length > 0) {
			await productsCollection.updateMany(
				{ updatedAt: { $exists: false } },
				{ $set: { updatedAt: new Date() } }
			);
			console.log(`✅ Added updatedAt to ${missingUpdatedAtProducts.length} products`);
		}
		
		console.log('\n🎯 Data quality check completed!');
		
		// Final verification
		const finalNullNames = await productsCollection.countDocuments({ name: null });
		const finalEmptyNames = await productsCollection.countDocuments({ name: '' });
		const totalProducts = await productsCollection.countDocuments({});
		
		console.log(`\n📊 Final Status:`);
		console.log(`Total products: ${totalProducts}`);
		console.log(`Products with null names: ${finalNullNames}`);
		console.log(`Products with empty names: ${finalEmptyNames}`);
		
		if (finalNullNames === 0 && finalEmptyNames === 0) {
			console.log(`\n✅ All data quality issues have been resolved!`);
		} else {
			console.log(`\n⚠️ Some issues remain. Consider running the script again.`);
		}
		
	} catch (error) {
		console.error('Error fixing data quality:', error);
	} finally {
		await client.close();
		console.log('Disconnected from MongoDB');
	}
}

// Run the script
fixDataQuality().catch(console.error);
