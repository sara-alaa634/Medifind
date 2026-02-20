
import React, { useState } from 'react';
import { MOCK_PHARMACIES } from '../../constants';
import { CheckCircle, XCircle, MoreVertical, Building, X, Save } from 'lucide-react';

const PharmacyMgmtView: React.FC = () => {
  const [pharmacies] = useState(MOCK_PHARMACIES);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pharmacies</h1>
          <p className="text-slate-500">Manage registered partners and new applications.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100"
        >
          Register New Pharmacy
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pharmacies.map(pharm => (
          <div key={pharm.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group">
            <button className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-600 transition-colors">
                <MoreVertical size={18} />
            </button>
            <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center">
                    <Building size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">{pharm.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Active Partner
                    </div>
                </div>
            </div>
            <div className="space-y-2 text-sm text-slate-500 mb-6">
                <p>{pharm.address}</p>
                <p className="font-mono">{pharm.phone}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button className="py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1">
                    <XCircle size={14} /> Deactivate
                </button>
                <button className="py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle size={14} /> Profile
                </button>
            </div>
          </div>
        ))}
      </div>

      {/* Register Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Register Pharmacy</h2>
                    <button onClick={() => setIsModalOpen(false)}><X /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Pharmacy Name</label>
                        <input type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200" placeholder="e.g. Wellness Point" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Phone Number</label>
                        <input type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200" placeholder="+1 555..." />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Physical Address</label>
                        <input type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200" placeholder="Full street address" />
                    </div>
                </div>
                <div className="pt-4 flex gap-4">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Discard</button>
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                        <Save size={18} /> Approve & Register
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyMgmtView;
