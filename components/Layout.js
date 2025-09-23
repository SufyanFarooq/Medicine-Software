import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getUser, clearAuth, isAuthenticated } from '../lib/auth';
import { setCurrency } from '../lib/currency';
import { apiRequest } from '../lib/auth';
import { getNavigationItems, getBottomNavigationItems, canAccess } from '../lib/permissions';
import { logUserActivity } from '../lib/activity-logger';
import NotificationCenter from './NotificationCenter';
import BranchSwitcher from './BranchSwitcher';
import {
  Layout as AntLayout,
  Menu,
  Avatar,
  Typography,
  Button,
  Drawer,
  Badge,
  Space,
  Divider,
  Dropdown
} from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  BellOutlined, 
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  ShoppingOutlined,
  DollarOutlined,
  SwapOutlined,
  BarChartOutlined,
  SettingOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  PieChartOutlined,
  CreditCardOutlined,
  ContactsOutlined,
  TeamOutlined,
  ApartmentOutlined,
  CustomerServiceOutlined,
  FileDoneOutlined,
  TagsOutlined,
  OrderedListOutlined,
  AccountBookOutlined,
  PieChartFilled,
  DownOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CalculatorOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;
const { Text, Title } = Typography;

export default function Layout({ children }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [businessName, setBusinessName] = useState('My Business');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState([]);
  
  // Performance optimization - Cache settings and notifications
  const [settingsCache, setSettingsCache] = useState(null);
  const [notificationsCache, setNotificationsCache] = useState(null);
  const [lastCacheTime, setLastCacheTime] = useState(0);

  const isActive = (href) => router.pathname === href;

  // Icon mapping for menu items
  const getIcon = (iconName) => {
    const iconMap = {
      '🏠': <HomeOutlined />,
      '📦': <ShoppingOutlined />,
      '💰': <DollarOutlined />,
      '🔄': <SwapOutlined />,
      '📊': <BarChartOutlined />,
      '⚙️': <SettingOutlined />,
      '👥': <UserOutlined />,
      '📄': <BarChartOutlined />,
      '🔔': <BellOutlined />,
      '⏰': <ClockCircleOutlined />,
      '🏖️': <CalendarOutlined />,
      '💸': <CalculatorOutlined />
    };
    return iconMap[iconName] || <UserOutlined />;
  };

  // Convert navigation items to Ant Design menu format (flattened, no dropdowns)
  const convertToMenuItems = (navigation) => {
    const menuItems = [];

    navigation.forEach((group) => {
      group.items.forEach((item) => {
        // Skip "Add" items - these will be handled on the actual pages
        if (item.name.toLowerCase().includes('add') ||
          item.name.toLowerCase().includes('create') ||
          item.name.toLowerCase().includes('new')) {
          return;
        }

        // Check required role for specific items
        if (item.requiredRole && user?.role !== item.requiredRole) {
          console.log('Skipping item due to role restriction:', item.name, 'Required:', item.requiredRole, 'User:', user?.role);
          return; // Skip this item if user doesn't have the required role
        }

        // Check permissions for HR items
        if (item.href.startsWith('/hr/')) {
          const hrFeature = item.href.split('/')[2]; // Get 'employees', 'attendance', etc.
          console.log('Checking HR permission for:', hrFeature, 'User role:', user?.role);
          const hasPermission = canAccess(user?.role, hrFeature);
          console.log('Has permission:', hasPermission);
          if (!hasPermission) {
            return; // Skip this item if user doesn't have permission
          }
        }

        menuItems.push({
          key: item.href,
          icon: getIcon(item.icon),
          label: item.name,
          onClick: () => {
            router.push(item.href);
            setMobileDrawerOpen(false);
          }
        });
      });
    });

    console.log('Final menu items:', menuItems);
    return menuItems;
  };

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }));

    // Check authentication on component mount
    checkAuth();
  }, []);

  // Update selected keys when route changes
  useEffect(() => {
    if (router.pathname) {
      setSelectedKeys([router.pathname]);
    }
  }, [router.pathname]);

  const checkAuth = () => {
    try {
      // Debug localStorage
      if (typeof window !== 'undefined') {
        console.log('LocalStorage Debug:', {
          token: localStorage.getItem('token'),
          user: localStorage.getItem('user'),
          parsedUser: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
        });
      }

      if (!isAuthenticated()) {
        console.log('Not authenticated, redirecting to login');
        router.push('/login');
        return;
      }

      const userObj = getUser();
      console.log('User object:', userObj);

      if (!userObj || !userObj.role) {
        console.log('Invalid user object, redirecting to login');
        clearAuth();
        router.push('/login');
        return;
      }

      setUser(userObj);
      console.log('User set successfully:', userObj);

      // Fetch settings and set global currency
      fetchSettings();
      fetchUnreadNotificationCount(); // Fetch unread notifications when user is authenticated
    } catch (error) {
      console.error('Auth check error:', error);
      clearAuth();
      router.push('/login');
    }
  };

  const fetchSettings = async () => {
    // Check cache first (5 minutes cache)
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    
    if (settingsCache && (now - lastCacheTime) < CACHE_DURATION) {
      console.log('Using cached settings');
      setCurrency(settingsCache.currency);
      setBusinessName(settingsCache.businessName || 'My Business');
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiRequest('/api/settings');
      if (response.ok) {
        const data = await response.json();
        // Cache the settings
        setSettingsCache(data);
        setLastCacheTime(now);
        // Set global currency symbol
        setCurrency(data.currency);
        // Set business name from settings or use default
        setBusinessName(data.businessName || 'My Business');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      // Only set loading to false after everything is loaded
      setIsLoading(false);
    }
  };

  const fetchUnreadNotificationCount = async () => {
    if (!user?._id) return;

    // Check cache for notifications (2 minutes cache)
    const NOTIFICATION_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
    const now = Date.now();
    
    if (notificationsCache && (now - notificationsCache.timestamp) < NOTIFICATION_CACHE_DURATION) {
      console.log('Using cached notification count');
      setUnreadNotificationCount(notificationsCache.count || 0);
      return;
    }

    try {
      const response = await apiRequest(`/api/notifications?userId=${user._id}&unreadOnly=true`);
      if (response.ok) {
        const data = await response.json();
        const count = data.unreadCount || 0;
        setUnreadNotificationCount(count);
        // Cache the notification count
        setNotificationsCache({
          count: count,
          timestamp: now
        });
      }
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
    }
  };

  const handleLogout = () => {
    // Log logout activity
    if (user) {
      logUserActivity.logout(user.username);
    }

    // Clear authentication
    clearAuth();

    // Redirect to login
    router.push('/login');
  };

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      handleLogout();
    }
  };

  // Get navigation items based on user role
  const navigation = user ? getNavigationItems(user.role) : [];
  const bottomNavigation = user ? getBottomNavigationItems(user.role) : [];

  console.log('Navigation items:', navigation);
  console.log('User role:', user?.role);

  // Convert to Ant Design menu items
  const menuItems = convertToMenuItems(navigation);

  // Add logout to bottom menu items
  const bottomMenuItems = bottomNavigation.map((item) => ({
    key: item.action === 'logout' ? 'logout' : item.href,
    icon: getIcon(item.icon),
    label: item.name,
    onClick: () => {
      if (item.action === 'logout') {
        handleLogout();
      } else {
        router.push(item.href);
        setMobileDrawerOpen(false);
      }
    }
  }));

  // Show loading or redirect if not authenticated
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #1890ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '16px', color: '#666' }}>Loading...</p>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>Please wait while we authenticate...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.role) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '16px' }}>
          <div style={{ color: '#ff4d4f', fontSize: '20px', marginBottom: '16px' }}>⚠️ Authentication Error</div>
          <p style={{ color: '#666', marginBottom: '16px' }}>Unable to load user information.</p>

          <div style={{ backgroundColor: '#f0f0f0', padding: '16px', borderRadius: '8px', marginBottom: '16px', textAlign: 'left', fontSize: '12px' }}>
            <p><strong>Debug Info:</strong></p>
            <p>User: {user ? 'Present' : 'Missing'}</p>
            <p>User Role: {user?.role || 'Missing'}</p>
            <p>Token: {typeof window !== 'undefined' ? (localStorage.getItem('token') ? 'Present' : 'Missing') : 'SSR'}</p>
          </div>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              block
              onClick={() => {
                clearAuth();
                router.push('/login');
              }}
            >
              Go to Login
            </Button>

            <Button
              type="default"
              block
              onClick={() => {
                const testUser = {
                  username: 'superadmin',
                  role: 'super_admin'
                };
                localStorage.setItem('user', JSON.stringify(testUser));
                localStorage.setItem('token', 'test-token');
                window.location.reload();
              }}
            >
              Test Login (Super Admin)
            </Button>
          </Space>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        /* Clean Minimal Sidebar - iDURAR Style */
        .clean-sidebar {
          background: #ffffff !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        
        .clean-logo {
          padding: 16px 16px;
          background: transparent;
          color: #333;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          height: auto;
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .clean-menu-item {
          padding: 8px 16px !important;
          margin: 8px !important;
          border-radius: 0 !important;
          height: 36px !important;
          line-height: 1.2 !important;
          background: transparent !important;
          border: none !important;
          font-weight: 400;
          color: #666 !important;
          font-size: 14px !important;
        }
        
        .clean-menu-item:hover {
          background: #f5f5f5 !important;
          color: #2563eb !important;
          border-radius: 6px !important;
        }
        
        .clean-menu-item.ant-menu-item-selected {
          background: #f0f0f0 !important;
          color: #2563eb !important;
          font-weight: 500;
          border-radius: 6px !important;
          margin: 0 8px !important;
        }
        
        .clean-menu-item .ant-menu-item-icon {
          font-size: 14px;
          margin-right: 8px;
          color: inherit;
        }
        
        .clean-menu {
          background: transparent !important;
          border: none !important;
        }
        
        .clean-submenu .ant-menu-submenu-title {
          padding: 8px 16px !important;
          margin: 0 8px !important;
          height: 36px !important;
          line-height: 1.2 !important;
          color: #666 !important;
          font-weight: 400;
          font-size: 14px !important;
          border-radius: 6px !important;
        }
        
        .clean-submenu .ant-menu-submenu-title:hover {
          background: #f5f5f5 !important;
          color: #2563eb !important;
          border-radius: 6px !important;
        }
        
        .clean-submenu .ant-menu-submenu-title .ant-menu-submenu-arrow {
          font-size: 10px;
        }
        
        /* Custom scrollbar */
        .idurar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        
        .idurar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .idurar-scroll::-webkit-scrollbar-thumb {
          background-color: #d9d9d9;
          border-radius: 3px;
        }
        
        .idurar-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #bfbfbf;
        }
      `}</style>
      <AntLayout style={{ minHeight: '100vh' }}>
         {/* Desktop Sider - Clean Minimal Style */}
         <Sider
           width={240}
           style={{
             overflow: 'hidden',
             height: '100vh',
             position: 'fixed',
             left: 0,
             top: 0,
             bottom: 0,
             background: '#ffffff'
           }}
           theme="light"
           className="clean-sidebar"
         >
           {/* Logo Section - Clean */}
           <div className="clean-logo">
             <div style={{ display: 'flex', alignItems: 'center' }}>
               <div style={{
                 width: '32px',
                 height: '32px',
                 marginRight: '12px',
                 overflow: 'hidden',
                 borderRadius: '6px'
               }}>
                 <img 
                   src="/logo.jpg" 
                   alt="Codebridge Logo" 
                   style={{
                     width: '100%',
                     height: '100%',
                     objectFit: 'cover'
                   }}
                   onError={(e) => {
                     // Fallback to simple icon if image fails to load
                     e.target.style.display = 'none';
                     e.target.nextSibling.style.display = 'flex';
                   }}
                 />
                 <div style={{
                   width: '32px',
                   height: '32px',
                   background: '#2563eb',
                   borderRadius: '6px',
                   display: 'none',
                   alignItems: 'center',
                   justifyContent: 'center',
                   color: 'white',
                   fontSize: '16px',
                   fontWeight: 'bold'
                 }}>C</div>
               </div>
               <span style={{ color: '#333', fontWeight: '500' }}>Codebridge</span>
             </div>
           </div>

           {/* Menu Container */}
           <div style={{
             flex: 1,
             overflowY: 'auto',
             height: 'calc(100vh - 80px)'
           }}
             className="idurar-scroll">
            <Menu
              mode="inline"
              selectedKeys={selectedKeys}
              style={{
                background: 'transparent',
                border: 'none'
              }}
              className="clean-menu"
              items={menuItems.map(item => ({
                ...item,
                className: "clean-menu-item"
              }))}
            />
          </div>
        </Sider>


        {/* Main Layout */}
        <AntLayout style={{ marginLeft: 240 }}>
          {/* Header */}
          <Header style={{
            padding: '0 24px',
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Left side - User Info */}
            <Space align="center">
              <Avatar
                size="default"
                style={{ backgroundColor: '#2563eb' }}
              >
                {user.username ? user.username.charAt(0).toUpperCase() : 'S'}
              </Avatar>
              <div style={{ lineHeight: '1.2' }}>
                <div>
                  <Text style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                    {user.username || 'superadmin'}
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{
                    fontSize: '12px',
                    textTransform: 'capitalize',
                    color: '#2563eb'
                  }}>
                    {user.role?.replace('_', ' ') || 'Super Admin'}
                  </Text>
                </div>
              </div>
            </Space>

            {/* Center - Branch Switcher */}
            <BranchSwitcher 
              currentBranch={user?.currentBranch}
              onBranchSwitch={(branch) => {
                setUser(prev => ({ ...prev, currentBranch: branch }));
              }}
            />

            {/* Right side - Actions */}
            <Space size="large">
              <Text type="secondary" style={{
                backgroundColor: '#f0f0f0',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                {currentDate}
              </Text>

              <Badge count={unreadNotificationCount} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  onClick={() => setShowNotifications(true)}
                  style={{ fontSize: '16px' }}
                />
              </Badge>

              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ fontSize: '14px' }}
              >
                Logout
              </Button>
            </Space>
          </Header>

          {/* Content */}
          <Content style={{
            margin: '24px 16px',
            padding: 24,
            background: '#fff',
            minHeight: 'calc(100vh - 112px)',
            borderRadius: '8px'
          }}>
            {children}
          </Content>
        </AntLayout>

        {/* Notification Center */}
        <NotificationCenter
          userId={user?._id}
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />

      </AntLayout>
    </>
  );
} 