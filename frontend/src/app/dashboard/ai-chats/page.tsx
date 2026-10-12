'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { formatDualDate } from '@/lib/ethiopic-calendar';
import {
  MessageSquare,
  Bot,
  User,
  Send,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  BookmarkCheck,
  AlertCircle,
  Clock,
  CheckCheck,
} from 'lucide-react';

export default function AiChatsPage() {
  const { shop, useEthiopianCalendar, language, t } = useAuth();
  const [filter, setFilter] = useState<'waiting' | 'ai_answered' | 'closed'>('waiting');
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [saveAsRule, setSaveAsRule] = useState(false);
  const [questionPattern, setQuestionPattern] = useState('');
  const [approvedAnswer, setApprovedAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shopAiActive, setShopAiActive] = useState<boolean>(shop?.isAiEnabled ?? true);

  useEffect(() => {
    if (shop?.id) {
      loadConversations();
    }
  }, [shop?.id, filter]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/shops/${shop!.id}/ai/conversations`, {
        params: { filter },
      });
      setConversations(res.data);
      if (res.data.length > 0 && !activeConv) {
        loadConversationDetails(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetails = async (convId: string) => {
    try {
      const res = await api.get(`/shops/${shop!.id}/ai/conversations/${convId}`);
      setActiveConv(res.data);
    } catch (err) {
      console.error('Failed to load conversation details', err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConv) return;
    setSubmitting(true);
    try {
      await api.post(`/shops/${shop!.id}/ai/conversations/${activeConv.id}/reply`, {
        replyText,
        saveAsRule,
        questionPattern: saveAsRule ? questionPattern : undefined,
        approvedAnswer: saveAsRule ? (approvedAnswer || replyText) : undefined,
      });
      setReplyText('');
      setSaveAsRule(false);
      setQuestionPattern('');
      setApprovedAnswer('');
      await loadConversationDetails(activeConv.id);
      await loadConversations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleShopAi = async () => {
    try {
      const newVal = !shopAiActive;
      await api.patch(`/shops/${shop!.id}/ai/toggle`, { isAiEnabled: newVal });
      setShopAiActive(newVal);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle AI');
    }
  };

  const handleToggleConvAi = async () => {
    if (!activeConv) return;
    try {
      const newVal = !activeConv.isAiEnabled;
      await api.patch(`/shops/${shop!.id}/ai/conversations/${activeConv.id}/toggle`, {
        isAiEnabled: newVal,
      });
      setActiveConv({ ...activeConv, isAiEnabled: newVal });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle conversation AI');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Shop AI switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.chatsTitle}</h2>
          <p className="text-xs text-slate-500">
            {language === 'am' ? 'የደንበኞች ጥያቄዎችን ይመልሱ፣ AI የሚጠቀምባቸውን ህጎች ያስተካክሉ' : 'Review customer queries, correct AI replies, and train shop rules'}
          </p>
        </div>

        {/* Global Shop AI Toggle (FR-44) */}
        <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
          <Bot className={`w-4 h-4 ${shopAiActive ? 'text-purple-600' : 'text-slate-400'}`} />
          <span className="text-xs font-semibold text-slate-700">{t.shopAiToggle}</span>
          <button
            onClick={handleToggleShopAi}
            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
              shopAiActive ? 'bg-purple-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow block" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-h-[600px]">
        {/* Left Column: Conversation list (4 cols) */}
        <div className="lg:col-span-4 border-r border-slate-200 flex flex-col">
          {/* Filter Tabs */}
          <div className="p-3 border-b border-slate-100 flex bg-slate-50 gap-1 text-[11px] font-bold">
            <button
              onClick={() => setFilter('waiting')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition ${
                filter === 'waiting' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.tabWaitingOwner}
            </button>
            <button
              onClick={() => setFilter('ai_answered')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition ${
                filter === 'ai_answered' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.tabAiAnswered}
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition ${
                filter === 'closed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.tabClosed}
            </button>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center">
                {language === 'am' ? 'ምንም ውይይት የለም' : 'No conversations found'}
              </p>
            ) : (
              conversations.map((conv) => {
                const isSelected = activeConv?.id === conv.id;
                const lastMsg = conv.messages && conv.messages[0];
                return (
                  <div
                    key={conv.id}
                    onClick={() => loadConversationDetails(conv.id)}
                    className={`p-3.5 cursor-pointer transition flex items-start justify-between ${
                      isSelected ? 'bg-purple-50/70 border-l-4 border-purple-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800 truncate">
                          {conv.customer?.name || 'Customer'}
                        </span>
                        {conv.status === 'WAITING_OWNER' && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {lastMsg?.text || 'No messages yet'}
                      </p>
                    </div>

                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {formatDualDate(conv.updatedAt, useEthiopianCalendar, language)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat messages & Reply form (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-800">
                      {activeConv.customer?.name || 'Customer'}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      {activeConv.customer?.phone || 'Telegram ID: ' + activeConv.customer?.telegramId}
                    </p>
                  </div>
                </div>

                {/* Per-conversation AI Toggle */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] text-slate-500 hidden sm:inline">{t.conversationAiToggle}</span>
                  <button
                    onClick={handleToggleConvAi}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                      activeConv.isAiEnabled
                        ? 'bg-purple-100 border-purple-200 text-purple-700'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                  >
                    AI: {activeConv.isAiEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 max-h-[420px]">
                {activeConv.messages?.map((msg: any) => {
                  const isCustomer = msg.sender === 'CUSTOMER';
                  const isAi = msg.sender === 'AI';
                  const isOwner = msg.sender === 'OWNER';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        {isAi ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                            <Bot className="w-3 h-3" />
                            <span>{t.aiAssistantBadge}</span>
                          </span>
                        ) : isOwner ? (
                          <span className="text-[10px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
                            {t.ownerBadge}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {activeConv.customer?.name || t.customerBadge}
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                          isCustomer
                            ? 'bg-slate-100 text-slate-800 rounded-tl-sm'
                            : isAi
                            ? 'bg-purple-50 text-purple-900 border border-purple-200/80 rounded-tr-sm'
                            : 'bg-brand-600 text-white rounded-tr-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Owner Reply Form (O11) */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={replyText}
                    onChange={(e) => {
                      setReplyText(e.target.value);
                      if (saveAsRule && !approvedAnswer) {
                        setApprovedAnswer(e.target.value);
                      }
                    }}
                    placeholder={t.typeReplyPrompt}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !replyText.trim()}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
                  >
                    <span>{t.sendReplyBtn}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Save as Rule Checkbox (FR-42, FR-43) */}
                <div className="pt-2 border-t border-slate-200/60">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={saveAsRule}
                      onChange={(e) => setSaveAsRule(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t.saveAsRuleCheckbox}</span>
                  </label>

                  {saveAsRule && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">
                          {t.questionPatternLabel}
                        </label>
                        <input
                          type="text"
                          required
                          value={questionPattern}
                          onChange={(e) => setQuestionPattern(e.target.value)}
                          placeholder="e.g. Do you deliver to Bole?"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">
                          {t.approvedAnswerLabel}
                        </label>
                        <input
                          type="text"
                          required
                          value={approvedAnswer || replyText}
                          onChange={(e) => setApprovedAnswer(e.target.value)}
                          placeholder="e.g. Yes, we deliver to Bole for 100 ETB."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center h-full py-20 text-slate-400 text-xs">
              {language === 'am' ? 'ውይይት ይምረጡ' : 'Select a conversation to view and reply'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
