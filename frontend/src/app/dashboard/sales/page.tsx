'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { formatDualDate } from '@/lib/ethiopic-calendar';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Award,
} from 'lucide-react';

export default function SalesPage() {
  const { shop, useEthiopianCalendar, language, t } = useAuth();
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shop?.id) {
      loadSales();
    }
  }, [shop?.id, timeframe]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/shops/${shop!.id}/analytics/sales`, {
        params: { timeframe },
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load sales analytics', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Timeframe filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.salesTitle}</h2>
          <p className="text-xs text-slate-500">
            {language === 'am' ? 'የገቢ እና የተሸጡ እቃዎች አፈጻጸም ሪፖርት' : 'Income performance, order volume, and top-performing items'}
          </p>
        </div>

        {/* Timeframe pills */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold w-fit">
          <button
            onClick={() => setTimeframe('day')}
            className={`py-1.5 px-3 rounded-lg transition ${
              timeframe === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.timeframeDay}
          </button>
          <button
            onClick={() => setTimeframe('week')}
            className={`py-1.5 px-3 rounded-lg transition ${
              timeframe === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.timeframeWeek}
          </button>
          <button
            onClick={() => setTimeframe('month')}
            className={`py-1.5 px-3 rounded-lg transition ${
              timeframe === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.timeframeMonth}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.totalIncome}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data?.totalIncome || '0.00'} <span className="text-xs font-bold text-slate-400">ETB</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {timeframe === 'day' ? 'Today' : timeframe === 'week' ? 'Past 7 Days' : 'Past 30 Days'}
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.totalOrdersCount}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data?.totalOrders || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {language === 'am' ? 'የተረጋገጡ እና የተጠናቀቁ ትዕዛዞች' : 'Confirmed & Delivered orders'}
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.avgOrderValue}</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data?.averageOrderValue || '0.00'} <span className="text-xs font-bold text-slate-400">ETB</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {language === 'am' ? 'በአንድ ትዕዛዝ አማካኝ ገቢ' : 'Per confirmed order'}
          </p>
        </div>
      </div>

      {/* Top-Selling Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>{t.topSellingProducts}</span>
        </h3>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data?.topProducts?.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">
            {language === 'am' ? 'በዚህ ጊዜ ውስጥ ምንም ሽያጭ አልተመዘገበም' : 'No sales recorded in this timeframe'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">{t.productNameLabel}</th>
                  <th className="py-2.5 px-3 text-right">{t.soldUnits}</th>
                  <th className="py-2.5 px-3 text-right">{t.salesRevenue}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.topProducts?.map((p: any, idx: number) => (
                  <tr key={p.productId || idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{p.productName}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">{p.unitsSold}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-brand-600">{p.revenue} ETB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
