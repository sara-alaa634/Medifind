'use client';

import { useEffect, useState } from 'react';
import { Search, MapPin, Star, Clock, Phone, AlertCircle } from 'lucide-react';

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

interface MedicineWithAvailability extends Medicine {
  availability?: PharmacyAvailability[];
}

/**
 * Medicine Search Page
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10
 * 
 * Features:
 * - Guest access (no authentication required)
 * - Search by name, active ingredient
 * - Filter by category
 * - Display pharmacy availability with distance and stock status
 * - Sort by distance and rating
 * - Show prescription requirement indicator
 */
export default function PublicSearchPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineWithAvailability | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

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

    // Try to get user's location for distance calculation
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

  const loadMedicines = async (search?: string, category?: string) => {
    setSearchLoading(true);
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
        
        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(data.medicines.map((m: Medicine) => m.category))
        ) as string[];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error loading medicines:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = () => {
    loadMedicines(searchQuery, categoryFilter);
  };

  const handleMedicineClick = async (medicine: Medicine) => {
    setDetailsLoading(true);
    setSelectedMedicine({ ...medicine, availability: [] });
    
    try {
      const params = new URLSearchParams();
      if (userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lon', userLocation.lon.toString());
      }

      const response = await fetch(`/api/medicines/${medicine.id}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedMedicine({
          ...data.medicine,
          availability: data.availability || [],
        });
      }
    } catch (error) {
      console.error('Error loading medicine details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getSortedAvailability = (availability: PharmacyAvailability[]) => {
    return [...availability].sort((a, b) => {
      if (sortBy === 'distance') {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      } else {
        return b.rating - a.rating;
      }
    });
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'text-green-600 bg-green-50';
      case 'LOW_STOCK':
        return 'text-yellow-600 bg-yellow-50';
      case 'OUT_OF_STOCK':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'In Stock';
      case 'LOW_STOCK':
        return 'Low Stock';
      case 'OUT_OF_STOCK':
        return 'Out of Stock';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {user ? `Welcome back, ${user.name}!` : 'Search Medicines'}
        </h1>
        <p className="text-gray-600">Find medicines available at nearby pharmacies</p>
      </div>

      {/* Info Message for Guests */}
      {!loading && !user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center mb-8">
          <p className="text-blue-900 mb-4">
            <span className="font-semibold">Welcome to MediFind!</span>
            <br />
            Browse medicines as a guest. Login or register to make reservations.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/login"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Login
            </a>
            <a
              href="/register"
              className="px-6 py-2 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Register
            </a>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by medicine name or active ingredient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            disabled={searchLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Medicine List */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Medicines ({medicines.length})
          </h2>
          <div className="space-y-4">
            {medicines.length === 0 && !searchLoading && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-600">No medicines found. Try a different search.</p>
              </div>
            )}
            {medicines.map((medicine) => (
              <div
                key={medicine.id}
                onClick={() => handleMedicineClick(medicine)}
                className={`bg-white rounded-lg shadow-sm p-6 cursor-pointer transition-all hover:shadow-md ${
                  selectedMedicine?.id === medicine.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{medicine.name}</h3>
                  {medicine.prescriptionRequired && (
                    <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      <AlertCircle className="w-3 h-3" />
                      Rx Required
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Active Ingredient:</span> {medicine.activeIngredient}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Dosage:</span> {medicine.dosage}
                </p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {medicine.category}
                  </span>
                  <span className="text-sm font-medium text-blue-600">
                    {medicine.priceRange}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pharmacy Availability */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Pharmacy Availability
            </h2>
            {selectedMedicine && selectedMedicine.availability && selectedMedicine.availability.length > 0 && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'distance' | 'rating')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="distance">Sort by Distance</option>
                <option value="rating">Sort by Rating</option>
              </select>
            )}
          </div>

          {!selectedMedicine && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-600">Select a medicine to see pharmacy availability</p>
            </div>
          )}

          {selectedMedicine && detailsLoading && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-600">Loading availability...</p>
            </div>
          )}

          {selectedMedicine && !detailsLoading && selectedMedicine.availability && (
            <div className="space-y-4">
              {selectedMedicine.availability.length === 0 && (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <p className="text-gray-600">No pharmacies have this medicine in stock</p>
                </div>
              )}
              {getSortedAvailability(selectedMedicine.availability).map((pharmacy) => (
                <div key={pharmacy.pharmacyId} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{pharmacy.pharmacyName}</h3>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4" />
                        {pharmacy.address}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${getStockStatusColor(pharmacy.stockStatus)}`}>
                      {getStockStatusText(pharmacy.stockStatus)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {pharmacy.distance !== null && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{pharmacy.distance.toFixed(1)} km away</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{pharmacy.rating.toFixed(1)} rating</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{pharmacy.workingHours}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{pharmacy.phone}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {user && user.role === 'PATIENT' ? (
                      <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Reserve Medicine
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!user) {
                            window.location.href = '/login';
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Login to Reserve
                      </button>
                    )}
                    <a
                      href={`tel:${pharmacy.phone}`}
                      className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
