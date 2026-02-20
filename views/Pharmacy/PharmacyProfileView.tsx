
import React from 'react';
import { Building2, MapPin, Phone, Clock, Mail, ShieldCheck } from 'lucide-react';

const PharmacyProfileView: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
            <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm">
                <ShieldCheck size={18} />
                Verified Partner
            </div>
        </div>
        
        <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center">
                <Building2 size={40} />
            </div>
            <div>
                <h1 className="text-3xl font-black text-slate-900">HealthFirst Pharmacy</h1>
                <p className="text-slate-500">Main Downtown Branch</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                    <MapPin className="text-blue-500" size={20} />
                    <span>123 Main St, New York, NY</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                    <Phone className="text-blue-500" size={20} />
                    <span>+1 555 1010</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                    <Mail className="text-blue-500" size={20} />
                    <span>contact@healthfirst.com</span>
                </div>
            </div>
            <div className="space-y-4 bg-slate-50 p-6 rounded-3xl">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                    <Clock size={18} className="text-blue-500" />
                    Operating Hours
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Mon - Fri</span>
                    <span className="font-bold">24 Hours</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Sat - Sun</span>
                    <span className="font-bold">08:00 - 22:00</span>
                </div>
            </div>
        </div>

        <button className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">
            Update Profile Information
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <h3 className="text-xl font-bold">Staff Management</h3>
        <div className="space-y-4">
            {['Admin User', 'Shift Manager', 'Assistant'].map((role, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-blue-600 shadow-sm">U{i}</div>
                        <div>
                            <div className="font-bold text-slate-800">Staff Member {i+1}</div>
                            <div className="text-xs text-slate-400">{role}</div>
                        </div>
                    </div>
                    <button className="text-slate-400 hover:text-blue-600 font-bold text-sm">Permissions</button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default PharmacyProfileView;
