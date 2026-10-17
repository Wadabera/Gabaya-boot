'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ShoppingBag,
  Bot,
  Shield,
  ArrowRight,
  Store,
  CheckCircle,
  Smartphone,
  Sparkles,
  Zap,
  TrendingUp,
  MessageSquare,
  Package,
  Layers,
  Send,
  Eye,
  CreditCard,
  QrCode,
} from 'lucide-react';

export default function HomePage() {
  const { user, shop, isLoading, language, setLanguage } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'buyer' | 'seller' | 'ai'>('buyer');

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'ADMIN') {
        router.push('/admin');
      } else if (user.role === 'OWNER') {
        if (!shop) {
          router.push('/onboarding');
        } else if (shop.status === 'PENDING') {
          router.push('/waiting-approval');
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [user, shop, isLoading, router]);

  const isAm = language === 'am';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 bg-mesh text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1.5 leading-tight">
                {isAm ? 'ገበያ ቡት' : 'Gebeya Boot'}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-200">
                  AI v2
                </span>
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                {isAm ? 'የቴሌግራም ንግድ AI ረዳት መድረክ' : 'Telegram Shop & AI Assistant Platform'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setLanguage('am')}
                className={`px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  isAm ? 'bg-white shadow text-slate-900 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                አማርኛ
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  !isAm ? 'bg-white shadow text-slate-900 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                English
              </button>
            </div>

            <Link
              href="/admin/login"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200/80 bg-white/70 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm transition"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isAm ? 'አድሚን' : 'Admin'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col items-center">
        {/* Top Floating Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-brand-200 shadow-sm text-brand-800 text-xs font-semibold mb-6 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500 radar-pulse" />
          <span>
            {isAm
              ? '🇪🇹 ለኢትዮጵያ ነጋዴዎች የተዘጋጀ · በቴሌግራም በቀጥታ ይሽጡ'
              : '🇪🇹 Built for Ethiopian Merchants · Sell Directly Inside Telegram'}
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight text-center max-w-4xl leading-[1.15]">
          {isAm ? (
            <>
              የቴሌግራም ቻናልዎን ወደ{' '}
              <span className="bg-gradient-to-r from-brand-600 via-emerald-600 to-sky-600 bg-clip-text text-transparent">
                ዘመናዊ AI የሽያጭ ሱቅ
              </span>{' '}
              ይለውጡ!
            </>
          ) : (
            <>
              Transform Your Telegram Channel Into a{' '}
              <span className="bg-gradient-to-r from-brand-600 via-emerald-600 to-sky-600 bg-clip-text text-transparent">
                Smart AI Storefront
              </span>
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-xl text-slate-600 text-center max-w-3xl leading-relaxed">
          {isAm
            ? 'ደንበኞች ያለ ምንም አፕሊኬሽን በቴሌግራም እቃዎችን እንዲመርጡ፣ በAI ረዳት ጥያቄዎቻቸውን እንዲመልሱ እና በቴሌብር ወይም በጥሬ ገንዘብ እንዲያዙ ያድርጉ።'
            : 'Customers browse, order, and get instant answers in Amharic inside Telegram. Never miss orders or repeat prices again.'}
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-glow glow-btn-primary transition duration-200 active:scale-95"
          >
            <Store className="w-5 h-5" />
            <span>{isAm ? 'ሱቅዎን በነፃ ያስጀምሩ' : 'Start Shop Onboarding'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/bot-simulator"
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold shadow-sm hover:border-sky-300 hover:shadow-glow-blue glow-btn-telegram transition duration-200 active:scale-95"
          >
            <Smartphone className="w-5 h-5 text-sky-500" />
            <span>{isAm ? 'የቴሌግራም ቦት ሞካሪ (Simulator)' : 'Try Telegram Bot Simulator'}</span>
          </Link>

          <Link
            href="/overview"
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-700 font-semibold hover:bg-slate-200/80 transition"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>{isAm ? 'የመተግበሪያው አሰራር (S00–S02)' : 'Architecture Blueprint'}</span>
          </Link>
        </div>

        {/* Live Interactive Interactive Showcase (Phone & Screen Simulation) */}
        <div className="mt-14 w-full max-w-4xl">
          {/* Tab Selector */}
          <div className="flex justify-center mb-6">
            <div className="bg-white/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-md inline-flex gap-1">
              <button
                onClick={() => setActiveTab('buyer')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  activeTab === 'buyer'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>{isAm ? '1. የደንበኛ የቴሌግራም እይታ' : '1. Telegram Buyer'}</span>
              </button>
              <button
                onClick={() => setActiveTab('seller')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  activeTab === 'seller'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>{isAm ? '2. የነጋዴው ዳሽቦርድ' : '2. Seller Dashboard'}</span>
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  activeTab === 'ai'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>{isAm ? '3. የታመነ AI ረዳት' : '3. Grounded AI'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Phone & Card Window */}
          <div className="relative mx-auto max-w-lg bg-slate-900 rounded-[2.5rem] p-4 shadow-2xl ring-1 ring-slate-800">
            {/* Phone Top Notch */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-900 mr-2" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>

            {/* Inner Phone Screen */}
            <div className="bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-200 min-h-[460px] flex flex-col relative text-left">
              {/* Phone Header Bar */}
              <div className="bg-sky-600 text-white px-4 pt-8 pb-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                    GB
                  </div>
                  <div>
                    <h4 className="font-bold text-xs leading-none">Bole Elegant Leather Bot</h4>
                    <span className="text-[10px] text-sky-100 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      bot · {isAm ? 'ክፍት ነው' : 'online'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono">
                  t.me/{process.env.NEXT_PUBLIC_BOT_USERNAME || 'gebayawa_bot'}
                </span>
              </div>

              {/* Screen Content based on Active Tab */}
              <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto space-y-3">
                {activeTab === 'buyer' && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Bot Welcome Bubble */}
                    <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm text-xs space-y-2 max-w-[85%]">
                      <p className="font-semibold text-slate-800">
                        {isAm
                          ? 'እንኳን ደህና መጡ ወደ ቦሌ ኤሌጋንት ሌዘር! ምን ማዘዝ ይፈልጋሉ?'
                          : 'Welcome to Bole Elegant Leather! What would you like to order?'}
                      </p>
                    </div>

                    {/* Product Card Inside Chat */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-[90%]">
                      <div className="h-28 bg-slate-100 relative overflow-hidden">
                        <img
                          src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80"
                          alt="Genuine Leather Jacket"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                          4,500 ETB
                        </span>
                      </div>
                      <div className="p-3">
                        <h5 className="font-bold text-xs text-slate-900">
                          {isAm ? 'ኦሪጅናል የቆዳ ጃኬት' : 'Addis Genuine Leather Jacket'}
                        </h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {isAm ? 'መጠኖች: M, L, XL | በክምችት አለ (5 ቀሪ)' : 'Sizes: M, L, XL | In stock (5 left)'}
                        </p>
                        <div className="mt-2 flex gap-1.5">
                          <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-sky-200 flex-1 text-center">
                            {isAm ? 'ወደ ጋሪ ጨምር' : 'Add to cart'}
                          </span>
                          <span className="bg-brand-600 text-white text-[10px] font-bold px-3 py-1 rounded-lg shadow-sm">
                            {isAm ? 'አሁኑኑ ይዘዙ' : 'Order Now'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Action Pill */}
                    <div className="self-end bg-sky-500 text-white text-xs px-3 py-1.5 rounded-2xl rounded-tr-sm ml-auto max-w-[80%] font-medium">
                      {isAm ? 'በደረሰኝ ጊዜ በጥሬ ገንዘብ (Cash on Delivery) ቦሌ' : 'Cash on Delivery to Bole Medhanialem'}
                    </div>

                    {/* Order Sent Message */}
                    <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-emerald-200 bg-emerald-50/50 text-xs text-slate-800 space-y-1">
                      <span className="font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        {isAm ? 'ትዕዛዝዎ በተሳካ ሁኔታ ተልኳል! (#1004)' : 'Order Sent Successfully! (#1004)'}
                      </span>
                      <p className="text-[10px] text-slate-600">
                        {isAm
                          ? 'ሱቁ ትዕዛዙን ሲያረጋግጥ መልእክት እዚህ ይደርስዎታል።'
                          : 'You will receive a Telegram message once the owner confirms.'}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'seller' && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Live Alert Banner */}
                    <div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-md flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-white radar-pulse" />
                        <div>
                          <p className="font-black text-xs">{isAm ? 'አዲስ ትዕዛዝ ደርሷል!' : 'New Order #1004'}</p>
                          <p className="text-[10px] text-emerald-100">4,500 ETB · Dawit (0911223344)</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-white text-emerald-800 px-2.5 py-1 rounded-lg">
                        {isAm ? 'አረጋግጥ' : 'Confirm'}
                      </span>
                    </div>

                    {/* Live Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {isAm ? 'የዛሬ ሽያጭ' : "Today's Income"}
                        </span>
                        <p className="text-base font-black text-slate-900 mt-0.5">18,200 ETB</p>
                        <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
                          <TrendingUp className="w-2.5 h-2.5" /> +4 ትዕዛዞች
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {isAm ? 'የቦት ሁኔታ' : 'Bot Status'}
                        </span>
                        <p className="text-xs font-black text-emerald-700 flex items-center gap-1 mt-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {isAm ? 'በመስራት ላይ' : 'Active'}
                        </p>
                        <span className="text-[9px] text-slate-500 mt-1 block">Free Plan · 12/20 Orders</span>
                      </div>
                    </div>

                    {/* Attention List */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                      <span className="font-bold text-slate-800 text-[11px] block">
                        {isAm ? 'ትኩረት የሚሹ ጉዳዮች (Needs Attention)' : 'Needs Attention'}
                      </span>
                      <div className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100">
                        <span className="text-slate-600">
                          {isAm ? 'የተረጋገጠ ክፍያ ማረጋገጫ' : 'Direct payment confirmation'}
                        </span>
                        <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">1 ማረጋገጫ</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] py-1">
                        <span className="text-slate-600">{isAm ? 'ያለቀ ስቶክ' : 'Low stock products'}</span>
                        <span className="text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded">1 እቃ</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Buyer Question in Amharic */}
                    <div className="self-end bg-sky-500 text-white text-xs px-3.5 py-2 rounded-2xl rounded-tr-sm ml-auto max-w-[85%]">
                      {isAm
                        ? 'ሰላም፣ የቆዳ ጃኬት መጠን L አለ ወይ? ቦሌ ስንት ሰዓት ይደርሳል?'
                        : 'Do you have size L leather jacket in stock? Can you deliver to Bole today?'}
                    </div>

                    {/* AI Grounded Answer with Badge */}
                    <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-brand-200 shadow-sm text-xs space-y-2 max-w-[90%]">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-[10px] font-black">
                        <Sparkles className="w-3 h-3 text-brand-600" />
                        <span>AI assistant · የሱቅ ረዳት</span>
                      </div>
                      <p className="text-slate-800 text-[11px] leading-relaxed">
                        {isAm
                          ? 'አዎ፣ የቆዳ ጃኬት መጠን L በክምችት አለ (ዋጋው 4,500 ETB)። ወደ ቦሌ እስከ ምሽቱ 2:00 ሰዓት ድረስ እናደርሳለን።'
                          : 'Yes, size L is in stock (Price: 4,500 ETB). We deliver to Bole until 8:00 PM today.'}
                      </p>
                    </div>

                    {/* Guarded Escalation Simulation */}
                    <div className="self-end bg-sky-500 text-white text-xs px-3.5 py-2 rounded-2xl rounded-tr-sm ml-auto max-w-[85%]">
                      {isAm
                        ? 'በጥቅል ከገዛሁ ቅናሽ አላችሁ?'
                        : 'Can I get a custom discount if I buy 10 items?'}
                    </div>

                    <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm text-xs space-y-1.5 max-w-[90%]">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black">
                        <Bot className="w-3 h-3 text-amber-500" />
                        <span>AI assistant · {isAm ? 'ወደ ሱቁ ተላልፏል' : 'Escalated'}</span>
                      </div>
                      <p className="text-slate-700 text-[11px]">
                        {isAm
                          ? 'ስለዚህ ጉዳይ እርግጠኛ አይደለሁም። ሱቁን ጠይቄ እዚህ እመልስልዎታለሁ።'
                          : 'I am not sure about that. I will ask the shop and reply here.'}
                      </p>
                      <span className="text-[9px] text-slate-400 block italic">
                        {isAm ? 'ደንበኛውን ሳያዘናጋ ወደ ነጋዴው ዳሽቦርድ ይላካል (FR-41)' : 'Safe escalation to seller (FR-41)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Interactive Dock */}
              <div className="bg-white border-t border-slate-200 p-2.5 flex items-center justify-around text-slate-500 text-[10px]">
                <span className="font-bold text-sky-600 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" /> Telegram
                </span>
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Products
                </span>
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" /> Grounded AI
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Photography Showcase Section (Ethiopian Products) */}
        <div className="mt-20 w-full">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isAm ? 'ለማንኛውም አይነት ምርት የሚሆን ዝግጁ መድረክ' : 'Optimized for Ethiopian Commerce'}
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              {isAm
                ? 'የባህል ልብሶች፣ የቆዳ ውጤቶች፣ ቡና፣ ኤሌክትሮኒክስ እና ሌሎችም በቀላሉ ይሸጣሉ'
                : 'Traditional fashion, leather, specialty coffee, electronics, and cosmetics.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Traditional Clothes */}
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover-lift group">
              <div className="h-44 bg-slate-100 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80"
                  alt="Habesha Traditional Dress"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-slate-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                  {isAm ? 'የባህል ልብስ' : 'Fashion'}
                </span>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-slate-900 text-sm">{isAm ? 'የሀበሻ ቀሚስ እና ጥልፍ' : 'Habesha Traditional Kemis'}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {isAm ? 'የመጠን (S, M, L) እና የጥልፍ ምርጫዎች' : 'Size and pattern selectors'}
                </p>
              </div>
            </div>

            {/* Card 2: Specialty Coffee */}
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover-lift group">
              <div className="h-44 bg-slate-100 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80"
                  alt="Ethiopian Yirgacheffe Coffee"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-slate-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                  {isAm ? 'ቡና እና ቅመማ ቅመም' : 'Specialty Coffee'}
                </span>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-slate-900 text-sm">{isAm ? 'የይርጋጨፌ ቆሎ ቡና' : 'Yirgacheffe Roast Coffee'}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {isAm ? 'የኪሎ ግራም እና የፈጨት አይነት አማራጮች' : 'Weight & roast level variants'}
                </p>
              </div>
            </div>

            {/* Card 3: Genuine Leather */}
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover-lift group">
              <div className="h-44 bg-slate-100 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80"
                  alt="Leather Handbag"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-slate-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                  {isAm ? 'የቆዳ ውጤቶች' : 'Leather Goods'}
                </span>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-slate-900 text-sm">{isAm ? 'የእጅ ቦርሳ እና ጃኬት' : 'Genuine Leather Bags'}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {isAm ? 'የቀለም እና ዲዛይን አማራጮች' : 'Color and material choices'}
                </p>
              </div>
            </div>

            {/* Card 4: Footwear & Accessories */}
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover-lift group">
              <div className="h-44 bg-slate-100 overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80"
                  alt="Shoes & Sneakers"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-slate-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                  {isAm ? 'ጫማዎች' : 'Footwear'}
                </span>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-slate-900 text-sm">{isAm ? 'ስኒከርስ እና ጫማዎች' : 'Comfort Sneakers'}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {isAm ? 'ቁጥር (38–44) እና የስቶክ ክምችት' : 'Size and live stock tracking'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Value Pillars */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-left">
          <div className="p-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover-lift">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg mb-2">
              {isAm ? 'የታመነ AI ረዳት (Grounded AI)' : 'Grounded AI Assistant'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isAm
                ? 'የዋጋ፣ የስቶክ እና የስራ ሰዓት ጥያቄዎችን ከሱቅዎ እውነተኛ መረጃ ብቻ ይመልሳል። ካልታወቀ ደንበኛውን ሳያዘናጋ ወደ እርስዎ ያሸጋግራል (FR-41)።'
                : 'Answers customer questions strictly using your catalog and verified rules. Safely escalates to you when unsure without fabricating.'}
            </p>
          </div>

          <div className="p-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover-lift">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-5">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg mb-2">
              {isAm ? 'ዜሮ ኮሚሽን፣ ፈጣን ክፍያ' : 'Direct Payment & Zero Commission'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isAm
                ? 'ደንበኞች በደረሰኝ ጊዜ በጥሬ ገንዘብ ወይም በቀጥታ ወደ እርስዎ የቴሌብር/ባንክ አካውንት ይከፍላሉ። መድረኩ የደንበኛ ገንዘብ አይይዝም (FR-64)።'
                : 'Customers pay cash on delivery or directly to your bank/Telebirr account. The platform never holds customer funds.'}
            </p>
          </div>

          <div className="p-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover-lift">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg mb-2">
              {isAm ? 'የማህበራዊ ሚዲያ ማስተዋወቂያ ኪት' : 'Social Media Posting Kit'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isAm
                ? 'ምርቶችዎን በፌስቡክ እና ቲክቶክ በቀላሉ ያጋሩ፤ የሱቅዎን ሊንክ እና የሚታተም QR ኮድ በራስ-ሰር ያዘጋጁ (FR-67, FR-68)።'
                : 'Ready-made captions with your shop link, Facebook album preview, TikTok video preview, and printable QR codes for in-store display.'}
            </p>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-20 w-full bg-gradient-to-tr from-slate-900 via-slate-800 to-brand-900 rounded-3xl p-8 sm:p-12 text-white text-center shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight">
              {isAm ? 'ሱቅዎን ዛሬውኑ በነፃ ይክፈቱ!' : 'Launch Your Telegram Shop Today'}
            </h3>
            <p className="text-sm text-slate-300">
              {isAm
                ? 'ምንም ወርሃዊ ክፍያ ሳይከፍሉ በነፃ ፕላን (Free Plan) እስከ 10 ምርቶች እና 20 ትዕዛዞች ይሞክሩ።'
                : 'Start with our Free Plan. 10 products, 20 orders/month, and 50 AI answers included.'}
            </p>
            <div className="pt-2">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-black shadow-lg shadow-brand-500/30 hover:scale-105 active:scale-100 transition duration-200"
              >
                <span>{isAm ? 'አሁኑኑ በስልክ ቁጥርዎ ይመዝገቡ' : 'Sign Up With Phone Number'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Gebeya Boot & AI Order Assistant. Built strictly per SRS v2 & 63 UX/UI screens.</p>
          <div className="flex items-center gap-4 font-semibold text-slate-600">
            <Link href="/overview" className="hover:text-slate-900">
              {isAm ? 'የስርዓት አሰራር' : 'Blueprint'}
            </Link>
            <Link href="/bot-simulator" className="hover:text-slate-900">
              {isAm ? 'ቦት ሞካሪ' : 'Simulator'}
            </Link>
            <Link href="/admin/login" className="hover:text-slate-900">
              {isAm ? 'አድሚን' : 'Admin'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
