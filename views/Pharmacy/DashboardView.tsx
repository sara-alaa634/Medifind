
import React, { useState, useEffect } from 'react';
import { store } from '../../services/mockStore';
import { Reservation, ReservationStatus } from '../../types';
import { Bell, Check, X, Clock, User, Pill, MessageSquare } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

const DashboardView: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const pharmacyId = 'p1'; // Mocking logged in pharmacy

  useEffect(() => {
    const load = () => {
        const all = store.getReservations();
        setReservations(all.filter(r => r.pharmacyId === pharmacyId));
    };
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = (id: string, status: ReservationStatus) => {
    store.updateReservationStatus(id, status);
    setReservations(store.getReservations().filter(r => r.pharmacyId === pharmacyId));
  };

  const pendingCount = reservations.filter(r => r.status === ReservationStatus.PENDING).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reservation Dashboard</h1>
          <p className="text-slate-500">Manage real-time medicine requests from patients.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-2xl border border-slate-100 shadow-sm">
           <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="font-bold text-slate-700">Accepting Orders</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100">
           <div className="flex items-center justify-between mb-2 opacity-80">
                <span className="font-bold uppercase tracking-wider text-xs">New Requests</span>
                <Bell size={20} />
           </div>
           <div className="text-4xl font-black">{pendingCount}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-2 text-slate-400">
                <span className="font-bold uppercase tracking-wider text-xs">Today's Total</span>
                <Check size={20} />
           </div>
           <div className="text-4xl font-black text-slate-900">{reservations.length}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-2 text-slate-400">
                <span className="font-bold uppercase tracking-wider text-xs">Avg. Response Time</span>
                <Clock size={20} />
           </div>
           <div className="text-4xl font-black text-slate-900">1.8 min</div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
            Incoming Orders
            {pendingCount > 0 && <span className="bg-rose-500 text-white text-xs px-2 py-1 rounded-full animate-bounce">{pendingCount} NEW</span>}
        </h2>
        
        {reservations.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400">
                No active reservations found.
            </div>
        ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {reservations.map(res => (
                    <div key={res.id} className={`bg-white rounded-3xl border shadow-sm transition-all overflow-hidden ${res.status === ReservationStatus.PENDING ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-100'}`}>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{res.userName}</div>
                                        <div className="text-xs text-slate-500 font-mono">ID: {res.id} • {new Date(res.requestTime).toLocaleTimeString()}</div>
                                    </div>
                                </div>
                                <StatusBadge status={res.status} />
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                                <div className="flex items-center gap-3">
                                    <Pill className="text-blue-600" />
                                    <div>
                                        <div className="font-bold text-slate-900">{res.medicineName}</div>
                                        <div className="text-sm text-slate-500">Qty: {res.quantity} Unit</div>
                                    </div>
                                </div>
                            </div>

                            {res.status === ReservationStatus.PENDING ? (
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleAction(res.id, ReservationStatus.REJECTED)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 transition-all border border-rose-100"
                                    >
                                        <X size={18} />
                                        Reject
                                    </button>
                                    <button 
                                        onClick={() => handleAction(res.id, ReservationStatus.ACCEPTED)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                                    >
                                        <Check size={18} />
                                        Accept
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-slate-400 text-sm border-t border-slate-50 pt-4">
                                    <MessageSquare size={16} />
                                    <span>Notes: {res.note || 'None provided'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
