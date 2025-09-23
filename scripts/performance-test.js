// Performance Testing Script
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'business_management';

async function performanceTest() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log('🚀 Starting Performance Tests...\n');
    
    // Test 1: Products Query Performance
    console.log('📦 Testing Products Query Performance...');
    const startTime1 = Date.now();
    
    const products = await db.collection('products')
      .find({ isActive: true })
      .limit(20)
      .toArray();
    
    const endTime1 = Date.now();
    console.log(`   ✅ Products query: ${endTime1 - startTime1}ms`);
    console.log(`   📊 Found ${products.length} products\n`);
    
    // Test 2: Invoices Query Performance
    console.log('📄 Testing Invoices Query Performance...');
    const startTime2 = Date.now();
    
    const invoices = await db.collection('invoices')
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    
    const endTime2 = Date.now();
    console.log(`   ✅ Invoices query: ${endTime2 - startTime2}ms`);
    console.log(`   📊 Found ${invoices.length} invoices\n`);
    
    // Test 3: Customers Query Performance
    console.log('👥 Testing Customers Query Performance...');
    const startTime3 = Date.now();
    
    const customers = await db.collection('customers')
      .find({ isActive: true })
      .limit(20)
      .toArray();
    
    const endTime3 = Date.now();
    console.log(`   ✅ Customers query: ${endTime3 - startTime3}ms`);
    console.log(`   📊 Found ${customers.length} customers\n`);
    
    // Test 4: Search Performance
    console.log('🔍 Testing Search Performance...');
    const startTime4 = Date.now();
    
    const searchResults = await db.collection('products')
      .find({ 
        $or: [
          { name: { $regex: 'test', $options: 'i' } },
          { sku: { $regex: 'test', $options: 'i' } }
        ]
      })
      .limit(10)
      .toArray();
    
    const endTime4 = Date.now();
    console.log(`   ✅ Search query: ${endTime4 - startTime4}ms`);
    console.log(`   📊 Found ${searchResults.length} search results\n`);
    
    // Test 5: Aggregation Performance
    console.log('📊 Testing Aggregation Performance...');
    const startTime5 = Date.now();
    
    const aggregationResults = await db.collection('products')
      .aggregate([
        { $match: { isActive: true } },
        { $group: { 
          _id: '$category', 
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }},
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
      .toArray();
    
    const endTime5 = Date.now();
    console.log(`   ✅ Aggregation query: ${endTime5 - startTime5}ms`);
    console.log(`   📊 Found ${aggregationResults.length} categories\n`);
    
    // Performance Summary
    const totalTime = (endTime1 - startTime1) + (endTime2 - startTime2) + 
                     (endTime3 - startTime3) + (endTime4 - startTime4) + 
                     (endTime5 - startTime5);
    
    console.log('📈 Performance Summary:');
    console.log(`   🕐 Total test time: ${totalTime}ms`);
    console.log(`   ⚡ Average query time: ${Math.round(totalTime / 5)}ms`);
    
    // Performance Rating
    if (totalTime < 1000) {
      console.log('   🟢 EXCELLENT - System is very fast!');
    } else if (totalTime < 2000) {
      console.log('   🟡 GOOD - System is reasonably fast');
    } else if (totalTime < 5000) {
      console.log('   🟠 FAIR - System needs optimization');
    } else {
      console.log('   🔴 POOR - System needs major optimization');
    }
    
    // Database Stats
    console.log('\n📊 Database Statistics:');
    const collections = await db.listCollections().toArray();
    console.log(`   📁 Collections: ${collections.length}`);
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   📄 ${collection.name}: ${count} documents`);
    }
    
  } catch (error) {
    console.error('❌ Performance test error:', error);
  } finally {
    await client.close();
  }
}

// Run the performance test
performanceTest();
