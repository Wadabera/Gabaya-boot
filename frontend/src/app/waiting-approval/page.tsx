'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Clock, AlertTriangle, CheckCircle, RefreshCw, LogOut } from 'lucide-react';

export default function WaitingApprovalPage() {
  const { shop, refreshShop, logout, language, t } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (shop?.status === 'ACTIVE') {
      router.push('/dashboard');
    }
  }, [shop, router]);

  const handleCheckStatus = async () => {
    setChecking(true);
    await refreshShop();
    setChecking(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 text-center">
        {shop?.status === 'PENDING' ? (
          <>
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {t.waitingApprovalTitle}
            </h2>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {t.waitingApprovalDesc}
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5 mb-6">
              <div><strong>{t.shopNameLabel}:</strong> {shop.name}</div>
              {shop.area && <div><strong>{t.shopAreaLabel}:</strong> {shop.area}</div>}
              <div><strong>{t.status}:</strong> <span className="text-amber-600 font-semibold">{shop.status}</span></div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? t.loading : t.refresh}</span>
              </button>

              <button
                onClick={logout}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 flex items-center gap-2 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logout}</span>
              </button>
            </div>
          </>
        ) : shop?.status === 'SUSPENDED' ? (
          <>
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {t.shopRejectedTitle}
            </h2>

            <p className="text-sm text-red-600 mb-6 font-medium">
              {shop.rejectionReason || 'Your shop account has been suspended by the platform administrator.'}
            </p>

            <button
              onClick={logout}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 text-white font-semibold text-sm hover:bg-slate-900 transition"
            >
              {t.logout}
            </button>
          </>
        ) : (
          <div className="py-8">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Shop is Active!</h3>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-6 py-2.5 bg-brand-600 text-white font-semibold rounded-xl"
            >
              {t.goToDashboard}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
