import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ProductForm from '../../components/ProductForm';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';
import { 
  Table, 
  Button, 
  Card, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Tag, 
  Input, 
  Select, 
  Modal, 
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Divider,
  Switch,
  Drawer,
  Dropdown
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  CopyOutlined,
  ExclamationCircleOutlined,
  MoreOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

export default function Products() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [formDrawerVisible, setFormDrawerVisible] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory]);

  const fetchProducts = async () => {
    try {
      const response = await apiRequest('/api/products');
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with products property
        const productsArray = data.products || data || [];
        setProducts(Array.isArray(productsArray) ? productsArray : []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      message.error('Failed to fetch products');
      setProducts([]); // Ensure products is always an array
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiRequest('/api/categories');
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with categories property
        const categoriesArray = data.categories || data || [];
        setCategories(Array.isArray(categoriesArray) ? categoriesArray : []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]); // Ensure categories is always an array
    }
  };

  const filterProducts = () => {
    // Ensure products is always an array before filtering
    let filtered = Array.isArray(products) ? products : [];

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  };

  const handleAddProduct = (newProduct) => {
    setProducts(prev => [...prev, newProduct]);
    setFormDrawerVisible(false);
    message.success('Product added successfully!');
  };

  const handleEditProduct = (updatedProduct) => {
    setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
    setEditingProduct(null);
    setFormDrawerVisible(false);
    message.success('Product updated successfully!');
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const response = await apiRequest(`/api/products/${productId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setProducts(prev => prev.filter(p => p._id !== productId));
        message.success('Product deleted successfully!');
      } else {
        message.error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      message.error('Failed to delete product');
    }
  };

  const copyBarcode = (barcode) => {
    navigator.clipboard.writeText(barcode);
    message.success('Barcode copied to clipboard!');
  };

  const handleActiveToggle = async (productId, currentStatus) => {
    try {
      const response = await apiRequest(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        // Update local state
        setProducts(prev => prev.map(p => 
          p._id === productId ? { ...p, isActive: !currentStatus } : p
        ));
        message.success(`Product ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        message.error('Failed to update product status');
      }
    } catch (error) {
      console.error('Error updating product status:', error);
      message.error('Failed to update product status');
    }
  };

  const getCategoryColor = (categoryName) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.color || '#6B7280';
  };

  const columns = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Button 
            type="link" 
            onClick={() => router.push(`/products/${record._id}`)}
            style={{ padding: 0, height: 'auto' }}
          >
            <Text strong>{text}</Text>
          </Button>
          {record.adminDiscount > 0 && (
            <Badge 
              count={`🎯 ${record.adminDiscount}%`} 
              style={{ backgroundColor: '#1890ff', marginLeft: 8 }}
            />
          )}
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Code: {record.code || 'N/A'}
            </Text>
          </div>
          {record.brand && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Brand: {record.brand}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      render: (barcode) => (
        barcode ? (
          <Space>
            <Text code style={{ fontSize: '12px' }}>{barcode}</Text>
            <Tooltip title="Copy barcode">
              <Button 
                type="text" 
                size="small" 
                icon={<CopyOutlined />}
                onClick={() => copyBarcode(barcode)}
              />
            </Tooltip>
          </Space>
        ) : (
          <Text type="secondary">N/A</Text>
        )
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color={getCategoryColor(category)}>
          {category}
        </Tag>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity, record) => (
        <div>
          <Text>{quantity} {record.unit}</Text>
          {quantity <= 10 && (
            <div>
              <Tag color="red" icon={<ExclamationCircleOutlined />}>
                Low Stock
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Purchase Price',
      dataIndex: 'purchasePrice',
      key: 'purchasePrice',
      render: (price) => <Text>{formatCurrency(price)}</Text>,
    },
    {
      title: 'Selling Price',
      dataIndex: 'sellingPrice',
      key: 'sellingPrice',
      render: (price) => <Text strong>{formatCurrency(price)}</Text>,
    },
    {
      title: 'Admin Discount',
      dataIndex: 'adminDiscount',
      key: 'adminDiscount',
      render: (discount) => (
        discount ? (
          <Tag color="blue">{discount}%</Tag>
        ) : (
          <Text type="secondary">N/A</Text>
        )
      ),
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive, record) => (
        <Switch
          checked={isActive !== false} // Default to true if undefined
          onChange={(checked) => handleActiveToggle(record._id, isActive !== false)}
          size="small"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => {
        const menuItems = [
          {
            key: 'view',
            label: 'View Details',
            icon: <EyeOutlined />,
            onClick: () => router.push(`/products/${record._id}`)
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <EditOutlined />,
            onClick: () => {
              setEditingProduct(record);
              setFormDrawerVisible(true);
            }
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: 'Delete Product',
                content: 'Are you sure you want to delete this product?',
                okText: 'Yes, Delete',
                cancelText: 'Cancel',
                okType: 'danger',
                onOk: () => handleDeleteProduct(record._id),
              });
            }
          }
        ];

        return (
          <Dropdown
            menu={{ items: menuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button 
              type="text" 
              icon={<MoreOutlined />}
              onClick={e => e.preventDefault()}
            />
          </Dropdown>
        );
      },
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div>Loading products...</div>
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
            <Title level={2} style={{ margin: 0 }}>Products Management</Title>
            <Text type="secondary">Manage your product inventory</Text>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setFormDrawerVisible(true)}
            >
              Add New Product
            </Button>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Search
                placeholder="Search products by name, code, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                value={selectedCategory}
                onChange={setSelectedCategory}
                style={{ width: '100%' }}
                placeholder="Select Category"
                suffixIcon={<FilterOutlined />}
              >
                <Option value="All">All Categories</Option>
                {categories.map((category) => (
                  <Option key={category._id || category.name} value={category.name}>
                    {category.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={24} md={8}>
              <Text type="secondary">
                Showing {filteredProducts.length} of {products.length} products
              </Text>
            </Col>
          </Row>
        </Card>

        {/* Products Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredProducts}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} products`,
            }}
            scroll={{ x: 800 }}
            locale={{
              emptyText: searchTerm || selectedCategory !== 'All' 
                ? 'No products match your search criteria.'
                : 'No products found. Add your first product to get started!'
            }}
          />
        </Card>

        {/* Product Form Drawer */}
        <Drawer
          title={editingProduct ? 'Edit Product' : 'Add New Product'}
          open={formDrawerVisible}
          onClose={() => {
            setFormDrawerVisible(false);
            setEditingProduct(null);
          }}
          width={600}
          destroyOnClose
          placement="right"
        >
          <ProductForm
            product={editingProduct}
            onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
            onCancel={() => {
              setFormDrawerVisible(false);
              setEditingProduct(null);
            }}
          />
        </Drawer>
      </div>
    </Layout>
  );
}