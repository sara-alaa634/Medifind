
import React, { useEffect, useState } from 'react';
import { Medicine, Pharmacy, ReservationStatus, Reservation } from '../../types';
import { Loader2, CheckCircle2, XCircle, Clock, MapPin, Phone, Info, ChevronLeft } from 'lucide-react';
import { store } from '../../services/mockStore';

interface ReservationFlowViewProps {
  medicine: Medicine;
  pharmacy: Pharmacy;
  reservationId: string | null;
  onFinish: () => void;
}

const ReservationFlowView: React.FC<ReservationFlowViewProps> = ({ medicine, pharmacy, reservationId, onFinish }) => {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [pickupTimer, setPickupTimer] = useState(1800); 

  useEffect(() => {
    const checkStatus = () => {
      if (!reservationId) return;
      const res = store.getReservations().find(r => r.id === reservationId);
      if (res) setReservation({...res});
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, [reservationId]);

  useEffect(() => {
    let interval: any;
    if (reservation?.status === ReservationStatus.ACCEPTED && pickupTimer > 0) {
      interval = setInterval(() => setPickupTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [reservation?.status, pickupTimer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!reservation) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin mb-4" />
        Loading your request...
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={onFinish} className="flex items-center gap-2 text-slate-500 font-semibold hover:text-blue-600 transition-colors mb-4">
        <ChevronLeft size={20} />
        Back to Search
      </button>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Status Header */}
        <div className={`p-8 text-center transition-colors duration-500 ${
            reservation.status === ReservationStatus.PENDING ? 'bg-blue-600 text-white' :
            reservation.status === ReservationStatus.ACCEPTED ? 'bg-emerald-600 text-white' :
            reservation.status === ReservationStatus.REJECTED ? 'bg-rose-600 text-white' :
            'bg-slate-600 text-white'
        }`}>
            {reservation.status === ReservationStatus.PENDING && (
                <div className="space-y-4">
                    <Loader2 size={48} className="animate-spin mx-auto" />
                    <h2 className="text-2xl font-bold">Request Processing</h2>
                    <p className="opacity-90">Pharmacy is checking stock levels...</p>
                </div>
            )}

            {reservation.status === ReservationStatus.ACCEPTED && (
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

            {reservation.status === ReservationStatus.REJECTED && (
                <div className="space-y-4">
                    <XCircle size={48} className="mx-auto" />
                    <h2 className="text-2xl font-bold">Unable to Fulfill</h2>
                    <p className="opacity-90">Stock was recently depleted at this location.</p>
                </div>
            )}
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-6">
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Item</div>
                    <div className="text-xl font-bold text-slate-900">{medicine.name}</div>
                    <div className="text-slate-500">{medicine.dosage} • 1 Unit</div>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Store</div>
                    <div className="text-lg font-bold text-slate-900">{pharmacy.name}</div>
                    <div className="text-slate-500 text-sm">{pharmacy.phone}</div>
                </div>
            </div>

            {reservation.status === ReservationStatus.ACCEPTED && (
                <div className="space-y-4 animate-in slide-in-from-bottom duration-500">
                    <div className="bg-slate-50 p-4 rounded-2xl flex gap-4">
                        <MapPin className="text-blue-600 flex-shrink-0" />
                        <div>
                            <div className="font-bold text-slate-900">Pharmacy Location</div>
                            <div className="text-sm text-slate-600">{pharmacy.address}</div>
                        </div>
                    </div>

                    {reservation.note && (
                         <div className="bg-amber-50 p-4 rounded-2xl flex gap-4 border border-amber-100">
                            <Info className="text-amber-600 flex-shrink-0" />
                            <div>
                                <div className="font-bold text-amber-900 text-sm">Pharmacist's Note</div>
                                <div className="text-sm text-amber-700 italic">"{reservation.note}"</div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <button 
                            onClick={() => window.alert('Opening directions...')}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                        >
                            Directions
                        </button>
                        <a 
                            href={`tel:${pharmacy.phone}`}
                            className="flex-1 py-4 border-2 border-slate-200 text-center text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                        >
                            Call Store
                        </a>
                    </div>
                </div>
            )}

            {reservation.status === ReservationStatus.REJECTED && (
                <div className="space-y-4">
                    <p className="text-slate-600 text-center">Try searching for other nearby pharmacies.</p>
                    <button 
                        onClick={onFinish}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100"
                    >
                        Try New Search
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ReservationFlowView;
