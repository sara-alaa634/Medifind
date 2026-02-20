'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Building2, Package, FileText, Phone, AlertTriangle, TrendingUp } from 'lucide-react';

interface AdminAnalytics {
  totalUsers: number;
  totalPatients: number;
  totalPharmacies: number;
  pendingApprovals: number;
  totalMedicines: number;
  totalReservations: number;
  reservationsByStatus: {
    pending: number;
    accepted: number;
    rejected: number;
    cancelled: number;
    noResponse: number;
  };
  directCalls: number;
  noResponseByPharmacy: Array<{
    pharmacy: { id: string; name: string; address: string };
    count: number;
  }>;
  reservationsOverTime: Array<{
    month: string;
    count: number;
  }>;
  topMedicines: Array<{
    medicine: { id: string; name: string; activeIngredient: string; category: string };
    count: number;
  }>;
}

const COLORS = ['#fbbf24', '#10b981', '#ef4444', '#6b7280', '#f97316'];

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/admin');
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

  const reservationStatusData = [
    { name: 'Pending', value: analytics.reservationsByStatus.pending },
    { name: 'Accepted', value: analytics.reservationsByStatus.accepted },
    { name: 'Rejected', value: analytics.reservationsByStatus.rejected },
    { name: 'Cancelled', value: analytics.reservationsByStatus.cancelled },
    { name: 'No Response', value: analytics.reservationsByStatus.noResponse },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Analytics</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalUsers}</p>
              <p className="text-xs text-gray-500 mt-1">{analytics.totalPatients} patients</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pharmacies</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalPharmacies}</p>
              <p className="text-xs text-gray-500 mt-1">{analytics.pendingApprovals} pending</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Medicines</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalMedicines}</p>
              <p className="text-xs text-gray-500 mt-1">In catalog</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reservations</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalReservations}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Direct Calls</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.directCalls}</p>
              <p className="text-xs text-gray-500 mt-1">Total direct pharmacy calls</p>
            </div>
            <div className="bg-indigo-100 rounded-full p-3">
              <Phone className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">No Response Count</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{analytics.reservationsByStatus.noResponse}</p>
              <p className="text-xs text-gray-500 mt-1">Performance indicator</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Reservation Status Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Reservations by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reservationStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reservationStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Reservations Over Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Reservations Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.reservationsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Medicines */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Reserved Medicines</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={analytics.topMedicines} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="medicine.name" type="category" width={150} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* NO_RESPONSE by Pharmacy */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          NO_RESPONSE Count by Pharmacy
          <span className="text-sm font-normal text-gray-500 ml-2">(Performance Indicator)</span>
        </h2>
        {analytics.noResponseByPharmacy.length === 0 ? (
          <p className="text-gray-500">No NO_RESPONSE reservations recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pharmacy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NO_RESPONSE Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.noResponseByPharmacy
                  .sort((a, b) => b.count - a.count)
                  .map((item) => (
                    <tr key={item.pharmacy.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.pharmacy.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.pharmacy.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                          {item.count}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
