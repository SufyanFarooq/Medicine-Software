// Role-based permissions system

// Define permissions for each role
const rolePermissions = {
  super_admin: {
    canViewDashboard: true,
    canManageProducts: true,
    canManageInventory: true,
    canGenerateInvoices: true,
    canViewInvoices: true,
    canManageReturns: true,
    canViewReports: true,
    canManageUsers: true,
    canManageSettings: true,
    canManageSuppliers: true,
    canManagePurchaseOrders: true,
    canManageWarehouses: true,
    canManageTransfers: true,
    canManageBatches: true
  },
  admin: {
    canViewDashboard: true,
    canManageProducts: true,
    canManageInventory: true,
    canGenerateInvoices: true,
    canViewInvoices: true,
    canManageReturns: true,
    canViewReports: true,
    canManageUsers: false,
    canManageSettings: true,
    canManageSuppliers: true,
    canManagePurchaseOrders: true,
    canManageWarehouses: true,
    canManageTransfers: true,
    canManageBatches: true
  },
  manager: {
    canViewDashboard: true,
    canManageProducts: true,
    canManageInventory: true,
    canGenerateInvoices: true,
    canViewInvoices: true,
    canManageReturns: true,
    canViewReports: true,
    canManageUsers: false,
    canManageSettings: false,
    canManageSuppliers: true,
    canManagePurchaseOrders: true,
    canManageWarehouses: true,
    canManageTransfers: true,
    canManageBatches: true
  },
  staff: {
    canViewDashboard: true,
    canManageProducts: false,
    canManageInventory: false,
    canGenerateInvoices: true,
    canViewInvoices: true,
    canManageReturns: false,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
    canManageSuppliers: false,
    canManagePurchaseOrders: false,
    canManageWarehouses: false,
    canManageTransfers: false,
    canManageBatches: false
  }
};

// Get user permissions based on role
export const getUserPermissions = (userRole) => {
  console.log('getUserPermissions called with role:', userRole);
  console.log('Available roles:', Object.keys(rolePermissions));
  
  // Handle undefined/null userRole
  if (!userRole) {
    console.warn('getUserPermissions called with undefined userRole, returning staff permissions as fallback');
    return rolePermissions.staff;
  }

  // Check if the role exists
  if (!rolePermissions[userRole]) {
    console.warn(`Role '${userRole}' not found in rolePermissions, returning staff permissions as fallback`);
    return rolePermissions.staff;
  }

  const permissions = rolePermissions[userRole];
  console.log(`Returned permissions for role '${userRole}':`, permissions);
  return permissions;
};

export function canAccess(userRole, feature) {
  const rolePermissions = getUserPermissions(userRole);
  
  // Map features to permission checks
  const featurePermissions = {
    'dashboard': 'canViewDashboard',
    'products': 'canManageProducts',
    'categories': 'canManageProducts',
    'inventory': 'canManageInventory',
    'invoices': 'canGenerateInvoices',
    'returns': 'canManageReturns',
    'reports': 'canViewReports',
    'activities': 'canViewReports',
    'users': 'canManageUsers',
    'settings': 'canManageSettings',
    'suppliers': 'canManageSuppliers',
    'purchase-orders': 'canManagePurchaseOrders',
    'warehouses': 'canManageWarehouses',
    'transfers': 'canManageTransfers',
    'batches': 'canManageBatches'
  };

  const permission = featurePermissions[feature];
  if (!permission) {
    console.warn(`Unknown feature: ${feature}`);
    return false;
  }

  return rolePermissions[permission] || false;
}

