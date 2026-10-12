'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import {
  Settings,
  Store,
  CreditCard,
  QrCode,
  Globe,
  Calendar,
  Save,
  Copy,
  Check,
  Download,
  AlertCircle,
  Building,
} from 'lucide-react';

export default function ProfilePage() {
  const { shop, refreshShop, language, setLanguage, useEthiopianCalendar, setUseEthiopianCalendar, t } = useAuth();

  const [name, setName] = useState(shop?.name || '');
  const [area, setArea] = useState(shop?.area || '');
  const [openingHours, setOpeningHours] = useState(shop?.openingHours || '');
  const [deliveryAreas, setDeliveryAreas] = useState(shop?.deliveryAreas || '');
  const [bankName, setBankName] = useState(shop?.bankName || '');
  const [bankAccount, setBankAccount] = useState(shop?.bankAccount || '');
  const [bankAccountHolder, setBankAccountHolder] = useState(shop?.bankAccountHolder || '');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState(shop?.mobileMoneyNumber || '');

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (shop) {
      setName(shop.name);
      setArea(shop.area || '');
      setOpeningHours(shop.openingHours || '');
      setDeliveryAreas(shop.deliveryAreas || '');
      setBankName(shop.bankName || '');
      setBankAccount(shop.bankAccount || '');
      setBankAccountHolder(shop.bankAccountHolder || '');
      setMobileMoneyNumber(shop.mobileMoneyNumber || '');

      loadQrCode(shop.id);
    }
  }, [shop]);

  const loadQrCode = async (shopId: string) => {
    try {
      const res = await api.get(`/shops/${shopId}/qr-code`);
      setQrCodeDataUrl(res.data.qrCodeDataUrl);
    } catch (err) {
      console.error('Failed to load QR code', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setIsSaving(true);
    try {
      await api.patch(`/shops/${shop.id}`, {
        name,
        area,
        openingHours,
        deliveryAreas,
        bankName,
        bankAccount,
        bankAccountHolder,
        mobileMoneyNumber,
        useEthiopianCalendar,
        language,
      });
      await refreshShop();
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save shop settings');
    } finally {
      setIsSaving(false);
    }
  };

  const copyBotLink = () => {
    if (shop?.botLink) {
      navigator.clipboard.writeText(shop.botLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t.shopSettingsTitle}</h2>
        <p className="text-xs text-slate-500">
          {language === 'am' ? 'የሱቅዎን አድራሻ፣ የስራ ሰዓት እና ለገዢዎች የሚታዩ የክፍያ ዝርዝሮችን ያስተካክሉ' : 'Update shop profile, contact info, and payment details shown to Telegram buyers'}
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{language === 'am' ? 'ቅንብሮችዎ በተሳካ ሁኔታ ተቀምጠዋል!' : 'Settings successfully saved!'}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Shop Info (FR-02) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Store className="w-4 h-4 text-brand-600" />
            <span>{language === 'am' ? 'የሱቅ መረጃ' : 'Shop Profile'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.shopNameLabel}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.shopAreaLabel}</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.openingHoursLabel}</label>
              <input
                type="text"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.deliveryAreasLabel}</label>
              <input
                type="text"
                value={deliveryAreas}
                onChange={(e) => setDeliveryAreas(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Direct Payment Accounts shown to Telegram Buyers (FR-66) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-600" />
              <span>{t.directPaymentInfo}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === 'am'
                ? 'ገዢዎች በቴሌግራም ቦት "በቀጥታ ለሱቁ ክፈል" የሚለውን ሲመርጡ እነዚህ የሂሳብ ቁጥሮች ይታዩዋቸዋል።'
                : 'These details are displayed to buyers in Telegram when they select "Pay Direct to Shop".'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.bankNameLabel}</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. CBE / Commercial Bank of Ethiopia"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.bankAccountLabel}</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="e.g. 1000123456789"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.bankAccountHolderLabel}</label>
              <input
                type="text"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="Account Holder Full Name"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.mobileMoneyNumberLabel}</label>
              <input
                type="text"
                value={mobileMoneyNumber}
                onChange={(e) => setMobileMoneyNumber(e.target.value)}
                placeholder="Telebirr Number (09...)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Telegram Bot Link & Printable QR Code (FR-20, FR-68) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <QrCode className="w-4 h-4 text-brand-600" />
            <span>{language === 'am' ? 'የቴሌግራም ቦት ሊንክ እና QR ኮድ' : 'Telegram Bot Link & QR Code'}</span>
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {qrCodeDataUrl && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <img src={qrCodeDataUrl} alt="Shop QR Code" className="w-36 h-36 rounded-lg mx-auto" />
                <a
                  href={qrCodeDataUrl}
                  download="gebeya_shop_qr.png"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline"
                >
                  <Download className="w-3 h-3" />
                  <span>{t.downloadQrBtn}</span>
                </a>
              </div>
            )}

            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.botLinkTitle}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shop?.botLink || ''}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={copyBotLink}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition"
                    title="Copy Link"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {language === 'am'
                  ? 'ይህን ሊንክ ወይም QR ኮድ በማህበራዊ ሚዲያ ገጾችዎ (Facebook, TikTok, Instagram) ወይም ቴሌግራም ቻናልዎ ላይ በማጋራት ደንበኞችዎን በቀጥታ ይቀበሉ።'
                  : 'Share this link or print the QR code in your store or on your channel so customers jump directly into your catalog.'}
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? t.loading : t.saveChanges}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
