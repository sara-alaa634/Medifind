
import React from 'react';
import { User, Settings, Bell, Shield, CreditCard, LogOut, ChevronRight, Phone } from 'lucide-react';

const ProfileView: React.FC = () => {
  const menuItems = [
    { icon: Bell, label: 'Notifications', color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Shield, label: 'Privacy & Security', color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: CreditCard, label: 'Payment Methods', color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: Settings, label: 'Settings', color: 'text-slate-500', bg: 'bg-slate-50' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center">
        <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-white text-3xl font-bold border-4 border-blue-50">
          JD
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">John Doe</h2>
        <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mt-1">
          <Phone size={14} />
          <span>+1 (555) 000-0000</span>
        </div>
        <button className="mt-4 px-6 py-2 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
          Edit Profile
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {menuItems.map((item, i) => (
          <button 
            key={i}
            className={`w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors ${i !== menuItems.length - 1 ? 'border-b border-slate-50' : ''}`}
          >
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${item.bg} ${item.color}`}>
                    <item.icon size={20} />
                </div>
                <span className="font-bold text-slate-700">{item.label}</span>
            </div>
            <ChevronRight className="text-slate-300" />
          </button>
        ))}
      </div>

      <button className="w-full p-5 flex items-center justify-center gap-3 text-rose-600 font-bold bg-rose-50 rounded-3xl hover:bg-rose-100 transition-colors">
        <LogOut size={20} />
        Logout
      </button>

      <div className="text-center text-slate-400 text-xs">
        MediFind Version 1.2.0 (Prototype)
      </div>
    </div>
  );
};

export default ProfileView;
