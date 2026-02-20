
import React from 'react';
// Added YAxis to named imports
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react';

const ReportsView: React.FC = () => {
  const data = [
    { name: 'Panadol', value: 120 },
    { name: 'Augmentin', value: 80 },
    { name: 'Zyrtec', value: 45 },
    { name: 'Lipitor', value: 30 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Performance Reports</h1>
        <p className="text-slate-500">Track your daily and monthly reservation analytics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: TrendingUp, label: 'Growth', value: '+14%', color: 'text-emerald-500' },
          { icon: Users, label: 'Patients', value: '342', color: 'text-blue-500' },
          { icon: CheckCircle, label: 'Success', value: '92%', color: 'text-emerald-500' },
          { icon: XCircle, label: 'Rejection', value: '4%', color: 'text-rose-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className={`p-2 w-fit rounded-xl bg-slate-50 ${stat.color} mb-3`}>
                <stat.icon size={20} />
            </div>
            <div className="text-2xl font-black text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Most Requested Items</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical">
                        <XAxis type="number" hide />
                        {/* Fixed recharts.YAxis to YAxis */}
                        <YAxis dataKey="name" type="category" width={80} stroke="#94a3b8" fontSize={12} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#94a3b8'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
            <div className="text-center space-y-4">
                <div className="text-5xl font-black text-blue-600">8.2m</div>
                <div className="text-slate-500 font-medium">Average pickup time (minutes)</div>
                <p className="text-sm text-slate-400">You are 12% faster than the district average!</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
