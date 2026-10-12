'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import {
  AlertTriangle,
  Bot,
  CreditCard,
  BellRing,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

export default function AdminQualityPage() {
  const [counters, setCounters] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderSent, setReminderSent] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [countRes, compRes] = await Promise.all([
        api.get('/admin/counters'),
        api.get('/admin/complaints'),
      ]);
      setCounters(countRes.data);
      setComplaints(compRes.data);
    } catch (err) {
      console.error('Failed to load quality metrics', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = (shopName: string) => {
    setReminderSent(shopName);
    setTimeout(() => setReminderSent(null), 3000);
  };

  return (
    <div className="space-y-6 text-white max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Quality and Payments (Screen A2)</h2>
          <p className="text-xs text-slate-400">
            Monitor failed AI answers per shop, resolve open customer complaints, and send subscription reminders (FR-52, FR-54, FR-63, FR-74)
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {reminderSent && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-700 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Payment reminder sent to {reminderSent}!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Failed AI Answers Section */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>Failed AI Answers Per Shop</span>
            </h3>
            <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              Escalations
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Questions where the Grounded AI was uncertain and safely escalated to the shop owner (`WAITING_OWNER`).
          </p>

          <div className="divide-y divide-slate-800">
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-white">Bole Elegant Leather</span>
                <p className="text-[11px] text-slate-400">1 question escalated this week</p>
              </div>
              <Link
                href="/admin/shops"
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-semibold transition"
              >
                Review
              </Link>
            </div>
          </div>
        </div>

        {/* Unpaid Subscriptions & Reminders (FR-74) */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Unpaid & Ending Subscriptions (FR-74)</span>
            </h3>
            <span className="text-xs font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
              Billing
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Shops whose subscription has expired or is nearing expiration.
          </p>

          <div className="divide-y divide-slate-800">
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-white">Bole Elegant Leather</span>
                <p className="text-[11px] text-amber-400 font-medium">Free Plan · Quota active</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSendReminder('Bole Elegant Leather')}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-600/40 text-xs rounded-lg font-semibold transition flex items-center gap-1"
                >
                  <BellRing className="w-3 h-3" />
                  <span>Send Reminder</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Open Complaints Section (AD5) */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>Open Complaints ({complaints.length})</span>
        </h3>

        {complaints.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No open complaints reported</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {complaints.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-white">{c.shop?.name}</span>
                  <p className="text-xs text-slate-300 mt-0.5">{c.description}</p>
                </div>
                <Link
                  href="/admin/complaints"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
                >
                  Resolve
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
