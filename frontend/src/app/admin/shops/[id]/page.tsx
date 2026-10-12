'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import {
  Store,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Phone,
  Calendar,
  ExternalLink,
  Shield,
  Trash2,
  Lock,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';

export default function AdminShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params.id as string;

  const [shop, setShop] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // AD3 Checklist state
  const [checklist, setChecklist] = useState({
    nameClear: true,
    productsHavePhotosPrices: true,
    nothingForbidden: true,
    phoneVerified: true,
  });
  const [rejectionReason, setRejectionReason] = useState('Missing required merchant documentation');

  useEffect(() => {
    if (shopId) {
      loadShop();
    }
  }, [shopId]);

  const loadShop = async () => {
    try {
      setLoading(true);
      const [shopRes, prodRes] = await Promise.all([
        api.get(`/shops/${shopId}/public`),
        api.get(`/shops/${shopId}/products`),
      ]);
      setShop(shopRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Failed to load shop details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action: 'APPROVE' | 'REJECT' | 'SUSPEND', reason?: string) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/shops/${shopId}/review`, {
        action,
        reason,
      });
      router.push('/admin/shops');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to review shop');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!shop) {
    return <div className="text-white text-center py-12">Shop not found</div>;
  }

  const isPending = shop.status === 'PENDING';

  return (
    <div className="space-y-6 max-w-4xl text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/shops"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{shop.name}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  shop.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : shop.status === 'PENDING'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {shop.status}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {isPending ? 'Screen AD3: Review a new shop' : 'Screen AD2: One shop manage'}
            </p>
          </div>
        </div>
      </div>

      {/* Screen AD3: Review Checklist (if PENDING) */}
      {isPending && (
        <div className="bg-slate-900 rounded-2xl border border-amber-500/30 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Administrator Verification Checklist (Screen AD3)</span>
          </h3>

          <div className="space-y-2 text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.nameClear}
                onChange={(e) => setChecklist({ ...checklist, nameClear: e.target.checked })}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span>Clear shop name and physical area provided</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.productsHavePhotosPrices}
                onChange={(e) => setChecklist({ ...checklist, productsHavePhotosPrices: e.target.checked })}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span>Products have clear photos and realistic pricing</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.nothingForbidden}
                onChange={(e) => setChecklist({ ...checklist, nothingForbidden: e.target.checked })}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span>Nothing forbidden or illegal is sold</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.phoneVerified}
                onChange={(e) => setChecklist({ ...checklist, phoneVerified: e.target.checked })}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span>Phone number verified via SMS</span>
            </label>
          </div>

          <div className="pt-2">
            <label className="block text-[11px] text-slate-400 mb-1">
              Rejection Reason (if rejecting):
            </label>
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleReview('APPROVE')}
              disabled={actionLoading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md disabled:opacity-50"
            >
              Approve Shop (W02)
            </button>
            <button
              onClick={() => handleReview('REJECT', rejectionReason)}
              disabled={actionLoading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-700 font-bold text-xs transition disabled:opacity-50"
            >
              Reject Shop
            </button>
          </div>
        </div>
      )}

      {/* Screen AD2: Shop Profile & Manage Information */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-white text-sm">Shop Information</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div>
            <span className="text-slate-500 block">Owner Name & Phone</span>
            <span className="font-semibold">{shop.owner?.name || 'Owner'}</span> · {shop.owner?.phone}
          </div>

          <div>
            <span className="text-slate-500 block">Location & Hours</span>
            <span className="font-semibold">{shop.area || 'No area set'}</span> · {shop.openingHours || 'No hours'}
          </div>

          <div>
            <span className="text-slate-500 block">Bot Link</span>
            <a
              href={shop.botLink}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 underline flex items-center gap-1 font-mono"
            >
              <span>{shop.botLink}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <span className="text-slate-500 block">Delivery Zones</span>
            <span>{shop.deliveryAreas || 'All areas'}</span>
          </div>
        </div>

        {/* Action Buttons for Active Shops (AD2) */}
        {!isPending && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800">
            {shop.status === 'ACTIVE' ? (
              <button
                onClick={() => handleReview('SUSPEND')}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-600/40 text-xs font-semibold hover:bg-amber-500/30 transition"
              >
                Suspend Shop
              </button>
            ) : (
              <button
                onClick={() => handleReview('APPROVE')}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-600/40 text-xs font-semibold hover:bg-emerald-600/30 transition"
              >
                Reactivate Shop
              </button>
            )}

            <Link
              href="/admin/plans"
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
            >
              Change Plan (AD4)
            </Link>
          </div>
        )}
      </div>

      {/* Product Thumbnails Preview (AD3) */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-white text-sm">Product Thumbnails ({products.length})</h3>

        {products.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No products in this shop</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {products.map((p) => (
              <div key={p.id} className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <div className="h-20 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center mb-1.5">
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-600" />
                  )}
                </div>
                <div className="font-bold text-xs truncate text-white">{p.name}</div>
                <div className="text-[11px] text-brand-400 font-semibold">{p.price} ETB</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
