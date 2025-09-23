import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, Row, Col, Button, Typography, Space, Avatar, Tag, Divider, message } from 'antd';
import { 
  EnvironmentOutlined, 
  UserOutlined, 
  CrownOutlined,
  SettingOutlined,
  EyeOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { apiRequest } from '../lib/auth';

const { Title, Text } = Typography;

export default function BranchPicker() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetchUserBranches();
  }, []);

  const fetchUserBranches = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/session/branch');
      
      if (response.success) {
        setBranches(response.data.branches);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchSelect = async (branchId) => {
    try {
      setSwitching(true);
      
      // Get the selected branch details
      const selectedBranch = branches.find(b => b._id === branchId);
      if (!selectedBranch) {
        console.error('Branch not found');
        return;
      }
      
      // Call the session/branch API to get a new token with branch context
      const response = await fetch('/api/session/branch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ branchId })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update the token and branch in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentBranch', JSON.stringify(data.branch));
        
        // Redirect to dashboard
        router.push('/');
      } else {
        const error = await response.json();
        console.error('Error switching branch:', error.message);
        message.error(error.message || 'Failed to switch branch');
      }
    } catch (error) {
      console.error('Error switching branch:', error);
      message.error('Error switching branch');
    } finally {
      setSwitching(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'FranchiseOwner':
        return <CrownOutlined style={{ color: '#faad14' }} />;
      case 'BranchManager':
        return <SettingOutlined style={{ color: '#1890ff' }} />;
      case 'Staff':
        return <TeamOutlined style={{ color: '#52c41a' }} />;
      case 'Viewer':
        return <EyeOutlined style={{ color: '#8c8c8c' }} />;
      case 'Admin':
        return <CrownOutlined style={{ color: '#722ed1' }} />;
      default:
        return <UserOutlined />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'FranchiseOwner':
        return 'gold';
      case 'BranchManager':
        return 'blue';
      case 'Staff':
        return 'green';
      case 'Viewer':
        return 'default';
      case 'Admin':
        return 'purple';
      default:
        return 'default';
    }
  };

  const getBranchTypeIcon = (branchType) => {
    switch (branchType) {
      case 'head_office':
        return '🏢';
      case 'branch_office':
        return '🏪';
      case 'retail_store':
        return '🛍️';
      case 'warehouse':
        return '🏭';
      case 'distribution_center':
        return '🚚';
      case 'service_center':
        return '🔧';
      default:
        return '🏢';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>🔄</div>
          <Title level={3}>Loading your branches...</Title>
          <Text type="secondary">Please wait while we fetch your accessible branches</Text>
        </Card>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ textAlign: 'center', padding: '40px', maxWidth: '500px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
          <Title level={2}>No Branches Assigned</Title>
          <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: '24px' }}>
            You don't have access to any branches yet. Please contact your administrator.
          </Text>
          <Button type="primary" onClick={() => router.push('/login')}>
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
          <Title level={1} style={{ color: 'white', marginBottom: '8px' }}>
            Select Your Branch
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>
            Choose the branch you want to work with
          </Text>
        </div>

        <Row gutter={[24, 24]}>
          {branches.map((branch) => (
            <Col xs={24} sm={12} lg={8} key={branch._id}>
              <Card
                hoverable
                style={{ 
                  height: '100%',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease'
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                    {getBranchTypeIcon(branch.branchType)}
                  </div>
                  <Title level={3} style={{ marginBottom: '8px' }}>
                    {branch.name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    {branch.code} • {branch.branchType.replace('_', ' ')}
                  </Text>
                </div>

                <Divider />

                <div style={{ marginBottom: '20px' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <EnvironmentOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                      <Text strong>{branch.address.city}, {branch.address.country}</Text>
                    </div>
                    <div>
                      <Text type="secondary">{branch.address.street}</Text>
                    </div>
                  </Space>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <Tag 
                    color={getRoleColor(branch.role)} 
                    icon={getRoleIcon(branch.role)}
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    {branch.role}
                  </Tag>
                </div>

                <Button
                  type="primary"
                  size="large"
                  block
                  loading={switching}
                  onClick={() => handleBranchSelect(branch._id)}
                  style={{
                    height: '48px',
                    fontSize: '16px',
                    fontWeight: '500',
                    borderRadius: '8px'
                  }}
                >
                  {switching ? 'Switching...' : 'Enter Branch'}
                </Button>
              </Card>
            </Col>
          ))}
        </Row>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Button 
            type="link" 
            onClick={() => router.push('/login')}
            style={{ color: 'rgba(255,255,255,0.8)' }}
          >
            ← Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
