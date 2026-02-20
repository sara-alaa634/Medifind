
import React, { useState, useEffect } from 'react';
import { store } from '../../services/mockStore';
import { Reservation, ReservationStatus } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import { Calendar, Package, ArrowRight, Loader2 } from 'lucide-react';

interface HistoryViewProps {
  onViewReservation: (res: Reservation) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onViewReservation }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    const update = () => setReservations(store.getReservations());
    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, []);

  const ongoing = reservations.filter(r => [ReservationStatus.PENDING, ReservationStatus.ACCEPTED].includes(r.status));
  const past = reservations.filter(r => ![ReservationStatus.PENDING, ReservationStatus.ACCEPTED].includes(r.status));

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reservations</h1>
        <p className="text-slate-500">Track and manage your medicine requests.</p>
      </div>

      {ongoing.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Loader2 size={20} className="text-blue-600 animate-spin" />
            Ongoing Requests
          </h2>
          <div className="grid gap-4">
            {ongoing.map(res => (
              <button 
                key={res.id}
                onClick={() => onViewReservation(res)}
                className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${res.status === ReservationStatus.PENDING ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        <Package size={24} />
                    </div>
                    <div>
                        <div className="font-bold text-slate-900">{res.medicineName}</div>
                        <div className="text-sm text-slate-500">{res.pharmacyName}</div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <StatusBadge status={res.status} />
                    <ArrowRight className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar size={20} className="text-slate-400" />
          History
        </h2>
        {past.length === 0 ? (
          <div className="bg-slate-50 p-12 rounded-3xl text-center text-slate-400 border-2 border-dashed">
            No past reservations found.
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
             {past.map((res, i) => (
               <div key={res.id} className={`p-5 flex items-center justify-between ${i !== past.length - 1 ? 'border-b border-slate-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="text-xs font-mono text-slate-400">
                        {new Date(res.requestTime).toLocaleDateString()}
                    </div>
                    <div>
                        <div className="font-bold text-slate-700">{res.medicineName}</div>
                        <div className="text-xs text-slate-400">{res.pharmacyName}</div>
                    </div>
                  </div>
                  <StatusBadge status={res.status} />
               </div>
             ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HistoryView;
