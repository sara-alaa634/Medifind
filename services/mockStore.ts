
import { Reservation, ReservationStatus, InventoryItem, StockStatus, Medicine, Pharmacy } from '../types';
import { MOCK_MEDICINES, MOCK_PHARMACIES } from '../constants';

class MockStore {
  private reservations: Reservation[] = [];
  private inventory: InventoryItem[] = [];
  private medicines: Medicine[] = [...MOCK_MEDICINES];
  private pharmacies: Pharmacy[] = [...MOCK_PHARMACIES];

  constructor() {
    // Initial dummy inventory
    MOCK_PHARMACIES.forEach(p => {
      MOCK_MEDICINES.forEach(m => {
        this.inventory.push({
          id: `inv-${p.id}-${m.id}`,
          pharmacyId: p.id,
          medicineId: m.id,
          quantity: Math.floor(Math.random() * 50),
          status: Math.random() > 0.1 ? StockStatus.IN_STOCK : StockStatus.OUT_OF_STOCK
        });
      });
    });
  }

  getReservations() { return [...this.reservations]; }
  
  createReservation(res: Omit<Reservation, 'id' | 'status' | 'requestTime'>) {
    const newRes: Reservation = {
      ...res,
      id: `res-${Date.now()}`,
      status: ReservationStatus.PENDING,
      requestTime: Date.now()
    };
    this.reservations.unshift(newRes);
    return newRes;
  }

  updateReservationStatus(id: string, status: ReservationStatus, note?: string) {
    const index = this.reservations.findIndex(r => r.id === id);
    if (index !== -1) {
      this.reservations[index] = { 
        ...this.reservations[index], 
        status, 
        note, 
        acceptedTime: status === ReservationStatus.ACCEPTED ? Date.now() : undefined 
      };
    }
  }

  getInventory(pharmacyId: string) {
    return this.inventory.filter(i => i.pharmacyId === pharmacyId);
  }

  updateInventory(id: string, updates: Partial<InventoryItem>) {
    const index = this.inventory.findIndex(i => i.id === id);
    if (index !== -1) {
      this.inventory[index] = { ...this.inventory[index], ...updates };
    }
  }

  getPharmacies() { return this.pharmacies; }
  getMedicines() { return this.medicines; }
}

export const store = new MockStore();
