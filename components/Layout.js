import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getUser, clearAuth, isAuthenticated } from '../lib/auth';
import { setCurrency } from '../lib/currency';
import { apiRequest } from '../lib/auth';
import { getNavigationItems, getBottomNavigationItems } from '../lib/permissions';
import { logUserActivity } from '../lib/activity-logger';

export default function Layout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [businessName, setBusinessName] = useState('My Business');

  const isActive = (href) => router.pathname === href;

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }));

    // Check authentication on component mount
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      const userObj = getUser();
      setUser(userObj);
      
      // Fetch settings and set global currency
      fetchSettings();
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
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

  // Show loading or redirect if not authenticated
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-gradient-to-b from-blue-50 to-white shadow-2xl">
          <div className="flex h-16 items-center justify-between px-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <h1 className="text-xl font-bold text-white">{businessName}</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:text-blue-200 cursor-pointer transition-colors duration-200"
            >
              ✕
            </button>
          </div>
          
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role?.replace('_', ' ') || 'User'}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-700 hover:shadow-md transform hover:scale-102'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Bottom Navigation - Fixed at bottom */}
          <div className="border-t border-blue-200 px-3 py-4 bg-gradient-to-r from-gray-50 to-blue-50 mt-auto">
            {bottomNavigation.map((item) => (
              item.action === 'logout' ? (
                <button
                  key={item.name}
                  onClick={() => handleNavigationClick(item)}
                  className={`group flex w-full items-center px-3 py-3 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 hover:shadow-md transform hover:scale-102'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </button>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex w-full items-center px-3 py-3 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-700 hover:shadow-md transform hover:scale-102'
                  }`}
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
        <div className="flex flex-col h-full bg-gradient-to-b from-blue-50 to-white border-r border-blue-200 shadow-xl">
          <div className="flex h-16 items-center px-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <h1 className="text-xl font-bold text-white">{businessName}</h1>
          </div>
          
          {/* User Info */}
          <div className="px-4 py-4 border-b border-blue-200 bg-gradient-to-r from-blue-100 to-blue-50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold text-white">
                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-gray-800">{user.username}</p>
                <p className="text-xs text-blue-600 font-medium capitalize">{user.role?.replace('_', ' ') || 'User'}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-700 hover:shadow-md transform hover:scale-102'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Bottom Navigation - Fixed at bottom */}
          <div className="border-t border-blue-200 px-3 py-4 bg-gradient-to-r from-gray-50 to-blue-50 mt-auto">
            {bottomNavigation.map((item) => (
              item.action === 'logout' ? (
                <button
                  key={item.name}
                  onClick={() => handleNavigationClick(item)}
                  className={`group flex w-full items-center px-3 py-3 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 hover:shadow-md transform hover:scale-102'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </button>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex w-full items-center px-3 py-3 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-700 hover:shadow-md transform hover:scale-102'
                  }`}
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
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
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
              <span className="text-sm text-gray-500">
                {currentDate}
              </span>
              <div className="flex items-center gap-x-2">
                <span className="text-sm text-gray-700">Welcome, {user.username}</span>
                <span className="text-xs text-gray-500 capitalize">({user.role?.replace('_', ' ')})</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800 cursor-pointer transition-colors duration-200 font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 