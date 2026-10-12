'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import {
  Store,
  CheckCircle,
  Clock,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [counters, setCounters] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCounters();
  }, []);

  const loadCounters = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/counters');
      setCounters(res.data);
    } catch (err) {
      console.error('Failed to load admin counters', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Platform Health & Counters (AD0)</h2>
          <p className="text-xs text-slate-400">
            Real-time oversight across all merchant shops, orders, and payment approvals
          </p>
        </div>

        <button
          onClick={loadCounters}
          className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shops */}
        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Shops</span>
            <Store className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-black text-white">{counters?.totalShops || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-bold">{counters?.activeShops || 0}</span> active shops
          </div>
        </div>

        {/* Pending Approval */}
        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white flex items-center gap-2">
            <span>{counters?.pendingShops || 0}</span>
            {counters?.pendingShops > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                Action Required
              </span>
            )}
          </div>
          <Link
            href="/admin/shops?status=PENDING"
            className="text-xs text-amber-400 hover:underline flex items-center gap-1 mt-1 font-semibold"
          >
            <span>Review shops</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Pending Subscription Payments */}
        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Payment Submissions</span>
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{counters?.pendingPayments || 0}</div>
          <Link
            href="/admin/payments"
            className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1 font-semibold"
          >
            <span>Review payments</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Open Complaints */}
        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Open Complaints</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-white">{counters?.openComplaints || 0}</div>
          <Link
            href="/admin/complaints"
            className="text-xs text-red-400 hover:underline flex items-center gap-1 mt-1 font-semibold"
          >
            <span>View complaints</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Platform Volume Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Platform Total Orders</h3>
              <p className="text-xs text-slate-400">All shops cumulative customer volume</p>
            </div>
          </div>
          <div className="text-3xl font-black text-white">{counters?.totalOrders || 0}</div>
        </div>

        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Total Sales Processed</h3>
              <p className="text-xs text-slate-400">Cumulative order value across merchants</p>
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {counters?.totalVolume || '0.00'} <span className="text-xs font-bold text-slate-400">ETB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
