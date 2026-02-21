'use client';

import { useEffect, useState } from 'react';
import { Search, MapPin, ChevronRight, TrendingUp, Pill, LogIn, UserPlus, User, LogOut, ArrowLeft, Filter, Phone, CalendarCheck, Star, X, PhoneCall, Loader2, CheckCircle2, XCircle, Clock, Info, ChevronLeft, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Medicine {
  id: string;
  name: string;
  activeIngredient: string;
  dosage: string;
  prescriptionRequired: boolean;
  category: string;
  priceRange: string;
}

interface PharmacyAvailability {
  pharmacyId: string;
  pharmacyName: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  rating: number;
  workingHours: string;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  quantity: number;
  distance: number | null;
}

const CATEGORIES = [
  { name: 'Painkillers', icon: '💊' },
  { name: 'Antibiotics', icon: '🧫' },
  { name: 'Chronic', icon: '🫀' },
  { name: 'Vitamins', icon: '🍎' },
  { name: 'Allergy', icon: '🤧' }
];

type ViewStep = 'home' | 'results' | 'confirm' | 'reservation';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [pharmacies, setPharmacies] = useState<PharmacyAvailability[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [viewStep, setViewStep] = useState<ViewStep>('home');
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'availability'>('distance');
  const [callingPharmacy, setCallingPharmacy] = useState<PharmacyAvailability | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<PharmacyAvailability | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservationStatus, setReservationStatus] = useState<string>('PENDING');
  const [pickupTimer, setPickupTimer] = useState(1800); // 30 minutes in seconds
  const [pendingTimer, setPendingTimer] = useState(300); // 5 minutes in seconds
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
        }
      );
    }

    // Load initial medicines
    loadMedicines();
  }, []);
  
  // Countdown timer for accepted reservations
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (reservationStatus === 'ACCEPTED' && pickupTimer > 0) {
      interval = setInterval(() => {
        setPickupTimer(t => {
          if (t <= 1) return 0;
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [reservationStatus]); // Only depend on status, not timer value
  
  // Countdown timer for pending reservations
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (reservationStatus === 'PENDING' && pendingTimer > 0) {
      console.log('Starting pending timer countdown, current:', pendingTimer);
      interval = setInterval(() => {
        setPendingTimer(t => {
          if (t <= 1) {
            console.log('Pending timer reached 0');
            return 0;
          }
          console.log('Pending timer tick:', t - 1);
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        console.log('Clearing pending timer interval');
        clearInterval(interval);
      }
    };
  }, [reservationStatus]); // Only depend on status, not timer value

  const loadMedicines = async (search?: string, category?: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      params.append('page', '1');
      params.append('limit', '50');

      const response = await fetch(`/api/medicines?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMedicines(data.medicines || []);
      }
    } catch (error) {
      console.error('Error loading medicines:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSearch = async (term: string) => {
    await loadMedicines(term, '');
    setViewStep('results');
    setSelectedMedicine(null);
  };

  const handleCategorySelect = async (category: string) => {
    await loadMedicines('', category);
    setViewStep('results');
    setSelectedMedicine(null);
  };

  const handleMedicineClick = async (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    
    try {
      const params = new URLSearchParams();
      if (userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lon', userLocation.lon.toString());
      }

      const response = await fetch(`/api/medicines/${medicine.id}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPharmacies(data.availability || []);
      }
    } catch (error) {
      console.error('Error loading medicine details:', error);
    }
    
    setViewStep('results');
  };

  const handleReserve = async (pharmacy: PharmacyAvailability) => {
    if (!selectedMedicine || !user) {
      window.location.href = '/login';
      return;
    }

    // Show confirmation page instead of creating reservation immediately
    setSelectedPharmacy(pharmacy);
    setViewStep('confirm');
  };
  
  const handleConfirmReservation = async () => {
    if (!selectedMedicine || !selectedPharmacy || !user) return;

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pharmacyId: selectedPharmacy.pharmacyId,
          medicineId: selectedMedicine.id,
          quantity: 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Reservation created:', data.reservation);
        setReservationId(data.reservation.id);
        setReservationStatus('PENDING');
        setPendingTimer(300); // Reset to 5 minutes
        setViewStep('reservation');
        console.log('View changed to reservation, status:', 'PENDING', 'timer:', 300);
        
        // Poll for status updates
        pollReservationStatus(data.reservation.id);
      } else {
        const errorData = await response.json();
        console.error('Reservation failed:', errorData);
        alert(`✗ Reservation failed: ${errorData.message || 'Please try again'}`);
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      alert('✗ An error occurred while creating the reservation. Please try again.');
    }
  };

  const handleCancelReservation = async () => {
    if (!reservationId || cancelling) return;
    
    setShowCancelConfirm(true);
  };

  const confirmCancelReservation = async () => {
    if (!reservationId) return;

    setCancelling(true);
    setShowCancelConfirm(false);
    
    try {
      const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: 'PUT',
        credentials: 'include',
      });

      if (response.ok) {
        setViewStep('home');
        setReservationId(null);
        setSelectedMedicine(null);
        setSelectedPharmacy(null);
      } else {
        const errorData = await response.json();
        console.error('Cancel failed:', errorData);
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
    } finally {
      setCancelling(false);
    }
  };
  
  const pollReservationStatus = (resId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/reservations/${resId}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setReservationStatus(data.reservation.status);
          
          if (data.reservation.status === 'ACCEPTED') {
            setPickupTimer(1800); // Reset to 30 minutes
            clearInterval(interval);
          } else if (data.reservation.status === 'REJECTED' || data.reservation.status === 'NO_RESPONSE') {
            clearInterval(interval);
          }
        } else if (response.status === 404) {
          console.error('Reservation not found, stopping polling');
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error polling reservation:', error);
      }
    }, 2000); // Poll every 2 seconds
    
    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  const getSortedPharmacies = () => {
    return [...pharmacies].sort((a, b) => {
      if (sortBy === 'distance') {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      }
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });
  };
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getStockStatusBadge = (status: string) => {
    const colors = {
      'IN_STOCK': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'LOW_STOCK': 'bg-amber-100 text-amber-700 border-amber-200',
      'OUT_OF_STOCK': 'bg-rose-100 text-rose-700 border-rose-200',
    };
    const labels = {
      'IN_STOCK': 'In Stock',
      'LOW_STOCK': 'Low Stock',
      'OUT_OF_STOCK': 'Out of Stock',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[status as keyof typeof colors] || colors.OUT_OF_STOCK}`}>
        {labels[status as keyof typeof labels] || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => { setViewStep('home'); setSelectedMedicine(null); loadMedicines(); }} className="flex items-center gap-2 text-blue-600 font-bold text-xl">
              <Pill size={28} />
              <span>MediFind</span>
            </button>

            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => { setViewStep('home'); setSelectedMedicine(null); loadMedicines(); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-blue-600 bg-blue-50"
              >
                <Search size={18} />
                <span>Search Medicines</span>
              </button>
            </nav>

            <div className="flex items-center gap-3">
              {!loading && !user && (
                <>
                  <a href="/login" className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <LogIn size={18} />
                    <span className="hidden sm:inline">Login</span>
                  </a>
                  <a href="/register" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                    <UserPlus size={18} />
                    <span className="hidden sm:inline">Register</span>
                  </a>
                </>
              )}

              {!loading && user && (
                <>
                  {user.role === 'PATIENT' && (
                    <a href="/my-reservations" className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <span className="hidden sm:inline">My Reservations</span>
                    </a>
                  )}
                  
                  {user.role === 'PHARMACY' && (
                    <a href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <span className="hidden sm:inline">Dashboard</span>
                    </a>
                  )}
                  
                  {user.role === 'ADMIN' && (
                    <a href="/analytics" className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <span className="hidden sm:inline">Admin Panel</span>
                    </a>
                  )}

                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                    <User size={18} className="text-slate-600" />
                    <span className="text-sm text-slate-700 hidden sm:inline">{user.name}</span>
                  </div>

                  <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <LogOut size={18} />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {viewStep === 'home' && (
          /* HOME VIEW */
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 py-10">
            <section className="text-center space-y-6 pt-10">
              <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Find your medicine <br />
                <span className="text-blue-600">Instantly.</span>
              </h1>
              <p className="text-lg text-slate-500 max-w-xl mx-auto">
                Search nearby pharmacies, check real-time stock availability, and reserve your medications for express pickup.
              </p>

              <div className="max-w-2xl mx-auto relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                  <Search size={24} />
                </div>
                <input
                  type="text"
                  placeholder="Search medicine name or active ingredient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                  className="w-full pl-14 pr-32 py-5 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg shadow-xl"
                />
                <button 
                  onClick={() => handleSearch(searchTerm)}
                  className="absolute right-3 top-2 bottom-2 px-6 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  Search
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                <MapPin size={16} />
                <span>Showing results near <b>Your Location</b></span>
              </div>
            </section>

            {!loading && !user && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
                <p className="text-blue-900 mb-4">
                  <span className="font-semibold">Welcome to MediFind!</span>
                  <br />
                  Browse medicines as a guest. Login or register to make reservations.
                </p>
                <div className="flex gap-4 justify-center">
                  <a href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Login
                  </a>
                  <a href="/register" className="px-6 py-2 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                    Register
                  </a>
                </div>
              </div>
            )}

            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                Quick Categories
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => handleCategorySelect(cat.name)}
                    className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all group text-center"
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</div>
                    <div className="font-semibold text-slate-700">{cat.name}</div>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-600" />
                  Most Requested
                </h2>
                <button 
                  onClick={() => handleSearch('')} 
                  className="text-blue-600 text-sm font-semibold hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {medicines.slice(0, 4).map((med) => (
                  <button
                    key={med.id}
                    onClick={() => handleMedicineClick(med)}
                    className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-blue-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                        {med.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-slate-900">{med.name}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide">{med.activeIngredient} • {med.dosage}</div>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {viewStep === 'results' && (
          /* RESULTS VIEW */
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 py-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewStep('home')} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <ArrowLeft />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{selectedMedicine ? selectedMedicine.name : 'All Medicines'}</h1>
                <p className="text-slate-500 text-sm">{selectedMedicine ? `Nearby availability for ${selectedMedicine.dosage}` : 'Browse all available medicines'}</p>
              </div>
            </div>

            {selectedMedicine && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between overflow-x-auto gap-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-600 hidden sm:inline">Sort by:</span>
                  <div className="flex gap-2">
                    {['distance', 'rating', 'availability'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setSortBy(type as any)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all whitespace-nowrap ${
                          sortBy === type ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedMedicine.prescriptionRequired && (
                  <div className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-100 flex items-center gap-2 whitespace-nowrap">
                    <AlertCircle size={14} />
                    Prescription Required
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              {/* No medicines found message */}
              {!selectedMedicine && medicines.length === 0 && (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No Medicines Found</h3>
                  <p className="text-slate-500 mb-6">
                    We couldn't find any medicines matching your search. Try different keywords or browse by category.
                  </p>
                  <button
                    onClick={() => setViewStep('home')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              )}

              {/* All medicines list */}
              {!selectedMedicine && medicines.map((med) => (
                <button
                  key={med.id}
                  onClick={() => handleMedicineClick(med)}
                  className="w-full bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                      {med.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900">{med.name}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wide">{med.activeIngredient} • {med.dosage}</div>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))}

              {/* No pharmacies available message */}
              {selectedMedicine && pharmacies.length === 0 && (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin size={32} className="text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No Pharmacies Available</h3>
                  <p className="text-slate-500 mb-6">
                    Unfortunately, no pharmacies near you currently have <span className="font-semibold">{selectedMedicine.name}</span> in stock.
                    <br />
                    Try checking back later or search for alternative medicines.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setViewStep('home')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                      Search Other Medicines
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMedicine(null);
                        loadMedicines();
                      }}
                      className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                    >
                      View All Medicines
                    </button>
                  </div>
                </div>
              )}

              {/* Pharmacies list */}
              {selectedMedicine && getSortedPharmacies().map((pharmacy) => (
                <div key={pharmacy.pharmacyId} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-slate-900">{pharmacy.pharmacyName}</h3>
                        {getStockStatusBadge(pharmacy.stockStatus)}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                          <span className="font-bold text-slate-900">{pharmacy.rating.toFixed(1)}</span>
                        </div>
                        {pharmacy.distance !== null && (
                          <div className="flex items-center gap-1">
                            <MapPin size={14} />
                            <span>{pharmacy.distance.toFixed(1)} km away</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>{pharmacy.workingHours}</span>
                        </div>
                      </div>
                      
                      <p className="text-slate-400 text-sm italic">{pharmacy.address}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setCallingPharmacy(pharmacy)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-100 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Phone size={18} />
                        Call
                      </button>
                      <button 
                        onClick={() => handleReserve(pharmacy)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                      >
                        <CalendarCheck size={18} />
                        Reserve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewStep === 'confirm' && selectedMedicine && selectedPharmacy && (
          /* CONFIRMATION VIEW */
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 py-8">
            <button 
              onClick={() => setViewStep('results')} 
              className="flex items-center gap-2 text-slate-500 font-semibold hover:text-blue-600 transition-colors mb-4"
            >
              <ChevronLeft size={20} />
              Back to Results
            </button>

            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              {/* Header */}
              <div className="bg-blue-600 text-white p-6 text-center">
                <h2 className="text-2xl font-bold">Confirm Reservation</h2>
                <p className="text-sm opacity-90 mt-1">Review details before confirming</p>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {/* Medicine Details */}
                <div className="border-b border-slate-100 pb-6">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Medicine</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{selectedMedicine.name}</h3>
                  <p className="text-slate-600">{selectedMedicine.activeIngredient} • {selectedMedicine.dosage}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-sm text-slate-600">Quantity: <span className="font-bold">1 unit</span></span>
                    <span className="text-sm text-slate-600">Price: <span className="font-bold">{selectedMedicine.priceRange}</span></span>
                    <span className="text-sm text-slate-600">Category: <span className="font-bold">{selectedMedicine.category}</span></span>
                  </div>
                  {selectedMedicine.prescriptionRequired && (
                    <div className="mt-3 inline-flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
                      <AlertCircle size={14} />
                      Prescription Required
                    </div>
                  )}
                </div>

                {/* Pharmacy Details */}
                <div className="border-b border-slate-100 pb-6">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pharmacy</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{selectedPharmacy.pharmacyName}</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {selectedPharmacy.address}
                    </p>
                    <p className="text-sm text-slate-700 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {selectedPharmacy.phone}
                    </p>
                    <p className="text-sm text-slate-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {selectedPharmacy.workingHours}
                    </p>
                    <p className="text-sm text-slate-700 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      {selectedPharmacy.rating.toFixed(1)} rating
                    </p>
                  </div>
                  <div className="mt-3">
                    {getStockStatusBadge(selectedPharmacy.stockStatus)}
                  </div>
                </div>

                {/* Important Info */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">What happens next?</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Pharmacy has <span className="font-bold">5 minutes</span> to respond</li>
                        <li>• You'll receive a notification when they accept</li>
                        <li>• Pick up within <span className="font-bold">30 minutes</span> after acceptance</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-4">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPharmacy.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    <MapPin size={20} />
                    Get Directions
                  </a>
                  <div className="flex gap-3">
                    <a
                      href={`tel:${selectedPharmacy.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-colors"
                    >
                      <Phone size={20} />
                      Call Pharmacy
                    </a>
                    <button
                      onClick={handleConfirmReservation}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                    >
                      <CalendarCheck size={20} />
                      Confirm Reservation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewStep === 'reservation' && selectedMedicine && selectedPharmacy && (
          /* RESERVATION FLOW VIEW */
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 py-8">
            {/* {console.log('Rendering reservation view, status:', reservationStatus, 'pendingTimer:', pendingTimer, 'pickupTimer:', pickupTimer)} */}
            <button 
              onClick={() => { setViewStep('home'); setReservationId(null); }} 
              className="flex items-center gap-2 text-slate-500 font-semibold hover:text-blue-600 transition-colors mb-4"
            >
              <ChevronLeft size={20} />
              Back to Search
            </button>

            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              {/* Status Header */}
              <div className={`p-8 text-center transition-colors duration-500 ${
                reservationStatus === 'PENDING' ? 'bg-blue-600 text-white' :
                reservationStatus === 'ACCEPTED' ? 'bg-emerald-600 text-white' :
                reservationStatus === 'REJECTED' ? 'bg-rose-600 text-white' :
                'bg-slate-600 text-white'
              }`}>
                {reservationStatus === 'PENDING' && (
                  <div className="space-y-4">
                    <Loader2 size={48} className="animate-spin mx-auto" />
                    <h2 className="text-2xl font-bold">Request Processing</h2>
                    <p className="opacity-90">Pharmacy is checking stock levels...</p>
                    <div className="inline-flex items-center gap-2 bg-white/20 px-6 py-3 rounded-full font-mono text-xl font-bold">
                      <Clock size={20} />
                      {formatTime(pendingTimer)}
                    </div>
                  </div>
                )}

                {reservationStatus === 'ACCEPTED' && (
                  <div className="space-y-4">
                    <CheckCircle2 size={48} className="mx-auto animate-bounce" />
                    <h2 className="text-2xl font-bold">Confirmed for Pickup!</h2>
                    <p className="opacity-90">Please pick up your order within:</p>
                    <div className="inline-flex items-center gap-2 bg-white/20 px-6 py-3 rounded-full font-mono text-2xl font-bold">
                      <Clock size={24} />
                      {formatTime(pickupTimer)}
                    </div>
                  </div>
                )}

                {reservationStatus === 'REJECTED' && (
                  <div className="space-y-4">
                    <XCircle size={48} className="mx-auto" />
                    <h2 className="text-2xl font-bold">Unable to Fulfill</h2>
                    <p className="opacity-90">Stock was recently depleted at this location.</p>
                  </div>
                )}

                {reservationStatus === 'NO_RESPONSE' && (
                  <div className="space-y-4">
                    <AlertCircle size={48} className="mx-auto" />
                    <h2 className="text-2xl font-bold">No Response</h2>
                    <p className="opacity-90">Pharmacy did not respond in time.</p>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                <div className="flex items-start justify-between border-b border-slate-100 pb-6">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Item</div>
                    <div className="text-xl font-bold text-slate-900">{selectedMedicine.name}</div>
                    <div className="text-slate-500">{selectedMedicine.dosage} • 1 Unit</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Store</div>
                    <div className="text-lg font-bold text-slate-900">{selectedPharmacy.pharmacyName}</div>
                    <div className="text-slate-500 text-sm">{selectedPharmacy.phone}</div>
                  </div>
                </div>

                {reservationStatus === 'ACCEPTED' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl flex gap-4">
                      <MapPin className="text-blue-600 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">Pharmacy Location</div>
                        <div className="text-sm text-slate-600">{selectedPharmacy.address}</div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPharmacy.address)}`, '_blank')}
                        className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                      >
                        Directions
                      </button>
                      <a 
                        href={`tel:${selectedPharmacy.phone}`}
                        className="flex-1 py-4 border-2 border-slate-200 text-center text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                      >
                        Call Store
                      </a>
                    </div>
                  </div>
                )}

                {(reservationStatus === 'REJECTED' || reservationStatus === 'NO_RESPONSE') && (
                  <div className="space-y-4">
                    <p className="text-slate-600 text-center">Try searching for other nearby pharmacies.</p>
                    <button 
                      onClick={() => { setViewStep('home'); setReservationId(null); }}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100"
                    >
                      Try New Search
                    </button>
                  </div>
                )}

                {/* Cancel Button - Show for PENDING and ACCEPTED */}
                {(reservationStatus === 'PENDING' || reservationStatus === 'ACCEPTED') && (
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      onClick={handleCancelReservation}
                      disabled={cancelling}
                      className="w-full py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel Reservation'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Call Modal */}
      {callingPharmacy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center animate-pulse">
                <PhoneCall size={36} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Call Pharmacy</h2>
                <p className="text-slate-500 mt-1">Contacting {callingPharmacy.pharmacyName}</p>
              </div>
              <div className="bg-slate-50 w-full p-4 rounded-2xl text-2xl font-mono font-bold tracking-widest text-blue-700">
                {callingPharmacy.phone}
              </div>
              <div className="grid grid-cols-2 gap-4 w-full pt-4">
                <button 
                  onClick={() => setCallingPharmacy(null)}
                  className="p-4 border-2 border-slate-100 rounded-2xl font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <a 
                  href={`tel:${callingPharmacy.phone}`}
                  className="p-4 bg-blue-600 text-white rounded-2xl font-bold text-center hover:bg-blue-700 shadow-lg shadow-blue-200"
                >
                  Dial Now
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <AlertCircle size={36} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Cancel Reservation?</h2>
                <p className="text-slate-600 mt-2">
                  Are you sure you want to cancel this reservation? The pharmacy will be notified.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full pt-4">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="p-4 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Keep Reservation
                </button>
                <button 
                  onClick={confirmCancelReservation}
                  className="p-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600 text-sm">
          <p>&copy; 2024 MediFind. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
