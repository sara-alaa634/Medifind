'use client';

import { useEffect, useState } from 'react';
import { Search, MapPin, Phone, Clock, Star, Check, X, Trash2, Building2 } from 'lucide-react';

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  rating: number;
  workingHours: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    avatar: string | null;
    createdAt: string;
  };
}

/**
 * Admin Pharmacies Page
 * Requirements: 8.1-8.9
 * 
 * Features:
 * - Display pharmacy approval interface
 * - Approve or reject pharmacy registrations
 * - Filter by approval status and search
 */
export default function AdminPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<string>('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    loadPharmacies();
  }, [searchQuery, approvalFilter]);

  const loadPharmacies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (approvalFilter) params.append('isApproved', approvalFilter);
      params.append('page', '1');
      params.append('limit', '100');

      const response = await fetch(`/api/pharmacies?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPharmacies(data.pharmacies || []);
      }
    } catch (error) {
      console.error('Error loading pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePharmacy = async (id: string, name: string) => {
    if (!confirm(`Approve "${name}"? They will be able to access the pharmacy portal.`)) {
      return;
    }

    setActioningId(id);
    try {
      const response = await fetch(`/api/pharmacies/${id}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadPharmacies();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to approve pharmacy');
      }
    } catch (error) {
      console.error('Error approving pharmacy:', error);
      alert('An error occurred');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectPharmacy = async (id: string, name: string) => {
    if (!confirm(`Reject and delete "${name}"? This will permanently remove the pharmacy and associated user account. This action cannot be undone.`)) {
      return;
    }

    setActioningId(id);
    try {
      const response = await fetch(`/api/pharmacies/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadPharmacies();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to reject pharmacy');
      }
    } catch (error) {
      console.error('Error rejecting pharmacy:', error);
      alert('An error occurred');
    } finally {
      setActioningId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const pendingCount = pharmacies.filter(p => !p.isApproved).length;
  const approvedCount = pharmacies.filter(p => p.isApproved).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pharmacy Management</h1>
        <p className="text-gray-600">Approve or reject pharmacy registrations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pharmacies</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{pharmacies.length}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{approvedCount}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="false">Pending Approval</option>
            <option value="true">Approved</option>
          </select>
        </div>
      </div>

      {/* Pharmacies List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600">Loading pharmacies...</p>
        </div>
      ) : pharmacies.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchQuery || approvalFilter ? 'No pharmacies found' : 'No pharmacy registrations yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pharmacies.map((pharmacy) => (
            <div key={pharmacy.id} className="bg-white rounded-lg shadow-sm p-6">
              {/* Header with Status */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{pharmacy.name}</h3>
                    {pharmacy.isApproved ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border text-green-700 bg-green-50 border-green-200">
                        Approved
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border text-yellow-700 bg-yellow-50 border-yellow-200">
                        Pending Approval
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">Registered on {formatDate(pharmacy.createdAt)}</p>
                </div>
              </div>

              {/* Pharmacy Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Address</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {pharmacy.address}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Phone</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {pharmacy.phone}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Working Hours</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {pharmacy.workingHours}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Rating</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {pharmacy.rating.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Location</p>
                  <p className="text-sm font-medium text-gray-900">
                    {pharmacy.latitude.toFixed(6)}, {pharmacy.longitude.toFixed(6)}
                  </p>
                </div>
              </div>

              {/* Owner Details */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Owner Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Name</p>
                    <p className="text-sm font-medium text-gray-900">{pharmacy.user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <p className="text-sm font-medium text-gray-900">{pharmacy.user.email}</p>
                  </div>
                  {pharmacy.user.phone && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{pharmacy.user.phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">User ID</p>
                    <p className="text-sm font-mono text-gray-600">{pharmacy.user.id}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {!pharmacy.isApproved ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprovePharmacy(pharmacy.id, pharmacy.name)}
                    disabled={actioningId === pharmacy.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  >
                    <Check className="w-4 h-4" />
                    Approve Pharmacy
                  </button>
                  <button
                    onClick={() => handleRejectPharmacy(pharmacy.id, pharmacy.name)}
                    disabled={actioningId === pharmacy.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
                  >
                    <X className="w-4 h-4" />
                    Reject & Delete
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                    <Check className="w-4 h-4" />
                    Pharmacy is approved and active
                  </div>
                  <button
                    onClick={() => handleRejectPharmacy(pharmacy.id, pharmacy.name)}
                    disabled={actioningId === pharmacy.id}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
