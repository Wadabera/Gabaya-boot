'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import Link from 'next/link';
import {
  Share2,
  Copy,
  Check,
  QrCode,
  Image as ImageIcon,
  Video,
  Eye,
  ExternalLink,
  Download,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function PostingKitPage() {
  const { shop, language, t } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewMode, setPreviewMode] = useState<'none' | 'fb_album' | 'tiktok'>('none');

  useEffect(() => {
    if (shop?.id) {
      loadData();
    }
  }, [shop?.id]);

  const loadData = async () => {
    try {
      const [prodRes, qrRes] = await Promise.all([
        api.get(`/shops/${shop!.id}/products`),
        api.get(`/shops/${shop!.id}/qr-code`),
      ]);
      setProducts(prodRes.data);
      setQrCodeDataUrl(qrRes.data.qrCodeDataUrl);
      if (prodRes.data.length > 0) {
        setSelectedProductIds([prodRes.data[0].id]);
      }
    } catch (err) {
      console.error('Failed to load posting kit data', err);
    }
  };

  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));
  const primaryProduct = selectedProducts[0] || products[0];

  const generatedCaption = primaryProduct
    ? `🔥 ${primaryProduct.name} - ${primaryProduct.price} ETB\n${
        selectedProducts.length > 1
          ? selectedProducts.map((p, i) => `${i + 1}. ${p.name} - ${p.price} ETB`).join('\n') + '\n'
          : ''
      }🛒 አሁኑኑ በቴሌግራም ይዘዙ / Order here: ${shop?.botLink || `https://t.me/GebeyaShopBot?start=shop_${shop?.id}`}\n📍 ${
        shop?.area || 'አዲስ አበባ'
      } | ⏰ ${shop?.openingHours || 'የስራ ሰዓት'}`
    : `🛒 የሱቃችንን ምርቶች በቴሌግራም ይዘዙ: ${shop?.botLink || ''}`;

  const copyCaption = () => {
    navigator.clipboard.writeText(generatedCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const copyLink = () => {
    if (shop?.botLink) {
      navigator.clipboard.writeText(shop.botLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const toggleSelectProduct = (id: string) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter((pId) => pId !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {language === 'am' ? 'የማህበራዊ ሚዲያ ማስተዋወቂያ ኪት (P01 - P09)' : 'Social Posting Kit (P01 - P09)'}
        </h2>
        <p className="text-xs text-slate-500">
          {language === 'am'
            ? 'ምርቶችዎን በፌስቡክ እና ቲክቶክ በቀላሉ ያጋሩ፤ የሱቅዎን ሊንክ እና QR ኮድ በራስ-ሰር ያዘጋጁ'
            : 'Prepare Facebook and TikTok ready promotional posts with shop deep link and printable QR code (FR-67, FR-68)'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Post Preparation (P01 & P07) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Select Products Grid (P07) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>{language === 'am' ? 'ለማስተዋወቅ እቃዎችን ይምረጡ (P07)' : 'Select Products for Post (P07)'}</span>
              <span className="text-xs text-brand-600 font-semibold">{selectedProductIds.length} selected</span>
            </h3>

            {products.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No products in shop</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {products.map((p) => {
                  const isSelected = selectedProductIds.includes(p.id);
                  const orderNum = selectedProductIds.indexOf(p.id) + 1;
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleSelectProduct(p.id)}
                      className={`relative rounded-xl border p-2 cursor-pointer transition flex flex-col items-center text-center ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-brand-600 text-white font-black text-[10px] flex items-center justify-center shadow">
                          {orderNum}
                        </div>
                      )}
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden mb-1.5">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <span className="font-bold text-[11px] text-slate-800 line-clamp-1">{p.name}</span>
                      <span className="text-[10px] text-brand-700 font-semibold">{p.price} ETB</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generated Caption (P01) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                {language === 'am' ? 'የተዘጋጀ የፖስት ፅሁፍ (Caption)' : 'Ready-Made Caption (P01)'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={copyCaption}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                >
                  {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCaption ? 'Copied!' : 'Copy Caption'}</span>
                </button>
                <button
                  onClick={copyLink}
                  className="px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold flex items-center gap-1 transition"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <textarea
              readOnly
              rows={5}
              value={generatedCaption}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-sans focus:outline-none"
            />

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPreviewMode('fb_album')}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Facebook Album (P08)</span>
              </button>

              <button
                onClick={() => setPreviewMode('tiktok')}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-white hover:bg-black text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Preview TikTok Video (P09)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Previews & Printable QR (P01 & P08/P09) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Printable Shop QR Code */}
          {qrCodeDataUrl && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm text-center">
              <h3 className="font-bold text-slate-900 text-sm mb-1">
                {language === 'am' ? 'የሱቅ ማስተዋወቂያ QR ኮድ' : 'Printable Shop Window QR'}
              </h3>
              <p className="text-[11px] text-slate-400 mb-3">
                {language === 'am' ? 'በሱቅዎ በር ወይም በማህበራዊ ሚዲያ ፎቶዎች ላይ ለማድረግ' : 'Place in your shop window or on product photos'}
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-block shadow-sm">
                <img src={qrCodeDataUrl} alt="Shop QR" className="w-36 h-36 rounded-xl mx-auto" />
                <a
                  href={qrCodeDataUrl}
                  download="gebeya_shop_qr.png"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline"
                >
                  <Download className="w-3 h-3" />
                  <span>Download High-Res PNG</span>
                </a>
              </div>
            </div>
          )}

          {/* Dynamic Social Previews (P08 / P09) */}
          {previewMode === 'fb_album' && (
            <div className="bg-white rounded-2xl border border-blue-200 shadow-md p-4">
              <div className="flex items-center justify-between mb-3 border-b pb-2">
                <span className="font-bold text-xs text-blue-700">Facebook Album Preview (P08)</span>
                <button
                  onClick={() => setPreviewMode('none')}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {shop?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">{shop?.name}</span>
                    <span className="text-[10px] text-slate-400">Just now · 🌍</span>
                  </div>
                </div>

                <p className="text-slate-800 text-[11px] whitespace-pre-line line-clamp-3">
                  {generatedCaption}
                </p>

                <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden bg-slate-100 max-h-48">
                  {selectedProducts.slice(0, 4).map((p, idx) => (
                    <div key={idx} className="h-24 bg-slate-200 overflow-hidden relative">
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                          {p.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Link
                  href="/social-preview"
                  className="w-full mt-2 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg text-center block"
                >
                  Order on Telegram · ይዘዙ (P04)
                </Link>
              </div>
            </div>
          )}

          {previewMode === 'tiktok' && (
            <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-xl p-4">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <span className="font-bold text-xs text-pink-400">TikTok Video Preview (P09)</span>
                <button
                  onClick={() => setPreviewMode('none')}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="h-44 rounded-xl bg-slate-900 flex items-center justify-center relative overflow-hidden border border-slate-800">
                  {primaryProduct?.photoUrl ? (
                    <img src={primaryProduct.photoUrl} alt="TikTok" className="w-full h-full object-cover" />
                  ) : (
                    <Video className="w-10 h-10 text-slate-600" />
                  )}
                  <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white backdrop-blur">
                    {primaryProduct?.name} · {primaryProduct?.price} ETB
                  </span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] space-y-1">
                  <span className="font-bold text-slate-200">Shop Bio:</span>
                  <p className="text-slate-400">🔗 Link in bio: {shop?.botLink}</p>
                </div>

                <Link
                  href="/social-preview"
                  className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-lg text-center block transition"
                >
                  See What Buyers See (P10 / P05)
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
