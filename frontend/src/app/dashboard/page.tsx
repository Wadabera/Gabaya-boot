'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { formatDualDate } from '@/lib/ethiopic-calendar';
import { LoadingSpinner } from '@/components/loading-spinner';
import {
  ShoppingBag,
  DollarSign,
  AlertCircle,
  Package,
  MessageSquare,
  Bot,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle,
  QrCode,
  Sparkles,
} from 'lucide-react';

export default function DashboardHomePage() {
  const { shop, useEthiopianCalendar, language, t } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shop?.id) {
      loadData();
    }
  }, [shop?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, subRes] = await Promise.all([
        api.get(`/shops/${shop!.id}/analytics/summary`),
        api.get(`/subscriptions/shop/${shop!.id}`),
      ]);
      setSummary(sumRes.data);
      setSubscription(subRes.data);
    } catch (err) {
      console.error('Error loading dashboard summary', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  const isBotActive = shop?.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      {/* Bot Status & Plan Alert Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isBotActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <div>
            <span className="text-xs text-slate-500 block">{t.botStatus}</span>
            <span className="text-sm font-bold text-slate-800">
              {isBotActive ? t.botActive : t.botOffline}
            </span>
          </div>
        </div>

        {subscription?.isExpiringSoon && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              {t.planEndingNotice} {subscription.daysRemaining} {language === 'am' ? 'ቀናት' : 'days'}
            </span>
            <Link
              href="/dashboard/subscription"
              className="font-bold underline text-amber-900 ml-1"
            >
              {t.renewPlanBtn}
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Link
            href="/bot-simulator"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition"
          >
            <Bot className="w-4 h-4" />
            <span>{t.botSimulator}</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards (D00) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Income */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.todayIncome}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary?.todayIncome || '0.00'} <span className="text-xs font-bold text-slate-400">ETB</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {formatDualDate(new Date(), useEthiopianCalendar, language)}
          </p>
        </div>

        {/* This Week's Income */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.weekIncome}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary?.weekIncome || '0.00'} <span className="text-xs font-bold text-slate-400">ETB</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary?.weekOrdersCount || 0} {language === 'am' ? 'ትዕዛዞች በዚህ ሳምንት' : 'orders this week'}
          </p>
        </div>

        {/* Orders Needing Attention */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.ordersNeedingAttention}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 flex items-baseline gap-2">
            <span>{summary?.newOrdersCount || 0}</span>
            {summary?.newOrdersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                {t.newOrdersBadge}
              </span>
            )}
          </div>
          <Link
            href="/dashboard/orders"
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1 mt-1"
          >
            <span>{language === 'am' ? 'ትዕዛዞችን አስተዳድር' : 'Manage Orders'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Quotas & Usage Progress */}
      {subscription && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {t.currentPlan} <span className="text-brand-600 uppercase">{subscription.plan?.name}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {subscription.endDate
                  ? `${t.planExpiresAt} ${formatDualDate(subscription.endDate, useEthiopianCalendar, language)}`
                  : 'Active Plan'}
              </p>
            </div>
            <Link
              href="/dashboard/subscription"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition"
            >
              {language === 'am' ? 'እቅድ ቀይር' : 'Upgrade Plan'}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Products quota */}
            <div>
              <div className="flex justify-between mb-1 text-slate-600 font-medium">
                <span>{t.productUsage}</span>
                <span>{subscription.productsUsed} / {subscription.plan?.productLimit}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (subscription.productsUsed / (subscription.plan?.productLimit || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Orders quota */}
            <div>
              <div className="flex justify-between mb-1 text-slate-600 font-medium">
                <span>{t.orderUsage}</span>
                <span>{subscription.ordersThisMonth} / {subscription.plan?.orderMonthlyLimit}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (subscription.ordersThisMonth / (subscription.plan?.orderMonthlyLimit || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* AI quota */}
            <div>
              <div className="flex justify-between mb-1 text-slate-600 font-medium">
                <span>{t.aiUsage}</span>
                <span>{subscription.aiAnswersThisMonth} / {subscription.plan?.aiMonthlyLimit}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (subscription.aiAnswersThisMonth / (subscription.plan?.aiMonthlyLimit || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/dashboard/products"
          className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-brand-500 hover:shadow-sm transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">{t.addNewProduct}</span>
        </Link>

        <Link
          href="/dashboard/orders"
          className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-brand-500 hover:shadow-sm transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">{t.ordersTitle}</span>
        </Link>

        <Link
          href="/dashboard/ai-chats"
          className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-brand-500 hover:shadow-sm transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">{t.chatsTitle}</span>
        </Link>

        <Link
          href="/dashboard/profile"
          className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-brand-500 hover:shadow-sm transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">{t.downloadQrBtn}</span>
        </Link>
      </div>

      {/* Recent Orders Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-sm">{language === 'am' ? 'የቅርብ ጊዜ ትዕዛዞች' : 'Recent Orders'}</h3>
          <Link
            href="/dashboard/orders"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>{t.viewDetails}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {summary?.recentOrders && summary.recentOrders.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {summary.recentOrders.map((order: any) => (
              <div key={order.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">{order.orderNumber}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      order.status === 'NEW'
                        ? 'bg-amber-100 text-amber-800'
                        : order.status === 'CONFIRMED'
                        ? 'bg-blue-100 text-blue-800'
                        : order.status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {order.customer?.name || 'Customer'} · {order.deliveryArea || order.deliveryType}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-xs text-slate-900">{order.total} ETB</span>
                  <p className="text-[10px] text-slate-400">
                    {formatDualDate(order.createdAt, useEthiopianCalendar, language)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-6 text-center">{t.noOrdersFound}</p>
        )}
      </div>
    </div>
  );
}
