'use client';

import { useEffect, useState } from 'react';
import { Clock, MapPin, Phone, Package, User, AlertCircle, Check, X } from 'lucide-react';

interface Reservation {
  id: string;
  quantity: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'NO_RESPONSE';
  requestTime: string;
  acceptedTime: string | null;
  rejectedTime: string | null;
  noResponseTime: string | null;
  patientPhone: string | null;
  note: string | null;
  medicine: {
    id: string;
    name: string;
    activeIngredient: string;
    dosage: string;
    prescriptionRequired: boolean;
    category: string;
    priceRange: string;
  };
  user: {
    id: string;
    name: string;
    phone: string | null;
  };
}

/**
 * Pharmacy Reservations Page
 * Requirements: 9.1-9.10, 12.1-12.19
 * 
 * Features:
 * - Display reservation list with accept/reject actions
 * - Filter by status and sort by request time
 * - Handle PENDING and NO_RESPONSE reservations
 */
export default function PharmacyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReservations();
  }, [statusFilter]);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', '1');
      params.append('limit', '100');

      const response = await fetch(`/api/reservations?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReservations(data.reservations || []);
      } else {
        console.error('Failed to load reservations');
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAcceptModal = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setActionNote('');
    setShowAcceptModal(true);
  };

  const openRejectModal = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setActionNote('');
    setShowRejectModal(true);
  };

  const handleAcceptReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReservation) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/reservations/${selectedReservation.id}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: actionNote || undefined }),
      });

      if (response.ok) {
        setShowAcceptModal(false);
        setSelectedReservation(null);
        setActionNote('');
        await loadReservations();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to accept reservation');
      }
    } catch (error) {
      console.error('Error accepting reservation:', error);
      alert('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReservation) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/reservations/${selectedReservation.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: actionNote || undefined }),
      });

      if (response.ok) {
        setShowRejectModal(false);
        setSelectedReservation(null);
        setActionNote('');
        await loadReservations();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to reject reservation');
      }
    } catch (error) {
      console.error('Error rejecting reservation:', error);
      alert('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'PENDING':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'REJECTED':
      case 'CANCELLED':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'NO_RESPONSE':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canAcceptOrReject = (status: string) => {
    return status === 'PENDING' || status === 'NO_RESPONSE';
  };

  const getTimeSinceRequest = (requestTime: string) => {
    const now = new Date();
    const request = new Date(requestTime);
    const diffMs = now.getTime() - request.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reservation Requests</h1>
        <p className="text-gray-600">Manage incoming medicine reservation requests</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_RESPONSE">No Response</option>
          </select>
          <span className="text-sm text-gray-600">
            {reservations.length} reservation{reservations.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Reservations List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600">Loading reservations...</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {statusFilter ? 'No reservations found with this status' : 'No reservation requests yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="bg-white rounded-lg shadow-sm p-6">
              {/* Header with Status and Time */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {reservation.medicine.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(reservation.status)}`}>
                      {getStatusText(reservation.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {reservation.medicine.activeIngredient} • {reservation.medicine.dosage}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Requested {getTimeSinceRequest(reservation.requestTime)}
                  </p>
                </div>
              </div>

              {/* Medicine and Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Quantity</p>
                  <p className="text-sm font-medium text-gray-900">
                    {reservation.quantity} unit{reservation.quantity !== 1 ? 's' : ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Price Range</p>
                  <p className="text-sm font-medium text-gray-900">{reservation.medicine.priceRange}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Category</p>
                  <p className="text-sm font-medium text-gray-900">{reservation.medicine.category}</p>
                </div>
                {reservation.medicine.prescriptionRequired && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Prescription</p>
                    <span className="inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      <AlertCircle className="w-3 h-3" />
                      Required
                    </span>
                  </div>
                )}
              </div>

              {/* Patient Details */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Patient Information
                </h4>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">{reservation.user.name}</p>
                  {reservation.user.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {reservation.user.phone}
                    </p>
                  )}
                  {reservation.patientPhone && reservation.status === 'NO_RESPONSE' && (
                    <p className="text-sm text-blue-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Contact: {reservation.patientPhone}
                    </p>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Requested:</span>
                  <span>{formatDate(reservation.requestTime)}</span>
                </div>
                {reservation.acceptedTime && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Accepted:</span>
                    <span>{formatDate(reservation.acceptedTime)}</span>
                  </div>
                )}
                {reservation.rejectedTime && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Rejected:</span>
                    <span>{formatDate(reservation.rejectedTime)}</span>
                  </div>
                )}
                {reservation.noResponseTime && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">No Response:</span>
                    <span>{formatDate(reservation.noResponseTime)}</span>
                  </div>
                )}
              </div>

              {/* Note Display */}
              {reservation.note && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Your Note to Patient:</p>
                  <p className="text-sm text-blue-800">{reservation.note}</p>
                </div>
              )}

              {/* Action Buttons */}
              {canAcceptOrReject(reservation.status) && (
                <div className="flex gap-3">
                  <button
                    onClick={() => openAcceptModal(reservation)}
                    disabled={actioningId === reservation.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => openRejectModal(reservation)}
                    disabled={actioningId === reservation.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}

              {/* NO_RESPONSE Warning */}
              {reservation.status === 'NO_RESPONSE' && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <span className="font-semibold">Attention:</span> This reservation timed out after 5 minutes. 
                    Please respond promptly to improve your service rating.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Accept Modal */}
      {showAcceptModal && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Accept Reservation</h2>
            <p className="text-sm text-gray-600 mb-4">
              {selectedReservation.medicine.name} - {selectedReservation.quantity} unit{selectedReservation.quantity !== 1 ? 's' : ''}
            </p>
            <form onSubmit={handleAcceptReservation}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note to Patient (Optional)
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="e.g., Ready for pickup in 30 minutes. Please bring prescription."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Patient will receive a notification with a 30-minute pickup window
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAcceptModal(false);
                    setSelectedReservation(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                >
                  {submitting ? 'Accepting...' : 'Accept'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reject Reservation</h2>
            <p className="text-sm text-gray-600 mb-4">
              {selectedReservation.medicine.name} - {selectedReservation.quantity} unit{selectedReservation.quantity !== 1 ? 's' : ''}
            </p>
            <form onSubmit={handleRejectReservation}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="e.g., Out of stock, Prescription required, etc."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedReservation(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
                >
                  {submitting ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
