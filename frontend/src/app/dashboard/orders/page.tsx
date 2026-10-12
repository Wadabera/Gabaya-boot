'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { formatDualDate } from '@/lib/ethiopic-calendar';
import {
  ShoppingBag,
  Search,
  CheckCircle,
  Truck,
  XCircle,
  DollarSign,
  AlertCircle,
  Eye,
  Clock,
  User,
  MapPin,
  CreditCard,
  Phone,
  RefreshCw,
} from 'lucide-react';

export default function OrdersPage() {
  const { shop, useEthiopianCalendar, language, t } = useAuth();
  const [tab, setTab] = useState<'new' | 'active' | 'done'>('new');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer requested cancellation');

  useEffect(() => {
    if (shop?.id) {
      loadOrders();
    }
  }, [shop?.id, tab]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/shop/${shop!.id}`, {
        params: {
          category: tab,
          search: search || undefined,
        },
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string, reason?: string) => {
    try {
      setActionLoading(true);
      await api.patch(`/orders/${orderId}/shop/${shop!.id}/status`, {
        status,
        reason,
      });
      await loadOrders();
      if (selectedOrder?.id === orderId) {
        const updated = await api.get(`/orders/${orderId}/shop/${shop!.id}`);
        setSelectedOrder(updated.data);
      }
      setCancelModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePayment = async (orderId: string, paymentStatus: string) => {
    try {
      setActionLoading(true);
      await api.patch(`/orders/${orderId}/shop/${shop!.id}/payment`, {
        paymentStatus,
      });
      await loadOrders();
      if (selectedOrder?.id === orderId) {
        const updated = await api.get(`/orders/${orderId}/shop/${shop!.id}`);
        setSelectedOrder(updated.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update payment status');
    } finally {
      setActionLoading(false);
    }
  };

  const openCancelModal = (order: any) => {
    setOrderToCancel(order);
    setCancelModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.ordersTitle}</h2>
          <p className="text-xs text-slate-500">
            {language === 'am' ? 'የትዕዛዝ ሁኔታዎችን ይቆጣጠሩ፣ ክፍያዎችን ያረጋግጡ' : 'Track and manage orders and payment reconciliation'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
              placeholder={t.search}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            onClick={loadOrders}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
            title={t.refresh}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/60 p-1 rounded-xl max-w-md">
        <button
          onClick={() => setTab('new')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
            tab === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.tabNewOrders}
        </button>
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
            tab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.tabActiveOrders}
        </button>
        <button
          onClick={() => setTab('done')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
            tab === 'done' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.tabCompletedOrders}
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm mb-1">{t.noOrdersFound}</h3>
          <p className="text-xs text-slate-400">
            {language === 'am' ? 'በዚህ ክፍል ውስጥ የተመዘገበ ትዕዛዝ የለም' : 'No orders in this category yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-extrabold text-sm text-slate-900">{order.orderNumber}</span>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatDualDate(order.createdAt, useEthiopianCalendar, language)}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.status === 'NEW'
                          ? 'bg-amber-100 text-amber-800'
                          : order.status === 'CONFIRMED'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'OUT_FOR_DELIVERY'
                          ? 'bg-purple-100 text-purple-800'
                          : order.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {order.status}
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        order.paymentStatus === 'CONFIRMED_PAID'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : order.paymentStatus === 'NOT_RECEIVED'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Customer & Delivery */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1 mb-3">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{order.customer?.name || 'Customer'}</span>
                    {order.customer?.phone && (
                      <span className="text-slate-500 font-mono">({order.customer.phone})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{order.deliveryType === 'PICKUP' ? 'Pickup at Shop' : (order.deliveryArea || 'Delivery')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Method: {order.paymentMethod}</span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="space-y-1 mb-4">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-xs text-slate-700">
                      <span>{item.quantity}x {item.productName}</span>
                      <span className="font-semibold">{item.totalPrice} ETB</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-100 flex justify-between font-black text-sm text-slate-900">
                    <span>{t.orderTotal}</span>
                    <span className="text-brand-600">{order.total} ETB</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {/* Status Progression */}
                  {order.status === 'NEW' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                        disabled={actionLoading}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{t.confirmOrder}</span>
                      </button>
                      <button
                        onClick={() => openCancelModal(order)}
                        disabled={actionLoading}
                        className="py-1.5 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                      >
                        {t.cancelOrder}
                      </button>
                    </>
                  )}

                  {order.status === 'CONFIRMED' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                        disabled={actionLoading}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition disabled:opacity-50"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>{t.outForDelivery}</span>
                      </button>
                      <button
                        onClick={() => openCancelModal(order)}
                        disabled={actionLoading}
                        className="py-1.5 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                      >
                        {t.cancelOrder}
                      </button>
                    </>
                  )}

                  {order.status === 'OUT_FOR_DELIVERY' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                      disabled={actionLoading}
                      className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{t.delivered}</span>
                    </button>
                  )}
                </div>

                {/* Payment Reconciliation Actions (FR-65) */}
                {order.status !== 'CANCELLED' && (
                  <div className="flex gap-2 pt-1 border-t border-slate-50">
                    <button
                      onClick={() => handleUpdatePayment(order.id, 'CONFIRMED_PAID')}
                      disabled={actionLoading || order.paymentStatus === 'CONFIRMED_PAID'}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition ${
                        order.paymentStatus === 'CONFIRMED_PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      <DollarSign className="w-3 h-3" />
                      <span>{t.markAsPaid}</span>
                    </button>

                    <button
                      onClick={() => handleUpdatePayment(order.id, 'NOT_RECEIVED')}
                      disabled={actionLoading || order.paymentStatus === 'NOT_RECEIVED'}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition ${
                        order.paymentStatus === 'NOT_RECEIVED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700'
                      }`}
                    >
                      <XCircle className="w-3 h-3" />
                      <span>{t.markNotReceived}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModalOpen && orderToCancel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base mb-2">
              {t.cancelOrder} - {orderToCancel.orderNumber}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'am' ? 'የትዕዛዝ መሰረዣ ምክንያት ያስገቡ፡' : 'Enter cancellation reason:'}
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleUpdateStatus(orderToCancel.id, 'CANCELLED', cancelReason)}
                disabled={actionLoading}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
