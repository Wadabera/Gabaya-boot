'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from './api';
import { Language, translations } from './i18n';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
  isVerified: boolean;
  shopId?: string;
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  area?: string;
  openingHours?: string;
  deliveryAreas?: string;
  language: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  rejectionReason?: string;
  botLink?: string;
  isAiEnabled: boolean;
  useEthiopianCalendar: boolean;
  bankName?: string;
  bankAccount?: string;
  bankAccountHolder?: string;
  mobileMoneyNumber?: string;
}

interface AuthContextType {
  user: User | null;
  shop: Shop | null;
  token: string | null;
  language: Language;
  useEthiopianCalendar: boolean;
  isLoading: boolean;
  t: typeof translations['am'];
  setLanguage: (lang: Language) => void;
  setUseEthiopianCalendar: (val: boolean) => void;
  sendSmsCode: (phone: string) => Promise<{ success: boolean; devCode?: string }>;
  verifySmsCode: (phone: string, code: string) => Promise<boolean>;
  adminLogin: (email: string, pass: string) => Promise<{ success: boolean; requires2fa?: boolean; tempToken?: string }>;
  adminVerify2fa: (tempToken: string, code: string) => Promise<boolean>;
  refreshShop: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [language, setLanguageState] = useState<Language>('am');
  const [useEthiopianCalendar, setUseEthCalendarState] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const t = translations[language] || translations.am;

  useEffect(() => {
    const savedToken = localStorage.getItem('gebeya_token');
    const savedLang = localStorage.getItem('gebeya_lang') as Language;
    const savedCal = localStorage.getItem('gebeya_cal');

    if (savedLang) setLanguageState(savedLang);
    if (savedCal !== null) setUseEthCalendarState(savedCal === 'true');

    if (savedToken) {
      setToken(savedToken);
      fetchSession(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('gebeya_lang', lang);
  };

  const setUseEthiopianCalendar = (val: boolean) => {
    setUseEthCalendarState(val);
    localStorage.setItem('gebeya_cal', String(val));
  };

  const fetchSession = async (jwt: string) => {
    try {
      const res = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setUser(res.data.user);

      if (res.data.user.role === 'OWNER') {
        await refreshShop();
      }
    } catch {
      localStorage.removeItem('gebeya_token');
      setToken(null);
      setUser(null);
      setShop(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshShop = async () => {
    try {
      const shopRes = await api.get('/shops/my-shop');
      setShop(shopRes.data);
      if (shopRes.data?.language) {
        setLanguageState(shopRes.data.language as Language);
      }
      if (shopRes.data?.useEthiopianCalendar !== undefined) {
        setUseEthCalendarState(shopRes.data.useEthiopianCalendar);
      }
    } catch {
      setShop(null);
    }
  };

  const sendSmsCode = async (phone: string) => {
    const res = await api.post('/auth/owner/send-code', { phone });
    return res.data;
  };

  const verifySmsCode = async (phone: string, code: string) => {
    const res = await api.post('/auth/owner/verify-code', { phone, code });
    const { accessToken, user: authUser, shop: authShop } = res.data;
    localStorage.setItem('gebeya_token', accessToken);
    setToken(accessToken);
    setUser(authUser);
    setShop(authShop);
    return true;
  };

  const adminLogin = async (email: string, password: string) => {
    const res = await api.post('/auth/admin/login', { email, password });
    if (res.data.requires2fa) {
      return { success: true, requires2fa: true, tempToken: res.data.tempToken };
    }
    const { accessToken, user: authUser } = res.data;
    localStorage.setItem('gebeya_token', accessToken);
    setToken(accessToken);
    setUser(authUser);
    return { success: true };
  };

  const adminVerify2fa = async (tempToken: string, code: string) => {
    const res = await api.post('/auth/admin/verify-2fa', { tempToken, code });
    const { accessToken, user: authUser } = res.data;
    localStorage.setItem('gebeya_token', accessToken);
    setToken(accessToken);
    setUser(authUser);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('gebeya_token');
    setToken(null);
    setUser(null);
    setShop(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        shop,
        token,
        language,
        useEthiopianCalendar,
        isLoading,
        t,
        setLanguage,
        setUseEthiopianCalendar,
        sendSmsCode,
        verifySmsCode,
        adminLogin,
        adminVerify2fa,
        refreshShop,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
