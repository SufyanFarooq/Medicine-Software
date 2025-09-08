// Role-based permissions system

// Define permissions for each role
const rolePermissions = {
  super_admin: {
    // Full access to everything
    canManageUsers: true,
    canManageSettings: true,
    canManageCranes: true,
    canGenerateInvoices: true,
    canViewInvoices: true,
    canManageReturns: true,
    canViewDashboard: true,
    canViewReports: true,
    canViewActivities: true,
    canDeleteData: true,
    canCreateUsers: true,
    canDeleteUsers: true,
    canUpdateUsers: true,
    canModifySettings: true,
    canViewCustomerStatement: true,
  },
  manager: {
    // Can manage most things but not user management
    canManageUsers: false,
    canManageSettings: false,
    canManageCranes: true,
    canGenerateInvoices: true,
    canViewInvoices: true,
    canManageReturns: true,
    canViewDashboard: true,
    canViewReports: true,
    canViewActivities: true,
    canDeleteData: false,
    canCreateUsers: false,
    canDeleteUsers: false,
    canUpdateUsers: false,
    canModifySettings: false,
    canViewCustomerStatement: true,
  },
  sales_man: {
    // Limited access - can only sell and basic info
    canManageUsers: false,
    canManageSettings: false,
    canManageCranes: false,
    canGenerateInvoices: true,
    canViewInvoices: true,
    canManageReturns: true,
    canViewDashboard: true,
    canViewReports: true,
    canViewActivities: false,
    canDeleteData: false,
    canCreateUsers: false,
    canDeleteUsers: false,
    canUpdateUsers: false,
    canModifySettings: false,
    canViewCustomerStatement: true,
  },
  customer_service: {
    // Customer service role - can view customer statements and basic info
    canManageUsers: false,
    canManageSettings: false,
    canManageCranes: false,
    canGenerateInvoices: false,
    canViewInvoices: true,
    canManageReturns: false,
    canViewDashboard: true,
    canViewReports: false,
    canViewActivities: false,
    canDeleteData: false,
    canCreateUsers: false,
    canDeleteUsers: false,
    canUpdateUsers: false,
    canModifySettings: false,
    canViewCustomerStatement: true,
  }
};

// Get user permissions
export const getUserPermissions = (userRole) => {
  return rolePermissions[userRole] || rolePermissions.sales_man;
};

// Check if user has specific permission
export const hasPermission = (userRole, permission) => {
  const permissions = getUserPermissions(userRole);
  return permissions[permission] || false;
};

// Check if user can access a specific page/feature
export const canAccess = (userRole, feature) => {
  const permissionMap = {
    'settings': 'canManageSettings',
    'users': 'canManageUsers',
    'cranes': 'canManageCranes',
    'invoices': 'canGenerateInvoices',
    'returns': 'canManageReturns',
    'dashboard': 'canViewDashboard',
    'reports': 'canViewReports',
    'activities': 'canViewActivities',
    'add-crane': 'canManageCranes',
    'generate-invoice': 'canGenerateInvoices',
    'add-return': 'canManageReturns',
    'customer-statement': 'canViewCustomerStatement',
  };
  
  const permission = permissionMap[feature];
  return permission ? hasPermission(userRole, permission) : false;
};

// Get navigation items based on user role
export const getNavigationItems = (userRole) => {
  const baseItems = [
    { name: 'Dashboard', href: '/', icon: '🏠', permission: 'dashboard' },
    { name: 'Cranes', href: '/cranes', icon: '🚁', permission: 'cranes' },
    { name: 'Add Crane', href: '/cranes/add', icon: '➕', permission: 'add-crane' },
    { name: 'Customers', href: '/customers', icon: '👥', permission: 'cranes' },
    { name: 'Add Customer', href: '/customers/add', icon: '➕', permission: 'add-crane' },
    { name: 'Crane Rentals', href: '/crane-rentals', icon: '📋', permission: 'cranes' },
    { name: 'Generate Rental', href: '/crane-rentals/generate', icon: '🧾', permission: 'generate-invoice' },
    { name: 'Generate Invoice', href: '/invoices/generate-crane-rental', icon: '📄', permission: 'generate-invoice' },
    { name: 'View Invoices', href: '/invoices', icon: '📋', permission: 'invoices' },
    { name: 'Returns', href: '/returns', icon: '🔧', permission: 'returns' },
    { name: 'Add Return', href: '/returns/add', icon: '📝', permission: 'add-return' },
    { name: 'Customer Statement', href: '/customers/statement', icon: '📊', permission: 'customer-statement' },
    { name: 'Sales Report', href: '/sales-report', icon: '📈', permission: 'reports' },
    { name: 'Inventory Report', href: '/inventory-report', icon: '📦', permission: 'reports' },
    { name: 'Activities', href: '/activities', icon: '📊', permission: 'activities' },
  ];

  return baseItems.filter(item => canAccess(userRole, item.permission));
};

// Get bottom navigation items based on user role
export const getBottomNavigationItems = (userRole) => {
  const items = [];
  
  if (hasPermission(userRole, 'canManageSettings')) {
    items.push({ name: 'Settings', href: '/settings', icon: '⚙️' });
  }
  
  items.push({ name: 'Logout', href: '#', icon: '🚪', action: 'logout' });
  
  return items;
};

// Check if user can perform specific actions
export const canPerformAction = (userRole, action) => {
  const actionPermissions = {
    'delete_user': 'canDeleteUsers',
    'create_user': 'canCreateUsers',
    'update_user': 'canUpdateUsers',
    'delete_crane': 'canDeleteData',
    'delete_invoice': 'canDeleteData',
    'delete_return': 'canDeleteData',
    'modify_settings': 'canModifySettings',
    'view_reports': 'canViewReports',
  };
  
  const permission = actionPermissions[action];
  return permission ? hasPermission(userRole, permission) : false;
}; 