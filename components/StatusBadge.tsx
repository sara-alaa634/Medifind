
import React from 'react';
import { ReservationStatus, StockStatus } from '../types';

interface BadgeProps {
  status: ReservationStatus | StockStatus;
}

const StatusBadge: React.FC<BadgeProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case ReservationStatus.ACCEPTED:
      case StockStatus.IN_STOCK:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case ReservationStatus.PENDING:
      case StockStatus.LOW_STOCK:
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case ReservationStatus.REJECTED:
      case ReservationStatus.CANCELLED:
      case StockStatus.OUT_OF_STOCK:
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case ReservationStatus.NO_RESPONSE:
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStyles()}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default StatusBadge;
