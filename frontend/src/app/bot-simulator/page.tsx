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
  Camera,
  Image as ImageIcon,
  User,
  Crown,
  Plus,
  Check,
  Share2,
  X,
} from 'lucide-react';

interface SimulatedMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  photoUrl?: string;
  inlineKeyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  timestamp: string;
}

const SAMPLE_PHOTOS = [
  {
    title: 'Leather Boots',
    url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600',
    caption: 'የወንድ የቆዳ ጫማ 2800 ETB 40,41,42,43',
  },
  {
    title: 'Leather Handbag',
    url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600',
    caption: 'Bole Leather Handbag 2200 ETB Brown, Black',
  },
  {
    title: 'Winter Jacket',
    url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600',
    caption: 'Classic Warm Jacket 3500 ETB M, L, XL',
  },
  {
    title: 'Bank Receipt',
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    caption: 'የCBE ክፍያ ደረሰኝ ከፍያለሁ',
  },
];

export default function BotSimulatorPage() {
  const [messages, setMessages] = useState<SimulatedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [activeRole, setActiveRole] = useState<'buyer' | 'owner'>('buyer');
  const [telegramUserId] = useState<number>(() => Math.floor(10000000 + Math.random() * 90000000));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Photo sending state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState(SAMPLE_PHOTOS[0].url);
  const [photoCaptionInput, setPhotoCaptionInput] = useState(SAMPLE_PHOTOS[0].caption);

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadShops = async () => {
    try {
      let shopList = [];
      try {
        const res = await api.get('/shops/public/list');
        shopList = res.data;
      } catch {
        const adminRes = await api.get('/admin/shops');
        shopList = adminRes.data;
      }
      setShops(shopList);
      if (shopList.length > 0) {
        const firstShop = shopList[0];
        setSelectedShopId(firstShop.id);
        startBotSession(firstShop.id);
      } else {
        startBotSession('');
      }
    } catch {
      startBotSession('');
    }
  };

  const startBotSession = async (shopId: string, role = activeRole) => {
    setMessages([]);
    setLoading(true);
    try {
      const command = role === 'owner' ? '/owner' : shopId ? `/start shop_${shopId}` : '/start';
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

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (!textToSend) return;

    if (customText === undefined) {
      setInputText('');
    }

    const newMsg: SimulatedMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      const res = await api.post('/telegram/simulate', {
        fromId: telegramUserId,
        chatId: telegramUserId,
        messageText: textToSend,
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

  const handleSendPhoto = async () => {
    if (!photoUrlInput.trim()) return;
    setShowPhotoModal(false);

    const newMsg: SimulatedMessage = {
      id: `user_photo_${Date.now()}`,
      sender: 'user',
      text: photoCaptionInput ? `[Photo Upload]: ${photoCaptionInput}` : '[Photo Upload]',
      photoUrl: photoUrlInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      const res = await api.post('/telegram/simulate', {
        fromId: telegramUserId,
        chatId: telegramUserId,
        photoUrl: photoUrlInput,
        caption: photoCaptionInput,
        messageText: photoCaptionInput,
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
      text: `[🔘 ${btn.text}]`,
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
      {/* Top Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
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
              <h1 className="font-bold text-sm text-white">Telegram ShopBot Simulator</h1>
              <span className="text-[10px] text-emerald-400">Live AI Assistant & FR-14 Product Engine</span>
            </div>
          </div>
        </div>

        {/* Role & Shop Selectors */}
        <div className="flex items-center gap-2">
          {/* Role Mode Switcher */}
          <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => {
                setActiveRole('buyer');
                startBotSession(selectedShopId, 'buyer');
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition ${
                activeRole === 'buyer'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Buyer</span>
            </button>
            <button
              onClick={() => {
                setActiveRole('owner');
                startBotSession(selectedShopId, 'owner');
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition ${
                activeRole === 'owner'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>Owner (FR-14)</span>
            </button>
          </div>

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
            title="Restart Session"
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
                  {/* Media attachment (Image or Video) */}
                  {m.photoUrl && (
                    <div className="mb-2.5 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-md">
                      {m.photoUrl.match(/\.(mp4|webm|mov|ogg)$/i) ? (
                        <div className="relative">
                          <video
                            src={m.photoUrl}
                            controls
                            muted
                            playsInline
                            className="w-full max-h-60 object-contain rounded-2xl"
                          />
                          <span className="absolute top-2 left-2 text-[9px] font-bold bg-sky-600/90 text-white px-2 py-0.5 rounded-md backdrop-blur-md">
                            🎬 Product Video
                          </span>
                        </div>
                      ) : (
                        <img
                          src={m.photoUrl}
                          alt="Attachment"
                          className="w-full max-h-60 object-cover hover:scale-105 transition duration-300"
                        />
                      )}
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
                              className="flex-1 min-w-[120px] py-1.5 px-3 rounded-lg bg-slate-700 hover:bg-sky-600 text-white font-medium text-[11px] transition text-center shadow-sm flex items-center justify-center gap-1"
                            >
                              <span>{btn.text}</span>
                              {btn.url && <ExternalLink className="w-3 h-3 opacity-70" />}
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

        {/* Input Bar & Actions */}
        <div className="pt-2">
          {/* Quick Action Pills based on active role */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 text-[11px] font-semibold text-slate-300">
            {activeRole === 'owner' ? (
              <>
                <button
                  onClick={() => setShowPhotoModal(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg whitespace-nowrap flex items-center gap-1 font-bold shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>➕ Add Product (FR-14)</span>
                </button>
                <button
                  onClick={() => handleSendMessage(undefined, '/owner')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap"
                >
                  👑 Owner Portal
                </button>
                <button
                  onClick={() => handleSendMessage(undefined, '/orders')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap"
                >
                  📦 Pending Orders
                </button>
                <button
                  onClick={() => handleSendMessage(undefined, '/sales')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap"
                >
                  📊 Sales Report
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSendMessage(undefined, 'ምርቶች')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap"
                >
                  🛍️ Catalog (ምርቶች)
                </button>
                <button
                  onClick={() => handleSendMessage(undefined, '/cart')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap"
                >
                  🛒 Cart (ጋሪ)
                </button>
                <button
                  onClick={() => handleSendMessage(undefined, 'ትዕዛዞቼ')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap"
                >
                  📦 My Orders
                </button>
                <button
                  onClick={() => handleSendMessage(undefined, 'ዋጋው ስንት ነው?')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap"
                >
                  ❓ Ask AI (ዋጋ)
                </button>
                <button
                  onClick={() => handleSendMessage(undefined, 'የሱቅ መረጃ')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 whitespace-nowrap"
                >
                  🏪 Shop Info
                </button>
              </>
            )}
          </div>

          {/* Text input form with camera icon */}
          <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition border border-slate-700"
              title="Upload Photo (Product creation or Receipt)"
            >
              <Camera className="w-4 h-4 text-sky-400" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={activeRole === 'owner' ? "Send owner command or product text..." : "Type message, search product, or ask question..."}
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

      {/* Send Photo Modal (FR-14 Simulator) */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">Send Photo to Bot (FR-14)</h3>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="w-7 h-7 rounded-full bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Sample Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 block">Choose a sample:</span>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_PHOTOS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPhotoUrlInput(sample.url);
                      setPhotoCaptionInput(sample.caption);
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition text-xs ${
                      photoUrlInput === sample.url
                        ? 'border-sky-500 bg-sky-950/40 text-white'
                        : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <img src={sample.url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    <span className="truncate font-semibold text-[11px]">{sample.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Preview & URL input */}
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Image URL:</label>
                <input
                  type="text"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Caption (Product Name & Price in ETB):
                </label>
                <input
                  type="text"
                  value={photoCaptionInput}
                  onChange={(e) => setPhotoCaptionInput(e.target.value)}
                  placeholder="e.g. Leather Bag 1800 ETB S,M,L"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendPhoto}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md transition"
              >
                Send Photo to Bot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
