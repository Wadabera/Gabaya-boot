'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Layers, Edit3, Save, CheckCircle, RefreshCw } from 'lucide-react';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subscriptions/plans');
      setPlans(res.data);
    } catch (err) {
      console.error('Failed to load plans', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      setSaving(true);
      await api.patch(`/admin/plans/${editingPlan.id}`, {
        priceMonthly: parseFloat(editingPlan.priceMonthly),
        productLimit: parseInt(editingPlan.productLimit, 10),
        orderMonthlyLimit: parseInt(editingPlan.orderMonthlyLimit, 10),
        aiMonthlyLimit: parseInt(editingPlan.aiMonthlyLimit, 10),
      });
      setEditingPlan(null);
      await loadPlans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Subscription Plans Management (AD4, FR-62)</h2>
          <p className="text-xs text-slate-400">
            Define pricing, product limits, order quotas, and AI allowances for all merchant tiers
          </p>
        </div>

        <button
          onClick={loadPlans}
          className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg text-white">{plan.displayName}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-brand-400 font-bold">
                  {plan.name}
                </span>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-black text-white">{plan.priceMonthly}</span>
                <span className="text-xs text-slate-400 ml-1">ETB / month</span>
              </div>

              <div className="space-y-3 text-xs text-slate-300 mb-6">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Product Quota</span>
                  <span className="font-bold text-white">{plan.productLimit}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Monthly Orders Quota</span>
                  <span className="font-bold text-white">{plan.orderMonthlyLimit}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Monthly AI Answers</span>
                  <span className="font-bold text-white">{plan.aiMonthlyLimit}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setEditingPlan({ ...plan })}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Pricing & Quotas</span>
            </button>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-4">Edit {editingPlan.displayName}</h3>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Monthly Price (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={editingPlan.priceMonthly}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, priceMonthly: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Product Limit
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editingPlan.productLimit}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, productLimit: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Monthly Order Limit
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editingPlan.orderMonthlyLimit}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, orderMonthlyLimit: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Monthly AI Answers Limit
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editingPlan.aiMonthlyLimit}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, aiMonthlyLimit: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
