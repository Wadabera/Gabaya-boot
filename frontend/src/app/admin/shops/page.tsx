'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Store,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Phone,
  Calendar,
  ExternalLink,
} from 'lucide-react';

export default function AdminShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Action modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Missing required merchant documentation');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadShops();
  }, [statusFilter]);

  const loadShops = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/shops', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      setShops(res.data);
    } catch (err) {
      console.error('Failed to load shops', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (shopId: string, action: 'APPROVE' | 'REJECT' | 'SUSPEND', reason?: string) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/shops/${shopId}/review`, {
        action,
        reason,
      });
      setRejectModalOpen(false);
      await loadShops();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to review shop');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (shop: any) => {
    setSelectedShop(shop);
    setRejectModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Shops Management (AD1, AD2, AD3)</h2>
          <p className="text-xs text-slate-400">
            Review, approve, suspend, or manage merchant storefronts (FR-04, FR-60)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadShops()}
              placeholder="Search shops or owners..."
              className="pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-52 sm:w-64"
            />
          </div>

          <button
            onClick={loadShops}
            className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold max-w-sm">
        <button
          onClick={() => setStatusFilter('')}
          className={`flex-1 py-1.5 px-3 rounded-lg transition ${
            statusFilter === '' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`flex-1 py-1.5 px-3 rounded-lg transition ${
            statusFilter === 'PENDING' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setStatusFilter('ACTIVE')}
          className={`flex-1 py-1.5 px-3 rounded-lg transition ${
            statusFilter === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setStatusFilter('SUSPENDED')}
          className={`flex-1 py-1.5 px-3 rounded-lg transition ${
            statusFilter === 'SUSPENDED' ? 'bg-red-500/20 text-red-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          Suspended
        </button>
      </div>

      {/* Shops Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shops.length === 0 ? (
          <p className="text-xs text-slate-500 py-12 text-center">No shops found matching filter</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Shop Details</th>
                  <th className="py-3 px-4">Owner Info</th>
                  <th className="py-3 px-4">Catalog / Orders</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{shop.name}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        {shop.area || 'No physical area'} · {shop.openingHours || 'Hours not set'}
                      </div>
                      {shop.botLink && (
                        <a
                          href={shop.botLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:underline mt-1"
                        >
                          <span>{shop.botLink}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{shop.owner?.name || 'Owner'}</div>
                      <div className="text-slate-400 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{shop.owner?.phone}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-300">
                        <strong>{shop._count?.products || 0}</strong> products
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        <strong>{shop._count?.orders || 0}</strong> orders
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          shop.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : shop.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {shop.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {shop.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleReview(shop.id, 'APPROVE')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(shop)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/40 border border-red-700/50 font-semibold text-[11px] transition"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {shop.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleReview(shop.id, 'SUSPEND')}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold text-[11px] transition"
                          >
                            Suspend
                          </button>
                        )}

                        {shop.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleReview(shop.id, 'APPROVE')}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 font-semibold text-[11px] transition"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && selectedShop && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-2">Reject {selectedShop.name}</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter reason for rejection. The shop owner will be informed.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(selectedShop.id, 'REJECT', rejectionReason)}
                disabled={actionLoading}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
