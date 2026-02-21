'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
interface InventoryItem {
  id: string;
  quantity: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  lastUpdated: string;
  medicine: {
    id: string;
    name: string;
    activeIngredient: string;
    dosage: string;
    category: string;
    priceRange: string;
    prescriptionRequired: boolean;
  };
}

interface Medicine {
  id: string;
  name: string;
  activeIngredient: string;
  dosage: string;
  category: string;
}

/**
 * Pharmacy Inventory Page
 * Requirements: 9.1-9.10
 * 
 * Features:
 * - Display inventory table with filtering and search
 * - Add, update, and delete inventory items
 * - Auto-update stock status based on quantity
 */
export default function PharmacyInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({ medicineId: '', quantity: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Medicine search state
  const [medicineSearch, setMedicineSearch] = useState('');
  const [medicineResults, setMedicineResults] = useState<Medicine[]>([]);
  const [searchingMedicines, setSearchingMedicines] = useState(false);
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadInventory();
  }, [statusFilter, searchQuery]);

  // Debounced medicine search
  useEffect(() => {
    if (!medicineSearch || medicineSearch.length < 1) {
      setMedicineResults([]);
      setShowMedicineDropdown(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchMedicines(medicineSearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [medicineSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.medicine-search-container')) {
        setShowMedicineDropdown(false);
      }
    };

    if (showMedicineDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMedicineDropdown]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', '1');
      params.append('limit', '100');

      const response = await fetch(`/api/inventory?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory || []);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchMedicines = async (query: string) => {
    setSearchingMedicines(true);
    try {
      const response = await fetch(`/api/medicines?search=${encodeURIComponent(query)}&limit=20`);
      
      if (response.ok) {
        const data = await response.json();
        setMedicineResults(data.medicines || []);
        setShowMedicineDropdown(true);
      } else {
        console.error('Failed to search medicines');
        setMedicineResults([]);
      }
    } catch (error) {
      console.error('Error searching medicines:', error);
      setMedicineResults([]);
    } finally {
      setSearchingMedicines(false);
    }
  };

  const selectMedicine = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setFormData({ ...formData, medicineId: medicine.id });
    setMedicineSearch(medicine.name);
    setShowMedicineDropdown(false);
  };

  const clearMedicineSelection = () => {
    setSelectedMedicine(null);
    setMedicineSearch('');
    setFormData({ ...formData, medicineId: '' });
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/inventory', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddModal(false);
        setFormData({ medicineId: '', quantity: 0 });
        clearMedicineSelection();
        await loadInventory();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to add inventory item');
      }
    } catch (error) {
      console.error('Error adding inventory:', error);
      setError('An error occurred while adding the medicine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/inventory/${selectedItem.id}`, {
        credentials: 'include',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: formData.quantity }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedItem(null);
        setFormData({ medicineId: '', quantity: 0 });
        await loadInventory();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update inventory');
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      setError('An error occurred while updating the quantity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInventory = async (id: string, name: string) => {
    setItemToDelete({ id, name });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/inventory/${itemToDelete.id}`, {
        credentials: 'include',
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteConfirm(false);
        setItemToDelete(null);
        await loadInventory();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete inventory item');
      }
    } catch (error) {
      console.error('Error deleting inventory:', error);
      setError('An error occurred while deleting the item');
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({ medicineId: item.medicine.id, quantity: item.quantity });
    setError('');
    setShowEditModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'LOW_STOCK':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'OUT_OF_STOCK':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
          <p className="text-gray-600">Manage your medicine stock levels</p>
        </div>
        <button
          onClick={() => {
            setFormData({ medicineId: '', quantity: 0 });
            setError('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Medicine
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by medicine name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Stock Status</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      ) : inventory.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {statusFilter || searchQuery ? 'No items found' : 'Your inventory is empty'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Medicine
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medicine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.medicine.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.medicine.activeIngredient} • {item.medicine.dosage}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{item.medicine.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(item.lastUpdated).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit quantity"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInventory(item.id, item.medicine.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove from inventory"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Medicine to Inventory</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleAddInventory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medicine
                </label>
                <div className="relative medicine-search-container">
                  {selectedMedicine ? (
                    <div className="flex items-center justify-between w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedMedicine.name}</p>
                        <p className="text-xs text-gray-500">{selectedMedicine.activeIngredient}</p>
                      </div>
                      <button
                        type="button"
                        onClick={clearMedicineSelection}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search for a medicine..."
                          value={medicineSearch}
                          onChange={(e) => setMedicineSearch(e.target.value)}
                          onFocus={() => medicineSearch.length >= 1 && setShowMedicineDropdown(true)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {showMedicineDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {searchingMedicines ? (
                            <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                          ) : medicineResults.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500">
                              {medicineSearch.length < 1 ? 'Type to search' : 'No medicines found'}
                            </div>
                          ) : (
                            medicineResults.map((medicine) => (
                              <button
                                key={medicine.id}
                                type="button"
                                onClick={() => selectMedicine(medicine)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                              >
                                <p className="text-sm font-medium text-gray-900">{medicine.name}</p>
                                <p className="text-xs text-gray-500">
                                  {medicine.activeIngredient} • {medicine.dosage}
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Start typing to search from the medicine database
                </p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    clearMedicineSelection();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.medicineId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {submitting ? 'Adding...' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
              Remove from Inventory?
            </h2>
            
            <p className="text-gray-600 text-center mb-2">
              Are you sure you want to remove
            </p>
            <p className="text-gray-900 font-semibold text-center mb-6">
              {itemToDelete.name}
            </p>
            <p className="text-gray-600 text-center mb-8">
              This will remove the medicine from your inventory. You can add it back later if needed.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 w-full">
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setItemToDelete(null);
                  setError('');
                }}
                disabled={deleting}
                className="p-4 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Keep Item
              </button>
              <button 
                onClick={confirmDelete}
                disabled={deleting}
                className="p-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quantity Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Update Quantity</h2>
            <p className="text-sm text-gray-600 mb-4">
              {selectedItem.medicine.name}
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleUpdateInventory}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Stock status will be automatically updated based on quantity
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {submitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
