import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function CraneRentalDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchRental();
    }
  }, [id]);



  const fetchRental = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/crane-rentals/${id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Rental data:', data); // Debug log
        setRental(data);
      } else {
        setError('Rental not found');
      }
    } catch (error) {
      console.error('Error fetching rental:', error);
      setError('Error fetching rental details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await apiRequest(`/api/crane-rentals/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          contractStatus: newStatus,
          contractEndDate: newStatus === 'Completed' ? new Date().toISOString() : null
        }),
      });

      if (response.ok) {
        const updatedRental = await response.json();
        
        // Update local state to reflect the changes immediately
        if (newStatus === 'Completed' || newStatus === 'Cancelled') {
          // When contract is completed/cancelled, all cranes should be completed
          const updatedCraneRentals = updatedRental.craneRentals.map(crane => ({
            ...crane,
            craneStatus: 'Completed',
            completionDate: new Date().toISOString()
          }));
          
          setRental({
            ...updatedRental,
            craneRentals: updatedCraneRentals
          });
        } else if (newStatus === 'Active') {
          // When contract is active, all cranes should be active
          const updatedCraneRentals = updatedRental.craneRentals.map(crane => ({
            ...crane,
            craneStatus: 'Active',
            completionDate: null
          }));
          
          setRental({
            ...updatedRental,
            craneRentals: updatedCraneRentals
          });
        } else {
          setRental(updatedRental);
        }
      }
    } catch (error) {
      console.error('Error updating rental status:', error);
    }
  };

  const handleCraneStatusChange = async (craneIndex, newStatus) => {
    try {
      const updatedCraneRentals = [...rental.craneRentals];
      updatedCraneRentals[craneIndex] = {
        ...updatedCraneRentals[craneIndex],
        craneStatus: newStatus,
        completionDate: newStatus === 'Completed' ? new Date().toISOString() : null
      };

      // Update the rental with new crane status
      const response = await apiRequest(`/api/crane-rentals/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          craneRentals: updatedCraneRentals,
          contractStatus: checkContractStatus(updatedCraneRentals),
          contractEndDate: checkContractStatus(updatedCraneRentals) === 'Completed' ? new Date().toISOString() : null
        }),
      });

      if (response.ok) {
        const updatedRental = await response.json();
        setRental(updatedRental);
        
        // Update crane status in cranes collection
        if (newStatus === 'Completed') {
          await updateCraneAvailability(updatedCraneRentals[craneIndex].craneId, 'Available');
        } else if (newStatus === 'Active') {
          await updateCraneAvailability(updatedCraneRentals[craneIndex].craneId, 'In Use');
        }
        

      }
    } catch (error) {
      console.error('Error updating crane status:', error);
    }
  };

  const checkContractStatus = (craneRentals) => {
    if (craneRentals.length === 0) return 'Active';
    
    const allCompleted = craneRentals.every(crane => crane.craneStatus === 'Completed');
    const anyCancelled = craneRentals.some(crane => crane.craneStatus === 'Cancelled');
    
    if (allCompleted) return 'Completed';
    if (anyCancelled) return 'Cancelled';
    return 'Active';
  };

  const updateCraneAvailability = async (craneId, status) => {
    try {
      await apiRequest(`/api/cranes/${craneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Error updating crane availability:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this rental?')) return;

    try {
      const response = await apiRequest(`/api/crane-rentals/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/crane-rentals');
      }
    } catch (error) {
      console.error('Error deleting rental:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading rental details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !rental) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Rental Not Found</h3>
            <p className="text-gray-500 mb-6">{error || 'The rental record you are looking for does not exist.'}</p>
            <Link
              href="/crane-rentals"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              ← Back to Rentals
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  href="/crane-rentals"
                  className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900 mb-4"
                >
                  ← Back to Rentals
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">
                  Rental: {rental.rentalNumber}
                </h1>
                <p className="text-gray-600 mt-2">
                  Created on {new Date(rental.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex space-x-3">
                <select
                  value={rental.contractStatus || rental.status || 'Active'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                
                <Link
                  href={`/invoices/generate-crane-rental?rentalId=${rental._id}`}
                  className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                    (rental.contractStatus || rental.status) === 'Completed' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  onClick={(e) => {
                    if ((rental.contractStatus || rental.status) !== 'Completed') {
                      e.preventDefault();
                      alert('Invoice can only be generated for completed contracts');
                    }
                  }}
                >
                  📄 Generate Invoice
                </Link>
                
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-8">
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
              (rental.contractStatus || rental.status) === 'Completed' 
                ? 'bg-green-100 text-green-800'
                : (rental.contractStatus || rental.status) === 'Active'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              Contract: {rental.contractStatus || rental.status || 'Active'}
            </span>
            {rental.contractEndDate && (
              <span className="ml-3 inline-flex px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
                Ended: {new Date(rental.contractEndDate).toLocaleDateString()}
              </span>
            )}
            <span className={`ml-3 inline-flex px-3 py-1 text-sm font-medium rounded-full ${
              rental.paymentStatus === 'Paid' 
                ? 'bg-green-100 text-green-800'
                : rental.paymentStatus === 'Pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              Payment: {rental.paymentStatus}
            </span>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Customer & Project Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                    <p className="mt-1 text-sm text-gray-900">{rental.customerName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{rental.customerEmail}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{rental.customerPhone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{rental.customerAddress}</p>
                  </div>
                </div>
              </div>

              {/* Project Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Project Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project Name</label>
                    <p className="mt-1 text-sm text-gray-900">{rental.projectName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="mt-1 text-sm text-gray-900">{rental.projectLocation}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{rental.projectDescription}</p>
                  </div>
                </div>
              </div>

              {/* Crane Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Crane Information</h3>
                {rental.craneRentals && rental.craneRentals.length > 0 ? (
                  <div className="space-y-4">
                    {rental.craneRentals.map((craneRental, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-md font-medium text-gray-900">
                            {craneRental.craneName} ({craneRental.craneCode})
                          </h4>
                          <div className="flex items-center space-x-2">
                            <select
                              value={craneRental.craneStatus}
                              onChange={(e) => handleCraneStatusChange(index, e.target.value)}
                              className={`px-3 py-1 text-sm border rounded-md ${
                                craneRental.craneStatus === 'Completed' 
                                  ? 'border-green-300 bg-green-50 text-green-800'
                                  : craneRental.craneStatus === 'Active'
                                  ? 'border-blue-300 bg-blue-50 text-blue-800'
                                  : 'border-gray-300 bg-gray-50 text-gray-800'
                              }`}
                            >
                              <option value="Active">Active</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                            {craneRental.craneStatus === 'Completed' && (
                              <span className="text-xs text-green-600">
                                {craneRental.completionDate ? 
                                  `Completed on ${new Date(craneRental.completionDate).toLocaleDateString()}` : 
                                  'Completed'
                                }
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Crane Type</label>
                            <p className="mt-1 text-gray-900">{craneRental.craneType}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Capacity</label>
                            <p className="mt-1 text-gray-900">{craneRental.craneCapacity}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Rate</label>
                            <p className="mt-1 text-gray-900">
                              {rental.billingType === 'hourly' 
                                ? `${formatCurrency(craneRental.hourlyRate)}/hour`
                                : `${formatCurrency(craneRental.dailyRate)}/day`
                              }
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Amount</label>
                            <p className="mt-1 text-green-600 font-medium">
                              {formatCurrency(craneRental.individualAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No cranes assigned to this rental
                  </div>
                )}
              </div>

              {/* Rental Period */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(rental.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(rental.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {rental.billingType === 'hourly' 
                        ? `${rental.totalHours} hours`
                        : `${rental.totalDays} days`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Services */}
              {rental.additionalServices && rental.additionalServices.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Services</h3>
                  <div className="space-y-3">
                    {rental.additionalServices.map((service, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{service.name}</p>
                          <p className="text-xs text-gray-500">{service.description}</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(service.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Billing & Summary */}
            <div className="space-y-6">
              {/* Billing Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Billing Type</label>
                    <p className="mt-1 text-sm font-medium text-gray-900 capitalize">{rental.billingType}</p>
                  </div>
                  
                  {rental.billingType === 'hourly' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hourly Rate</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {formatCurrency(rental.hourlyRate)}/hour
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Daily Rate</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {formatCurrency(rental.dailyRate)}/day
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Base Amount</label>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {formatCurrency(rental.baseAmount)}
                    </p>
                  </div>
                  
                  {rental.additionalServicesTotal > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Additional Services</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {formatCurrency(rental.additionalServicesTotal)}
                      </p>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                    <p className="mt-1 text-xl font-bold text-green-600">
                      {formatCurrency(rental.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {rental.notes && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{rental.notes}</p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                                     <Link
                     href={`/invoices/generate-crane-rental?rentalId=${rental._id}`}
                     className={`w-full flex items-center justify-center px-4 py-2 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                       (rental.contractStatus || rental.status) === 'Completed' 
                         ? 'bg-green-600' 
                         : 'bg-gray-400 cursor-not-allowed'
                     }`}
                     onClick={(e) => {
                       if ((rental.contractStatus || rental.status) !== 'Completed') {
                         e.preventDefault();
                         alert('Invoice can only be generated for completed contracts');
                       }
                     }}
                   >
                     📄 Generate Invoice
                   </Link>
                  
                  <Link
                    href={`/crane-rentals/generate?edit=${rental._id}`}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    ✏️ Edit Rental
                  </Link>
                  
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    🗑️ Delete Rental
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
