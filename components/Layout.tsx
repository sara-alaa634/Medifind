
import React from 'react';
import { UserRole } from '../types';
import { Search, ClipboardList, User, LayoutDashboard, Database, Pill, Bell, Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeRole, setActiveRole, activeTab, setActiveTab }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = {
    [UserRole.PATIENT]: [
      { id: 'search', label: 'Search', icon: Search },
      { id: 'history', label: 'Reservations', icon: ClipboardList },
      { id: 'profile', label: 'Profile', icon: User },
    ],
    [UserRole.PHARMACY]: [
      { id: 'pharmacy-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'inventory', label: 'Inventory', icon: Database },
      { id: 'reports', label: 'Reports', icon: ClipboardList },
      { id: 'pharmacy-profile', label: 'Profile', icon: User },
    ],
    [UserRole.ADMIN]: [
      { id: 'admin-dashboard', label: 'Analytics', icon: LayoutDashboard },
      { id: 'pharmacy-mgmt', label: 'Pharmacies', icon: LayoutDashboard },
      { id: 'medicine-db', label: 'Medicines', icon: Pill },
    ],
  };

  const currentNav = navItems[activeRole];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-2xl">
            <Pill size={32} />
            <span>MediFind</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {currentNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Switch View (Demo)</label>
          <div className="grid grid-cols-1 gap-1">
            {Object.values(UserRole).map((role) => (
              <button
                key={role}
                onClick={() => {
                  setActiveRole(role);
                  setActiveTab(navItems[role][0].id);
                }}
                className={`text-xs px-3 py-2 rounded text-left ${
                  activeRole === role ? 'bg-slate-200 font-bold' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {role.charAt(0) + role.slice(1).toLowerCase()} Portal
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
          <Pill size={24} />
          <span>MediFind</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-slate-600"><Bell size={24} /></button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-20 p-6">
          <nav className="space-y-4">
            {currentNav.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl ${
                  activeTab === item.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'
                }`}
              >
                <item.icon size={24} />
                <span className="text-lg font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        <div className="md:hidden p-4 bg-white border-b border-slate-100 mb-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
             {/* Mobile Role Switcher */}
             <div className="flex gap-2">
                {Object.values(UserRole).map((role) => (
                    <button
                        key={role}
                        onClick={() => {
                        setActiveRole(role);
                        setActiveTab(navItems[role][0].id);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border ${
                        activeRole === role ? 'bg-blue-600 border-blue-600 text-white font-bold' : 'border-slate-200 text-slate-600'
                        }`}
                    >
                        {role}
                    </button>
                ))}
             </div>
        </div>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
