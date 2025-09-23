import { useState, useEffect } from 'react';
import { Select, Button, Space, Typography, Tag, Tooltip } from 'antd';
import { 
  SwapOutlined, 
  EnvironmentOutlined, 
  CrownOutlined,
  UserOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { apiRequest } from '../lib/auth';

const { Text } = Typography;
const { Option } = Select;

export default function BranchSwitcher({ currentBranch, onBranchSwitch }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const handleBranchSwitch = async (branchId) => {
    if (branchId === currentBranch?._id) return;

    try {
      setSwitching(true);
      const response = await apiRequest('/api/session/branch', {
        method: 'POST',
        body: JSON.stringify({ branchId })
      });

      if (response.success) {
        // Update token in localStorage
        localStorage.setItem('token', response.data.token);
        
        // Notify parent component
        if (onBranchSwitch) {
          onBranchSwitch(response.data.branch);
        }

        // Reload page to update all data with new branch context
        window.location.reload();
      }
    } catch (error) {
      console.error('Error switching branch:', error);
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
        return <UserOutlined style={{ color: '#52c41a' }} />;
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

  if (branches.length <= 1) {
    // If user has only one branch or no branches, show current branch info
    if (currentBranch) {
      return (
        <Space>
          <EnvironmentOutlined />
          <Text strong>{currentBranch.name}</Text>
          <Tag color={getRoleColor(currentBranch.role)} icon={getRoleIcon(currentBranch.role)}>
            {currentBranch.role}
          </Tag>
        </Space>
      );
    }
    return null;
  }

  return (
    <Space>
      <EnvironmentOutlined />
      <Select
        value={currentBranch?._id}
        onChange={handleBranchSwitch}
        loading={loading || switching}
        style={{ minWidth: 200 }}
        placeholder="Select Branch"
        optionLabelProp="label"
      >
        {branches.map(branch => (
          <Option 
            key={branch._id} 
            value={branch._id}
            label={
              <Space>
                <span>{getBranchTypeIcon(branch.branchType)}</span>
                <span>{branch.name}</span>
                <Tag color={getRoleColor(branch.role)} size="small">
                  {branch.role}
                </Tag>
              </Space>
            }
          >
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ marginRight: '8px', fontSize: '16px' }}>
                  {getBranchTypeIcon(branch.branchType)}
                </span>
                <Text strong>{branch.name}</Text>
                <Tag 
                  color={getRoleColor(branch.role)} 
                  icon={getRoleIcon(branch.role)}
                  style={{ marginLeft: '8px' }}
                >
                  {branch.role}
                </Tag>
              </div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                <div>{branch.code} • {branch.branchType.replace('_', ' ')}</div>
                <div>{branch.address.city}, {branch.address.country}</div>
              </div>
            </div>
          </Option>
        ))}
      </Select>
      {switching && (
        <Tooltip title="Switching branch...">
          <Button 
            type="text" 
            icon={<SwapOutlined spin />} 
            size="small"
          />
        </Tooltip>
      )}
    </Space>
  );
}
