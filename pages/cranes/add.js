import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';

export default function AddCranePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [craneData, setCraneData] = useState({
    name: '',
    code: '',
    type: 'Mobile Crane',
    capacity: '',
    boomLength: '',
    location: '',
    status: 'Available',
    operator: '',
    purchasePrice: '',
    dailyRate: '',
    hourlyRate: '',
    minRentalHours: 1,
    lastMaintenance: new Date().toISOString().split('T')[0],
    nextMaintenance: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const craneTypes = [
    'Mobile Crane',
    'Tower Crane',
    'Crawler Crane',
    'All Terrain Crane',
    'Truck Mounted Crane'
  ];

  const craneStatuses = [
    'Available',
    'In Use',
    'Maintenance'
  ];

  const uaeLocations = [
    'Dubai Marina',
    'Dubai Hills Estate',
    'Dubai Creek Harbour',
    'Dubai World Central',
    'Abu Dhabi Downtown',
    'Abu Dhabi Global Market',
    'Abu Dhabi Corniche',
    'Abu Dhabi Airport',
    'Sharjah Industrial',
    'Sharjah University City',
    'Sharjah Al Qasimiya',
    'Ras Al Khaimah Port',
    'Fujairah Free Zone',
    'Fujairah Port',
    'Ajman Free Zone',
    'Umm Al Quwain',
    'Al Ain Industrial City'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCraneData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!craneData.name || !craneData.code || !craneData.capacity || !craneData.dailyRate) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Validate numeric fields
      if (isNaN(craneData.purchasePrice) || isNaN(craneData.dailyRate)) {
        setError('Purchase price and daily rate must be valid numbers');
        setLoading(false);
        return;
      }

      const response = await apiRequest('/api/cranes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...craneData,
          purchasePrice: parseFloat(craneData.purchasePrice),
          dailyRate: parseFloat(craneData.dailyRate),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/cranes/${result.craneId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add crane');
      }
    } catch (error) {
      console.error('Error adding crane:', error);
      setError('Error adding crane');
    } finally {
      setLoading(false);
    }
  };

  const generateCraneCode = () => {
    const type = craneData.type.replace(/\s+/g, '').toUpperCase();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const newCode = `${type}${randomNum}`;
    setCraneData(prev => ({ ...prev, code: newCode }));
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
                  Add New Crane
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Add a new crane to your fleet
                </p>
              </div>
              <Link
                href="/cranes"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ← Back to Cranes
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Crane Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={craneData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Liebherr LTM 1100-4.2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Crane Code *
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        name="code"
                        value={craneData.code}
                        onChange={handleInputChange}
                        placeholder="e.g., CRANE001"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={generateCraneCode}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        🎲 Generate
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Crane Type *
                    </label>
                    <select
                      name="type"
                      value={craneData.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      {craneTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status *
                    </label>
                    <select
                      name="status"
                      value={craneData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      {craneStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Specifications */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Capacity *
                    </label>
                    <input
                      type="text"
                      name="capacity"
                      value={craneData.capacity}
                      onChange={handleInputChange}
                      placeholder="e.g., 100 tons"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Boom Length
                    </label>
                    <input
                      type="text"
                      name="boomLength"
                      value={craneData.boomLength}
                      onChange={handleInputChange}
                      placeholder="e.g., 60m"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Location & Operations */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Location & Operations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <select
                      name="location"
                      value={craneData.location}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Location</option>
                      {uaeLocations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Operator
                    </label>
                    <input
                      type="text"
                      name="operator"
                      value={craneData.operator}
                      onChange={handleInputChange}
                      placeholder="e.g., Ahmed Al Mansouri"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Price (AED)
                    </label>
                    <input
                      type="number"
                      name="purchasePrice"
                      value={craneData.purchasePrice}
                      onChange={handleInputChange}
                      placeholder="e.g., 2500000"
                      step="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Daily Rate (AED) *
                    </label>
                    <input
                      type="number"
                      name="dailyRate"
                      value={craneData.dailyRate}
                      onChange={handleInputChange}
                      placeholder="e.g., 15000"
                      step="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate (AED)
                    </label>
                    <input
                      type="number"
                      name="hourlyRate"
                      value={craneData.hourlyRate || (craneData.dailyRate ? Math.round(craneData.dailyRate / 8) : '')}
                      onChange={handleInputChange}
                      placeholder="Auto-calculated from daily rate"
                      step="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty to auto-calculate (Daily Rate ÷ 8 hours)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Rental Hours
                    </label>
                    <input
                      type="number"
                      name="minRentalHours"
                      value={craneData.minRentalHours || 1}
                      onChange={handleInputChange}
                      placeholder="e.g., 1"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Maintenance Schedule */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Maintenance Date
                    </label>
                    <input
                      type="date"
                      name="lastMaintenance"
                      value={craneData.lastMaintenance}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Next Maintenance Date
                    </label>
                    <input
                      type="date"
                      name="nextMaintenance"
                      value={craneData.nextMaintenance}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Link
                  href="/cranes"
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Crane'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
