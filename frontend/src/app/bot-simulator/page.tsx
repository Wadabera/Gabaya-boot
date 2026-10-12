'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import {
  Send,
  Smartphone,
  Bot,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Trash2,
} from 'lucide-react';

interface SimulatedMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  photoUrl?: string;
  inlineKeyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  timestamp: string;
}

export default function BotSimulatorPage() {
  const [messages, setMessages] = useState<SimulatedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [telegramUserId] = useState<number>(() => Math.floor(10000000 + Math.random() * 90000000));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadShops = async () => {
    try {
      // Fetch shops to let user select
      const res = await api.get('/admin/shops');
      setShops(res.data);
      if (res.data.length > 0) {
        const firstShop = res.data[0];
        setSelectedShopId(firstShop.id);
        startBotSession(firstShop.id);
      } else {
        startBotSession('');
      }
    } catch {
      startBotSession('');
    }
  };

  const startBotSession = async (shopId: string) => {
    setMessages([]);
    setLoading(true);
    try {
      const command = shopId ? `/start shop_${shopId}` : '/start';
      const res = await api.post('/telegram/simulate', {
        fromId: telegramUserId,
        chatId: telegramUserId,
        messageText: command,
      });

      setMessages([
        {
          id: 'user_start',
          sender: 'user',
          text: command,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: 'bot_start',
          sender: 'bot',
          text: res.data?.text || 'Welcome to Gebeya Bot!',
          photoUrl: res.data?.photoUrl,
          inlineKeyboard: res.data?.replyMarkup?.inline_keyboard,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Failed to start simulator', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMsgText = inputText.trim();
    setInputText('');

    const newMsg: SimulatedMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      const res = await api.post('/telegram/simulate', {
        fromId: telegramUserId,
        chatId: telegramUserId,
        messageText: userMsgText,
      });

      if (res.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: 'bot',
            text: res.data.text || '',
            photoUrl: res.data.photoUrl,
            inlineKeyboard: res.data.replyMarkup?.inline_keyboard,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Error: ${err.response?.data?.message || err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = async (btn: { text: string; callback_data?: string; url?: string }) => {
    if (btn.url) {
      window.open(btn.url, '_blank');
      return;
    }

    if (!btn.callback_data) return;

    const clickNotice: SimulatedMessage = {
      id: `user_click_${Date.now()}`,
      sender: 'user',
      text: `[Clicked: ${btn.text}]`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, clickNotice]);
    setLoading(true);

    try {
      const res = await api.post('/telegram/simulate', {
        fromId: telegramUserId,
        chatId: telegramUserId,
        callbackData: btn.callback_data,
      });

      if (res.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: 'bot',
            text: res.data.text || '',
            photoUrl: res.data.photoUrl,
            inlineKeyboard: res.data.replyMarkup?.inline_keyboard,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Error: ${err.response?.data?.message || err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white">Telegram Bot Simulator</h1>
              <span className="text-[10px] text-emerald-400">Connected to /api/telegram/simulate</span>
            </div>
          </div>
        </div>

        {/* Shop Selector */}
        <div className="flex items-center gap-2">
          {shops.length > 0 && (
            <select
              value={selectedShopId}
              onChange={(e) => {
                setSelectedShopId(e.target.value);
                startBotSession(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => startBotSession(selectedShopId)}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition"
            title="Restart Session (/start)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Telegram Chat Container */}
      <div className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col justify-between overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 py-4">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-md leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-sky-600 text-white rounded-tr-sm'
                      : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-sm'
                  }`}
                >
                  {/* Image attachment */}
                  {m.photoUrl && (
                    <div className="mb-2.5 rounded-xl overflow-hidden border border-slate-700 max-h-56">
                      <img src={m.photoUrl} alt="Product" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Text */}
                  <div>{m.text}</div>

                  {/* Inline Keyboards */}
                  {m.inlineKeyboard && m.inlineKeyboard.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/80 space-y-1.5">
                      {m.inlineKeyboard.map((row, rIdx) => (
                        <div key={rIdx} className="flex flex-wrap gap-1.5">
                          {row.map((btn, bIdx) => (
                            <button
                              key={bIdx}
                              onClick={() => handleButtonClick(btn)}
                              className="flex-1 min-w-[120px] py-1.5 px-3 rounded-lg bg-slate-700 hover:bg-sky-600 text-white font-medium text-[11px] transition text-center shadow-sm"
                            >
                              {btn.text}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  <span className={`block text-[9px] mt-1 text-right ${isUser ? 'text-sky-200' : 'text-slate-400'}`}>
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
              <Bot className="w-4 h-4 animate-bounce text-sky-400" />
              <span>Shop Bot is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="pt-2">
          {/* Quick Command Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 text-[11px] font-semibold text-slate-300">
            <button
              onClick={() => { setInputText('ምርቶች'); }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap"
            >
              ምርቶች (Catalog)
            </button>
            <button
              onClick={() => { setInputText('የሱቅ መረጃ'); }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap"
            >
              የሱቅ መረጃ (Info)
            </button>
            <button
              onClick={() => { setInputText('ዋጋው ስንት ነው?'); }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap"
            >
              ጥያቄ (Ask AI)
            </button>
            <button
              onClick={() => { setInputText('ትዕዛዞቼ'); }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap"
            >
              ትዕዛዞቼ (My Orders)
            </button>
            <button
              onClick={() => { setInputText('መረጃዬን ሰርዝ'); }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-red-400 whitespace-nowrap"
            >
              መረጃዬን ሰርዝ (Delete Data)
            </button>
          </div>

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message or question to the bot..."
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="p-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-2xl transition shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
