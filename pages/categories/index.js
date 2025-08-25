import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { hasPermission } from '../../lib/permissions';
import { getUser } from '../../lib/auth';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const predefinedColors = [
    '#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B',
    '#6B7280', '#374151', '#EC4899', '#F97316', '#6366F1',
    '#84CC16', '#06B6D4', '#F43F5E', '#A855F7', '#EAB308'
  ];

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiRequest('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (editingCategory) {
        // Update existing category
        const response = await apiRequest(`/api/categories/${editingCategory._id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          setMessage('Category updated successfully!');
          setEditingCategory(null);
          setShowForm(false);
          fetchCategories();
        } else {
          const errorData = await response.json();
          setMessage(errorData.error || 'Failed to update category');
        }
      } else {
        // Create new category
        const response = await apiRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          setMessage('Category created successfully!');
          setShowForm(false);
          fetchCategories();
        } else {
          const errorData = await response.json();
          setMessage(errorData.error || 'Failed to create category');
        }
      }

      // Reset form
      setFormData({ name: '', description: '', color: '#3B82F6' });
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? Products using this category will be moved to "General" category.')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/categories/${categoryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessage('Category deleted successfully!');
        fetchCategories();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to delete category');
      }
    } catch (error) {
      setMessage('Error deleting category');
    }

    setTimeout(() => setMessage(''), 3000);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: '#3B82F6' });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-600">Loading categories...</div>
        </div>
      </Layout>
    );
  }

  // Check if user has permission to manage categories
  if (!hasPermission(currentUser?.role, 'canManageSettings')) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600">
              You do not have permission to manage categories. Only Super Admins and Managers can access this page.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Categories Management</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add New Category
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('successfully') 
              ? 'bg-green-100 border border-green-200 text-green-600' 
              : 'bg-red-100 border border-red-200 text-red-600'
          }`}>
            {message}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter category name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color *
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-16 h-10 border border-gray-300 rounded-md cursor-pointer"
                    />
                    <span className="text-sm text-gray-500">{formData.color}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-gray-400"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter category description"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingCategory ? 'Update Category' : 'Add Category')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Categories</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <h4 className="font-medium text-gray-900">{category.name}</h4>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category._id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {category.description && (
                  <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Color: {category.color}</span>
                  <span>ID: {category._id?.slice(-8)}</span>
                </div>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No categories found. Create your first category to get started!
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
