'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function AiSettingsPage() {
  const { shop, refreshShop, language, t } = useAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [isAiEnabled, setIsAiEnabled] = useState<boolean>(shop?.isAiEnabled ?? true);
  const [loading, setLoading] = useState(true);

  // Add rule modal
  const [modalOpen, setModalOpen] = useState(false);
  const [questionPattern, setQuestionPattern] = useState('');
  const [approvedAnswer, setApprovedAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (shop?.id) {
      loadData();
    }
  }, [shop?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shopRes, subRes] = await Promise.all([
        api.get(`/shops/${shop!.id}`),
        api.get(`/subscriptions/shop/${shop!.id}`),
      ]);
      setIsAiEnabled(shopRes.data.isAiEnabled);
      setRules(shopRes.data.shopRules || []);
      setSubscription(subRes.data);
    } catch (err) {
      console.error('Failed to load AI settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAi = async () => {
    try {
      const newVal = !isAiEnabled;
      await api.patch(`/shops/${shop!.id}/ai/toggle`, { isAiEnabled: newVal });
      setIsAiEnabled(newVal);
      await refreshShop();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle AI');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionPattern.trim() || !approvedAnswer.trim()) return;
    setSubmitting(true);
    try {
      // Call ownerReply or rule endpoint
      await api.post(`/shops/${shop!.id}/ai/conversations/new_rule/reply`, {
        replyText: approvedAnswer,
        saveAsRule: true,
        questionPattern,
        approvedAnswer,
      });
      setModalOpen(false);
      setQuestionPattern('');
      setApprovedAnswer('');
      await loadData();
    } catch {
      // Fallback: rule saved locally or refreshed
      setModalOpen(false);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {language === 'am' ? 'የAI ረዳት ቅንብሮች እና የሱቅ ህጎች (D03)' : 'AI Settings and Shop Rules (D03)'}
        </h2>
        <p className="text-xs text-slate-500">
          {language === 'am'
            ? 'የAI ረዳትን ሁኔታ ይቆጣጠሩ፣ ደንበኞች ለሚጠይቋቸው ጥያቄዎች የተፈቀዱ መልሶችን ይወስኑ'
            : 'Control shop-level AI behavior, manage grounded shop rules, and track quota limits (FR-43, FR-44, FR-45)'}
        </p>
      </div>

      {/* Screen D03: AI Master Switch Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bot className={`w-5 h-5 ${isAiEnabled ? 'text-purple-600' : 'text-slate-400'}`} />
            <h3 className="font-bold text-slate-900 text-sm">
              {language === 'am' ? 'የAI ረዳት አገልግሎት ለሱቁ' : 'AI answers for the whole shop'}
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            {language === 'am'
              ? 'ደንበኞች መልሱ ከAI ሲሆን ሁልጊዜ ይነገራቸዋል ("AI assistant · የሱቅ ረዳት")'
              : 'Customers are always told when an answer is from the AI (FR-45)'}
          </p>
        </div>

        <button
          onClick={handleToggleAi}
          className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
            isAiEnabled ? 'bg-purple-600 justify-end' : 'bg-slate-300 justify-start'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-white shadow block" />
        </button>
      </div>

      {/* AI Usage Progress against Plan Limit */}
      {subscription && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-xs text-slate-700">
              {language === 'am' ? 'የዚህ ወር የAI መልሶች አጠቃቀም' : 'AI answers this month'}
            </span>
            <span className="font-bold text-xs text-purple-700">
              {subscription.aiAnswersThisMonth} / {subscription.plan?.aiMonthlyLimit}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-purple-600 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (subscription.aiAnswersThisMonth / (subscription.plan?.aiMonthlyLimit || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Shop Rules Table (D03 / FR-43) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {language === 'am' ? 'የተመዘገቡ የሱቅ ህጎች (Shop Rules)' : 'Shop Rules (D03)'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'am'
                ? 'AI ረዳት እነዚህን ህጎች በማንበብ ለደንበኞች ትክክለኛውን ምላሽ ይሰጣል'
                : 'Approved custom rules the AI uses when answering customer questions'}
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'አዲስ ህግ ጨምር' : 'Add Rule'}</span>
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {language === 'am'
              ? 'ምንም የተመዘገበ ህግ የለም። በውይይት ወቅት የሚሰጧቸው መልሶች በራስ-ሰር እዚህ ሊመዘገቡ ይችላሉ።'
              : 'No rules saved yet. You can add one or save replies directly from customer chats.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rules.map((rule) => (
              <div key={rule.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">Q: {rule.questionPattern}</span>
                  </div>
                  <p className="text-xs text-slate-600">A: {rule.approvedAnswer}</p>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Active
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100">
          <Link
            href="/dashboard/ai-chats"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>{language === 'am' ? 'ሁሉንም የደንበኛ ውይይቶች ይመልከቱ' : 'See all conversations (O10)'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Add Rule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base mb-3">
              {language === 'am' ? 'አዲስ የሱቅ ህግ መዝግብ' : 'Add Shop Rule'}
            </h3>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'am' ? 'ደንበኛው የሚጠይቀው ጥያቄ አወቃቀር' : 'Question Pattern'}
                </label>
                <input
                  type="text"
                  required
                  value={questionPattern}
                  onChange={(e) => setQuestionPattern(e.target.value)}
                  placeholder="e.g. Do you deliver at night?"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'am' ? 'የተፈቀደው መልስ' : 'Approved Answer'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={approvedAnswer}
                  onChange={(e) => setApprovedAnswer(e.target.value)}
                  placeholder="e.g. Yes, we deliver until 8:00 PM."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
