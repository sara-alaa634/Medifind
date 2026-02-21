'use client';

import { useEffect, useState } from 'react';
import { Clock, MapPin, Phone, Package, AlertCircle, X } from 'lucide-react';
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
  pharmacy: {
    id: string;
    name: string;
    address: string;
    phone: string;
    workingHours: string;
  };
}

/**
 * Patient Reservations Page
 * Requirements: 13.1-13.11
 * 
 * Features:
 * - Display reservation list with filtering and sorting
 * - Show reservation status, medicine, pharmacy details
 * - Allow cancellation of PENDING/ACCEPTED reservations
 */
export default function PatientReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submittingPhone, setSubmittingPhone] = useState(false);

  useEffect(() => {
    loadReservations();
  }, [statusFilter]);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', '1');
      params.append('limit', '50');

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

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    setCancellingId(reservationId);
    try {
      const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
        credentials: 'include',
        method: 'PUT',
      });

      if (response.ok) {
        // Reload reservations
        await loadReservations();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to cancel reservation');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('An error occurred while cancelling the reservation');
    } finally {
      setCancellingId(null);
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
        return 'text-gray-700 bg-gray-50 border-gray-200';
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

  const canCancelReservation = (status: string) => {
    return status === 'PENDING' || status === 'ACCEPTED';
  };

  const openPhoneModal = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setPhoneNumber('');
    setShowPhoneModal(true);
  };

  const handleProvidePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReservation || !phoneNumber.trim()) return;

    setSubmittingPhone(true);
    try {
      const response = await fetch(`/api/reservations/${selectedReservation.id}/provide-phone`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: phoneNumber.trim() }),
      });

      if (response.ok) {
        setShowPhoneModal(false);
        setSelectedReservation(null);
        setPhoneNumber('');
        await loadReservations();
        alert('✓ Phone number provided! The pharmacy will contact you soon.');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to provide phone number');
      }
    } catch (error) {
      console.error('Error providing phone:', error);
      alert('An error occurred');
    } finally {
      setSubmittingPhone(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Reservations</h1>
        <p className="text-gray-600">View and manage your medicine reservations</p>
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
          <p className="text-gray-600 mb-4">
            {statusFilter ? 'No reservations found with this status' : 'You have no reservations yet'}
          </p>
          <a
            href="/patient/search"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search Medicines
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="bg-white rounded-lg shadow-sm p-6">
              {/* Header with Status */}
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
                </div>
                {canCancelReservation(reservation.status) && (
                  <button
                    onClick={() => handleCancelReservation(reservation.id)}
                    disabled={cancellingId === reservation.id}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Cancel reservation"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Medicine Details */}
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

              {/* Pharmacy Details */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Pharmacy</h4>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">{reservation.pharmacy.name}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {reservation.pharmacy.address}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {reservation.pharmacy.phone}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {reservation.pharmacy.workingHours}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
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
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">No Response:</span>
                    <span>{formatDate(reservation.noResponseTime)}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {reservation.note && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Pharmacy Note:</p>
                  <p className="text-sm text-blue-800">{reservation.note}</p>
                </div>
              )}

              {/* ACCEPTED - Pickup Instructions with Timer */}
              {reservation.status === 'ACCEPTED' && (
                <div className="mt-4 p-6 bg-green-50 border-l-4 border-green-500 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-green-900 mb-2">
                        ✓ Reservation Confirmed!
                      </h4>
                      <p className="text-sm text-green-800 mb-3">
                        Your medicine is ready for pickup. Please collect it within <span className="font-bold">30 minutes</span> to keep your reservation.
                      </p>
                      <div className="bg-white rounded-lg p-4 mb-3">
                        <p className="text-xs font-semibold text-gray-600 mb-2">PICKUP LOCATION:</p>
                        <p className="text-sm font-bold text-gray-900 mb-1">{reservation.pharmacy.name}</p>
                        <p className="text-sm text-gray-700 flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4" />
                          {reservation.pharmacy.address}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-700 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {reservation.pharmacy.phone}
                          </p>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {reservation.pharmacy.workingHours}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reservation.pharmacy.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center text-sm font-medium"
                        >
                          Get Directions
                        </a>
                        <a
                          href={`tel:${reservation.pharmacy.phone}`}
                          className="flex-1 px-4 py-2 border-2 border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-center text-sm font-medium"
                        >
                          Call Pharmacy
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NO_RESPONSE Message */}
              {reservation.status === 'NO_RESPONSE' && (
                <div className="mt-4">
                  {!reservation.patientPhone ? (
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-yellow-900 mb-1">
                            Pharmacy Hasn't Responded Yet
                          </p>
                          <p className="text-sm text-yellow-800 mb-3">
                            The pharmacy didn't respond within 5 minutes. Provide your phone number so they can contact you directly to complete this reservation.
                          </p>
                          <button
                            onClick={() => openPhoneModal(reservation)}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                          >
                            Provide Phone Number
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-blue-900 mb-1">
                            Phone Number Provided
                          </p>
                          <p className="text-sm text-blue-800">
                            The pharmacy has your contact number ({reservation.patientPhone}). They will call you soon to complete this reservation.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Provide Phone Modal */}
      {showPhoneModal && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Provide Phone Number</h2>
            <p className="text-sm text-gray-600 mb-4">
              The pharmacy will call you to confirm availability for <span className="font-semibold">{selectedReservation.medicine.name}</span>.
            </p>
            <form onSubmit={handleProvidePhone}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 555 1111"
                  required
                  pattern="[\+]?[0-9\s\-\(\)]+"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code if outside your region
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPhoneModal(false);
                    setSelectedReservation(null);
                    setPhoneNumber('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPhone || !phoneNumber.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {submittingPhone ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
