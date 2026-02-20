
import React, { useState } from 'react';
import { MOCK_MEDICINES } from '../../constants';
import { Pill, Search, Plus, Edit3, X, Save } from 'lucide-react';

const MedicineDbView: React.FC = () => {
  const [medicines] = useState(MOCK_MEDICINES);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Medicine Master List</h1>
          <p className="text-slate-500">Add or edit medications in the platform database.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all hover:scale-105"
        >
          <Plus size={20} />
          Add Medicine
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
        <Search className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Filter database..." 
          className="flex-1 bg-transparent border-none focus:ring-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase">
            <tr>
              <th className="px-6 py-4">Medicine</th>
              <th className="px-6 py-4">Active Ingredient</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(med => (
              <tr key={med.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center font-bold">
                            {med.name.charAt(0)}
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">{med.name}</div>
                            <div className="text-xs text-slate-400">{med.dosage}</div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{med.activeIngredient}</td>
                <td className="px-6 py-4">
                    {med.prescriptionRequired ? (
                        <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-xs font-bold border border-rose-100">Rx Required</span>
                    ) : (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-bold border border-emerald-100">OTC</span>
                    )}
                </td>
                <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit3 size={18} />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Medicine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl space-y-6 transform animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">New Medicine Entry</h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Medicine Name</label>
                        <input type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200" placeholder="e.g. Panadol" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Dosage</label>
                        <input type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200" placeholder="e.g. 500mg" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Active Ingredient</label>
                        <input type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200" placeholder="e.g. Paracetamol" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
                        <select className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <option>Painkillers</option>
                            <option>Antibiotics</option>
                            <option>Vitamins</option>
                            <option>Chronic</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl md:col-span-2">
                        <input type="checkbox" id="rx" className="w-5 h-5 text-blue-600 rounded" />
                        <label htmlFor="rx" className="text-sm font-bold text-slate-700">This medicine requires a prescription (Rx)</label>
                    </div>
                </div>
                <div className="pt-4 flex gap-4">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">Cancel</button>
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                        <Save size={18} /> Save to Database
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MedicineDbView;
