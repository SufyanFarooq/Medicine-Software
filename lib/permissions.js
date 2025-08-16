// Role-based permissions system

// Define permissions for each role
const rolePermissions = {
  super_admin: {
    // Full access to everything
    canManageUsers: true,
    canManageSettings: true,
    canManageProducts: true,
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
  },
  manager: {
    // Can manage most things but not user management
    canManageUsers: false,
    canManageSettings: false,
    canManageProducts: true,
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
  },
  sales_man: {
    // Limited access - can only sell and basic info
    canManageUsers: false,
    canManageSettings: false,
    canManageProducts: false,
    canGenerateInvoices: true,
    canViewInvoices: true,
    canManageReturns: true,
    canViewDashboard: true,
    canViewReports: false,
    canViewActivities: false,
    canDeleteData: false,
    canCreateUsers: false,
    canDeleteUsers: false,
    canUpdateUsers: false,
    canModifySettings: false,
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
    'products': 'canManageProducts',
    'invoices': 'canGenerateInvoices',
    'returns': 'canManageReturns',
    'dashboard': 'canViewDashboard',
    'reports': 'canViewReports',
    'activities': 'canViewActivities',
    'add-product': 'canManageProducts',
    'generate-invoice': 'canGenerateInvoices',
    'add-return': 'canManageReturns',
  };
  
  const permission = permissionMap[feature];
  return permission ? hasPermission(userRole, permission) : false;
};

// Get navigation items based on user role
export const getNavigationItems = (userRole) => {
  const baseItems = [
    { name: 'Dashboard', href: '/', icon: '🏠', permission: 'dashboard' },
    { name: 'Products', href: '/products', icon: '📦', permission: 'products' },
    { name: 'Add Product', href: '/products/add', icon: '➕', permission: 'add-product' },
    { name: 'Generate Invoice', href: '/invoices/generate', icon: '🧾', permission: 'generate-invoice' },
    { name: 'View Invoices', href: '/invoices', icon: '📋', permission: 'invoices' },
    { name: 'Returns', href: '/returns', icon: '🔄', permission: 'returns' },
    { name: 'Add Return', href: '/returns/add', icon: '📝', permission: 'add-return' },
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
    'delete_product': 'canDeleteData',
    'delete_invoice': 'canDeleteData',
    'delete_return': 'canDeleteData',
    'modify_settings': 'canModifySettings',
    'view_reports': 'canViewReports',
  };
  
  const permission = actionPermissions[action];
  return permission ? hasPermission(userRole, permission) : false;
}; 