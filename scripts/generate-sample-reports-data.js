const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medicine_software';

async function generateSampleReportsData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const invoicesCol = db.collection('invoices');
    const productsCol = db.collection('products');
    
    // Check if we have products
    const products = await productsCol.find({}).toArray();
    if (products.length === 0) {
      console.log('No products found. Please create products first.');
      return;
    }
    
    // Clear existing invoices
    await invoicesCol.deleteMany({});
    console.log('Cleared existing invoices');
    
    // Generate sample invoices for the last 3 months
    const now = new Date();
    const sampleInvoices = [];
    
    for (let i = 0; i < 30; i++) {
      const invoiceDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const numItems = Math.floor(Math.random() * 5) + 1; // 1-5 items per invoice
      const items = [];
      
      let totalAmount = 0;
      let totalTax = 0;
      let totalDiscount = 0;
      
      // Select random products for this invoice
      const selectedProducts = [];
      for (let j = 0; j < numItems; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        if (product && !selectedProducts.find(p => p._id.toString() === product._id.toString())) {
          selectedProducts.push(product);
        }
      }
      
      for (const product of selectedProducts) {
        const quantity = Math.floor(Math.random() * 10) + 1;
        const sellingPrice = product.sellingPrice || 100;
        const purchasePrice = product.purchasePrice || 80;
        const taxRate = 0.15; // 15% tax
        const discountRate = Math.random() > 0.7 ? 0.1 : 0; // 10% discount for 30% of items
        
        const subtotal = quantity * sellingPrice;
        const taxAmount = subtotal * taxRate;
        const discountAmount = subtotal * discountRate;
        const finalAmount = subtotal + taxAmount - discountAmount;
        
        items.push({
          productId: product._id.toString(), // Convert ObjectId to string
          name: product.name,
          code: product.code,
          category: product.category || 'General',
          quantity: quantity,
          sellingPrice: sellingPrice,
          purchasePrice: purchasePrice,
          subtotal: subtotal,
          taxAmount: taxAmount,
          discountAmount: discountAmount,
          total: finalAmount
        });
        
        totalAmount += finalAmount;
        totalTax += taxAmount;
        totalDiscount += discountAmount;
      }
      
      const invoice = {
        invoiceNumber: `INV${Date.now()}${i}`,
        customerName: `Customer ${i + 1}`,
        customerPhone: `+92${Math.floor(Math.random() * 900000000) + 100000000}`,
        items: items,
        subtotal: totalAmount - totalTax - totalDiscount, // Fixed calculation
        taxAmount: totalTax,
        discountAmount: totalDiscount,
        totalAmount: totalAmount,
        status: 'completed',
        paymentMethod: Math.random() > 0.5 ? 'cash' : 'card',
        createdAt: invoiceDate,
        updatedAt: invoiceDate,
        createdBy: new ObjectId(),
        globalDiscountPercentage: Math.random() > 0.8 ? Math.floor(Math.random() * 10) + 5 : 0
      };
      
      sampleInvoices.push(invoice);
    }
    
    // Insert sample invoices
    const result = await invoicesCol.insertMany(sampleInvoices);
    console.log(`Created ${result.insertedCount} sample invoices`);
    
    // Generate some sample returns
    const returnsCol = db.collection('returns');
    await returnsCol.deleteMany({});
    
    const sampleReturns = [];
    for (let i = 0; i < 5; i++) {
      const returnDate = new Date(now.getTime() - (i * 3 * 24 * 60 * 60 * 1000));
      const invoice = sampleInvoices[Math.floor(Math.random() * sampleInvoices.length)];
      
      if (invoice && invoice.items.length > 0) {
        const returnItem = invoice.items[Math.floor(Math.random() * invoice.items.length)];
        const returnQuantity = Math.floor(returnItem.quantity / 2) + 1;
        
        const returnRecord = {
          returnNumber: `RET${Date.now()}${i}`,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone,
          items: [{
            productId: returnItem.productId.toString(), // Ensure it's a string
            productName: returnItem.name,
            productCode: returnItem.code,
            quantity: returnQuantity,
            price: returnItem.sellingPrice,
            purchasePrice: returnItem.purchasePrice,
            reason: 'Customer request',
            refundMethod: 'cash',
            refundAmount: returnQuantity * returnItem.sellingPrice
          }],
          totalAmount: returnQuantity * returnItem.sellingPrice,
          status: 'completed',
          createdAt: returnDate,
          updatedAt: returnDate,
          createdBy: new ObjectId()
        };
        
        sampleReturns.push(returnRecord);
      }
    }
    
    if (sampleReturns.length > 0) {
      const returnResult = await returnsCol.insertMany(sampleReturns);
      console.log(`Created ${returnResult.insertedCount} sample returns`);
    }
    
    console.log('✅ Sample reports data generated successfully!');
    console.log('📊 Visit /reports to see the business reports');
    console.log('📈 Sample data includes:');
    console.log(`   - ${sampleInvoices.length} invoices over the last 30 days`);
    console.log(`   - ${sampleReturns.length} returns`);
    console.log(`   - Various products, categories, and tax calculations`);
    
  } catch (error) {
    console.error('❌ Error generating sample reports data:', error);
  } finally {
    await client.close();
    process.exit(0);
  }
}

generateSampleReportsData();
