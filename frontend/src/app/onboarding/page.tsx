'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import {
  ShoppingBag,
  Smartphone,
  ShieldCheck,
  Store,
  PlusCircle,
  QrCode,
  ArrowRight,
  Check,
  AlertCircle,
  Copy,
  Download,
} from 'lucide-react';

export default function OnboardingPage() {
  const { user, shop, sendSmsCode, verifySmsCode, refreshShop, language, t } = useAuth();
  const router = useRouter();

  // Wizard steps: 1: Phone, 2: SMS Code, 3: Shop Profile, 4: First Product, 5: Complete
  const [step, setStep] = useState<number>(user ? (shop ? 4 : 3) : 1);

  // Form states
  const [phone, setPhone] = useState<string>('+251911111111');
  const [code, setCode] = useState<string>('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Shop state (O3)
  const [shopName, setShopName] = useState<string>('Bole Fashion Store');
  const [shopArea, setShopArea] = useState<string>('Bole Medhanialem');
  const [openingHours, setOpeningHours] = useState<string>('2:30 AM - 12:00 PM (8:30 - 18:00)');
  const [deliveryAreas, setDeliveryAreas] = useState<string>('Bole, Kazanchis, Piassa, Sarbet');
  const [bankName, setBankName] = useState<string>('Commercial Bank of Ethiopia (CBE)');
  const [bankAccount, setBankAccount] = useState<string>('1000123456789');
  const [bankAccountHolder, setBankAccountHolder] = useState<string>('Abebe Kebede');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState<string>('0911111111');

  // Product state (O4)
  const [productName, setProductName] = useState<string>('Men Leather Shoes');
  const [productPrice, setProductPrice] = useState<string>('2500');
  const [productStock, setProductStock] = useState<string>('10');
  const [productCategory, setProductCategory] = useState<string>('Footwear');
  const [productPhoto, setProductPhoto] = useState<File | null>(null);

  // Completed shop state (O5)
  const [createdShopId, setCreatedShopId] = useState<string>(shop?.id || '');
  const [botLink, setBotLink] = useState<string>(shop?.botLink || '');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Step 1: Send SMS code (O1)
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await sendSmsCode(phone);
      if (res.devCode) {
        setDevCode(res.devCode);
        setCode(res.devCode); // Auto-fill for convenience
      }
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to send verification SMS');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify SMS code (O2)
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await verifySmsCode(phone, code);
      await refreshShop();
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid or expired verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Create Shop Profile (O3)
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await api.post('/shops', {
        name: shopName,
        area: shopArea,
        openingHours,
        deliveryAreas,
        language,
        bankName,
        bankAccount,
        bankAccountHolder,
        mobileMoneyNumber,
      });
      const newShop = res.data;
      setCreatedShopId(newShop.id);
      setBotLink(newShop.botLink || `https://t.me/GebeyaShopBot?start=shop_${newShop.id}`);
      await refreshShop();
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create shop profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 4: Add First Product (O4)
  const handleAddFirstProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const targetShopId = createdShopId || shop?.id;
      if (!targetShopId) throw new Error('Shop ID missing');

      let uploadedPhotoUrl = '';
      if (productPhoto) {
        const formData = new FormData();
        formData.append('file', productPhoto);
        const uploadRes = await api.post('/storage/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedPhotoUrl = uploadRes.data.url;
      }

      await api.post(`/shops/${targetShopId}/products`, {
        name: productName,
        price: parseFloat(productPrice),
        stock: parseInt(productStock, 10),
        categoryName: productCategory,
        photoUrl: uploadedPhotoUrl || undefined,
      });

      // Fetch QR Code for O5
      const qrRes = await api.get(`/shops/${targetShopId}/qr-code`);
      setQrCodeUrl(qrRes.data.qrCodeDataUrl);

      setStep(5);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create first product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(botLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-brand-600 text-white items-center justify-center shadow-lg shadow-brand-500/30 mb-3">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {language === 'am' ? 'የሱቅ ባለቤት ምዝገባ' : 'Shop Owner Onboarding'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {language === 'am' ? 'በደቂቃዎች ውስጥ የራስዎን የቴሌግራም ሱቅ ያስጀምሩ' : 'Launch your Telegram AI shop in minutes'}
        </p>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-brand-600'
                  : s < step
                  ? 'w-2 bg-emerald-500'
                  : 'w-2 bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl border border-slate-200/80 sm:px-10">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Phone Number (O1) */}
          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.phone}
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251911111111"
                    className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-medium"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {language === 'am' ? 'የኢትዮጵያ ስልክ ቁጥር ያስገቡ (ለምሳሌ፡ +2519... ወይም 09...)' : 'Enter Ethiopian phone number (e.g. +2519... or 09...)'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
              >
                <span>{isSubmitting ? t.loading : t.sendSmsCode}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: SMS Verification Code (O2) */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {t.enterVerificationCode}
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 tracking-widest text-center text-lg font-bold placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {devCode && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center justify-between">
                    <span>{t.devCodeHint} <strong>{devCode}</strong></span>
                    <button
                      type="button"
                      onClick={() => setCode(devCode)}
                      className="text-amber-900 underline font-semibold text-xs ml-2"
                    >
                      {language === 'am' ? 'ሙላ' : 'Use Code'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  {t.back}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl shadow-md bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? t.loading : t.verifyAndLogin}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Shop Profile Setup (O3) */}
          {step === 3 && (
            <form onSubmit={handleCreateShop} className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Store className="w-5 h-5 text-brand-600" />
                <span>{t.onboardingStep2}</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.shopNameLabel}</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.shopAreaLabel}</label>
                <input
                  type="text"
                  value={shopArea}
                  onChange={(e) => setShopArea(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.openingHoursLabel}</label>
                <input
                  type="text"
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.deliveryAreasLabel}</label>
                <input
                  type="text"
                  value={deliveryAreas}
                  onChange={(e) => setDeliveryAreas(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="block text-xs font-bold text-slate-800 mb-2">
                  {t.directPaymentInfo}
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-600 mb-0.5">{t.bankNameLabel}</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">{t.bankAccountLabel}</label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  <div>
                    <label className="block text-slate-600 mb-0.5">{t.bankAccountHolderLabel}</label>
                    <input
                      type="text"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">{t.mobileMoneyNumberLabel}</label>
                    <input
                      type="text"
                      value={mobileMoneyNumber}
                      onChange={(e) => setMobileMoneyNumber(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition shadow-md disabled:opacity-50"
              >
                {isSubmitting ? t.loading : t.createShopBtn}
              </button>
            </form>
          )}

          {/* STEP 4: First Product (O4) */}
          {step === 4 && (
            <form onSubmit={handleAddFirstProduct} className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-brand-600" />
                <span>{t.onboardingStep3}</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.productNameLabel}</label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.productPriceLabel}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.productStockLabel}</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.productCategoryLabel}</label>
                <input
                  type="text"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.productPhotoLabel}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setProductPhoto(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition shadow-md disabled:opacity-50"
              >
                {isSubmitting ? t.loading : t.addFirstProductBtn}
              </button>
            </form>
          )}

          {/* STEP 5: Launch & Bot Link / QR Code (O5) */}
          {step === 5 && (
            <div className="space-y-6 text-center">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">{t.onboardingSuccess}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'am' ? 'ደንበኞችዎ በዚህ ቦት አማካኝነት በቀጥታ መግዛት ይችላሉ' : 'Customers can now browse and order via your bot link'}
                </p>
              </div>

              {/* Bot Link Box */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left">
                <label className="text-xs font-semibold text-slate-500 block mb-1">{t.botLinkTitle}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={botLink}
                    className="flex-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="p-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 transition"
                    title="Copy Link"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* QR Code */}
              {qrCodeUrl && (
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm inline-block">
                  <img src={qrCodeUrl} alt="Shop QR Code" className="w-44 h-44 mx-auto rounded-lg" />
                  <a
                    href={qrCodeUrl}
                    download="gebeya_shop_qr.png"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-700 font-semibold hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.downloadQrBtn}</span>
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md transition"
              >
                {t.goToDashboard}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
