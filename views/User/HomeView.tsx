
import React from 'react';
import { Search, MapPin, ChevronRight, TrendingUp } from 'lucide-react';
import { CATEGORIES, MOCK_MEDICINES } from '../../constants';
import { Medicine } from '../../types';

interface HomeViewProps {
  onSearch: (term: string) => void;
  onCategorySelect: (category: string) => void;
  onSelectMedicine: (medicine: Medicine) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onSearch, onCategorySelect, onSelectMedicine }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Hero Section */}
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
            onKeyDown={(e) => e.key === 'Enter' && onSearch(searchTerm)}
            className="w-full pl-14 pr-32 py-5 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg shadow-xl"
          />
          <button 
            onClick={() => onSearch(searchTerm)}
            className="absolute right-3 top-2 bottom-2 px-6 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Search
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
          <MapPin size={16} />
          <span>Showing results near <b>New York, NY</b></span>
          <button className="text-blue-600 font-semibold hover:underline">Change</button>
        </div>
      </section>

      {/* Categories */}
      <section>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          Quick Categories
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => onCategorySelect(cat.name)}
              className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all group text-center"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</div>
              <div className="font-semibold text-slate-700">{cat.name}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Popular Medicines */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            Most Requested
          </h2>
          <button 
            onClick={() => onSearch('')} 
            className="text-blue-600 text-sm font-semibold hover:underline"
          >
            View all
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_MEDICINES.slice(0, 4).map((med) => (
            <button
              key={med.id}
              onClick={() => onSelectMedicine(med)}
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
  );
};

export default HomeView;
