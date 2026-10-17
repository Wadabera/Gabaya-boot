'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  Volume2,
  VolumeX,
  Star,
  ShoppingBag,
  ExternalLink,
  Share2,
} from 'lucide-react';

export interface GalleryMediaItem {
  id?: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string;
  isPrimary?: boolean;
  sortOrder?: number;
  title?: string;
}

interface ProductGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    description?: string;
    price: number | string;
    stock: number;
    options?: string;
    photoUrl?: string;
    videoUrl?: string;
    media?: GalleryMediaItem[];
    category?: { name: string };
  } | null;
  language?: string;
}

export default function ProductGalleryModal({
  isOpen,
  onClose,
  product,
  language = 'am',
}: ProductGalleryModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  // Consolidate media list from product
  const mediaList: GalleryMediaItem[] = React.useMemo(() => {
    if (!product) return [];
    if (product.media && product.media.length > 0) {
      return [...product.media].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    const fallback: GalleryMediaItem[] = [];
    if (product.photoUrl) {
      fallback.push({
        type: 'IMAGE',
        url: product.photoUrl,
        isPrimary: true,
        sortOrder: 0,
        title: product.name,
      });
    }
    if (product.videoUrl) {
      fallback.push({
        type: 'VIDEO',
        url: product.videoUrl,
        isPrimary: false,
        sortOrder: 1,
        title: `${product.name} Video`,
      });
    }
    return fallback;
  }, [product]);

  // Set default to primary image or 0
  useEffect(() => {
    if (mediaList.length > 0) {
      const primaryIdx = mediaList.findIndex((m) => m.isPrimary && m.type !== 'VIDEO');
      setSelectedIndex(primaryIdx >= 0 ? primaryIdx : 0);
    } else {
      setSelectedIndex(0);
    }
  }, [product, mediaList]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, mediaList]);

  if (!isOpen || !product) return null;

  const currentMedia = mediaList[selectedIndex];

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-fade-in overflow-y-auto">
      {/* Lightbox Shell */}
      <div
        className={`relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 w-full ${
          isFullscreen
            ? 'fixed inset-3 z-50 h-[calc(100vh-24px)]'
            : 'max-w-5xl max-h-[92vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between z-20">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/50">
              {product.category?.name || (language === 'am' ? 'ምርት ዝርዝር' : 'Product Details')}
            </span>
            <h3 className="text-white font-bold text-sm sm:text-base truncate">
              {product.name}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {mediaList.length > 0 && (
              <span className="text-xs font-semibold text-slate-400 bg-slate-800/90 px-2.5 py-1 rounded-full border border-slate-700">
                {selectedIndex + 1} of {mediaList.length}
              </span>
            )}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-red-600/80 flex items-center justify-center transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area (Split Grid on Desktop: Media Stage + Info Drawer) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-slate-950">
          {/* Main Media Stage */}
          <div className="flex-1 relative flex items-center justify-center bg-black min-h-[320px] sm:min-h-[460px] p-2 sm:p-4 select-none">
            {currentMedia ? (
              currentMedia.type === 'VIDEO' ? (
                <div className="relative w-full h-full flex items-center justify-center max-h-[70vh]">
                  <video
                    key={currentMedia.url}
                    src={currentMedia.url}
                    controls
                    autoPlay
                    muted={isVideoMuted}
                    playsInline
                    className="max-h-[70vh] max-w-full rounded-2xl shadow-2xl object-contain"
                  />
                  <button
                    onClick={() => setIsVideoMuted(!isVideoMuted)}
                    className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full backdrop-blur-md transition shadow-lg"
                    title={isVideoMuted ? 'Unmute' : 'Mute'}
                  >
                    {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    key={currentMedia.url}
                    src={currentMedia.url}
                    alt={product.name}
                    className="max-h-[70vh] max-w-full object-contain rounded-2xl transition duration-500 hover:scale-[1.02]"
                  />
                  {currentMedia.isPrimary && (
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-white" />
                      <span>{language === 'am' ? 'ዋና ፎቶ' : 'Primary Product Photo'}</span>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="text-slate-500 text-sm">
                {language === 'am' ? 'ምንም ምስል አልተገኘም' : 'No media available for this product'}
              </div>
            )}

            {/* Prev/Next Navigation Controls */}
            {mediaList.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-brand-600 text-white backdrop-blur-md flex items-center justify-center shadow-lg transition duration-200 hover:scale-110 active:scale-95"
                  title="Previous (Left arrow)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-brand-600 text-white backdrop-blur-md flex items-center justify-center shadow-lg transition duration-200 hover:scale-110 active:scale-95"
                  title="Next (Right arrow)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Product Details Side Panel */}
          <div className="w-full md:w-80 lg:w-96 bg-slate-900/90 border-t md:border-t-0 md:border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div>
                <span className="text-2xl font-black text-emerald-400">
                  {Number(product.price).toLocaleString()} ETB
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      product.stock > 0
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                        : 'bg-red-900/60 text-red-300 border border-red-700/50'
                    }`}
                  >
                    {product.stock > 0
                      ? `${language === 'am' ? 'ስቶክ አለ' : 'In Stock'} (${product.stock})`
                      : language === 'am'
                      ? 'አልቋል'
                      : 'Out of Stock'}
                  </span>
                  {product.options && (
                    <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                      {product.options}
                    </span>
                  )}
                </div>
              </div>

              {product.description && (
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-40 overflow-y-auto">
                  <p className="font-semibold text-slate-400 mb-1 text-[11px] uppercase tracking-wider">
                    {language === 'am' ? 'የምርት ማብራሪያ' : 'Description'}
                  </p>
                  {product.description}
                </div>
              )}

              {/* Media Thumbnails Strip */}
              {mediaList.length > 1 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {language === 'am' ? 'የምርት ፎቶዎች እና ቪዲዮዎች' : 'Gallery Items'} ({mediaList.length})
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {mediaList.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedIndex(idx)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                          selectedIndex === idx
                            ? 'border-brand-400 shadow-glow scale-105 ring-2 ring-brand-400/30'
                            : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                        }`}
                      >
                        {item.type === 'VIDEO' ? (
                          <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                            <video src={item.url} className="w-full h-full object-cover" muted />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Play className="w-4 h-4 fill-white text-white" />
                            </div>
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                        {item.isPrimary && (
                          <div className="absolute top-1 left-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-800 mt-4 flex items-center gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow transition duration-200 text-center"
              >
                {language === 'am' ? 'እሺ፣ ተመለስ' : 'Close Gallery'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
