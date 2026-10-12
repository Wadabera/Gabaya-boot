'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { formatDualDate } from '@/lib/ethiopic-calendar';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  Upload,
  ArrowRight,
  ShieldCheck,
  Send,
  Sparkles,
} from 'lucide-react';

export default function SubscriptionPage() {
  const { shop, useEthiopianCalendar, language, t } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment submission form
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'MOBILE_MONEY'>('MOBILE_MONEY');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (shop?.id) {
      loadData();
    }
  }, [shop?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes, payRes] = await Promise.all([
        api.get('/subscriptions/plans'),
        api.get(`/subscriptions/shop/${shop!.id}`),
        api.get(`/subscriptions/shop/${shop!.id}/payments`),
      ]);
      setPlans(plansRes.data);
      setSubscription(subRes.data);
      setPayments(payRes.data);
      if (plansRes.data.length > 0) {
        setSelectedPlanId(plansRes.data[1]?.id || plansRes.data[0]?.id);
      }
    } catch (err) {
      console.error('Failed to load subscription data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceNumber.trim() || !selectedPlanId) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      let receiptUrl = undefined;
      if (receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        const uploadRes = await api.post('/storage/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        receiptUrl = uploadRes.data.url;
      }

      await api.post(`/subscriptions/shop/${shop!.id}/payments`, {
        planId: selectedPlanId,
        paymentMethod,
        referenceNumber,
        receiptUrl,
      });

      setReferenceNumber('');
      setReceiptFile(null);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 5000);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit subscription payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t.subscriptionTitle}</h2>
        <p className="text-xs text-slate-500">
          {language === 'am' ? 'የእቅድ ገደቦችዎን ይመልከቱ፣ በቴሌብር ወይም ባንክ ክፍያ ፈፅመው ያድሱ' : 'View plan quotas, compare tiers, and submit manual Ethiopian subscription payments'}
        </p>
      </div>

      {/* Current Plan Quotas Banner (O13 / D00) */}
      {subscription && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-semibold text-slate-500">{t.currentPlan}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-extrabold text-slate-900 uppercase">
                  {subscription.plan?.displayName || subscription.plan?.name}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 font-bold">
                  {subscription.status}
                </span>
              </div>
            </div>

            <div className="text-sm text-slate-600 sm:text-right">
              <span className="block text-xs text-slate-400">{t.planExpiresAt}</span>
              <span className="font-bold">
                {subscription.endDate
                  ? formatDualDate(subscription.endDate, useEthiopianCalendar, language)
                  : (language === 'am' ? 'ገደብ የለውም' : 'Lifetime')}
              </span>
            </div>
          </div>

          {/* Usage Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1.5">
                <span>{t.productUsage}</span>
                <span>{subscription.productsUsed} / {subscription.plan?.productLimit}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (subscription.productsUsed / (subscription.plan?.productLimit || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1.5">
                <span>{t.orderUsage}</span>
                <span>{subscription.ordersThisMonth} / {subscription.plan?.orderMonthlyLimit}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (subscription.ordersThisMonth / (subscription.plan?.orderMonthlyLimit || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1.5">
                <span>{t.aiUsage}</span>
                <span>{subscription.aiAnswersThisMonth} / {subscription.plan?.aiMonthlyLimit}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
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

      {/* Plan Comparison Cards (D05 / FR-51) */}
      <div>
        <h3 className="font-bold text-slate-900 text-sm mb-4">
          {language === 'am' ? 'የደንበኝነት እቅዶች ንጽጽር' : 'Available Subscription Plans'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent = subscription?.planId === p.id;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between transition ${
                  isCurrent ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 text-base">{p.displayName}</h4>
                    {isCurrent && (
                      <span className="text-[10px] bg-brand-100 text-brand-800 font-bold px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-black text-slate-900">{p.priceMonthly}</span>
                    <span className="text-xs text-slate-400 font-semibold ml-1">ETB / {language === 'am' ? 'ወር' : 'mo'}</span>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                      <span>{p.productLimit} {language === 'am' ? 'ምርቶች' : 'products limit'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                      <span>{p.orderMonthlyLimit} {language === 'am' ? 'ትዕዛዞች በወር' : 'orders / month'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                      <span>{p.aiMonthlyLimit} {language === 'am' ? 'የAI ምላሾች በወር' : 'AI answers / month'}</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition ${
                    selectedPlanId === p.id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {selectedPlanId === p.id ? 'Selected' : 'Choose Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Payment Submission Form (D06 / FR-73) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-1">{t.submitPaymentTitle}</h3>
        <p className="text-xs text-slate-500 mb-6">
          {language === 'am'
            ? 'ክፍያዎን በቴሌብር ወይም በባንክ ካስተላለፉ በኋላ የግብይት መለያ ቁጥሩን (Transaction Reference) እና ደረሰኙን እዚህ ያስገቡ።'
            : 'Transfer the subscription fee via Telebirr or Commercial Bank of Ethiopia (CBE), then submit the transaction reference.'}
        </p>

        {successMsg && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              {language === 'am'
                ? 'ክፍያዎ በተሳካ ሁኔታ ተልኳል! የመድረኩ አስተዳዳሪ አረጋግጦ እቅድዎን ያስጀምራል።'
                : 'Payment submitted successfully! The administrator will review and activate your plan.'}
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.selectPlan}</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName} - {p.priceMonthly} ETB
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.paymentMethodLabel}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
              >
                <option value="MOBILE_MONEY">{t.mobileMoney}</option>
                <option value="BANK_TRANSFER">{t.bankTransfer}</option>
              </select>
            </div>
          </div>

          {/* Payment Account Hint */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
            <span className="font-bold block text-slate-900">
              {language === 'am' ? 'የመድረኩ ይፋዊ የክፍያ ሂሳቦች፡' : 'Platform Payment Accounts:'}
            </span>
            <div>• <strong>Telebirr:</strong> 0911000000 (Gebeya Boot Platform)</div>
            <div>• <strong>CBE Bank:</strong> 1000999888777 (Gebeya Boot E-Commerce PLC)</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.referenceNumberLabel}</label>
              <input
                type="text"
                required
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. FT260098765432 or TB123456"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.receiptUploadLabel}</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setReceiptFile(e.target.files[0]);
                  }
                }}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !referenceNumber.trim()}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? t.loading : t.submitPaymentBtn}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Payment Submissions History (D07) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-4">{t.paymentHistoryTitle}</h3>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            {language === 'am' ? 'ምንም የቀደመ የክፍያ ታሪክ የለም' : 'No payment submissions found'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{t.date}</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">{t.price}</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">{t.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-3 text-slate-500">
                      {formatDualDate(p.createdAt, useEthiopianCalendar, language)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{p.plan?.name}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{p.amount} ETB</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{p.referenceNumber}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          p.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                      {p.rejectionReason && (
                        <p className="text-[10px] text-red-600 mt-0.5">{p.rejectionReason}</p>
                      )}
                    </td>
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
