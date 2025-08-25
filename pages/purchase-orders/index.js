import { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';

export default function PurchaseOrdersPage() {
	const [suppliers, setSuppliers] = useState([]);
	const [products, setProducts] = useState([]);
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState({ supplierId: '', items: [], notes: '', taxRate: 0, freight: 0, discount: 0 });
	const [search, setSearch] = useState('');
	const [error, setError] = useState('');
	const [receiveDrawer, setReceiveDrawer] = useState(null); // po object for partial receive
	const [payment, setPayment] = useState({ poId: '', amount: '' });
	const [priceWarning, setPriceWarning] = useState('');
	const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
	const [quickProductForm, setQuickProductForm] = useState({ name: '', code: '', category: '', unit: 'pcs', purchasePrice: 0, sellingPrice: 0 });

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const [supRes, prodRes, poRes] = await Promise.all([
					apiRequest('/api/suppliers'),
					apiRequest('/api/products'),
					apiRequest('/api/purchase-orders')
				]);
				setSuppliers(await supRes.json());
				setProducts(await prodRes.json());
				setOrders(await poRes.json());
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	const addItem = (p) => {
		setForm(prev => {
			const exists = prev.items.find(i => i.productId === p._id);
			if (exists) return prev;
			return { ...prev, items: [...prev.items, { productId: p._id, name: p.name, quantity: 1, unitPrice: p.purchasePrice || 0 }] };
		});
	};

	const updateItem = (pid, patch) => {
		setForm(prev => ({
			...prev,
			items: prev.items.map(i => i.productId === pid ? { ...i, ...patch } : i)
		}));
	};

	const removeItem = (pid) => {
		setForm(prev => ({ ...prev, items: prev.items.filter(i => i.productId !== pid) }));
	};

	const subTotal = useMemo(() => form.items.reduce((s, i) => s + (Number(i.quantity)||0) * (Number(i.unitPrice)||0), 0), [form.items]);
	const taxAmount = useMemo(() => (Number(form.taxRate)||0) * subTotal / 100, [form.taxRate, subTotal]);
	const grandTotal = useMemo(() => subTotal + taxAmount + (Number(form.freight)||0) - (Number(form.discount)||0), [subTotal, taxAmount, form.freight, form.discount]);

	const createPO = async () => {
		setError('');
		if (!form.supplierId || form.items.length === 0) {
			setError('Select supplier and add at least one item');
			return;
		}
		setLoading(true);
		try {
			const supplier = suppliers.find(s => s._id === form.supplierId);
			const res = await apiRequest('/api/purchase-orders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ supplierId: form.supplierId, supplierName: supplier?.name || '', items: form.items, notes: form.notes, taxRate: form.taxRate, freight: form.freight, discount: form.discount })
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to create purchase order');
			}
			const created = await res.json();
			setOrders(prev => [created, ...prev]);
			setForm({ supplierId: '', items: [], notes: '', taxRate: 0, freight: 0, discount: 0 });
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	const openReceive = (po) => {
		// Handle both old and new PO data structures
		const items = po.items.map(i => {
			const orderedQty = i.orderedQty || i.quantity || 0;
			const receivedQty = i.receivedQty || 0;
			const remaining = orderedQty - receivedQty;
			return {
				productId: (i.productId._id || i.productId),
				name: i.name,
				remaining: remaining,
				receiveQty: remaining > 0 ? remaining : 0,
				unitPrice: i.unitPrice || 0
			};
		});
		setReceiveDrawer({ _id: po._id, poNumber: po.poNumber, supplierName: po.supplierName, items });
	};

	const submitReceive = async () => {
		if (!receiveDrawer) return;
		setLoading(true);
		setPriceWarning('');
		try {
			const res = await apiRequest(`/api/purchase-orders/${receiveDrawer._id}?action=receive`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ receiveItems: receiveDrawer.items.map(i => ({ productId: i.productId, quantity: i.receiveQty, unitPrice: i.unitPrice })) })
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to receive PO');
			}
			const result = await res.json();
			
			// Check for price warnings in the response
			if (result.priceWarnings && result.priceWarnings.length > 0) {
				setPriceWarning(result.priceWarnings.join('\n'));
			}
			
			const listRes = await apiRequest('/api/purchase-orders');
			setOrders(await listRes.json());
			setReceiveDrawer(null);
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	const cancelPO = async (poId) => {
		if (!confirm('Cancel this PO?')) return;
		setLoading(true);
		try {
			await apiRequest(`/api/purchase-orders/${poId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cancel: true }) });
			const listRes = await apiRequest('/api/purchase-orders');
			setOrders(await listRes.json());
		} finally { setLoading(false); }
	};

	const recordPayment = async () => {
		if (!payment.poId || !payment.amount) return;
		setLoading(true);
		try {
			const res = await apiRequest(`/api/purchase-orders/${payment.poId}?action=payment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Number(payment.amount) }) });
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to record payment');
			}
			setPayment({ poId: '', amount: '' });
		} finally { setLoading(false); }
	};

	const getSuggestedSellingPrice = (currentSelling, newPurchase) => {
		// Suggest 20% markup on new purchase price
		const suggested = newPurchase * 1.2;
		return Math.max(suggested, currentSelling);
	};

	const updateProductPrice = async (productId, newSellingPrice) => {
		try {
			const res = await apiRequest(`/api/products/${productId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sellingPrice: newSellingPrice })
			});
			if (res.ok) {
				setPriceWarning(prev => prev + `\n\n✅ Updated selling price for product to Rs${newSellingPrice}`);
			}
		} catch (e) {
			console.error('Error updating product price:', e);
		}
	};

	const quickUpdatePrice = async (productName, suggestedPrice) => {
		try {
			// Find the product by name
			const product = products.find(p => p.name === productName);
			if (!product) {
				setError(`Product "${productName}" not found. This might be due to corrupted data (null name).`);
				return;
			}
			
			// Additional safety check
			if (!product._id) {
				setError(`Product "${productName}" has invalid ID. Cannot update price.`);
				return;
			}
			
			console.log('🔍 Before update - Product data:', product);
			console.log('📝 Sending update with sellingPrice:', suggestedPrice);
			
			const res = await apiRequest(`/api/products/${product._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sellingPrice: suggestedPrice })
			});
			
			if (res.ok) {
				console.log('✅ Update successful, response:', await res.json());
				
				// Update local products list
				setProducts(prev => prev.map(p => 
					p._id === product._id ? { ...p, sellingPrice: suggestedPrice } : p
				));
				
				// Update warning message
				setPriceWarning(prev => prev.replace(
					`Suggested selling price for "${productName}": Rs${suggestedPrice.toFixed(2)} (20% markup on current cost Rs${(suggestedPrice/1.2).toFixed(2)})`,
					`✅ UPDATED: Selling price for "${productName}" is now Rs${suggestedPrice.toFixed(2)}`
				));
				
				// Refresh orders to show updated status
				const listRes = await apiRequest('/api/purchase-orders');
				setOrders(await listRes.json());
				
				// Refresh products to get updated data
				const productsRes = await apiRequest('/api/products');
				const updatedProducts = await productsRes.json();
				setProducts(updatedProducts);
				
				console.log('🔄 Products refreshed, updated product:', updatedProducts.find(p => p._id === product._id));
			} else {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Failed to update product price');
			}
		} catch (e) {
			setError('Failed to update price: ' + e.message);
			console.error('Price update error:', e);
		}
	};

	const quickAddProduct = async () => {
		if (!quickProductForm.name || !quickProductForm.code) {
			setError('Product name and code are required');
			return;
		}
		setLoading(true);
		try {
			const res = await apiRequest('/api/products', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: quickProductForm.name,
					code: quickProductForm.code,
					category: quickProductForm.category || 'General',
					unit: quickProductForm.unit,
					purchasePrice: Number(quickProductForm.purchasePrice) || 0,
					sellingPrice: Number(quickProductForm.sellingPrice) || 0,
					quantity: 0 // Will be updated when PO is received
				})
			});
			if (res.ok) {
				const newProduct = await res.json();
				setProducts(prev => [newProduct, ...prev]);
				setShowQuickAddProduct(false);
				setQuickProductForm({ name: '', code: '', category: '', unit: 'pcs', purchasePrice: 0, sellingPrice: 0 });
				setError('');
				// Auto-add to PO form
				addItem(newProduct);
			} else {
				const data = await res.json();
				throw new Error(data.error || 'Failed to create product');
			}
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	const checkPriceWarnings = async (poId) => {
		try {
			const res = await apiRequest(`/api/purchase-orders/${poId}?action=check-prices`, { method: 'POST' });
			if (res.ok) {
				const data = await res.json();
				if (data.priceWarnings && data.priceWarnings.length > 0) {
					// Create enhanced warning with action buttons
					let enhancedWarning = '';
					data.priceWarnings.forEach((warning, index) => {
						const suggestion = data.priceSuggestions[index];
						const suggestedPrice = suggestion ? parseFloat(suggestion.match(/Rs(\d+\.?\d*)/)[1]) : 0;
						const productName = warning.match(/Product "([^"]+)"/)[1];
						
						enhancedWarning += `${warning}\n\n${suggestion}\n\n`;
						enhancedWarning += `🔧 Quick Actions:\n`;
						enhancedWarning += `• Update to suggested price: Rs${suggestedPrice.toFixed(2)}\n`;
						enhancedWarning += `• Keep current price (not recommended)\n\n`;
					});
					
					setPriceWarning(enhancedWarning);
				} else {
					setPriceWarning('✅ No price issues found. All products have healthy profit margins.');
				}
				if (data.productAnalysis && data.productAnalysis.length > 0) {
					console.log('Product analysis:', data.productAnalysis);
				}
			}
		} catch (e) {
			console.error('Error checking price warnings:', e);
			setPriceWarning('❌ Error checking price warnings: ' + e.message);
		}
	};

	const printPO = (po) => {
		const lines = [];
		lines.push(`PO: ${po.poNumber}`);
		lines.push(`Supplier: ${po.supplierName}`);
		lines.push('Items:');
		po.items.forEach(i => lines.push(`- ${i.name}  ${i.orderedQty} x ${i.unitPrice} = ${i.total}`));
		lines.push(`Subtotal: ${po.subTotal}`);
		lines.push(`Tax (${po.taxRate}%): ${po.taxAmount}`);
		lines.push(`Freight: ${po.freight}`);
		lines.push(`Discount: ${po.discount}`);
		lines.push(`Grand Total: ${po.grandTotal}`);
		const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const w = window.open(url);
		setTimeout(() => { w.print(); }, 300);
	};

	return (
		<Layout>
			<div className="container mx-auto p-4 space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">🧾 Purchase Orders</h1>
				</div>

				<div className="card">
					<h2 className="text-lg font-semibold mb-3">Create Purchase Order</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
						<select className="input-field" value={form.supplierId} onChange={(e)=>setForm({ ...form, supplierId: e.target.value })}>
							<option value="">Select Supplier</option>
							{suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
						</select>
						<input className="input-field md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e)=>setForm({ ...form, notes: e.target.value })} />
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h3 className="font-semibold mb-2">Products</h3>
							<div className="mb-3 flex justify-between items-center">
								<input className="input-field flex-1 mr-2" placeholder="Search products" value={search} onChange={(e)=>setSearch(e.target.value)} />
								<button 
									className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
									onClick={() => setShowQuickAddProduct(!showQuickAddProduct)}
								>
									{showQuickAddProduct ? '✕' : '➕ Quick Add'}
								</button>
							</div>
							
							{showQuickAddProduct && (
								<div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
									<h4 className="font-medium text-green-800 mb-2">Quick Add New Product</h4>
									<div className="grid grid-cols-2 gap-2 mb-3">
										<input 
											className="input-field text-sm" 
											placeholder="Product Name *" 
											value={quickProductForm.name} 
											onChange={(e)=>setQuickProductForm({...quickProductForm, name: e.target.value})} 
										/>
										<input 
											className="input-field text-sm" 
											placeholder="Product Code *" 
											value={quickProductForm.code} 
											onChange={(e)=>setQuickProductForm({...quickProductForm, code: e.target.value})} 
										/>
										<input 
											className="input-field text-sm" 
											placeholder="Category" 
											value={quickProductForm.category} 
											onChange={(e)=>setQuickProductForm({...quickProductForm, category: e.target.value})} 
										/>
										<select 
											className="input-field text-sm" 
											value={quickProductForm.unit} 
											onChange={(e)=>setQuickProductForm({...quickProductForm, unit: e.target.value})}
										>
											<option value="pcs">pcs</option>
											<option value="kg">kg</option>
											<option value="liters">liters</option>
											<option value="boxes">boxes</option>
										</select>
										<input 
											className="input-field text-sm" 
											type="number" 
											step="0.01" 
											placeholder="Purchase Price" 
											value={quickProductForm.purchasePrice} 
											onChange={(e)=>setQuickProductForm({...quickProductForm, purchasePrice: e.target.value})} 
										/>
										<input 
											className="input-field text-sm" 
											type="number" 
											step="0.01" 
											placeholder="Selling Price" 
											value={quickProductForm.sellingPrice} 
											onChange={(e)=>setQuickProductForm({...quickProductForm, sellingPrice: e.target.value})} 
										/>
									</div>
									<div className="flex gap-2">
										<button 
											className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
											onClick={quickAddProduct}
											disabled={loading}
										>
											{loading ? 'Adding...' : 'Add Product'}
										</button>
										<button 
											className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
											onClick={() => setShowQuickAddProduct(false)}
										>
											Cancel
										</button>
									</div>
								</div>
							)}
							
							<div className="max-h-64 overflow-auto border rounded">
								{/* Valid products */}
								{products.filter(p => p.name && p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
									<div key={p._id} className="flex items-center justify-between px-3 py-2 border-b">
										<div>
											<div className="font-medium">{p.name}</div>
											<div className="text-xs text-gray-500">Stock: {p.quantity} {p.unit} • Cost: {p.purchasePrice}</div>
										</div>
										<button className="text-blue-600" onClick={()=>addItem(p)}>Add</button>
									</div>
								))}
								
								{/* Products with missing names */}
								{products.filter(p => !p.name && (search === '' || p.code?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.toLowerCase().includes(search.toLowerCase()))).map(p => (
									<div key={p._id} className="flex items-center justify-between px-3 py-2 border-b bg-red-50">
										<div>
											<div className="font-medium text-red-700">
												⚠️ Missing Name (Code: {p.code || 'N/A'})
											</div>
											<div className="text-xs text-red-500">Stock: {p.quantity} {p.unit} • Cost: {p.purchasePrice}</div>
										</div>
										<button className="text-red-600 text-xs" disabled>Fix Name First</button>
									</div>
								))}
								
								{/* No results message */}
								{products.filter(p => 
									(p.name && p.name.toLowerCase().includes(search.toLowerCase())) ||
									(!p.name && (search === '' || p.code?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.toLowerCase().includes(search.toLowerCase())))
								).length === 0 && (
									<div className="px-3 py-4 text-center text-gray-500">
										No products found matching "{search}"
									</div>
								)}
							</div>
						</div>
						<div>
							<h3 className="font-semibold mb-2">Order Items</h3>
							{form.items.length === 0 ? (
								<p className="text-gray-500 text-sm">No items added</p>
							) : (
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200 text-sm">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-3 py-2 text-left">Item</th>
												<th className="px-3 py-2 text-right">Qty</th>
												<th className="px-3 py-2 text-right">Unit Price</th>
												<th className="px-3 py-2 text-right">Total</th>
												<th className="px-3 py-2">Actions</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{form.items.map(i => (
												<tr key={i.productId}>
													<td className="px-3 py-2">{i.name}</td>
													<td className="px-3 py-2 text-right">
														<input type="number" className="input-field w-24 text-right" value={i.quantity} min="1" onChange={(e)=>updateItem(i.productId, { quantity: Number(e.target.value) })} />
													</td>
													<td className="px-3 py-2 text-right">
														<input type="number" className="input-field w-28 text-right" value={i.unitPrice} min="0" step="0.01" onChange={(e)=>updateItem(i.productId, { unitPrice: Number(e.target.value) })} />
													</td>
													<td className="px-3 py-2 text-right">{(Number(i.quantity)||0) * (Number(i.unitPrice)||0)}</td>
													<td className="px-3 py-2"><button className="text-red-600" onClick={()=>removeItem(i.productId)}>Remove</button></td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
								<div className="space-y-2">
									<label className="text-sm">Tax Rate (%)</label>
									<input type="number" className="input-field" value={form.taxRate} onChange={(e)=>setForm({ ...form, taxRate: Number(e.target.value) })} />
								</div>
								<div className="space-y-2">
									<label className="text-sm">Freight</label>
									<input type="number" className="input-field" value={form.freight} onChange={(e)=>setForm({ ...form, freight: Number(e.target.value) })} />
								</div>
								<div className="space-y-2">
									<label className="text-sm">Discount</label>
									<input type="number" className="input-field" value={form.discount} onChange={(e)=>setForm({ ...form, discount: Number(e.target.value) })} />
								</div>
							</div>
							<div className="flex justify-between items-center mt-4">
								<div className="text-gray-600 text-sm">Subtotal: {subTotal} • Tax: {taxAmount} • Freight: {form.freight} • Discount: {form.discount}</div>
								<div className="text-lg font-semibold">Grand Total: {grandTotal}</div>
							</div>
							<div className="mt-4 flex justify-end gap-3">
								<button className="btn-primary" disabled={loading} onClick={createPO}>{loading ? 'Saving...' : 'Create PO'}</button>
							</div>
							{error && <p className="text-red-600 text-sm mt-2">{error}</p>}
						</div>
					</div>
				</div>

				<div className="card">
					<h2 className="text-lg font-semibold mb-3">Recent Purchase Orders</h2>
					{orders.length > 0 && (
						<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
							<details>
								<summary className="cursor-pointer font-medium">Debug: PO Data ({orders.length} orders)</summary>
								<pre className="text-xs mt-2 overflow-auto">{JSON.stringify(orders.slice(0, 2), null, 2)}</pre>
							</details>
						</div>
					)}
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200 text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-3 py-2 text-left">PO #</th>
									<th className="px-3 py-2 text-left">Supplier</th>
									<th className="px-3 py-2 text-right">Items</th>
									<th className="px-3 py-2 text-right">Grand Total</th>
									<th className="px-3 py-2 text-left">Status</th>
									<th className="px-3 py-2">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{orders.map(po => (
									<tr key={po._id}>
										<td className="px-3 py-2 font-mono">{po.poNumber}</td>
										<td className="px-3 py-2">{po.supplierName}</td>
										<td className="px-3 py-2 text-right">{po.items.length}</td>
										<td className="px-3 py-2 text-right">{po.grandTotal ?? po.totalAmount}</td>
										<td className="px-3 py-2">{po.status}</td>
										<td className="px-3 py-2 flex gap-3">
											{po.status === 'OPEN' && (
												<>
													<button className="text-blue-700 hover:underline" onClick={() => {
														console.log('PO data:', po);
														openReceive(po);
													}}>Partial Receive</button>
													<button className="text-gray-700 hover:underline" onClick={() => cancelPO(po._id)}>Cancel</button>
												</>
											)}
											{po.status === 'RECEIVED' && (
												<button className="text-yellow-700 hover:underline" onClick={() => checkPriceWarnings(po._id)}>Check Price Warnings</button>
											)}
											{po.status !== 'CANCELLED' && <button className="text-green-700 hover:underline" onClick={() => printPO(po)}>Print</button>}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="mt-4 flex items-center gap-2">
						<select className="input-field w-64" value={payment.poId} onChange={(e)=>setPayment({ ...payment, poId: e.target.value })}>
							<option value="">Select PO for payment</option>
							{orders.map(po => (<option key={po._id} value={po._id}>{po.poNumber} - {po.supplierName}</option>))}
						</select>
						<input className="input-field w-40" placeholder="Amount" value={payment.amount} onChange={(e)=>setPayment({ ...payment, amount: e.target.value })} />
						<button className="btn-primary" onClick={recordPayment}>Record Payment</button>
					</div>
				</div>

				{priceWarning && (
					<div className="card mb-4">
						<h3 className="text-lg font-semibold mb-3">💰 Price Analysis Results</h3>
						<div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
							<div className="text-yellow-800 font-medium mb-2">📊 Price Analysis</div>
							<div className="text-sm text-yellow-700 whitespace-pre-line mb-3">{priceWarning}</div>
							
							{priceWarning.includes('🔧 Quick Actions:') && (
								<div className="mt-4 space-y-2">
									{(() => {
										const warnings = priceWarning.match(/Product "([^"]+)": Current purchase price Rs(\d+\.?\d*) exceeds selling price Rs(\d+\.?\d*)/g);
										const suggestions = priceWarning.match(/Suggested selling price for "([^"]+)": Rs(\d+\.?\d*)/g);
										
										if (warnings && suggestions) {
											return warnings.map((warning, index) => {
												const productName = warning.match(/Product "([^"]+)"/)[1];
												const suggestedPrice = suggestions[index] ? parseFloat(suggestions[index].match(/Rs(\d+\.?\d*)/)[1]) : 0;
												
												return (
													<div key={index} className="flex items-center gap-3 p-2 bg-white rounded border">
														<span className="text-sm font-medium">{productName}</span>
														<button 
															className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
															onClick={() => quickUpdatePrice(productName, suggestedPrice)}
														>
															🚀 Update to Rs{suggestedPrice.toFixed(2)}
														</button>
														<button 
															className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
															onClick={() => setPriceWarning(prev => prev.replace(warning, `✅ IGNORED: ${warning}`))}
														>
															Ignore
														</button>
													</div>
												);
											});
										}
										return null;
									})()}
								</div>
							)}
							
							<div className="text-xs text-yellow-600 mt-3">
								💡 The system has detected potential profit margin issues. Use the quick actions above to fix them instantly!
							</div>
						</div>
					</div>
				)}

				{receiveDrawer && (
					<div className="card">
						<h3 className="text-lg font-semibold mb-3">Receive items for {receiveDrawer.poNumber}</h3>
						{priceWarning && (
							<div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
								<div className="text-yellow-800 font-medium mb-2">⚠️ Price Warning</div>
								<div className="text-sm text-yellow-700 whitespace-pre-line">{priceWarning}</div>
								<div className="text-xs text-yellow-600 mt-2">
									💡 Consider updating the selling price to maintain profit margins.
								</div>
							</div>
						)}
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200 text-sm">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-3 py-2 text-left">Item</th>
										<th className="px-3 py-2 text-right">Remaining</th>
										<th className="px-3 py-2 text-right">Receive Now</th>
										<th className="px-3 py-2 text-right">Unit Price</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{receiveDrawer.items.map((i, idx) => (
										<tr key={idx}>
											<td className="px-3 py-2">{i.name}</td>
											<td className="px-3 py-2 text-right">{i.remaining}</td>
											<td className="px-3 py-2 text-right"><input type="number" className="input-field w-24 text-right" value={i.receiveQty} min="0" max={i.remaining} onChange={(e)=>{
												const v = Number(e.target.value); setReceiveDrawer(prev => ({ ...prev, items: prev.items.map((x, j) => j===idx ? { ...x, receiveQty: v } : x) }));
											}} /></td>
											<td className="px-3 py-2 text-right"><input type="number" className="input-field w-28 text-right" value={i.unitPrice} step="0.01" onChange={(e)=>{
												const v = Number(e.target.value); setReceiveDrawer(prev => ({ ...prev, items: prev.items.map((x, j) => j===idx ? { ...x, unitPrice: v } : x) }));
											}} /></td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="mt-3 flex justify-end gap-2">
							<button className="text-gray-700" onClick={()=>setReceiveDrawer(null)}>Close</button>
							<button className="btn-primary" onClick={submitReceive}>Receive Items</button>
						</div>
					</div>
				)}

				{error && (
					<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
						<div className="text-red-800 font-medium mb-2">❌ Error</div>
						<div className="text-sm text-red-700">{error}</div>
						{error.includes('corrupted data') && (
							<div className="mt-2 text-xs text-red-600">
								💡 This error suggests database corruption. Run "npm run fix-null-names" to fix it.
							</div>
						)}
					</div>
				)}

				{/* Debug section for data issues */}
				{products.some(p => !p.name) && (
					<div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded">
						<div className="text-orange-800 font-medium mb-2">⚠️ Data Quality Warning</div>
						<div className="text-sm text-orange-700">
							Found {products.filter(p => !p.name).length} products with missing names. This may cause errors.
						</div>
						<div className="mt-2 text-xs text-orange-600">
							💡 Run "npm run fix-null-names" in terminal to fix these issues.
						</div>
					</div>
				)}

			</div>
		</Layout>
	);
}


