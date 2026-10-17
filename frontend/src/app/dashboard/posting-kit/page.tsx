'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Printer,
  Smartphone,
  Facebook,
  Play,
  Layers,
  AlertCircle,
  Send,
} from 'lucide-react';

function PostingKitContent() {
  const { shop, language, t } = useAuth();
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('productId');

  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFbToast, setCopiedFbToast] = useState(false);
  const [copiedTiktokToast, setCopiedTiktokToast] = useState(false);
  const [previewMode, setPreviewMode] = useState<'none' | 'fb_album' | 'tiktok'>('none');
  const [isGeneratingFlyer, setIsGeneratingFlyer] = useState(false);
  const flyerCanvasRef = useRef<HTMLCanvasElement>(null);

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

      if (initialProductId && prodRes.data.some((p: any) => p.id === initialProductId)) {
        setSelectedProductIds([initialProductId]);
      } else if (prodRes.data.length > 0) {
        setSelectedProductIds([prodRes.data[0].id]);
      }
    } catch (err) {
      console.error('Failed to load posting kit data', err);
    }
  };

  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));
  const primaryProduct = selectedProducts[0] || products[0];

  // Consolidate media across selected products
  const selectedMediaList = selectedProducts.flatMap((p) => {
    if (p.media && p.media.length > 0) {
      return p.media;
    }
    const fallback = [];
    if (p.photoUrl) fallback.push({ type: 'IMAGE', url: p.photoUrl });
    if (p.videoUrl) fallback.push({ type: 'VIDEO', url: p.videoUrl });
    return fallback;
  });

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'gebayawa_bot';

  const generatedCaption = primaryProduct
    ? `🔥 ${primaryProduct.name} - ${Number(primaryProduct.price).toLocaleString()} ETB\n${
        selectedProducts.length > 1
          ? selectedProducts.map((p, i) => `${i + 1}. ${p.name} - ${Number(p.price).toLocaleString()} ETB`).join('\n') + '\n'
          : ''
      }${primaryProduct.description ? `\n📝 ${primaryProduct.description}\n` : ''}\n🛒 አሁኑኑ በቴሌግራም በቀጥታ ይዘዙ / Order directly inside Telegram:\n👉 ${
        shop?.botLink || `https://t.me/${botUsername}?start=shop_${shop?.id}`
      }\n\n📍 ${shop?.area || 'አዲስ አበባ'} | ⏰ ${shop?.openingHours || '8:00 AM - 8:00 PM'}\n🚚 ፈጣን ማድረሻ አለን (Fast Delivery & Pickup Available)`
    : `🛒 የሱቃችንን ምርቶች በቴሌግራም ይዘዙ: ${shop?.botLink || `https://t.me/${botUsername}`}`;

  const copyCaption = () => {
    navigator.clipboard.writeText(generatedCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  const copyLink = () => {
    if (shop?.botLink) {
      navigator.clipboard.writeText(shop.botLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleOpenFacebook = () => {
    // 1. Copy caption to clipboard so user can paste it directly
    navigator.clipboard.writeText(generatedCaption);
    setCopiedFbToast(true);
    setTimeout(() => setCopiedFbToast(false), 3500);

    // 2. Open Facebook share or Facebook.com
    const shareUrl = shop?.botLink || `https://t.me/${botUsername}`;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenTikTok = () => {
    // 1. Copy caption with bio link reminder
    navigator.clipboard.writeText(generatedCaption);
    setCopiedTiktokToast(true);
    setTimeout(() => setCopiedTiktokToast(false), 3500);

    // 2. Open TikTok Web upload
    window.open('https://www.tiktok.com/upload', '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = () => {
    const shareUrl = shop?.botLink || `https://t.me/${botUsername}`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(generatedCaption)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = () => {
    const shareUrl = shop?.botLink || `https://t.me/${botUsername}`;
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any).share({
        title: primaryProduct?.name || shop?.name || 'Gebeya Shop',
        text: generatedCaption,
        url: shareUrl,
      }).catch(() => {});
    } else {
      copyCaption();
    }
  };

  const toggleSelectProduct = (id: string) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter((pId) => pId !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  // Generate downloadable flyer with QR code on canvas
  const handleDownloadFlyer = () => {
    if (!flyerCanvasRef.current || !primaryProduct) return;
    setIsGeneratingFlyer(true);
    const canvas = flyerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1350;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1350);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.6, '#1e293b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1350);

    // Shop Header
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(shop?.name || 'GEBEYA SHOP', 540, 90);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px sans-serif';
    ctx.fillText(`Order inside Telegram · t.me/${botUsername}`, 540, 130);

    // Load Product Image & QR
    const productImg = new window.Image();
    productImg.crossOrigin = 'anonymous';
    const photoUrl = primaryProduct.photoUrl || primaryProduct.media?.[0]?.url;

    const qrImg = new window.Image();
    qrImg.crossOrigin = 'anonymous';

    const drawRest = () => {
      // Product Name & Price Card
      ctx.fillStyle = '#1e293b';
      ctx.roundRect ? ctx.roundRect(80, 880, 920, 180, 30) : ctx.fillRect(80, 880, 920, 180);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(primaryProduct.name.substring(0, 30), 120, 950);

      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 52px sans-serif';
      ctx.fillText(`${Number(primaryProduct.price).toLocaleString()} ETB`, 120, 1020);

      // Draw QR Code
      if (qrCodeDataUrl) {
        ctx.fillStyle = '#ffffff';
        ctx.roundRect ? ctx.roundRect(760, 895, 210, 150, 20) : ctx.fillRect(760, 895, 210, 150);
        ctx.fill();
        ctx.drawImage(qrImg, 795, 905, 130, 130);
      }

      // Footer callout
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📲 Scan QR with your phone to order instantly', 540, 1200);

      // Trigger download
      const link = document.createElement('a');
      link.download = `gebeya_${primaryProduct.name.replace(/\s+/g, '_')}_poster.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setIsGeneratingFlyer(false);
    };

    qrImg.onload = () => {
      if (photoUrl) {
        productImg.onload = () => {
          ctx.drawImage(productImg, 80, 170, 920, 680);
          drawRest();
        };
        productImg.onerror = () => drawRest();
        productImg.src = photoUrl;
      } else {
        drawRest();
      }
    };
    qrImg.src = qrCodeDataUrl || '';
  };

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in">
      <canvas ref={flyerCanvasRef} className="hidden" />

      {/* Header & SRS Context Banner */}
      <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {language === 'am'
                ? 'የማህበራዊ ሚዲያ ማስተዋወቂያ ኪት (P01 – P09)'
                : 'Social Posting Kit (P01 – P09)'}
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-200">
              FR-67 / FR-68
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'am'
              ? 'ምርቶችዎን በፌስቡክ እና ቲክቶክ በቀላሉ ያጋሩ፤ የሱቅዎን ሊንክ እና QR ኮድ በራስ-ሰር ያዘጋጁ'
              : 'Post high-converting photos & video clips directly to Facebook & TikTok with deep Telegram order links'}
          </p>
        </div>

        {/* Quick Social Launch Buttons (P01 - P03, Telegram, Mobile) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleShareTelegram}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md transition hover:-translate-y-0.5 active:translate-y-0"
            title="Broadcast directly to Telegram channels & groups"
          >
            <Send className="w-4 h-4" />
            <span>{language === 'am' ? 'በቴሌግራም ቻናል አጋራ' : 'Share to Telegram'}</span>
          </button>

          <button
            onClick={handleOpenFacebook}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition hover:-translate-y-0.5 active:translate-y-0"
            title="Copies caption and opens Facebook"
          >
            <Facebook className="w-4 h-4" />
            <span>{language === 'am' ? 'ፌስቡክ ላይ ፖስት (P02)' : 'Post on Facebook (P02)'}</span>
          </button>

          <button
            onClick={handleOpenTikTok}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition hover:-translate-y-0.5 active:translate-y-0"
            title="Copies caption and opens TikTok"
          >
            <Video className="w-4 h-4 text-pink-400" />
            <span>{language === 'am' ? 'ቲክቶክ ላይ ፖስት (P03)' : 'Post on TikTok (P03)'}</span>
          </button>

          <button
            onClick={handleNativeShare}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition hover:-translate-y-0.5 active:translate-y-0"
            title="Open phone share drawer"
          >
            <Smartphone className="w-4 h-4" />
            <span>{language === 'am' ? 'በስልክ ያጋሩ' : 'Mobile Share'}</span>
          </button>
        </div>
      </div>

      {/* Copy Alert Toasts */}
      {copiedFbToast && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-xs flex items-center gap-2 animate-slide-up shadow-sm">
          <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="font-semibold">
            {language === 'am'
              ? 'የፖስቱ ፅሁፍ ኮፒ ተደርጓል! ፌስቡክ ሲከፈት Paste በማድረግ ፖስት ያድርጉ።'
              : 'Caption copied to clipboard! Paste it into your Facebook post.'}
          </span>
        </div>
      )}

      {copiedTiktokToast && (
        <div className="p-3.5 bg-pink-50 border border-pink-200 text-pink-800 rounded-2xl text-xs flex items-center gap-2 animate-slide-up shadow-sm">
          <Check className="w-4 h-4 text-pink-600 flex-shrink-0" />
          <span className="font-semibold">
            {language === 'am'
              ? 'የፖስቱ ፅሁፍ ኮፒ ተደርጓል! በቲክቶክ ባዮዎ ላይ የቴሌግራም ሊንክዎን ማድረግ አይርሱ።'
              : 'Caption copied to clipboard! Remember to set your Telegram link in your TikTok bio.'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product & Media Selection (P01 & P07) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Select Products Grid (P07) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {language === 'am' ? 'ለማስተዋወቅ እቃዎችን ይምረጡ (P07)' : 'Choose Products for the Post (P07)'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'am'
                    ? 'በቅደም ተከተል ይምረጡ፤ ፎቶዎች እና ቪዲዮዎች አብረው ይካተታሉ'
                    : 'Tap products in order to include them in the social media album'}
                </p>
              </div>
              <span className="text-xs text-brand-600 font-bold bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
                {selectedProductIds.length} {language === 'am' ? 'ተመርጧል' : 'selected'}
              </span>
            </div>

            {products.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No products found in catalog.{' '}
                <Link href="/dashboard/products" className="text-brand-600 font-bold underline">
                  Add products first
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {products.map((p) => {
                  const isSelected = selectedProductIds.includes(p.id);
                  const orderNum = selectedProductIds.indexOf(p.id) + 1;
                  const photo = p.media?.find((m: any) => m.isPrimary)?.url || p.photoUrl || p.media?.[0]?.url;

                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleSelectProduct(p.id)}
                      className={`relative rounded-2xl border-2 p-2.5 cursor-pointer transition-all duration-200 flex flex-col items-center text-center ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/50 shadow-glow scale-[1.02]'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-600 text-white font-black text-[10px] flex items-center justify-center shadow-md">
                          {orderNum}
                        </div>
                      )}

                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden mb-2 relative">
                        {photo ? (
                          <img src={photo} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-400" />
                        )}
                        {p.media?.some((m: any) => m.type === 'VIDEO') && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="w-4 h-4 fill-white text-white" />
                          </div>
                        )}
                      </div>

                      <span className="font-bold text-xs text-slate-800 line-clamp-1">{p.name}</span>
                      <span className="text-[11px] text-brand-700 font-extrabold mt-0.5">
                        {Number(p.price).toLocaleString()} ETB
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Ready-Made Auto-Filled Caption (P01) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {language === 'am' ? 'የተዘጋጀ የፖስት ፅሁፍ (P01 Caption)' : 'Ready-Made Post Caption (P01)'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'am' ? 'ዋጋ፣ ሊንክ እና የሱቅ መረጃን በራስ-ሰር ያካትታል' : 'Auto-filled with product prices, telegram deep link, and contact details'}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={copyCaption}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCaption ? 'Copied!' : 'Copy Caption'}</span>
                </button>
                <button
                  onClick={copyLink}
                  className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <textarea
              readOnly
              rows={6}
              value={generatedCaption}
              className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-sans focus:outline-none leading-relaxed"
            />

            {/* Preview Switchers */}
            <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPreviewMode('fb_album')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  previewMode === 'fb_album'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Facebook Album Preview (P08)</span>
              </button>

              <button
                onClick={() => setPreviewMode('tiktok')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  previewMode === 'tiktok'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>TikTok Video Preview (P09)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Previews, Printable QR & Marketing Poster (P01, P08, P09, FR-68) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Printable Shop Window QR Code & Marketing Poster */}
          {qrCodeDataUrl && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm text-center space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm text-left">
                  {language === 'am' ? 'የሱቅ ማስተዋወቂያ ፖስተር እና QR' : 'Printable QR & Social Poster'}
                </h3>
                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                  FR-68
                </span>
              </div>
              <p className="text-[11px] text-slate-400 text-left">
                {language === 'am'
                  ? 'በምርቱ ፎቶ ላይ የሱቅዎን QR ኮድ እና ዋጋ ያካተተ ፖስተር በ1-ክሊክ ያውርዱ'
                  : 'Download a promotional banner with your product photo, price, and scannable Telegram QR'}
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl inline-block shadow-sm w-full">
                <img src={qrCodeDataUrl} alt="Shop QR" className="w-36 h-36 rounded-xl mx-auto mb-3 shadow" />

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <a
                    href={qrCodeDataUrl}
                    download={`gebeya_${shop?.name || 'shop'}_qr.png`}
                    className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download QR</span>
                  </a>

                  {primaryProduct && (
                    <button
                      onClick={handleDownloadFlyer}
                      disabled={isGeneratingFlyer}
                      className="py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-glow glow-btn-primary transition disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isGeneratingFlyer ? 'Generating...' : 'Download Promo Poster'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Social Previews (P08 / P09) */}
          {previewMode === 'fb_album' && (
            <div className="bg-white rounded-3xl border-2 border-blue-200 shadow-xl p-5 space-y-3 animate-scale-in">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-xs text-blue-700">Facebook Album Preview (P08)</span>
                </div>
                <button
                  onClick={() => setPreviewMode('none')}
                  className="text-slate-400 hover:text-slate-600 text-xs p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow">
                    {shop?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">{shop?.name}</span>
                    <span className="text-[10px] text-slate-400">Sponsored · Just now · 🌍</span>
                  </div>
                </div>

                <p className="text-slate-800 text-[11px] whitespace-pre-line line-clamp-3 leading-relaxed">
                  {generatedCaption}
                </p>

                {/* Multi-Photo Grid */}
                <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden bg-slate-100 max-h-56">
                  {selectedProducts.slice(0, 4).map((p, idx) => {
                    const imgUrl = p.media?.find((m: any) => m.isPrimary)?.url || p.photoUrl || p.media?.[0]?.url;
                    return (
                      <div key={idx} className="h-28 bg-slate-200 overflow-hidden relative">
                        {imgUrl ? (
                          <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                            {p.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleOpenFacebook}
                  className="w-full mt-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl text-center block shadow transition"
                >
                  Order on Telegram · ይዘዙ (P04)
                </button>
              </div>
            </div>
          )}

          {previewMode === 'tiktok' && (
            <div className="bg-slate-950 text-white rounded-3xl border-2 border-slate-800 shadow-2xl p-5 space-y-3 animate-scale-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-pink-400" />
                  <span className="font-bold text-xs text-pink-400">TikTok Video Preview (P09)</span>
                </div>
                <button
                  onClick={() => setPreviewMode('none')}
                  className="text-slate-400 hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="h-48 rounded-2xl bg-slate-900 flex items-center justify-center relative overflow-hidden border border-slate-800">
                  {primaryProduct?.media?.some((m: any) => m.type === 'VIDEO') ? (
                    <video
                      src={primaryProduct.media.find((m: any) => m.type === 'VIDEO').url}
                      className="w-full h-full object-cover"
                      muted
                      autoPlay
                      loop
                    />
                  ) : primaryProduct?.photoUrl ? (
                    <img src={primaryProduct.photoUrl} alt="TikTok" className="w-full h-full object-cover" />
                  ) : (
                    <Video className="w-10 h-10 text-slate-600" />
                  )}
                  <span className="absolute bottom-2 left-2 bg-black/70 px-2.5 py-1 rounded-lg text-[10px] text-white backdrop-blur font-bold">
                    {primaryProduct?.name} · {Number(primaryProduct?.price).toLocaleString()} ETB
                  </span>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 text-[11px] space-y-1">
                  <span className="font-bold text-slate-200">Shop Profile:</span>
                  <p className="text-slate-400">🔗 Link in bio: {shop?.botLink}</p>
                </div>

                <button
                  onClick={handleOpenTikTok}
                  className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl text-center block shadow transition"
                >
                  Open TikTok Web to Post (P03)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostingKitPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs text-slate-400">Loading posting kit...</div>}>
      <PostingKitContent />
    </Suspense>
  );
}
