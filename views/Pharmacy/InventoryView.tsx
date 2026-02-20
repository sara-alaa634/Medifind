
import React, { useState, useEffect } from 'react';
import { store } from '../../services/mockStore';
import { InventoryItem, StockStatus, Medicine } from '../../types';
import { Search, Plus, FileText, MoreVertical, Edit2, Trash2, X } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

const InventoryView: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pharmacyId = 'p1';

  useEffect(() => {
    setInventory(store.getInventory(pharmacyId));
    setMedicines(store.getMedicines());
  }, []);

  const getMedName = (id: string) => medicines.find(m => m.id === id)?.name || 'Unknown';

  const updateStatus = (id: string, status: StockStatus) => {
    store.updateInventory(id, { status });
    setInventory([...store.getInventory(pharmacyId)]);
  };

  const filtered = inventory.filter(item => 
    getMedName(item.medicineId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-slate-500">Update stock levels and medicine availability.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.alert('Excel Upload Triggered')}
            className="flex items-center gap-2 px-4 py-2 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
          >
            <FileText size={18} />
            Import Excel
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100"
          >
            <Plus size={18} />
            Add to Inventory
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
        <Search className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Search your stock..." 
          className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Medicine Name</th>
              <th className="px-6 py-4">Quantity</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{getMedName(item.medicineId)}</div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-sm">{item.quantity}</span>
                        <button className="text-blue-500 hover:text-blue-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14}/></button>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <select 
                        value={item.status}
                        onChange={(e) => updateStatus(item.id, e.target.value as StockStatus)}
                        className="text-xs font-bold border-none bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-100 p-1 cursor-pointer"
                    >
                        <option value={StockStatus.IN_STOCK}>In Stock</option>
                        <option value={StockStatus.LOW_STOCK}>Low Stock</option>
                        <option value={StockStatus.OUT_OF_STOCK}>Out of Stock</option>
                    </select>
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16}/></button>
                        <button className="p-2 text-slate-400 hover:text-slate-600"><MoreVertical size={16}/></button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Medicine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Add to Inventory</h2>
                    <button onClick={() => setIsModalOpen(false)}><X /></button>
                </div>
                <p className="text-slate-500">Select a medicine from the global database to add to your local stock.</p>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {medicines.map(med => (
                        <button 
                            key={med.id}
                            className="w-full text-left p-4 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-2xl flex justify-between items-center transition-all group"
                        >
                            <div>
                                <div className="font-bold text-slate-900 group-hover:text-blue-700">{med.name}</div>
                                <div className="text-xs text-slate-500">{med.activeIngredient}</div>
                            </div>
                            <Plus size={18} className="text-slate-300 group-hover:text-blue-600" />
                        </button>
                    ))}
                </div>
                <div className="pt-4 flex gap-4">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100">Add Selected</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default InventoryView;
