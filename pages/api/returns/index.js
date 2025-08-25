import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const { db } = await connectToDatabase();

    switch (method) {
      case 'GET':
        try {
          const returns = await db.collection('returns').find({}).sort({ createdAt: -1 }).toArray();
          res.status(200).json(returns);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch returns' });
        }
        break;

      case 'POST':
        try {
          console.log('📥 Received return request:', JSON.stringify(req.body, null, 2));
          
          const { 
            invoiceId, 
            invoiceNumber,
            customerName,
            customerPhone,
            items, 
            reason, 
            returnType, // 'full' or 'partial'
            refundAmount,
            refundMethod, // 'cash', 'credit_note', 'bank_transfer'
            notes,
            createdBy
          } = req.body;

          const returnsCol = db.collection('returns');
          const productsCol = db.collection('products');
          const invoicesCol = db.collection('invoices');

          // Validate required fields
          if (!reason) {
            return res.status(400).json({ error: 'Return reason is required' });
          }

          // Handle both single product returns and invoice-based returns
          let returnItems = [];
          
          if (req.body.invoiceId && req.body.invoiceNumber) {
            // Invoice-based return - extract items from request body
            if (req.body.productName && req.body.quantity) {
              // Single item from invoice - need to find productId from invoice
              const invoice = await invoicesCol.findOne({ _id: new ObjectId(req.body.invoiceId) });
              if (!invoice) {
                return res.status(404).json({ error: 'Invoice not found' });
              }
              
              // Find the product in the invoice items
              const invoiceItem = invoice.items.find(item => 
                item.name === req.body.productName || item.code === req.body.productCode
              );
              
              if (!invoiceItem) {
                return res.status(400).json({ error: 'Product not found in the specified invoice' });
              }
              
              console.log('🔍 Found invoice item:', JSON.stringify(invoiceItem, null, 2));
              console.log('🔑 Extracted productId:', invoiceItem.productId || invoiceItem.medicineId);
              
              returnItems = [{
                productId: invoiceItem.productId || invoiceItem.medicineId, // Handle both old and new structure
                productName: req.body.productName,
                productCode: req.body.productCode,
                quantity: parseInt(req.body.quantity),
                price: req.body.price || 0
              }];
            } else if (items && Array.isArray(items) && items.length > 0) {
              // Multiple items from invoice
              returnItems = items;
            } else {
              return res.status(400).json({ error: 'Product details required for invoice-based return' });
            }
          } else if (items && Array.isArray(items) && items.length > 0) {
            // Direct items array return
            returnItems = items;
          } else if (req.body.productName && req.body.quantity) {
            // Single product return (no invoice)
            // Try to find product by name if productId is not provided
            let productId = req.body.productId;
            if (!productId && req.body.productName) {
              const product = await productsCol.findOne({ name: req.body.productName });
              if (product) {
                productId = product._id;
              }
            }
            
            if (!productId) {
              return res.status(400).json({ error: 'Product not found. Please provide a valid product.' });
            }
            
            returnItems = [{
              productId: productId,
              productName: req.body.productName,
              productCode: req.body.productCode,
              quantity: parseInt(req.body.quantity),
              price: req.body.price || 0
            }];
          } else {
            return res.status(400).json({ error: 'Either items array or single product details must be provided' });
          }

          console.log('🔍 Processed returnItems:', JSON.stringify(returnItems, null, 2));

          // Validate invoice exists if provided
          if (invoiceId) {
            const invoice = await invoicesCol.findOne({ _id: new ObjectId(invoiceId) });
            if (!invoice) {
              return res.status(404).json({ error: 'Invoice not found' });
            }
            
            // Check for duplicate returns from the same invoice
            for (const returnItem of returnItems) {
              const existingReturn = await returnsCol.findOne({
                invoiceId: new ObjectId(invoiceId),
                'items.productId': new ObjectId(returnItem.productId)
              });
              
              if (existingReturn) {
                const existingItem = existingReturn.items.find(item => 
                  item.productId.toString() === returnItem.productId
                );
                const totalReturned = existingItem ? existingItem.quantity : 0;
                const invoiceItem = invoice.items.find(item => 
                  item.productId?.toString() === returnItem.productId || 
                  item.medicineId?.toString() === returnItem.productId
                );
                const invoiceQuantity = invoiceItem ? invoiceItem.quantity : 0;
                
                if (totalReturned >= invoiceQuantity) {
                  return res.status(400).json({ 
                    error: `Product "${returnItem.productName}" has already been fully returned from this invoice. Cannot return again.` 
                  });
                }
                
                // Check if this return would exceed the original invoice quantity
                if (totalReturned + returnItem.quantity > invoiceQuantity) {
                  return res.status(400).json({ 
                    error: `Cannot return ${returnItem.quantity} items of "${returnItem.productName}". Only ${invoiceQuantity - totalReturned} items remaining to return from this invoice.` 
                  });
                }
              }
            }
          }

          // Generate return number
          const lastReturn = await returnsCol
            .find({ returnNumber: { $regex: '^RET\\d+$' } })
            .sort({ returnNumber: -1 })
            .limit(1)
            .toArray();

          let nextReturnNumber = 'RET001';
          if (lastReturn.length > 0) {
            const lastNumber = parseInt(lastReturn[0].returnNumber.replace('RET', ''), 10) + 1;
            nextReturnNumber = `RET${lastNumber.toString().padStart(3, '0')}`;
          }

          // Process return items and restore stock
          const processedItems = [];
          let totalRefundAmount = 0;

          for (const returnItem of returnItems) {
            if (!returnItem.productId) {
              return res.status(400).json({ error: 'Product ID is required for each return item' });
            }

            const product = await productsCol.findOne({ _id: new ObjectId(returnItem.productId) });
            if (!product) {
              return res.status(404).json({ error: `Product ${returnItem.productId} not found` });
            }

            // Additional validation for invoice-based returns
            if (invoiceId) {
              const invoice = await invoicesCol.findOne({ _id: new ObjectId(invoiceId) });
              if (invoice) {
                const invoiceItem = invoice.items.find(item => 
                  item.productId?.toString() === returnItem.productId || 
                  item.medicineId?.toString() === returnItem.productId
                );
                
                if (invoiceItem) {
                  const invoiceQuantity = invoiceItem.quantity || 0;
                  
                  // Check if return quantity exceeds invoice quantity
                  if (returnItem.quantity > invoiceQuantity) {
                    return res.status(400).json({ 
                      error: `Cannot return ${returnItem.quantity} items. Only ${invoiceQuantity} items were sold in this invoice.` 
                    });
                  }
                  
                  // Check total returns from this invoice for this product
                  const existingReturns = await returnsCol.find({
                    invoiceId: new ObjectId(invoiceId),
                        'items.productId': new ObjectId(returnItem.productId)
                  }).toArray();
                  
                  const totalAlreadyReturned = existingReturns.reduce((sum, ret) => {
                    const item = ret.items.find(i => i.productId.toString() === returnItem.productId);
                    return sum + (item ? item.quantity : 0);
                  }, 0);
                  
                  if (totalAlreadyReturned + returnItem.quantity > invoiceQuantity) {
                    return res.status(400).json({ 
                      error: `Cannot return ${returnItem.quantity} items. Total returns (${totalAlreadyReturned}) + new return (${returnItem.quantity}) would exceed invoice quantity (${invoiceQuantity}).` 
                    });
                  }
                }
              }
            }

            // Calculate refund amount for this item
            const itemRefundAmount = returnItem.quantity * (returnItem.price || product.sellingPrice || 0);
            totalRefundAmount += itemRefundAmount;

            // Restore stock
            const newQuantity = (product.quantity || 0) + returnItem.quantity;
            await productsCol.updateOne(
              { _id: new ObjectId(returnItem.productId) },
              { 
                $set: { 
                  quantity: newQuantity,
                  updatedAt: new Date()
                }
              }
            );

            // Create inventory inflow record for stock restoration
            await db.collection('inventory').insertOne({
              productId: new ObjectId(returnItem.productId),
              type: 'inflow',
              quantity: returnItem.quantity,
              referenceType: 'return',
              referenceId: nextReturnNumber,
              notes: `Stock restored from return ${nextReturnNumber} - ${reason}`,
              date: new Date(),
              createdAt: new Date()
            });

            processedItems.push({
              ...returnItem,
              productId: new ObjectId(returnItem.productId),
              refundAmount: itemRefundAmount
            });
          }

          // Create return record
          const returnRecord = {
            returnNumber: nextReturnNumber,
            invoiceId: invoiceId ? new ObjectId(invoiceId) : null,
            invoiceNumber: invoiceNumber || null,
            customerName: customerName || 'Walk-in Customer',
            customerPhone: customerPhone || '',
            items: processedItems,
            reason: reason,
            returnType: returnType || 'partial',
            refundAmount: refundAmount || totalRefundAmount,
            refundMethod: refundMethod || 'cash',
            notes: notes || '',
            totalItems: processedItems.length,
            totalQuantity: processedItems.reduce((sum, item) => sum + item.quantity, 0),
            returnValue: totalRefundAmount,
            status: 'processed',
            date: new Date(),
            createdAt: new Date(),
            createdBy: createdBy || null
          };

          const result = await returnsCol.insertOne(returnRecord);

          if (result.insertedId) {
            // Update invoice with return information
            if (invoiceId) {
              try {
                const invoice = await invoicesCol.findOne({ _id: new ObjectId(invoiceId) });
                if (invoice) {
                  // Calculate new invoice totals after returns
                  let totalReturns = 0;
                  let totalReturnQuantity = 0;
                  
                  // Get all returns for this invoice
                  const allReturnsForInvoice = await returnsCol.find({ 
                    invoiceId: new ObjectId(invoiceId) 
                  }).toArray();
                  
                  allReturnsForInvoice.forEach(ret => {
                    ret.items.forEach(item => {
                      totalReturns += item.refundAmount || 0;
                      totalReturnQuantity += item.quantity || 0;
                    });
                  });
                  
                  // Update invoice with return information
                  const updatedInvoiceItems = invoice.items.map(item => {
                    const itemReturns = allReturnsForInvoice.reduce((sum, ret) => {
                      const returnItem = ret.items.find(ri => 
                        ri.productId.toString() === (item.productId || item.medicineId).toString()
                      );
                      return sum + (returnItem ? returnItem.quantity : 0);
                    }, 0);
                    
                    return {
                      ...item,
                      returnedQuantity: itemReturns,
                      remainingQuantity: (item.quantity || 0) - itemReturns,
                      isFullyReturned: itemReturns >= (item.quantity || 0)
                    };
                  });
                  
                  // Calculate new invoice totals
                  const newSubtotal = updatedInvoiceItems.reduce((sum, item) => {
                    const remainingQty = item.remainingQuantity;
                    const unitPrice = item.price || 0;
                    return sum + (remainingQty * unitPrice);
                  }, 0);
                  
                  const newTaxAmount = (invoice.taxRate || 0) * newSubtotal / 100;
                  const newTotal = newSubtotal + newTaxAmount + (invoice.freight || 0) - (invoice.discount || 0);
                  
                  // Determine invoice status
                  let newStatus = invoice.status;
                  const totalInvoiceQuantity = invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                  if (totalReturnQuantity >= totalInvoiceQuantity) {
                    newStatus = 'fully_returned';
                  } else if (totalReturnQuantity > 0) {
                    newStatus = 'partially_returned';
                  }
                  
                  // Update invoice
                  await invoicesCol.updateOne(
                    { _id: new ObjectId(invoiceId) },
                    {
                      $set: {
                        items: updatedInvoiceItems,
                        totalReturns: totalReturns,
                        totalReturnQuantity: totalReturnQuantity,
                        subtotal: newSubtotal,
                        taxAmount: newTaxAmount,
                        total: newTotal,
                        status: newStatus,
                        updatedAt: new Date()
                      }
                    }
                  );
                  
                  console.log(`✅ Invoice ${invoiceNumber} updated with return information`);
                }
              } catch (invoiceUpdateError) {
                console.warn('Failed to update invoice:', invoiceUpdateError);
              }
            }
            
            // Log the activity
            try {
              await db.collection('activities').insertOne({
                type: 'RETURN_PROCESSED',
                description: `Return ${nextReturnNumber} processed for ${returnRecord.totalQuantity} items`,
                details: {
                  returnNumber: nextReturnNumber,
                  reason: reason,
                  refundAmount: returnRecord.refundAmount,
                  items: processedItems.map(item => item.productName),
                  invoiceNumber: invoiceNumber || null
                },
                date: new Date(),
                createdAt: new Date(),
                createdBy: createdBy || null
              });
            } catch (activityError) {
              console.warn('Failed to log activity:', activityError);
            }

            res.status(201).json({
              message: 'Return processed successfully',
              returnNumber: nextReturnNumber,
              returnId: result.insertedId,
              refundAmount: returnRecord.refundAmount,
              stockRestored: returnRecord.totalQuantity,
              invoiceUpdated: !!invoiceId
            });
          } else {
            res.status(500).json({ error: 'Failed to create return record' });
          }
        } catch (error) {
          console.error('Error processing return:', error);
          res.status(500).json({ error: 'Failed to process return' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
} 