
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import { UserRole, Medicine, Pharmacy, ReservationStatus } from './types';
import HomeView from './views/User/HomeView';
import ResultsView from './views/User/ResultsView';
import ReservationFlowView from './views/User/ReservationFlowView';
import HistoryView from './views/User/HistoryView';
import ProfileView from './views/User/ProfileView';
import DashboardView from './views/Pharmacy/DashboardView';
import InventoryView from './views/Pharmacy/InventoryView';
import ReportsView from './views/Pharmacy/ReportsView';
import PharmacyProfileView from './views/Pharmacy/PharmacyProfileView';
import AnalyticsView from './views/Admin/AnalyticsView';
import PharmacyMgmtView from './views/Admin/PharmacyMgmtView';
import MedicineDbView from './views/Admin/MedicineDbView';
import { store } from './services/mockStore';

const App: React.FC = () => {
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.PATIENT);
  const [activeTab, setActiveTab] = useState<string>('search');
  
  // Navigation states for User view
  const [userStep, setUserStep] = useState<'home' | 'results' | 'reservation'>('home');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const handleSearch = (term: string) => {
    setCategoryFilter(null); // Clear category if text search used
    const meds = store.getMedicines();
    // If empty term, just show first med as placeholder for "all results" view
    const med = meds.find(m => m.name.toLowerCase().includes(term.toLowerCase())) || meds[0];
    setSelectedMedicine(med);
    setUserStep('results');
    setActiveTab('search');
  };

  const handleCategorySelect = (category: string) => {
    setCategoryFilter(category);
    const meds = store.getMedicines();
    const med = meds.find(m => m.category === category) || meds[0];
    setSelectedMedicine(med);
    setUserStep('results');
    setActiveTab('search');
  };

  const handleReserve = (pharmacy: Pharmacy) => {
    if (!selectedMedicine) return;
    const res = store.createReservation({
      userId: 'user-1',
      userName: 'John Doe',
      pharmacyId: pharmacy.id,
      pharmacyName: pharmacy.name,
      medicineId: selectedMedicine.id,
      medicineName: selectedMedicine.name,
      quantity: 1,
    });
    
    setTimeout(() => {
      store.updateReservationStatus(res.id, ReservationStatus.ACCEPTED, selectedMedicine.prescriptionRequired ? "Bring prescription" : "");
    }, 5000);

    setActiveReservationId(res.id);
    setSelectedPharmacy(pharmacy);
    setUserStep('reservation');
  };

  const renderUserView = () => {
    if (activeTab === 'history') {
      return <HistoryView onViewReservation={(res) => {
        const med = store.getMedicines().find(m => m.id === res.medicineId)!;
        const pharm = store.getPharmacies().find(p => p.id === res.pharmacyId)!;
        setSelectedMedicine(med);
        setSelectedPharmacy(pharm);
        setActiveReservationId(res.id);
        setUserStep('reservation');
        setActiveTab('search');
      }} />;
    }
    if (activeTab === 'profile') return <ProfileView />;

    switch (userStep) {
      case 'home':
        return (
          <HomeView 
            onSearch={handleSearch} 
            onCategorySelect={handleCategorySelect}
            onSelectMedicine={(med) => { setSelectedMedicine(med); setUserStep('results'); }} 
          />
        );
      case 'results':
        return selectedMedicine ? (
          <ResultsView 
            medicine={selectedMedicine} 
            onBack={() => setUserStep('home')} 
            onReserve={handleReserve}
          />
        ) : null;
      case 'reservation':
        return selectedMedicine && selectedPharmacy ? (
          <ReservationFlowView 
            medicine={selectedMedicine} 
            pharmacy={selectedPharmacy} 
            reservationId={activeReservationId}
            onFinish={() => { setUserStep('home'); setActiveReservationId(null); }}
          />
        ) : null;
      default: return <HomeView onSearch={handleSearch} onCategorySelect={handleCategorySelect} onSelectMedicine={setSelectedMedicine} />;
    }
  };

  const renderPharmacyView = () => {
    switch (activeTab) {
      case 'pharmacy-dashboard': return <DashboardView />;
      case 'inventory': return <InventoryView />;
      case 'reports': return <ReportsView />;
      case 'pharmacy-profile': return <PharmacyProfileView />;
      default: return <DashboardView />;
    }
  };

  const renderAdminView = () => {
    switch (activeTab) {
      case 'admin-dashboard': return <AnalyticsView />;
      case 'pharmacy-mgmt': return <PharmacyMgmtView />;
      case 'medicine-db': return <MedicineDbView />;
      default: return <AnalyticsView />;
    }
  };

  const renderContent = () => {
    if (activeRole === UserRole.PATIENT) return renderUserView();
    if (activeRole === UserRole.PHARMACY) return renderPharmacyView();
    if (activeRole === UserRole.ADMIN) return renderAdminView();
    return null;
  };

  return (
    <Layout 
      activeRole={activeRole} 
      setActiveRole={setActiveRole} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
