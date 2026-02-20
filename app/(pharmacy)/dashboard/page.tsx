'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, TrendingDown, Clock, Phone, AlertTriangle } from 'lucide-react';

interface PharmacyAnalytics {
  totalReservations: number;
  pending: number;
  accepted: number;
  rejected: number;
  noResponse: number;
  directCalls: number;
  inventoryStats: {
    totalItems: number;
    lowStock: number;
    outOfStock: number;
  };
  recentReservations: Array<{
    id: string;
    medicine: { id: string; name: string };
    patient: { id: string; name: string };
    quantity: number;
    status: string;
    requestTime: string;
  }>;
  lowStockItems: Array<{
    id: string;
    medicine: { id: string; name: string; activeIngredient: string };
    quantity: number;
    status: string;
    lastUpdated: string;
  }>;
}

export default function PharmacyDashboardPage() {
  const [analytics, setAnalytics] = useState<PharmacyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/pharmacy', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const reservationChartData = [
    { name: 'Pending', count: analytics.pending, fill: '#fbbf24' },
    { name: 'Accepted', count: analytics.accepted, fill: '#10b981' },
    { name: 'Rejected', count: analytics.rejected, fill: '#ef4444' },
    { name: 'No Response', count: analytics.noResponse, fill: '#f97316' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reservations</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalReservations}</p>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{analytics.pending}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting response</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">No Response</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{analytics.noResponse}</p>
              <p className="text-xs text-gray-500 mt-1">Performance indicator</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Direct Calls</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.directCalls}</p>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Phone className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.inventoryStats.totalItems}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{analytics.inventoryStats.lowStock}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <TrendingDown className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{analytics.inventoryStats.outOfStock}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Reservation Status Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reservation Status Breakdown</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={reservationChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Reservations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Reservations</h2>
          {analytics.recentReservations.length === 0 ? (
            <p className="text-gray-500">No recent reservations</p>
          ) : (
            <div className="space-y-4">
              {analytics.recentReservations.map((reservation) => (
                <div key={reservation.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{reservation.medicine.name}</p>
                      <p className="text-sm text-gray-600">Patient: {reservation.patient.name}</p>
                      <p className="text-sm text-gray-600">Quantity: {reservation.quantity}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        reservation.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : reservation.status === 'ACCEPTED'
                          ? 'bg-green-100 text-green-800'
                          : reservation.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {reservation.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(reservation.requestTime).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Low Stock Items</h2>
          {analytics.lowStockItems.length === 0 ? (
            <p className="text-gray-500">All items are well stocked</p>
          ) : (
            <div className="space-y-4">
              {analytics.lowStockItems.map((item) => (
                <div key={item.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{item.medicine.name}</p>
                      <p className="text-sm text-gray-600">{item.medicine.activeIngredient}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        item.status === 'OUT_OF_STOCK'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Last updated: {new Date(item.lastUpdated).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
