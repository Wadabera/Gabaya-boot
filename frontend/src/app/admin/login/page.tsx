'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';

export default function AdminLoginPage() {
  const { adminLogin, adminVerify2fa, language, t } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('admin@gebeya-boot.et');
  const [password, setPassword] = useState('AdminGebeya2026!Secure');
  const [code2fa, setCode2fa] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [requires2fa, setRequires2fa] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await adminLogin(email, password);
      if (res.requires2fa && res.tempToken) {
        setTempToken(res.tempToken);
        setRequires2fa(true);
      } else {
        router.push('/admin');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid administrator credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await adminVerify2fa(tempToken, code2fa);
      router.push('/admin');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid 2FA verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-brand-600 text-white items-center justify-center shadow-xl shadow-brand-500/20 mb-3">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          {t.adminPortalTitle}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Platform Security & Oversight Portal
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 py-8 px-6 shadow-2xl sm:rounded-3xl border border-slate-700/80 hover:border-brand-500/40 transition-colors duration-300 sm:px-10 shadow-glow/20">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-900/50 border border-red-700 text-red-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!requires2fa ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-glow glow-btn-primary transition disabled:opacity-50 active:scale-95"
                >
                  <span>{isSubmitting ? 'Authenticating with Neon...' : 'Sign In as Administrator'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerify2fa} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Two-Factor Authentication (2FA) Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code2fa}
                    onChange={(e) => setCode2fa(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Verifying...' : 'Verify 2FA'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
