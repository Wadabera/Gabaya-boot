'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  UserCheck,
  Store,
  QrCode,
  Share2,
  Eye,
  ShoppingBag,
  BellRing,
  Bot,
  Shield,
  CreditCard,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

export default function OverviewPage() {
  const [tab, setTab] = useState<'s00' | 's01' | 's02'>('s00');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-sm text-white">UX/UI Overview Guide</h1>
            <p className="text-[11px] text-slate-400">Screens S00, S01, S02 from SRS Design Specifications</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setTab('s00')}
            className={`py-1 px-3 rounded-lg transition ${
              tab === 's00' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            S00 How it Works
          </button>
          <button
            onClick={() => setTab('s01')}
            className={`py-1 px-3 rounded-lg transition ${
              tab === 's01' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            S01 Who Uses What
          </button>
          <button
            onClick={() => setTab('s02')}
            className={`py-1 px-3 rounded-lg transition ${
              tab === 's02' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            S02 Money Flow
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 sm:p-10">
        {/* SCREEN S00: How ShopBot Works in 7 Steps */}
        {tab === 's00' && (
          <div className="space-y-6">
            <div className="text-center max-w-lg mx-auto mb-8">
              <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">Screen S00</span>
              <h2 className="text-2xl font-black text-white mt-1">How ShopBot Works (Start Here)</h2>
              <p className="text-xs text-slate-400 mt-2">
                Seven numbered cards, from seller sign-up to handling the first order. Each card opens that step.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  num: 1,
                  title: 'Seller signs up',
                  desc: 'Phone number and SMS code',
                  link: '/onboarding',
                  btn: 'O1 Owner sign in',
                  icon: UserCheck,
                },
                {
                  num: 2,
                  title: 'Seller adds shop and products',
                  desc: 'Name, area, photos, prices, stock',
                  link: '/onboarding',
                  btn: 'O3 Shop details',
                  icon: Store,
                },
                {
                  num: 3,
                  title: 'Seller gets the shop link and QR',
                  desc: 'One deep link for the whole shop',
                  link: '/dashboard/profile',
                  btn: 'O5 Share your shop',
                  icon: QrCode,
                },
                {
                  num: 4,
                  title: 'Seller posts the link on Facebook and TikTok',
                  desc: 'Same photos, plus the link',
                  link: '/dashboard/posting-kit',
                  btn: 'P01 Prepare post',
                  icon: Share2,
                },
                {
                  num: 5,
                  title: 'Buyer sees the post and taps the link',
                  desc: 'Facebook feed or TikTok bio',
                  link: '/social-preview',
                  btn: 'P04 Buyer sees post',
                  icon: Eye,
                },
                {
                  num: 6,
                  title: 'Buyer orders inside Telegram',
                  desc: 'Browse, cart, checkout, confirm',
                  link: '/bot-simulator',
                  btn: 'L01 Buyer chooses language',
                  icon: ShoppingBag,
                },
                {
                  num: 7,
                  title: 'Seller gets and handles the order',
                  desc: 'Telegram notification, then Confirm & Stock reduction',
                  link: '/dashboard/orders',
                  btn: 'P06 Seller gets order',
                  icon: BellRing,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.num}
                    className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 hover:border-brand-500/50 transition flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center font-black text-sm">
                        {item.num}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{item.title}</h3>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </div>
                    </div>

                    <Link
                      href={item.link}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-brand-600 text-white font-semibold text-xs flex items-center gap-1.5 transition whitespace-nowrap shadow-sm"
                    >
                      <span>{item.btn}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SCREEN S01: Who Uses What */}
        {tab === 's01' && (
          <div className="space-y-6">
            <div className="text-center max-w-lg mx-auto mb-8">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Screen S01</span>
              <h2 className="text-2xl font-black text-white mt-1">Who Uses What</h2>
              <p className="text-xs text-slate-400 mt-2">
                Explains who uses a website and who uses the bot across all three platform roles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Buyer Card */}
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">Buyer (Customer)</h3>
                  <span className="text-[11px] font-semibold text-sky-400 block mb-3">Telegram bot only</span>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Menu, products, order, My orders, My details. No website, no sign-up needed.
                  </p>
                </div>
                <Link
                  href="/bot-simulator"
                  className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold text-center block transition"
                >
                  L01 Buyer Chooses Language
                </Link>
              </div>

              {/* Seller Card */}
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center mb-4">
                    <Store className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">Seller (Shop Owner)</h3>
                  <span className="text-[11px] font-semibold text-brand-400 block mb-3">Website + Telegram alerts</span>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Dashboard on phone or desktop browser. Telegram alerts tell them about new orders and customer questions.
                  </p>
                </div>
                <Link
                  href="/onboarding"
                  className="w-full py-2.5 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold text-center block transition"
                >
                  O1 Owner Sign In
                </Link>
              </div>

              {/* Admin Card */}
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">Platform Admin</h3>
                  <span className="text-[11px] font-semibold text-purple-400 block mb-3">Admin portal website</span>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Approves shops, manages subscription plans, reviews manual payments, and watches complaints.
                  </p>
                </div>
                <Link
                  href="/admin"
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold text-center block transition"
                >
                  AD0 Home Overview
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN S02: Where the Money Goes */}
        {tab === 's02' && (
          <div className="space-y-6">
            <div className="text-center max-w-lg mx-auto mb-8">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Screen S02</span>
              <h2 className="text-2xl font-black text-white mt-1">Where the Money Goes</h2>
              <p className="text-xs text-slate-400 mt-2">
                ShopBot never holds buyer money. All buyer payments go straight to the shop owner.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Payment 1 */}
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black mb-4">
                    1
                  </div>
                  <h3 className="font-bold text-white text-base mb-2">1. Buyer pays the seller</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Cash on delivery, pay the shop's own bank/mobile account, or pay at pickup. The platform never holds buyer money.
                  </p>
                </div>
                <Link
                  href="/bot-simulator"
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold text-center block transition"
                >
                  PAY1 Choose How to Pay
                </Link>
              </div>

              {/* Payment 2 */}
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black mb-4">
                    2
                  </div>
                  <h3 className="font-bold text-white text-base mb-2">2. Seller pays ShopBot</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Monthly subscription plan (Free, Basic, Pro) by bank transfer (CBE) or mobile money (Telebirr).
                  </p>
                </div>
                <Link
                  href="/dashboard/subscription"
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold text-center block transition"
                >
                  D06 Pay the Subscription
                </Link>
              </div>

              {/* Payment 3 */}
              <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black mb-4">
                    3
                  </div>
                  <h3 className="font-bold text-white text-base mb-2">3. Admin confirms</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Checks transaction reference & receipt image, logs the audit record, and activates the plan.
                  </p>
                </div>
                <Link
                  href="/admin/payments"
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold text-center block transition"
                >
                  A3 Confirm Subscription
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
