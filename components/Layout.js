import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getUser, clearAuth, isAuthenticated } from '../lib/auth';
import { setCurrency } from '../lib/currency';
import { apiRequest } from '../lib/auth';
import { getNavigationItems, getBottomNavigationItems } from '../lib/permissions';
import { logUserActivity } from '../lib/activity-logger';
import NotificationCenter from './NotificationCenter';

export default function Layout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [businessName, setBusinessName] = useState('My Business');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  // Dropdown state for navigation groups
  const [openDropdowns, setOpenDropdowns] = useState({
    'Inventory Management': false,
    'Sales & Billing': false,
    'Returns & Refunds': false,
    'Reports & Analytics': false
  });

  const isActive = (href) => router.pathname === href;

  const toggleDropdown = (groupName) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const openDropdown = (groupName) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [groupName]: true
    }));
  };

  const closeDropdown = (groupName) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [groupName]: false
    }));
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

  // Auto-open dropdown for current active section
  useEffect(() => {
    if (user && router.pathname) {
      const currentPath = router.pathname;
      const navigation = getNavigationItems(user.role);
      
      // Find which group contains the current path
      for (const group of navigation) {
        if (group.items && group.items.some(item => item.href === currentPath)) {
          setOpenDropdowns(prev => ({
            ...prev,
            [group.name]: true
          }));
          break;
        }
      }
    }
  }, [user, router.pathname]);

  // Handle router events to maintain dropdown state
  useEffect(() => {
    const handleRouteChange = (url) => {
      // Don't close dropdowns on route change - let user navigate naturally
      console.log('Route changed to:', url);
    };

    const handleRouteChangeComplete = (url) => {
      console.log('Route change completed:', url);
    };

    router.events.on('routeChangeStart', handleRouteChange);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router]);

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
    try {
      const response = await apiRequest('/api/settings');
      if (response.ok) {
        const data = await response.json();
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
    
    try {
      const response = await apiRequest(`/api/notifications?userId=${user._id}&unreadOnly=true`);
      if (response.ok) {
        const data = await response.json();
        setUnreadNotificationCount(data.unreadCount || 0);
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

  const handleNavigationClick = (item) => {
    if (item.action === 'logout') {
      handleLogout();
    } else {
      setSidebarOpen(false);
    }
  };

  // Get navigation items based on user role
  const navigation = user ? getNavigationItems(user.role) : [];
  const bottomNavigation = user ? getBottomNavigationItems(user.role) : [];

  // Debug logging
  console.log('Layout Debug:', { 
    user: user?.role, 
    navigation: navigation, 
    bottomNavigation: bottomNavigation,
    businessName: businessName
  });

  // Use navigation directly since it's now simplified
  const finalNavigation = navigation;
  const finalBottomNavigation = bottomNavigation;

  // Show loading or redirect if not authenticated
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we authenticate...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.role) {
    console.log('No user or user role, showing auth error');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 text-xl mb-4">⚠️ Authentication Error</div>
          <p className="text-gray-600 mb-4">Unable to load user information.</p>
          
          {/* Debug Information */}
          <div className="bg-gray-100 p-4 rounded-lg mb-4 text-left text-sm">
            <p><strong>Debug Info:</strong></p>
            <p>User: {user ? 'Present' : 'Missing'}</p>
            <p>User Role: {user?.role || 'Missing'}</p>
            <p>Token: {typeof window !== 'undefined' ? (localStorage.getItem('token') ? 'Present' : 'Missing') : 'SSR'}</p>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={() => {
                clearAuth();
                router.push('/login');
              }} 
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Login
            </button>
            
            {/* Temporary Test Login */}
            <button 
              onClick={() => {
                const testUser = {
                  username: 'superadmin',
                  role: 'super_admin'
                };
                localStorage.setItem('user', JSON.stringify(testUser));
                localStorage.setItem('token', 'test-token');
                window.location.reload();
              }} 
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Test Login (Super Admin)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-2xl">
          <div className="flex h-16 items-center justify-between px-6 bg-white border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">{businessName}</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 cursor-pointer transition-colors duration-200"
            >
              ✕
            </button>
          </div>
          
          {/* User Info */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-white">
                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                <p className="text-xs text-blue-600 font-medium capitalize">{user.role?.replace('_', ' ') || 'User'}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
            {finalNavigation.map((group) => (
              <div key={group.name} className="space-y-1">
                {group.items.length === 1 ? (
                  <Link
                    href={group.items[0].href}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200 ${
                      isActive(group.items[0].href)
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-l-4 hover:border-gray-300'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="mr-3 text-lg">{group.items[0].icon}</span>
                    <span className="text-sm font-medium">{group.items[0].name}</span>
                  </Link>
                ) : (
                  <div className="space-y-1">
                    {/* Group Header - Clickable for dropdown */}
                    <div
                      className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 cursor-pointer rounded-xl transition-all duration-200 hover:bg-gray-50 hover:text-gray-900"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleDropdown(group.name);
                      }}
                    >
                      <div className="flex items-center">
                        <span className="mr-3 text-lg">
                          {group.name === 'Dashboard' ? '🏠' :
                           group.name === 'Inventory Management' ? '📦' :
                           group.name === 'Sales & Billing' ? '💰' :
                           group.name === 'Returns & Refunds' ? '🔄' :
                           group.name === 'Reports & Analytics' ? '📊' : '📋'}
                        </span>
                        <span className="text-sm font-semibold">{group.name}</span>
                      </div>
                      <span className={`text-gray-400 text-xs ml-auto transition-transform duration-200 ${
                        openDropdowns[group.name] ? 'rotate-180' : ''
                      }`}>
                        ▼
                      </span>
                    </div>

                    {/* Group Items - Expandable */}
                    {openDropdowns[group.name] && (
                      <div className="ml-6 space-y-1 mt-2">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center px-4 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 ${
                              isActive(item.href)
                                ? 'bg-blue-100 text-blue-800 shadow-sm border-l-2 border-blue-400'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800 hover:border-l-2 hover:border-gray-300'
                            }`}
                            onClick={(e) => {
                              // Prevent event bubbling and ensure proper navigation
                              e.stopPropagation();
                              // Keep dropdown open during navigation
                              e.preventDefault();
                              // Use router.push for programmatic navigation
                              router.push(item.href);
                              // Close mobile sidebar after navigation
                              setSidebarOpen(false);
                            }}
                          >
                            <span className="mr-3 text-base">{item.icon}</span>
                            <span className="text-sm">{item.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Bottom Navigation - Fixed at bottom */}
          <div className="border-t border-gray-200 px-4 py-4 bg-gray-50 mt-auto">
            {finalBottomNavigation.map((item) => (
              item.action === 'logout' ? (
                <button
                  key={item.name}
                  onClick={() => handleNavigationClick(item)}
                  className="group flex w-full items-center px-4 py-3 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </button>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex w-full items-center px-4 py-3 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-lg">
          <div className="flex h-16 items-center px-6 bg-white border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">{businessName}</h1>
          </div>
          
          {/* User Info */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-white">
                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                <p className="text-xs text-blue-600 font-medium capitalize">{user.role?.replace('_', ' ') || 'User'}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
            {finalNavigation.map((group) => (
              <div key={group.name} className="space-y-1">
                {group.items.length === 1 ? (
                  <Link
                    href={group.items[0].href}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200 ${
                      isActive(group.items[0].href)
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-l-4 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-3 text-lg">{group.items[0].icon}</span>
                    <span className="text-sm font-medium">{group.items[0].name}</span>
                  </Link>
                ) : (
                  <div className="space-y-1">
                    {/* Group Header - Clickable for dropdown */}
                    <div
                      className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 cursor-pointer rounded-xl transition-all duration-200 hover:bg-gray-50 hover:text-gray-900"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleDropdown(group.name);
                      }}
                    >
                      <div className="flex items-center">
                        <span className="mr-3 text-lg">
                          {group.name === 'Dashboard' ? '🏠' :
                           group.name === 'Inventory Management' ? '📦' :
                           group.name === 'Sales & Billing' ? '💰' :
                           group.name === 'Returns & Refunds' ? '🔄' :
                           group.name === 'Reports & Analytics' ? '📊' : '📋'}
                        </span>
                        <span className="text-sm font-semibold">{group.name}</span>
                      </div>
                      <span className={`text-gray-400 text-xs ml-auto transition-transform duration-200 ${
                        openDropdowns[group.name] ? 'rotate-180' : ''
                      }`}>
                        ▼
                      </span>
                    </div>

                    {/* Group Items - Expandable */}
                    {openDropdowns[group.name] && (
                      <div className="ml-6 space-y-1 mt-2">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center px-4 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 ${
                              isActive(item.href)
                                ? 'bg-blue-100 text-blue-800 shadow-sm border-l-2 border-blue-400'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800 hover:border-l-2 hover:border-gray-300'
                            }`}
                            onClick={(e) => {
                              // Prevent event bubbling and ensure proper navigation
                              e.stopPropagation();
                              // Keep dropdown open during navigation
                              e.preventDefault();
                              // Use router.push for programmatic navigation
                              router.push(item.href);
                            }}
                          >
                            <span className="mr-3 text-base">{item.icon}</span>
                            <span className="text-sm">{item.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Bottom Navigation - Fixed at bottom */}
          <div className="border-t border-gray-200 px-4 py-4 bg-gray-50 mt-auto">
            {finalBottomNavigation.map((item) => (
              item.action === 'logout' ? (
                <button
                  key={item.name}
                  onClick={() => handleNavigationClick(item)}
                  className="group flex w-full items-center px-4 py-3 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </button>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex w-full items-center px-4 py-3 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200 text-gray-700 hover:bg-gray-50 hover:text-blue-700 hover:shadow-md"
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-6 shadow-sm sm:gap-x-6 sm:px-8 lg:px-10">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden cursor-pointer hover:text-blue-600 transition-colors duration-200"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            ☰
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                {currentDate}
              </span>
              
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
                  title="Notifications"
                >
                  <span className="text-xl">🔔</span>
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </span>
                  )}
                </button>
              </div>
              
              <div className="flex items-center gap-x-3">
                <span className="text-sm text-gray-700 font-medium">Welcome, {user.username}</span>
                <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded-md">({user.role?.replace('_', ' ')})</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800 cursor-pointer transition-colors duration-200 font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8 bg-gray-50 min-h-screen">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>

      {/* Notification Center */}
      <NotificationCenter
        userId={user?._id}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
} 