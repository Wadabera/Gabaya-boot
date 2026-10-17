'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Home,
  ShoppingBag,
  Package,
  MessageSquare,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  Calendar,
  Globe,
  Bot,
  Smartphone,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const {
    user,
    shop,
    isLoading,
    language,
    setLanguage,
    useEthiopianCalendar,
    setUseEthiopianCalendar,
    logout,
    t,
  } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/');
      } else if (user.role === 'OWNER') {
        if (!shop) {
          router.push('/onboarding');
        } else if (shop.status === 'PENDING') {
          router.push('/waiting-approval');
        }
      }
    }
  }, [user, shop, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: t.navHome, icon: Home },
    { href: '/dashboard/orders', label: t.navOrders, icon: ShoppingBag },
    { href: '/dashboard/products', label: t.navProducts, icon: Package },
    { href: '/dashboard/posting-kit', label: language === 'am' ? 'የማስተዋወቂያ ኪት (P01)' : 'Posting Kit (P01)', icon: Bot },
    { href: '/dashboard/ai-chats', label: t.navAiChats, icon: MessageSquare },
    { href: '/dashboard/ai-settings', label: language === 'am' ? 'የAI ህጎች (D03)' : 'AI Rules (D03)', icon: Bot },
    { href: '/dashboard/sales', label: t.navSales, icon: BarChart3 },
    { href: '/dashboard/subscription', label: t.navSubscription, icon: CreditCard },
    { href: '/dashboard/staff', label: language === 'am' ? 'ሰራተኞች (D02)' : 'Staff (D02)', icon: Settings },
    { href: '/dashboard/profile', label: t.navSettings, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white border-r border-slate-200 min-h-screen sticky top-0 h-screen">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-slate-900 text-sm leading-tight truncate">
                {shop?.name || t.appName}
              </h1>
              <p className="text-[11px] text-slate-400 truncate">
                {shop?.area || 'Telegram Shop'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Bot Status Badge */}
        <div className="mx-3 my-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 radar-pulse" />
            <span className="text-[11px] font-bold text-emerald-800">
              {language === 'am' ? 'ቦቱ በመስራት ላይ ነው' : 'Bot Active on Telegram'}
            </span>
          </div>
          <span className="text-[9px] font-mono text-emerald-700 bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200">
            {shop?.status || 'ACTIVE'}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition duration-200 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-glow font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 border-t border-slate-100 my-2">
            <Link
              href="/bot-simulator"
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sky-700 bg-sky-50 hover:bg-sky-100 text-xs font-bold transition shadow-xs hover:shadow-glow-blue glow-btn-telegram"
            >
              <Smartphone className="w-4 h-4 text-sky-600" />
              <span>{t.botSimulator}</span>
            </Link>
          </div>
        </nav>

        {/* Controls & Footer */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          {/* Calendar and Language Toggles */}
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{language === 'am' ? 'የኢትዮጵያ ዘመን' : 'Ethiopic Cal'}</span>
            </div>
            <button
              onClick={() => setUseEthiopianCalendar(!useEthiopianCalendar)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
                useEthiopianCalendar ? 'bg-brand-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow block" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>{language === 'am' ? 'ቋንቋ (Lang)' : 'Language'}</span>
            </div>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 font-semibold text-[10px]">
              <button
                onClick={() => setLanguage('am')}
                className={`px-1.5 py-0.5 rounded ${language === 'am' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
              >
                አማ
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-1.5 py-0.5 rounded ${language === 'en' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
              >
                EN
              </button>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-900 truncate max-w-[140px]">
              {shop?.name || t.appName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseEthiopianCalendar(!useEthiopianCalendar)}
              className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                useEthiopianCalendar ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              {useEthiopianCalendar ? 'ዘመን፡ ኢትዮጵያ' : 'Gregorian'}
            </button>
            <button
              onClick={() => setLanguage(language === 'am' ? 'en' : 'am')}
              className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700"
            >
              {language === 'am' ? 'EN' : 'አማ'}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Bottom Navigation Bar for Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around z-50 shadow-lg">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
                  isActive ? 'text-brand-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
