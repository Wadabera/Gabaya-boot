'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('SUBMITTED');

  // Review modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Invalid or unmatched bank transaction reference number');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPayments();
  }, [statusFilter]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/payments', {
        params: { status: statusFilter || undefined },
      });
      setPayments(res.data);
    } catch (err) {
      console.error('Failed to load subscription payments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedPayment) return;
    try {
      setActionLoading(true);
      await api.patch(`/admin/payments/${selectedPayment.id}/review`, {
        status,
        reason: status === 'REJECTED' ? rejectionReason : undefined,
      });
      setReviewModalOpen(false);
      await loadPayments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to review payment');
    } finally {
      setActionLoading(false);
    }
  };

  const openReviewModal = (payment: any) => {
    setSelectedPayment(payment);
    setReviewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Subscription Payments (A2, A3, FR-75)</h2>
          <p className="text-xs text-slate-400">
            Verify manual bank transfer & Telebirr receipts to activate merchant subscription tiers
          </p>
        </div>

        <button
          onClick={loadPayments}
          className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold max-w-md">
        <button
          onClick={() => setStatusFilter('')}
          className={`flex-1 py-1.5 px-3 rounded-lg transition ${
            statusFilter === '' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('SUBMITTED')}
          className={`flex-1 py-1.5 px-3 rounded-lg transition ${
            statusFilter === 'SUBMITTED' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Submitted
        </button>
        <button
          onClick={() => setStatusFilter('APPROVED')}
          className={`flex-1 py-1.5 px-3 rounded-lg transition ${
            statusFilter === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setStatusFilter('REJECTED')}
          className={`flex-1 py-1.5 px-3 rounded-lg transition ${
            statusFilter === 'REJECTED' ? 'bg-red-500/20 text-red-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Rejected
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-xs text-slate-500 py-12 text-center">No payment submissions found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Shop</th>
                  <th className="py-3 px-4">Plan & Amount</th>
                  <th className="py-3 px-4">Reference & Method</th>
                  <th className="py-3 px-4">Receipt</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{p.shop?.name}</div>
                      <div className="text-[11px] text-slate-400">{p.shop?.owner?.phone}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-brand-400">{p.plan?.name}</span>
                      <div className="text-slate-300 font-semibold">{p.amount} ETB</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono text-white font-bold">{p.referenceNumber}</div>
                      <div className="text-[11px] text-slate-400">{p.paymentMethod}</div>
                    </td>

                    <td className="py-3 px-4">
                      {p.receiptUrl ? (
                        <a
                          href={p.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </a>
                      ) : (
                        <span className="text-slate-500">None uploaded</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          p.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : p.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {p.status === 'SUBMITTED' ? (
                        <button
                          onClick={() => openReviewModal(p)}
                          className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-[11px] transition shadow-sm"
                        >
                          Review & Decide
                        </button>
                      ) : (
                        <button
                          onClick={() => openReviewModal(p)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-[11px] transition"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-2">Review Subscription Payment</h3>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2 mb-4">
              <div><strong>Shop:</strong> {selectedPayment.shop?.name}</div>
              <div><strong>Plan:</strong> {selectedPayment.plan?.name} ({selectedPayment.amount} ETB)</div>
              <div><strong>Method:</strong> {selectedPayment.paymentMethod}</div>
              <div><strong>Reference Number:</strong> <span className="font-mono text-brand-400">{selectedPayment.referenceNumber}</span></div>
              {selectedPayment.receiptUrl && (
                <div className="pt-2">
                  <span className="block mb-1 text-slate-400">Receipt Image:</span>
                  <img
                    src={selectedPayment.receiptUrl}
                    alt="Receipt"
                    className="w-full max-h-48 object-contain rounded-lg border border-slate-800 bg-black"
                  />
                </div>
              )}
            </div>

            {selectedPayment.status === 'SUBMITTED' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Rejection Reason (if rejecting):
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview('REJECTED')}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-700 text-xs font-bold transition disabled:opacity-50"
                  >
                    Reject Payment
                  </button>
                  <button
                    onClick={() => handleReview('APPROVED')}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md disabled:opacity-50"
                  >
                    Approve & Activate
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
