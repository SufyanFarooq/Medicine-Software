import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../lib/auth';
import { formatCurrency } from '../lib/currency';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCranes: 0,
    availableCranes: 0,
    inUseCranes: 0,
    maintenanceCranes: 0,
    totalRevenue: 0,
    totalMaintenanceCost: 0,
    netProfit: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
  });
  const [settings, setSettings] = useState({
    currency: 'AED',
    companyName: 'Crane Management UAE',
    vatRate: 5,
    timezone: 'Asia/Dubai'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData, setChartData] = useState({
    revenueData: [],
    projectData: [],
    monthlyData: [],
    dailyData: [],
    weeklyData: []
  });
  const [timePeriod, setTimePeriod] = useState('monthly'); // 'daily', 'weekly', 'monthly'
  const [exportFilter, setExportFilter] = useState('monthly'); // Filter for export data
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    toDate: new Date().toISOString().split('T')[0] // today
  });
  const [customDateEnabled, setCustomDateEnabled] = useState(false);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);

  useEffect(() => {
    fetchSettings();
    fetchStats();
    fetchRecentActivity();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [timePeriod]);

  const fetchSettings = async () => {
    try {
      const response = await apiRequest('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const [cranesRes, invoicesRes, returnsRes, inventoryRes] = await Promise.all([
        apiRequest('/api/cranes'),
        apiRequest('/api/invoices'),
        apiRequest('/api/returns'),
        apiRequest('/api/inventory'),
      ]);

      let cranes = [];
      if (cranesRes.ok) {
        cranes = await cranesRes.json();
        const availableCranes = cranes.filter(c => c.status === 'Available').length;
        const inUseCranes = cranes.filter(c => c.status === 'In Use').length;
        const maintenanceCranes = cranes.filter(c => c.status === 'Maintenance').length;

        // Calculate total crane value
        const totalCraneValue = cranes.reduce((sum, crane) => {
          return sum + (crane.purchasePrice || 0);
        }, 0);

        setStats(prev => ({
          ...prev,
          totalCranes: cranes.length,
          availableCranes,
          inUseCranes,
          maintenanceCranes,
          totalCraneValue,
        }));
      }

      if (invoicesRes.ok) {
        const invoices = await invoicesRes.json();
        const totalRevenue = invoices.reduce((sum, invoice) => {
          return sum + (invoice.totalAmount || 0);
        }, 0);

        // Count projects
        const uniqueProjects = new Set(invoices.map(invoice => invoice.projectName));
        const totalProjects = uniqueProjects.size;
        const activeProjects = invoices.filter(invoice => 
          invoice.status === 'Pending' || invoice.status === 'Active'
        ).length;
        const completedProjects = invoices.filter(invoice => 
          invoice.status === 'Paid' || invoice.status === 'Completed'
        ).length;

        setStats(prev => ({ 
          ...prev, 
          totalRevenue,
          totalProjects,
          activeProjects,
          completedProjects,
        }));
      }

      if (returnsRes.ok) {
        const returns = await returnsRes.json();
        const totalMaintenanceCost = returns.reduce((sum, returnItem) => {
          return sum + (returnItem.cost || 0);
        }, 0);

        // Calculate net profit (revenue - maintenance costs)
        const netProfit = stats.totalRevenue - totalMaintenanceCost;

        setStats(prev => ({ 
          ...prev, 
          totalMaintenanceCost,
          netProfit,
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const [invoicesRes, returnsRes, cranesRes] = await Promise.all([
        apiRequest('/api/invoices'),
        apiRequest('/api/returns'),
        apiRequest('/api/cranes'),
      ]);

      const activities = [];

      // Process invoices
      if (invoicesRes.ok) {
        const invoices = await invoicesRes.json();
        const recentInvoices = invoices
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        
        recentInvoices.forEach(invoice => {
          activities.push({
            id: invoice._id,
            type: 'invoice',
            title: `Invoice ${invoice.invoiceNumber} generated`,
            description: `${invoice.clientName} - ${invoice.projectName} - ${formatCurrency(invoice.totalAmount)}`,
            date: new Date(invoice.createdAt),
            icon: '🧾',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
          });
        });
      }

      // Process maintenance returns
      if (returnsRes.ok) {
        const returns = await returnsRes.json();
        const recentReturns = returns
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        
        recentReturns.forEach(returnItem => {
          activities.push({
            id: returnItem._id,
            type: 'maintenance',
            title: `Maintenance ${returnItem.returnNumber} completed`,
            description: `${returnItem.craneName} - ${returnItem.returnType} - ${formatCurrency(returnItem.cost)}`,
            date: new Date(returnItem.createdAt),
            icon: '🔧',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
          });
        });
      }

      // Process crane updates (recently added or updated)
      if (cranesRes.ok) {
        const cranes = await cranesRes.json();
        const recentCranes = cranes
          .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
          .slice(0, 3);
        
        recentCranes.forEach(crane => {
          activities.push({
            id: crane._id,
            type: 'crane',
            title: `Crane ${crane.code} updated`,
            description: `${crane.name} - ${crane.type} - ${crane.status}`,
            date: new Date(crane.updatedAt || crane.createdAt),
            icon: '🚁',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
          });
        });
      }

      // Sort activities by date and take the most recent 10
      const sortedActivities = activities
        .sort((a, b) => b.date - a.date)
        .slice(0, 10);

      setRecentActivity(sortedActivities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchChartData = async () => {
    setIsLoadingCharts(true);
    try {
      const [invoicesRes, inventoryRes] = await Promise.all([
        apiRequest('/api/invoices'),
        apiRequest('/api/inventory'),
      ]);

      if (invoicesRes.ok && inventoryRes.ok) {
        const invoices = await invoicesRes.json();
        const inventory = await inventoryRes.json();

        // Process data based on time period
        const processData = (data, dateField, valueField) => {
          const grouped = {};
          
          data.forEach(item => {
            const date = new Date(item[dateField]);
            let key;
            
            switch (timePeriod) {
              case 'daily':
                key = date.toISOString().split('T')[0];
                break;
              case 'weekly':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toISOString().split('T')[0];
                break;
              case 'monthly':
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
              default:
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
            
            if (!grouped[key]) {
              grouped[key] = 0;
            }
            grouped[key] += item[valueField] || 0;
          });
          
          return Object.entries(grouped).map(([key, value]) => ({ key, value }));
        };

        // Revenue data
        const revenueData = processData(invoices, 'createdAt', 'totalAmount');
        
        // Project data
        const projectData = processData(inventory, 'createdAt', 'totalAmount');

        setChartData({
          revenueData,
          projectData,
          monthlyData: revenueData,
          dailyData: revenueData,
          weeklyData: revenueData
        });
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsLoadingCharts(false);
    }
  };

  const exportData = async () => {
    try {
      const response = await apiRequest('/api/export/sales-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: exportFilter,
          fromDate: customDateEnabled ? exportDateRange.fromDate : null,
          toDate: customDateEnabled ? exportDateRange.toDate : null,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crane-management-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setShowExportModal(false);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'text-green-600 bg-green-100';
      case 'In Use': return 'text-blue-600 bg-blue-100';
      case 'Maintenance': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Crane Management Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  UAE Construction Operations Overview
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  📊 Export Report
                </button>
                <Link
                  href="/cranes/add"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  ➕ Add Crane
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Cranes */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">🚁</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Cranes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalCranes}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Cranes */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">✅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Available
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.availableCranes}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* In Use Cranes */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">🏗️</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        In Use
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.inUseCranes}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Maintenance Cranes */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">🔧</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Maintenance
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.maintenanceCranes}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Revenue */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">💰</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Revenue
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(stats.totalRevenue)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Projects */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">🏢</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Projects
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalProjects}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">📈</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Net Profit
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(stats.netProfit)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link
              href="/cranes"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">🚁</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Manage Cranes</h3>
                    <p className="text-sm text-gray-500">View and manage crane inventory</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/invoices"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">🧾</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Invoices</h3>
                    <p className="text-sm text-gray-500">Manage rental invoices</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/returns"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">🔧</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Maintenance</h3>
                    <p className="text-sm text-gray-500">Track maintenance and repairs</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/inventory-report"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-lg">📊</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Reports</h3>
                    <p className="text-sm text-gray-500">View operational reports</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="flow-root">
                <ul className="-mb-8">
                  {recentActivity.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== recentActivity.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${activity.bgColor}`}>
                              <span className="text-lg">{activity.icon}</span>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                {activity.title} <span className="font-medium text-gray-900">{activity.description}</span>
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              <time dateTime={activity.date.toISOString()}>
                                {activity.date.toLocaleDateString()}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Report</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Period
                  </label>
                  <select
                    value={exportFilter}
                    onChange={(e) => setExportFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={customDateEnabled}
                      onChange={(e) => setCustomDateEnabled(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Custom Date Range</span>
                  </label>
                </div>

                {customDateEnabled && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                      <input
                        type="date"
                        value={exportDateRange.fromDate}
                        onChange={(e) => setExportDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                      <input
                        type="date"
                        value={exportDateRange.toDate}
                        onChange={(e) => setExportDateRange(prev => ({ ...prev, toDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={exportData}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 