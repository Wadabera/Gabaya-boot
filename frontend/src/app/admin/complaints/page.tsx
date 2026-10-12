'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { AlertOctagon, CheckCircle, RefreshCw, Bot, History, User } from 'lucide-react';

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'complaints' | 'audit'>('complaints');

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (tab === 'complaints') {
        const res = await api.get('/admin/complaints');
        setComplaints(res.data);
      } else {
        const res = await api.get('/admin/audit-logs');
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveComplaint = async (complaintId: string) => {
    try {
      await api.patch(`/admin/complaints/${complaintId}/resolve`);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resolve complaint');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Complaints & Audit Trail (AD5, FR-63)</h2>
          <p className="text-xs text-slate-400">
            Monitor customer complaints, escalated AI conversations, and administrative audit logs
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold max-w-xs">
        <button
          onClick={() => setTab('complaints')}
          className={`flex-1 py-1.5 px-3 rounded-lg transition ${
            tab === 'complaints' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Complaints ({complaints.length})
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`flex-1 py-1.5 px-3 rounded-lg transition ${
            tab === 'audit' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Audit Logs
        </button>
      </div>

      {/* Content */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'complaints' ? (
          complaints.length === 0 ? (
            <p className="text-xs text-slate-500 py-12 text-center">No open complaints found</p>
          ) : (
            <div className="divide-y divide-slate-800">
              {complaints.map((c) => (
                <div key={c.id} className="p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-xs">{c.shop?.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          c.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{c.description}</p>
                    <div className="text-[11px] text-slate-500 mt-1">
                      By {c.customerName || 'Anonymous Customer'} · {new Date(c.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {c.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleResolveComplaint(c.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        ) : auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-12 text-center">No audit logs recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-brand-400">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      {log.entity} {log.entityId ? `(#${log.entityId.slice(0, 8)})` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-medium">
                      {log.user?.email || log.user?.phone || 'System'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 max-w-xs truncate">
                      {log.details || '-'}
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
