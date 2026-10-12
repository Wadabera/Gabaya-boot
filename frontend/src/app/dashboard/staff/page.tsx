'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  UserPlus,
  ShieldAlert,
  CheckCircle,
  Phone,
  Send,
  Lock,
} from 'lucide-react';

export default function StaffAccountsPage() {
  const { language, t } = useAuth();
  const [phone, setPhone] = useState('');
  const [staffList, setStaffList] = useState<any[]>([
    {
      id: 'staff-1',
      name: 'Tsegaye Alemu',
      phone: '+251922334455',
      role: 'Staff Member',
      status: 'Active',
      permissions: 'Can handle orders and questions; Cannot change the plan or delete the shop.',
    },
  ]);
  const [invited, setInvited] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setStaffList([
      ...staffList,
      {
        id: `staff-${Date.now()}`,
        name: 'New Staff Member',
        phone,
        role: 'Staff Member',
        status: 'Active',
        permissions: 'Can handle orders and questions; Cannot change the plan or delete the shop.',
      },
    ]);
    setPhone('');
    setInvited(true);
    setTimeout(() => setInvited(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase mb-1">
          Phase 2 · Pro Plan Feature (Screen D02)
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          {language === 'am' ? 'የሰራተኞች መለያዎች (Staff Accounts - D02)' : 'Staff Accounts (Screen D02)'}
        </h2>
        <p className="text-xs text-slate-500">
          {language === 'am'
            ? 'ሰራተኞችዎን በስልክ ቁጥር ይጋብዙ፤ ትዕዛዞችን እንዲያስተናግዱ ውሱን ፈቃድ ይስጧቸው'
            : 'Invite team members to handle incoming orders and customer questions with safe permission boundaries (FR-03)'}
        </p>
      </div>

      {invited && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Staff invitation sent successfully!</span>
        </div>
      )}

      {/* Invite Staff Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-brand-600" />
          <span>{language === 'am' ? 'በስልክ ቁጥር ሰራተኛ ይጋብዙ' : 'Invite by Phone Number'}</span>
        </h3>

        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2519..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Invite</span>
          </button>
        </form>

        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
          <Lock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Access Rules:</strong> Only the shop owner can change the plan, delete the shop, or view platform billing records.
          </span>
        </div>
      </div>

      {/* Existing Staff Members List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-600" />
          <span>Active Staff Members ({staffList.length})</span>
        </h3>

        <div className="divide-y divide-slate-100">
          {staffList.map((member) => (
            <div key={member.id} className="py-3.5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">{member.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {member.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{member.phone}</div>
                <p className="text-[11px] text-slate-400 mt-1">{member.permissions}</p>
              </div>

              <span className="text-[11px] font-semibold text-slate-400">{member.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
