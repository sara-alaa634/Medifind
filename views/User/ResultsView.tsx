
import React, { useState } from 'react';
import { ArrowLeft, Filter, Phone, CalendarCheck, Star, MapPin, X, PhoneCall } from 'lucide-react';
import { Medicine, Pharmacy, StockStatus } from '../../types';
import { MOCK_PHARMACIES } from '../../constants';
import StatusBadge from '../../components/StatusBadge';

interface ResultsViewProps {
  medicine: Medicine;
  onBack: () => void;
  onReserve: (pharmacy: Pharmacy) => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ medicine, onBack, onReserve }) => {
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'availability'>('distance');
  const [callingPharmacy, setCallingPharmacy] = useState<Pharmacy | null>(null);

  const pharmacies = [...MOCK_PHARMACIES].sort((a, b) => {
    if (sortBy === 'distance') return a.distance - b.distance;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ArrowLeft />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{medicine.name}</h1>
          <p className="text-slate-500 text-sm">Nearby availability for {medicine.dosage}</p>
        </div>
      </div>

      {/* Filters */}
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
        {medicine.prescriptionRequired && (
            <div className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-100 flex items-center gap-2 whitespace-nowrap">
                Prescription Required
            </div>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {pharmacies.map((pharmacy) => (
          <div key={pharmacy.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-900">{pharmacy.name}</h3>
                  <StatusBadge status={StockStatus.IN_STOCK} />
                </div>
                
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="font-bold text-slate-900">{pharmacy.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    <span>{pharmacy.distance} km away</span>
                  </div>
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
                  onClick={() => onReserve(pharmacy)}
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

      {/* Call Modal Simulation */}
      {callingPharmacy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center animate-pulse">
                        <PhoneCall size={36} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Call Pharmacy</h2>
                        <p className="text-slate-500 mt-1">Contacting {callingPharmacy.name}</p>
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
    </div>
  );
};

export default ResultsView;
