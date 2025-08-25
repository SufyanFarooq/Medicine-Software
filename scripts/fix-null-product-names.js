const { MongoClient } = require('mongodb');

async function fixNullProductNames() {
	const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/business_management';
	const client = new MongoClient(uri);
	
	try {
		await client.connect();
		console.log('Connected to MongoDB');
		
		const db = client.db('medical_shop');
		const productsCollection = db.collection('products');
		
		// Find products with null names
		const nullNameProducts = await productsCollection.find({ name: null }).toArray();
		console.log(`Found ${nullNameProducts.length} products with null names`);
		
		if (nullNameProducts.length === 0) {
			console.log('No products with null names found. Database is clean!');
			return;
		}
		
		// Update each product with null name
		for (const product of nullNameProducts) {
			let newName = '';
			
			// Try to use code as name
			if (product.code && product.code !== '') {
				newName = `Product-${product.code}`;
			} else if (product.barcode && product.barcode !== '') {
				newName = `Product-${product.barcode.slice(-6)}`; // Use last 6 chars of barcode
			} else {
				newName = `Product-${product._id.toString().slice(-6)}`; // Use last 6 chars of ID
			}
			
			console.log(`Updating product ${product._id}: null -> "${newName}"`);
			
			await productsCollection.updateOne(
				{ _id: product._id },
				{ 
					$set: { 
						name: newName,
						updatedAt: new Date()
					}
				}
			);
		}
		
		console.log('✅ Successfully fixed all products with null names');
		
		// Verify the fix
		const remainingNullNames = await productsCollection.countDocuments({ name: null });
		console.log(`Remaining products with null names: ${remainingNullNames}`);
		
	} catch (error) {
		console.error('Error fixing null product names:', error);
	} finally {
		await client.close();
		console.log('Disconnected from MongoDB');
	}
}

// Run the script
fixNullProductNames().catch(console.error);
