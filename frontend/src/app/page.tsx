'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ShoppingBag, Bot, Shield, ArrowRight, Store, CheckCircle, Smartphone } from 'lucide-react';

export default function HomePage() {
  const { user, shop, isLoading, language, setLanguage, t } = useAuth();
  const router = useRouter();

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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                {language === 'am' ? 'ገበያ ቡት' : 'Gebeya Boot'}
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                {language === 'am' ? 'የቴሌግራም ንግድ AI ረዳት' : 'Telegram Shop AI Assistant'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setLanguage('am')}
                className={`px-2.5 py-1 rounded-md transition ${language === 'am' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
              >
                አማርኛ
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-md transition ${language === 'en' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
              >
                English
              </button>
            </div>

            <Link
              href="/admin/login"
              className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium mb-6">
          <Bot className="w-4 h-4 text-brand-600" />
          <span>{language === 'am' ? 'በAI የታገዘ የቴሌግራም መገበያያ ቦት' : 'AI-Powered Telegram Commerce in Ethiopia'}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-3xl leading-[1.15]">
          {language === 'am' ? (
            <>
              በቴሌግራም <span className="text-brand-600">በቀላሉ ይሽጡ</span>፣ በAI ረዳት ደንበኞችዎን ያስተናግዱ!
            </>
          ) : (
            <>
              Turn Your Telegram Channel into a <span className="text-brand-600">Smart AI Shop</span>
            </>
          )}
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
          {language === 'am'
            ? 'ያለ ምንም ድረ-ገጽ ወይም ውስብስብ መተግበሪያ፤ ደንበኞችዎ በቴሌግራም በቀጥታ እቃዎችዎን እንዲያዩ፣ እንዲያዙ እና በAI ረዳት ፈጣን ምላሽ እንዲያገኙ ያድርጉ።'
            : 'Effortless automated catalog, smart grounded AI customer support, order tracking, and Ethiopian payment workflows—all inside Telegram.'}
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-brand-600 text-white font-semibold shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition transform active:scale-[0.98]"
          >
            <Store className="w-5 h-5" />
            <span>{language === 'am' ? 'ሱቅዎን አሁኑኑ ያስጀምሩ' : 'Start Shop Onboarding'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/bot-simulator"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold shadow-sm hover:bg-slate-50 transition"
          >
            <Smartphone className="w-5 h-5 text-sky-500" />
            <span>{language === 'am' ? 'የቴሌግራም ቦት ሞካሪ' : 'Try Telegram Bot Simulator'}</span>
          </Link>

          <Link
            href="/overview"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-200 transition"
          >
            <span>{language === 'am' ? 'የመተግበሪያው አሰራር (S00 - S02)' : 'How it Works (S00 - S02)'}</span>
          </Link>
        </div>

        {/* Features highlights */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left w-full">
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">
              {language === 'am' ? 'የታመነ AI ረዳት (Grounded AI)' : 'Grounded AI Assistant'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {language === 'am'
                ? 'የዋጋ፣ የስቶክ እና የስራ ሰዓት ጥያቄዎችን ከሱቅዎ መረጃ ብቻ ይመልሳል። ካልታወቀ ደንበኛውን ሳያዘናጋ ወደ እርስዎ ያሸጋግራል!'
                : 'Answers customer questions strictly using your catalog and hours. Safely escalates to you when unsure.'}
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">
              {language === 'am' ? 'ቀላል የትዕዛዝ አስተዳደር' : 'Seamless Ordering'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {language === 'am'
                ? 'ደንበኞች በቴሌግራም እቃ መርጠው ትዕዛዝ ሲያቀርቡ ወዲያውኑ ይደርስዎታል። ስቶክ በራስ-ሰር ይቀንሳል፣ ከመጠን በላይ ሽያጭን ይከላከላል።'
                : 'Atomic stock reduction on confirmation prevents overselling. Support for delivery and shop pickup.'}
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">
              {language === 'am' ? 'የኢትዮጵያ የቀን መቁጠሪያ እና ቋንቋ' : 'Ethiopic Calendar & Amharic'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {language === 'am'
                ? 'ሙሉ የአማርኛ እና የእንግሊዝኛ ድጋፍ። የሽያጭ ሪፖርቶችዎን በኢትዮጵያ ዘመን አቆጣጠር (መስከረም፣ ጥቅምት...) የመመልከት አማራጭ።'
                : 'Built-in Ge\'ez Ethiopian calendar conversion and full Amharic localization for local merchant convenience.'}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 Gebeya Boot & AI Order Assistant. Built strictly according to SRS v2.</p>
      </footer>
    </div>
  );
}
