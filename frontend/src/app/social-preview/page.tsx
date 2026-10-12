'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  ShoppingBag,
  Heart,
  MessageCircle,
  Share2,
  Video,
  Play,
  Check,
} from 'lucide-react';

export default function SocialPreviewPage() {
  const [activeTab, setActiveTab] = useState<'p04' | 'p10' | 'p05' | 'p11'>('p04');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/overview"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-sm text-white">Buyer Social Discovery (P04, P10, P05, P11)</h1>
            <p className="text-[11px] text-slate-400">Experience how shoppers encounter the store on Facebook & TikTok</p>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('p04')}
            className={`py-1 px-2.5 rounded-lg whitespace-nowrap transition ${
              activeTab === 'p04' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            P04 Facebook Post
          </button>
          <button
            onClick={() => setActiveTab('p10')}
            className={`py-1 px-2.5 rounded-lg whitespace-nowrap transition ${
              activeTab === 'p10' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            P10 Facebook Album
          </button>
          <button
            onClick={() => setActiveTab('p05')}
            className={`py-1 px-2.5 rounded-lg whitespace-nowrap transition ${
              activeTab === 'p05' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            P05 TikTok Feed
          </button>
          <button
            onClick={() => setActiveTab('p11')}
            className={`py-1 px-2.5 rounded-lg whitespace-nowrap transition ${
              activeTab === 'p11' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            P11 TikTok Video
          </button>
        </div>
      </header>

      {/* Screen Body */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 sm:p-6 flex flex-col justify-center">
        {/* P04: Buyer Sees Single Post on Facebook */}
        {activeTab === 'p04' && (
          <div className="bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow">
                  B
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">Bole Elegant Leather</h3>
                  <p className="text-[11px] text-slate-500">Sponsored · 🌍</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-800 leading-relaxed">
                Men Genuine Leather Shoes. Size 40, 41, 42, 43 available. Price: 2,500 ETB. Fast delivery in Addis Ababa!
              </p>

              <div className="h-56 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600"
                  alt="Shoes"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Call to Action Button (Order on Telegram · ይዘዙ) */}
              <Link
                href="/bot-simulator"
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Order on Telegram · ይዘዙ</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* P10: Buyer Swipes Photos on Facebook */}
        {activeTab === 'p10' && (
          <div className="bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow">
                B
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 leading-tight">Bole Elegant Leather</h3>
                <p className="text-[11px] text-slate-500">Photo Album (1 of 4) · 🌍</p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-800">
                New Summer Arrivals! Swipe through the collection. Tap below to buy directly in Telegram.
              </p>

              <div className="h-56 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600"
                  alt="Sneakers"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-white shadow" />
                  <span className="w-2 h-2 rounded-full bg-white/50" />
                  <span className="w-2 h-2 rounded-full bg-white/50" />
                </div>
              </div>

              <Link
                href="/bot-simulator"
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Order on Telegram · ይዘዙ</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* P05: Buyer Sees Post on TikTok with Link in Bio */}
        {activeTab === 'p05' && (
          <div className="bg-black text-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800 relative h-[560px] flex flex-col justify-between p-4">
            <div className="flex justify-between items-center z-10">
              <span className="text-xs font-bold">TikTok Feed</span>
              <span className="text-xs text-slate-400">@bole_leather</span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
              <img
                src="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600"
                alt="TikTok Post"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
            </div>

            <div className="z-10 space-y-3">
              <div className="p-3 bg-black/60 rounded-2xl border border-white/10 backdrop-blur-sm text-xs space-y-1">
                <span className="font-bold text-white block">@bole_leather profile card</span>
                <p className="text-slate-300 text-[11px]">
                  📍 Addis Ababa | Original leather shoes | Order link in bio!
                </p>
                <Link
                  href="/bot-simulator"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-sky-400 underline font-semibold"
                >
                  <span>t.me/GebeyaShopBot?start=shop_bole</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <Link
                href="/bot-simulator"
                className="w-full py-3 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs text-center flex items-center justify-center gap-2 shadow-lg transition"
              >
                <span>Open Shop in Telegram</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* P11: Buyer Watches TikTok Video and Taps Link */}
        {activeTab === 'p11' && (
          <div className="bg-black text-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800 relative h-[560px] flex flex-col justify-between p-4">
            <div className="flex justify-between items-center z-10">
              <span className="text-xs font-bold text-pink-400">Watching Video Preview</span>
              <span className="text-xs text-slate-400">P11</span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
              <img
                src="https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600"
                alt="TikTok Video Playing"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
              <Play className="w-12 h-12 text-white/80 z-10" />
            </div>

            <div className="z-10 space-y-2">
              <p className="text-xs text-white drop-shadow">
                Check out the quality craftsmanship! Tap bio link to place your order on Telegram.
              </p>

              <Link
                href="/bot-simulator"
                className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs text-center flex items-center justify-center gap-2 shadow-lg transition"
              >
                <span>Tap Link to Order in Telegram (L01)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
