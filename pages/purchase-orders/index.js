import { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { 
  Table, 
  Button, 
  Card, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Modal, 
  Form, 
  Input, 
  Select,
  InputNumber,
  message,
  Popconfirm,
  Tooltip,
  Tag,
  Alert,
  Divider,
  Drawer,
  Collapse,
  Spin,
  Badge,
  Progress,
  Descriptions
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ShoppingCartOutlined,
  UserOutlined,
  FileTextOutlined,
  PrinterOutlined,
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  ShopOutlined,
  BarcodeOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

export default function PurchaseOrdersPage() {
	const [suppliers, setSuppliers] = useState([]);
	const [products, setProducts] = useState([]);
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState({ supplierId: '', items: [], notes: '', taxRate: 0, freight: 0, discount: 0 });
	const [search, setSearch] = useState('');
	const [receiveDrawer, setReceiveDrawer] = useState(null);
	const [payment, setPayment] = useState({ poId: '', amount: '' });
	const [priceWarning, setPriceWarning] = useState('');
	const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
	const [quickProductModalVisible, setQuickProductModalVisible] = useState(false);
	const [quickProductForm] = Form.useForm();
	const [paymentModalVisible, setPaymentModalVisible] = useState(false);
	const [paymentForm] = Form.useForm();

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
				const poData = await poRes.json();
				const ordersArray = poData.purchaseOrders || poData || [];
				setOrders(Array.isArray(ordersArray) ? ordersArray : []);
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
		if (!form.supplierId || form.items.length === 0) {
			message.error('Select supplier and add at least one item');
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
			message.success('Purchase order created successfully!');
		} catch (e) {
			message.error(e.message);
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
			const listData = await listRes.json();
			const ordersArray = listData.purchaseOrders || listData || [];
			setOrders(Array.isArray(ordersArray) ? ordersArray : []);
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
			const listData = await listRes.json();
			const ordersArray = listData.purchaseOrders || listData || [];
			setOrders(Array.isArray(ordersArray) ? ordersArray : []);
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
				const listData = await listRes.json();
			const ordersArray = listData.purchaseOrders || listData || [];
			setOrders(Array.isArray(ordersArray) ? ordersArray : []);
				
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

	const quickAddProduct = async (values) => {
		setLoading(true);
		try {
			const res = await apiRequest('/api/products', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: values.name,
					code: values.code,
					category: values.category || 'General',
					unit: values.unit,
					purchasePrice: Number(values.purchasePrice) || 0,
					sellingPrice: Number(values.sellingPrice) || 0,
					quantity: 0 // Will be updated when PO is received
				})
			});
			if (res.ok) {
				const newProduct = await res.json();
				setProducts(prev => [newProduct, ...prev]);
				setQuickProductModalVisible(false);
				quickProductForm.resetFields();
				message.success('Product added successfully!');
				// Auto-add to PO form
				addItem(newProduct);
			} else {
				const data = await res.json();
				throw new Error(data.error || 'Failed to create product');
			}
		} catch (e) {
			message.error(e.message);
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

	// Define table columns for purchase orders
	const poColumns = [
		{
			title: 'PO #',
			dataIndex: 'poNumber',
			key: 'poNumber',
			render: (text) => <Text code strong>{text}</Text>,
		},
		{
			title: 'Supplier',
			dataIndex: 'supplierName',
			key: 'supplierName',
			render: (text) => (
				<Space>
					<ShopOutlined style={{ color: '#1890ff' }} />
					<Text>{text}</Text>
				</Space>
			),
		},
		{
			title: 'Items',
			dataIndex: 'items',
			key: 'items',
			render: (items) => (
				<Badge count={items?.length || 0} showZero>
					<ShoppingCartOutlined style={{ fontSize: '16px' }} />
				</Badge>
			),
		},
		{
			title: 'Grand Total',
			key: 'grandTotal',
			render: (_, record) => (
				<Text strong>Rs {(record.grandTotal ?? record.totalAmount)?.toFixed(2)}</Text>
			),
		},
		{
			title: 'Status',
			dataIndex: 'status',
			key: 'status',
			render: (status) => {
				const color = status === 'OPEN' ? 'processing' : 
							 status === 'RECEIVED' ? 'success' : 
							 status === 'CANCELLED' ? 'error' : 'default';
				const icon = status === 'OPEN' ? <CloseCircleOutlined /> : 
							status === 'RECEIVED' ? <CheckCircleOutlined /> : 
							status === 'CANCELLED' ? <ExclamationCircleOutlined /> : null;
				return <Tag color={color} icon={icon}>{status}</Tag>;
			},
		},
		{
			title: 'Actions',
			key: 'actions',
			render: (_, record) => (
				<Space>
					{record.status === 'OPEN' && (
						<>
							<Tooltip title="Partial Receive">
								<Button 
									type="text" 
									icon={<ShoppingCartOutlined />}
									onClick={() => {
										console.log('PO data:', record);
										openReceive(record);
									}}
								>
									Receive
								</Button>
							</Tooltip>
							<Popconfirm
								title="Cancel Purchase Order"
								description="Are you sure you want to cancel this PO?"
								onConfirm={() => cancelPO(record._id)}
								okText="Yes"
								cancelText="No"
								okType="danger"
							>
								<Tooltip title="Cancel PO">
									<Button type="text" danger icon={<CloseCircleOutlined />}>
										Cancel
									</Button>
								</Tooltip>
							</Popconfirm>
						</>
					)}
					{record.status === 'RECEIVED' && (
						<Tooltip title="Check Price Warnings">
							<Button 
								type="text" 
								icon={<WarningOutlined />}
								onClick={() => checkPriceWarnings(record._id)}
							>
								Check Prices
							</Button>
						</Tooltip>
					)}
					{record.status !== 'CANCELLED' && (
						<Tooltip title="Print PO">
							<Button 
								type="text" 
								icon={<PrinterOutlined />}
								onClick={() => printPO(record)}
							>
								Print
							</Button>
						</Tooltip>
					)}
				</Space>
			),
		},
	];

	return (
		<Layout>
			<div style={{ padding: '24px' }}>
				{/* Header */}
				<Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
					<Col>
						<Title level={2} style={{ margin: 0 }}>
							<Space>
								🧾 Purchase Orders
							</Space>
						</Title>
						<Text type="secondary">Manage purchase orders and inventory receiving</Text>
					</Col>
				</Row>

				{/* Create Purchase Order */}
				<Card title="Create Purchase Order" style={{ marginBottom: '24px' }}>
					<Row gutter={16} style={{ marginBottom: '16px' }}>
						<Col span={8}>
							<Text strong>Supplier *</Text>
							<Select
								placeholder="Select Supplier"
								style={{ width: '100%', marginTop: '8px' }}
								value={form.supplierId || undefined}
								onChange={(value) => setForm({ ...form, supplierId: value })}
								showSearch
								filterOption={(input, option) =>
									option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
								}
							>
								{suppliers.map(s => (
									<Option key={s._id} value={s._id}>
										<Space>
											<UserOutlined />
											{s.name}
										</Space>
									</Option>
								))}
							</Select>
						</Col>
						<Col span={16}>
							<Text strong>Notes</Text>
							<Input
								placeholder="Enter order notes"
								style={{ marginTop: '8px' }}
								value={form.notes}
								onChange={(e) => setForm({ ...form, notes: e.target.value })}
								prefix={<FileTextOutlined />}
							/>
						</Col>
					</Row>

					<Row gutter={24}>
						<Col span={12}>
							<Title level={4}>Products</Title>
							<Row gutter={8} style={{ marginBottom: '16px' }}>
								<Col flex={1}>
									<Input
										placeholder="Search products"
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										prefix={<SearchOutlined />}
										allowClear
									/>
								</Col>
								<Col>
									<Button 
										type="primary"
										icon={<PlusOutlined />}
										onClick={() => setQuickProductModalVisible(true)}
									>
										Quick Add
									</Button>
								</Col>
							</Row>
							
							<Card 
								size="small"
								style={{ maxHeight: '300px', overflowY: 'auto' }}
								bodyStyle={{ padding: '8px' }}
							>
								{/* Valid products */}
								{products.filter(p => p.name && p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
									<Row key={p._id} justify="space-between" align="middle" style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
										<Col span={18}>
											<div>
												<Text strong>{p.name}</Text>
												<br />
												<Text type="secondary" style={{ fontSize: '12px' }}>
													Stock: {p.quantity} {p.unit} • Cost: Rs {p.purchasePrice}
												</Text>
											</div>
										</Col>
										<Col span={6} style={{ textAlign: 'right' }}>
											<Button 
												type="link" 
												size="small"
												onClick={() => addItem(p)}
											>
												Add
											</Button>
										</Col>
									</Row>
								))}
								
								{/* Products with missing names */}
								{products.filter(p => !p.name && (search === '' || p.code?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.toLowerCase().includes(search.toLowerCase()))).map(p => (
									<Row key={p._id} justify="space-between" align="middle" style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fff2f0' }}>
										<Col span={18}>
											<div>
												<Text type="danger" strong>
													⚠️ Missing Name (Code: {p.code || 'N/A'})
												</Text>
												<br />
												<Text type="secondary" style={{ fontSize: '12px' }}>
													Stock: {p.quantity} {p.unit} • Cost: Rs {p.purchasePrice}
												</Text>
											</div>
										</Col>
										<Col span={6} style={{ textAlign: 'right' }}>
											<Button 
												type="link" 
												size="small"
												disabled
												danger
											>
												Fix Name First
											</Button>
										</Col>
									</Row>
								))}
								
								{/* No results message */}
								{products.filter(p => 
									(p.name && p.name.toLowerCase().includes(search.toLowerCase())) ||
									(!p.name && (search === '' || p.code?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.toLowerCase().includes(search.toLowerCase())))
								).length === 0 && (
									<div style={{ padding: '32px', textAlign: 'center' }}>
										<Text type="secondary">No products found matching "{search}"</Text>
									</div>
								)}
							</Card>
						</Col>
						<Col span={12}>
							<Title level={4}>Order Items</Title>
							{form.items.length === 0 ? (
								<Alert 
									message="No items added" 
									description="Add products from the left panel to create your purchase order"
									type="info" 
									showIcon 
								/>
							) : (
								<Card size="small">
									<Table
										size="small"
										dataSource={form.items.map(item => ({ ...item, key: item.productId }))}
										pagination={false}
										scroll={{ y: 200 }}
										columns={[
											{
												title: 'Item',
												dataIndex: 'name',
												key: 'name',
												render: (text) => <Text strong>{text}</Text>
											},
											{
												title: 'Qty',
												dataIndex: 'quantity',
												key: 'quantity',
												width: 80,
												render: (value, record) => (
													<InputNumber
														size="small"
														min={1}
														value={value}
														onChange={(val) => updateItem(record.productId, { quantity: val || 1 })}
													/>
												)
											},
											{
												title: 'Unit Price',
												dataIndex: 'unitPrice',
												key: 'unitPrice',
												width: 100,
												render: (value, record) => (
													<InputNumber
														size="small"
														min={0}
														step={0.01}
														value={value}
														onChange={(val) => updateItem(record.productId, { unitPrice: val || 0 })}
													/>
												)
											},
											{
												title: 'Total',
												key: 'total',
												width: 80,
												render: (_, record) => (
													<Text strong>Rs {((Number(record.quantity) || 0) * (Number(record.unitPrice) || 0)).toFixed(2)}</Text>
												)
											},
											{
												title: 'Action',
												key: 'action',
												width: 60,
												render: (_, record) => (
													<Button 
														type="text" 
														danger 
														size="small"
														icon={<DeleteOutlined />}
														onClick={() => removeItem(record.productId)}
													/>
												)
											}
										]}
									/>
								</Card>
							)}
							
							<Row gutter={16} style={{ marginTop: '16px' }}>
								<Col span={8}>
									<Text strong>Tax Rate (%)</Text>
									<InputNumber
										style={{ width: '100%', marginTop: '8px' }}
										min={0}
										max={100}
										value={form.taxRate}
										onChange={(value) => setForm({ ...form, taxRate: value || 0 })}
									/>
								</Col>
								<Col span={8}>
									<Text strong>Freight</Text>
									<InputNumber
										style={{ width: '100%', marginTop: '8px' }}
										min={0}
										step={0.01}
										value={form.freight}
										onChange={(value) => setForm({ ...form, freight: value || 0 })}
										addonBefore="Rs"
									/>
								</Col>
								<Col span={8}>
									<Text strong>Discount</Text>
									<InputNumber
										style={{ width: '100%', marginTop: '8px' }}
										min={0}
										step={0.01}
										value={form.discount}
										onChange={(value) => setForm({ ...form, discount: value || 0 })}
										addonBefore="Rs"
									/>
								</Col>
							</Row>
							
							<Card size="small" style={{ marginTop: '16px' }}>
								<Row justify="space-between" align="middle">
									<Col>
										<Space direction="vertical" size="small">
											<Text type="secondary">Subtotal: Rs {subTotal.toFixed(2)}</Text>
											<Text type="secondary">Tax: Rs {taxAmount.toFixed(2)}</Text>
											<Text type="secondary">Freight: Rs {form.freight}</Text>
											<Text type="secondary">Discount: Rs {form.discount}</Text>
										</Space>
									</Col>
									<Col>
										<Title level={3} style={{ margin: 0 }}>
											Grand Total: Rs {grandTotal.toFixed(2)}
										</Title>
									</Col>
								</Row>
							</Card>
							
							<Row justify="end" style={{ marginTop: '16px' }}>
								<Button 
									type="primary" 
									size="large"
									loading={loading}
									onClick={createPO}
									icon={<ShoppingCartOutlined />}
								>
									{loading ? 'Creating...' : 'Create PO'}
								</Button>
							</Row>
						</Col>
					</Row>
				</Card>

				{/* Purchase Orders List */}
				<Card title="Recent Purchase Orders" style={{ marginBottom: '24px' }}>
					{orders.length > 0 && (
						<Collapse size="small" style={{ marginBottom: '16px' }}>
							<Panel header={`Debug: PO Data (${orders.length} orders)`} key="debug">
								<pre style={{ fontSize: '12px', overflow: 'auto' }}>
									{JSON.stringify(orders.slice(0, 2), null, 2)}
								</pre>
							</Panel>
						</Collapse>
					)}
					
					<Table
						columns={poColumns}
						dataSource={orders}
						rowKey="_id"
						loading={loading}
						pagination={{
							pageSize: 10,
							showSizeChanger: true,
							showQuickJumper: true,
							showTotal: (total, range) => 
								`${range[0]}-${range[1]} of ${total} purchase orders`,
						}}
						scroll={{ x: 1000 }}
						locale={{
							emptyText: (
								<div style={{ textAlign: 'center', padding: '48px' }}>
									<div style={{ fontSize: '48px', marginBottom: '16px' }}>🧾</div>
									<Title level={4} type="secondary">No purchase orders found</Title>
									<Text type="secondary">Create your first purchase order to get started!</Text>
								</div>
							)
						}}
					/>
					
					<Divider />
					
					<Row gutter={16} align="middle">
						<Col flex={1}>
							<Text strong>Record Payment</Text>
							<Select
								placeholder="Select PO for payment"
								style={{ width: '100%', marginTop: '8px' }}
								value={payment.poId || undefined}
								onChange={(value) => setPayment({ ...payment, poId: value })}
								showSearch
							>
								{orders.map(po => (
									<Option key={po._id} value={po._id}>
										{po.poNumber} - {po.supplierName}
									</Option>
								))}
							</Select>
						</Col>
						<Col span={6}>
							<Text strong>Amount</Text>
							<InputNumber
								placeholder="Amount"
								style={{ width: '100%', marginTop: '8px' }}
								value={payment.amount}
								onChange={(value) => setPayment({ ...payment, amount: value })}
								addonBefore="Rs"
								min={0}
								step={0.01}
							/>
						</Col>
						<Col>
							<Button 
								type="primary"
								icon={<DollarOutlined />}
								onClick={recordPayment}
								style={{ marginTop: '24px' }}
							>
								Record Payment
							</Button>
						</Col>
					</Row>
				</Card>

				{/* Price Analysis Results */}
				{priceWarning && (
					<Card title="💰 Price Analysis Results" style={{ marginBottom: '24px' }}>
						<Alert
							message="📊 Price Analysis"
							description={
								<div>
									<Paragraph style={{ whiteSpace: 'pre-line', marginBottom: '16px' }}>
										{priceWarning}
									</Paragraph>
									
									{priceWarning.includes('🔧 Quick Actions:') && (
										<div style={{ marginTop: '16px' }}>
											{(() => {
												const warnings = priceWarning.match(/Product "([^"]+)": Current purchase price Rs(\d+\.?\d*) exceeds selling price Rs(\d+\.?\d*)/g);
												const suggestions = priceWarning.match(/Suggested selling price for "([^"]+)": Rs(\d+\.?\d*)/g);
												
												if (warnings && suggestions) {
													return warnings.map((warning, index) => {
														const productName = warning.match(/Product "([^"]+)"/)[1];
														const suggestedPrice = suggestions[index] ? parseFloat(suggestions[index].match(/Rs(\d+\.?\d*)/)[1]) : 0;
														
														return (
															<Card key={index} size="small" style={{ marginBottom: '8px' }}>
																<Row justify="space-between" align="middle">
																	<Col>
																		<Text strong>{productName}</Text>
																	</Col>
																	<Col>
																		<Space>
																			<Button 
																				type="primary"
																				size="small"
																				onClick={() => quickUpdatePrice(productName, suggestedPrice)}
																			>
																				🚀 Update to Rs{suggestedPrice.toFixed(2)}
																			</Button>
																			<Button 
																				size="small"
																				onClick={() => setPriceWarning(prev => prev.replace(warning, `✅ IGNORED: ${warning}`))}
																			>
																				Ignore
																			</Button>
																		</Space>
																	</Col>
																</Row>
															</Card>
														);
													});
												}
												return null;
											})()}
										</div>
									)}
									
									<Text type="secondary" style={{ fontSize: '12px' }}>
										💡 The system has detected potential profit margin issues. Use the quick actions above to fix them instantly!
									</Text>
								</div>
							}
							type="warning"
							showIcon
						/>
					</Card>
				)}

				{/* Receive Items Drawer */}
				<Drawer
					title={`Receive items for ${receiveDrawer?.poNumber}`}
					placement="right"
					size="large"
					onClose={() => setReceiveDrawer(null)}
					open={!!receiveDrawer}
					footer={
						<Space>
							<Button onClick={() => setReceiveDrawer(null)}>
								Close
							</Button>
							<Button type="primary" onClick={submitReceive} loading={loading}>
								Receive Items
							</Button>
						</Space>
					}
				>
					{receiveDrawer && (
						<div>
							{priceWarning && (
								<Alert
									message="⚠️ Price Warning"
									description={
										<div>
											<Paragraph style={{ whiteSpace: 'pre-line' }}>
												{priceWarning}
											</Paragraph>
											<Text type="secondary" style={{ fontSize: '12px' }}>
												💡 Consider updating the selling price to maintain profit margins.
											</Text>
										</div>
									}
									type="warning"
									showIcon
									style={{ marginBottom: '16px' }}
								/>
							)}
							
							<Table
								size="small"
								dataSource={receiveDrawer.items.map((item, idx) => ({ ...item, key: idx, index: idx }))}
								pagination={false}
								scroll={{ y: 400 }}
								columns={[
									{
										title: 'Item',
										dataIndex: 'name',
										key: 'name',
										render: (text) => <Text strong>{text}</Text>
									},
									{
										title: 'Remaining',
										dataIndex: 'remaining',
										key: 'remaining',
										width: 100,
										render: (value) => <Text>{value}</Text>
									},
									{
										title: 'Receive Now',
										dataIndex: 'receiveQty',
										key: 'receiveQty',
										width: 120,
										render: (value, record) => (
											<InputNumber
												size="small"
												min={0}
												max={record.remaining}
												value={value}
												onChange={(val) => {
													setReceiveDrawer(prev => ({
														...prev,
														items: prev.items.map((x, j) =>
															j === record.index ? { ...x, receiveQty: val || 0 } : x
														)
													}));
												}}
											/>
										)
									},
									{
										title: 'Unit Price',
										dataIndex: 'unitPrice',
										key: 'unitPrice',
										width: 120,
										render: (value, record) => (
											<InputNumber
												size="small"
												min={0}
												step={0.01}
												value={value}
												onChange={(val) => {
													setReceiveDrawer(prev => ({
														...prev,
														items: prev.items.map((x, j) =>
															j === record.index ? { ...x, unitPrice: val || 0 } : x
														)
													}));
												}}
												addonBefore="Rs"
											/>
										)
									}
								]}
							/>
						</div>
					)}
				</Drawer>

				{/* Data Quality Warnings */}
				{products.some(p => !p.name) && (
					<Alert
						message="⚠️ Data Quality Warning"
						description={
							<div>
								<Text>
									Found {products.filter(p => !p.name).length} products with missing names. This may cause errors.
								</Text>
								<br />
								<Text type="secondary" style={{ fontSize: '12px' }}>
									💡 Run "npm run fix-null-names" in terminal to fix these issues.
								</Text>
							</div>
						}
						type="warning"
						showIcon
						style={{ marginBottom: '24px' }}
					/>
				)}

				{/* Quick Add Product Modal */}
				<Modal
					title="Quick Add New Product"
					open={quickProductModalVisible}
					onCancel={() => {
						setQuickProductModalVisible(false);
						quickProductForm.resetFields();
					}}
					footer={null}
					width={600}
				>
					<Form
						form={quickProductForm}
						layout="vertical"
						onFinish={quickAddProduct}
						initialValues={{
							name: '',
							code: '',
							category: 'General',
							unit: 'pcs',
							purchasePrice: 0,
							sellingPrice: 0
						}}
					>
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item
									label="Product Name"
									name="name"
									rules={[{ required: true, message: 'Please enter product name!' }]}
								>
									<Input placeholder="Enter product name" />
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item
									label="Product Code"
									name="code"
									rules={[{ required: true, message: 'Please enter product code!' }]}
								>
									<Input placeholder="Enter product code" />
								</Form.Item>
							</Col>
						</Row>
						
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item
									label="Category"
									name="category"
								>
									<Input placeholder="Enter category" />
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item
									label="Unit"
									name="unit"
								>
									<Select>
										<Option value="pcs">pcs</Option>
										<Option value="kg">kg</Option>
										<Option value="liters">liters</Option>
										<Option value="boxes">boxes</Option>
									</Select>
								</Form.Item>
							</Col>
						</Row>
						
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item
									label="Purchase Price"
									name="purchasePrice"
								>
									<InputNumber
										style={{ width: '100%' }}
										min={0}
										step={0.01}
										addonBefore="Rs"
									/>
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item
									label="Selling Price"
									name="sellingPrice"
								>
									<InputNumber
										style={{ width: '100%' }}
										min={0}
										step={0.01}
										addonBefore="Rs"
									/>
								</Form.Item>
							</Col>
						</Row>
						
						<Row justify="end">
							<Space>
								<Button onClick={() => {
									setQuickProductModalVisible(false);
									quickProductForm.resetFields();
								}}>
									Cancel
								</Button>
								<Button type="primary" htmlType="submit" loading={loading}>
									Add Product
								</Button>
							</Space>
						</Row>
					</Form>
				</Modal>
			</div>
		</Layout>
	);
}


