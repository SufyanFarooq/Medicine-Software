import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { hasPermission } from '../../lib/permissions';
import { logSupplierActivity } from '../../lib/activity-logger';
import { apiRequest, getUser } from '../../lib/auth';
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
  message,
  Popconfirm,
  Tooltip,
  Tag,
  Alert,
  Divider,
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  ShopOutlined,
  FileTextOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function SuppliersPage() {
	const [suppliers, setSuppliers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [formModalVisible, setFormModalVisible] = useState(false);
	const [editingSupplier, setEditingSupplier] = useState(null);
	const [currentUser, setCurrentUser] = useState({ role: 'super_admin' });
	const [form] = Form.useForm();

	const canManage = hasPermission(currentUser.role, 'canManageSuppliers');

	const loadSuppliers = async () => {
		setLoading(true);
		try {
			const res = await apiRequest('/api/suppliers');
			const data = await res.json();
			setSuppliers(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error('Error loading suppliers:', error);
			message.error('Failed to load suppliers');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const user = getUser();
		if (user) setCurrentUser(user);
		loadSuppliers();
	}, []);

	const onSubmit = async (values) => {
		setLoading(true);
		try {
			if (editingSupplier) {
				// Update existing supplier
				const res = await apiRequest(`/api/suppliers/${editingSupplier._id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(values)
				});
				if (!res.ok) {
					const data = await res.json();
					throw new Error(data.error || 'Failed to update supplier');
				}
				await logSupplierActivity.updated(values.name, editingSupplier._id);
				message.success('Supplier updated successfully!');
			} else {
				// Create new supplier
				const res = await apiRequest('/api/suppliers', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(values)
				});
				if (!res.ok) {
					const data = await res.json();
					throw new Error(data.error || 'Failed to add supplier');
				}
				const created = await res.json();
				await logSupplierActivity.added(created.name, created._id);
				message.success('Supplier added successfully!');
			}
			resetForm();
			loadSuppliers();
		} catch (err) {
			message.error(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleEdit = (supplier) => {
		setEditingSupplier(supplier);
		form.setFieldsValue({
			name: supplier.name || '',
			phone: supplier.phone || '',
			company: supplier.company || '',
			email: supplier.email || '',
			address: supplier.address || '',
			notes: supplier.notes || ''
		});
		setFormModalVisible(true);
	};

	const handleDelete = async (id, name) => {
		setLoading(true);
		try {
			const res = await apiRequest(`/api/suppliers/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to delete');
			}
			await logSupplierActivity.deleted(name, id);
			message.success('Supplier deleted successfully!');
			loadSuppliers();
		} catch (err) {
			message.error(err.message);
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setFormModalVisible(false);
		setEditingSupplier(null);
		form.resetFields();
	};

	// Define table columns
	const columns = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			render: (text) => (
				<Space>
					<UserOutlined style={{ color: '#1890ff' }} />
					<Text strong>{text}</Text>
				</Space>
			),
		},
		{
			title: 'Company',
			dataIndex: 'company',
			key: 'company',
			render: (text) => (
				<Space>
					<ShopOutlined style={{ color: '#52c41a' }} />
					<Text>{text || '—'}</Text>
				</Space>
			),
		},
		{
			title: 'Phone',
			dataIndex: 'phone',
			key: 'phone',
			render: (text) => (
				<Space>
					<PhoneOutlined style={{ color: '#fa8c16' }} />
					<Text>{text}</Text>
				</Space>
			),
		},
		{
			title: 'Email',
			dataIndex: 'email',
			key: 'email',
			render: (text) => (
				<Space>
					<MailOutlined style={{ color: '#722ed1' }} />
					<Text>{text || '—'}</Text>
				</Space>
			),
		},
		{
			title: 'Address',
			dataIndex: 'address',
			key: 'address',
			render: (text) => (
				<Space>
					<HomeOutlined style={{ color: '#eb2f96' }} />
					<Text>{text || '—'}</Text>
				</Space>
			),
		},
		{
			title: 'Actions',
			key: 'actions',
			render: (_, record) => (
				<Space>
					{canManage && (
						<>
							<Tooltip title="Edit Supplier">
								<Button 
									type="text" 
									icon={<EditOutlined />}
									onClick={() => handleEdit(record)}
								/>
							</Tooltip>
							<Popconfirm
								title="Delete Supplier"
								description="Are you sure you want to delete this supplier?"
								onConfirm={() => handleDelete(record._id, record.name)}
								okText="Yes"
								cancelText="No"
								okType="danger"
							>
								<Tooltip title="Delete Supplier">
									<Button 
										type="text" 
										danger 
										icon={<DeleteOutlined />}
									/>
								</Tooltip>
							</Popconfirm>
						</>
					)}
				</Space>
			),
		},
	];

	if (!canManage) {
		return (
			<Layout>
				<div style={{ padding: '24px' }}>
					<Alert
						message="Access Denied"
						description="You do not have permission to manage suppliers."
						type="error"
						showIcon
					/>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div style={{ padding: '24px' }}>
				{/* Header */}
				<Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
					<Col>
						<Title level={2} style={{ margin: 0 }}>
							<Space>
								🚚 Suppliers
							</Space>
						</Title>
						<Text type="secondary">Manage your supplier database</Text>
					</Col>
					<Col>
						<Space>
							<Link href="/products">
								<Button icon={<ArrowLeftOutlined />}>
									Back to Products
								</Button>
							</Link>
							<Button 
								type="primary" 
								icon={<PlusOutlined />}
								size="large"
								onClick={() => {
									resetForm();
									setFormModalVisible(true);
								}}
							>
								Add Supplier
							</Button>
						</Space>
					</Col>
				</Row>

				{/* Suppliers Table */}
				<Card>
					<Table
						columns={columns}
						dataSource={suppliers}
						rowKey="_id"
						loading={loading}
						pagination={{
							pageSize: 10,
							showSizeChanger: true,
							showQuickJumper: true,
							showTotal: (total, range) => 
								`${range[0]}-${range[1]} of ${total} suppliers`,
						}}
						scroll={{ x: 800 }}
						locale={{
							emptyText: (
								<div style={{ textAlign: 'center', padding: '48px' }}>
									<div style={{ fontSize: '48px', marginBottom: '16px' }}>🚚</div>
									<Title level={4} type="secondary">No suppliers found</Title>
									<Text type="secondary">Add your first supplier to get started!</Text>
								</div>
							)
						}}
					/>
				</Card>

				{/* Supplier Form Modal */}
				<Modal
					title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
					open={formModalVisible}
					onCancel={resetForm}
					footer={null}
					width={600}
					destroyOnClose
				>
					<Form
						form={form}
						layout="vertical"
						onFinish={onSubmit}
						initialValues={{
							name: '',
							phone: '',
							company: '',
							email: '',
							address: '',
							notes: ''
						}}
					>
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item
									label="Name"
									name="name"
									rules={[{ required: true, message: 'Please enter supplier name!' }]}
								>
									<Input 
										placeholder="Enter supplier name"
										prefix={<UserOutlined />}
									/>
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item
									label="Phone"
									name="phone"
									rules={[{ required: true, message: 'Please enter phone number!' }]}
								>
									<Input 
										placeholder="Enter phone number"
										prefix={<PhoneOutlined />}
									/>
								</Form.Item>
							</Col>
						</Row>
						
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item
									label="Company"
									name="company"
								>
									<Input 
										placeholder="Enter company name"
										prefix={<ShopOutlined />}
									/>
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item
									label="Email"
									name="email"
									rules={[{ type: 'email', message: 'Please enter a valid email!' }]}
								>
									<Input 
										placeholder="Enter email address"
										prefix={<MailOutlined />}
									/>
								</Form.Item>
							</Col>
						</Row>
						
						<Form.Item
							label="Address"
							name="address"
						>
							<Input 
								placeholder="Enter address"
								prefix={<HomeOutlined />}
							/>
						</Form.Item>
						
						<Form.Item
							label="Notes"
							name="notes"
						>
							<TextArea 
								rows={3} 
								placeholder="Additional notes..."
								prefix={<FileTextOutlined />}
							/>
						</Form.Item>
						
						<Row justify="end">
							<Space>
								<Button onClick={resetForm}>
									Cancel
								</Button>
								<Button type="primary" htmlType="submit" loading={loading}>
									{editingSupplier ? 'Update Supplier' : 'Add Supplier'}
								</Button>
							</Space>
						</Row>
					</Form>
				</Modal>
			</div>
		</Layout>
	);
}