// Get navigation items based on user role
export const getNavigationItems = (userRole) => {
  console.log('getNavigationItems called with role:', userRole);
  
  const navigationItems = [
    {
      name: 'Dashboard',
      items: [
        { name: 'Dashboard', href: '/', icon: '📊' }
      ]
    },
    {
      name: 'Inventory Management',
      items: [
        { name: 'Products', href: '/products', icon: '📦' },
        { name: 'Add Product', href: '/products/add', icon: '➕' },
        { name: 'Categories', href: '/categories', icon: '🏷️' },
        { name: 'Batches', href: '/batches', icon: '📅' },
        { name: 'Suppliers', href: '/suppliers', icon: '🏢' },
        { name: 'Purchase Orders', href: '/purchase-orders', icon: '📋' },
        { name: 'Warehouses', href: '/warehouses', icon: '🏭' },
        { name: 'Transfers', href: '/transfers', icon: '🚚' }
      ]
    },
    {
      name: 'Sales & Billing',
      items: [
        { name: 'Generate Invoice', href: '/invoices/generate', icon: '💰' },
        { name: 'View Invoices', href: '/invoices', icon: '📄' }
      ]
    },
    {
      name: 'Returns & Refunds',
      items: [
        { name: 'Returns', href: '/returns', icon: '🔄' },
        { name: 'Add Return', href: '/returns/add', icon: '➕' }
      ]
    },
    {
      name: 'Reports & Analytics',
      items: [
        { name: 'Business Reports', href: '/reports', icon: '📈' },
        { name: 'Sales Report', href: '/reports/sales', icon: '📈' },
        { name: 'Inventory Report', href: '/reports/inventory', icon: '📊' },
        { name: 'User Activities', href: '/activities', icon: '👥' },
      ]
    }
  ];

  console.log('Returning simple navigation:', navigationItems);
  return navigationItems;
};

// Get bottom navigation items based on user role
export const getBottomNavigationItems = (userRole) => {
  // For debugging, return simple bottom navigation
  const items = [
    { name: 'Settings', href: '/settings', icon: '⚙️' },
    { name: 'Business Setup', href: '/setup/business-config', icon: '🚀' },
    { name: 'Logout', href: '#', icon: '🚪', action: 'logout' }
  ];
  
  console.log('Returning bottom navigation:', items);
  return items;
};

// Check if user can perform specific actions
export const canPerformAction = (userRole, action) => {
  const actionPermissions = {
    'create_user': 'canManageUsers',
    'edit_user': 'canManageUsers',
    'delete_user': 'canManageUsers',
    'view_reports': 'canViewReports',
    'manage_settings': 'canManageSettings',
    'manage_products': 'canManageProducts',
    'manage_inventory': 'canManageInventory'
  };

  const permission = actionPermissions[action];
  if (!permission) {
    return false;
  }

  const rolePermissions = getUserPermissions(userRole);
  return rolePermissions[permission] || false;
};

// Compatibility function for old hasPermission calls
export const hasPermission = (userRole, permission) => {
  // Handle undefined/null userRole
  if (!userRole) {
    console.warn('hasPermission called with undefined userRole');
    return false;
  }

  // Map old permission names to new ones
  const permissionMap = {
    'canManageBusinessSetup': 'canManageSettings',
    'canModifySettings': 'canManageSettings',
    'canManageUsers': 'canManageUsers',
    'canViewReports': 'canViewReports',
    'canManageProducts': 'canManageProducts',
    'canManageInventory': 'canManageInventory',
    'canGenerateInvoices': 'canGenerateInvoices',
    'canManageReturns': 'canManageReturns',
    'canManageSuppliers': 'canManageSuppliers',
    'canManagePurchaseOrders': 'canManagePurchaseOrders',
    'canManageWarehouses': 'canManageWarehouses',
    'canManageTransfers': 'canManageTransfers',
    'canManageBatches': 'canManageBatches'
  };

  const newPermission = permissionMap[permission];
  if (!newPermission) {
    console.warn(`Unknown permission: ${permission}`);
    return false;
  }

  const rolePermissions = getUserPermissions(userRole);
  
  // Handle undefined rolePermissions
  if (!rolePermissions) {
    console.warn(`No permissions found for role: ${userRole}`);
    return false;
  }

  return rolePermissions[newPermission] || false;
}; 