'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Video,
  Star,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
  AlertCircle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import api from '@/lib/api';

export interface MediaItem {
  id?: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string;
  isPrimary: boolean;
  sortOrder: number;
  title?: string;
  file?: File;
  isUploading?: boolean;
  error?: string;
}

interface MediaUploaderProps {
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  language?: string;
  maxFiles?: number;
}

export default function MediaUploader({
  media,
  onChange,
  language = 'am',
  maxFiles = 10,
}: MediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activePreviewVideo, setActivePreviewVideo] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  // Preset Ethiopian commerce items
  const presets = [
    {
      name: language === 'am' ? 'የቆዳ ውጤቶች ፎቶዎች' : 'Leather Bag Gallery',
      items: [
        { type: 'IMAGE' as const, url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=80', isPrimary: true, sortOrder: 0, title: 'Bole Leather Tote - Front' },
        { type: 'IMAGE' as const, url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&auto=format&fit=crop&q=80', isPrimary: false, sortOrder: 1, title: 'Bole Leather Tote - Texture' },
        { type: 'IMAGE' as const, url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80', isPrimary: false, sortOrder: 2, title: 'Bole Leather Tote - Side' },
      ],
    },
    {
      name: language === 'am' ? 'የይርጋጨፌ ቡና + ቪዲዮ' : 'Specialty Coffee + Clip',
      items: [
        { type: 'IMAGE' as const, url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80', isPrimary: true, sortOrder: 0, title: 'Roasted Beans' },
        { type: 'IMAGE' as const, url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80', isPrimary: false, sortOrder: 1, title: 'Brewing Experience' },
        { type: 'VIDEO' as const, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', isPrimary: false, sortOrder: 2, title: 'Coffee Roast Demo Video' },
      ],
    },
    {
      name: language === 'am' ? 'የሀበሻ ቀሚስ' : 'Habesha Traditional Dress',
      items: [
        { type: 'IMAGE' as const, url: 'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=800&auto=format&fit=crop&q=80', isPrimary: true, sortOrder: 0, title: 'Handwoven Habesha Kemis' },
        { type: 'IMAGE' as const, url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80', isPrimary: false, sortOrder: 1, title: 'Embroidery Detail' },
      ],
    },
    {
      name: language === 'am' ? 'የእጅ ጥበብ ጫማ' : 'Handmade Shoes',
      items: [
        { type: 'IMAGE' as const, url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80', isPrimary: true, sortOrder: 0, title: 'Leather Oxford Shoes' },
        { type: 'IMAGE' as const, url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&auto=format&fit=crop&q=80', isPrimary: false, sortOrder: 1, title: 'Sole & Craft Detail' },
      ],
    },
  ];

  const handleApplyPreset = (presetItems: typeof presets[0]['items']) => {
    setUploadError(null);
    const newItems: MediaItem[] = presetItems.map((item, idx) => ({
      ...item,
      sortOrder: idx,
    }));
    onChange(newItems);
  };

  const processFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    const fileArray = Array.from(files);

    if (media.length + fileArray.length > maxFiles) {
      setUploadError(
        language === 'am'
          ? `እባክዎ እስከ ${maxFiles} ሚዲያ (ምስሎች እና ቪዲዮ) ብቻ ያስገቡ`
          : `Maximum limit is ${maxFiles} media items total`,
      );
      return;
    }

    // Validate size and types
    for (const file of fileArray) {
      const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|ogg)$/i);
      const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);

      if (!isVideo && !isImage) {
        setUploadError(
          language === 'am'
            ? `ተቀባይነት የሌለው ፋይል አይነት: ${file.name}. እባክዎ ምስል ወይም ቪዲዮ ይጠቀሙ።`
            : `Unsupported file format: ${file.name}. Please select images or videos.`,
        );
        return;
      }

      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError(
          language === 'am'
            ? `ፋይል ${file.name} በጣም ትልቅ ነው። ከፍተኛው ገደብ: ${isVideo ? '50MB ለቪዲዮ' : '10MB ለምስል'}`
            : `File ${file.name} is too large. Max size is ${isVideo ? '50MB for video' : '10MB for image'}.`,
        );
        return;
      }
    }

    setUploadingCount((prev) => prev + fileArray.length);

    try {
      const formData = new FormData();
      fileArray.forEach((file) => {
        formData.append('files', file);
      });

      const res = await api.post('/storage/upload-multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedResults = res.data; // Array of { url, filename, type, size, mimeType }
      const hasExistingPrimary = media.some((m) => m.isPrimary && m.type !== 'VIDEO');

      const newMediaItems: MediaItem[] = uploadedResults.map((u: any, index: number) => {
        const isFirstImage = !hasExistingPrimary && index === 0 && u.type === 'IMAGE';
        return {
          type: u.type,
          url: u.url,
          isPrimary: isFirstImage,
          sortOrder: media.length + index,
          title: u.originalName,
        };
      });

      const combined = [...media, ...newMediaItems];
      // Ensure at least one image is primary if any image exists
      const hasAnyPrimary = combined.some((m) => m.isPrimary && m.type !== 'VIDEO');
      if (!hasAnyPrimary) {
        const firstImg = combined.find((m) => m.type !== 'VIDEO');
        if (firstImg) firstImg.isPrimary = true;
      }

      onChange(combined);
    } catch (err: any) {
      setUploadError(
        err.response?.data?.message ||
          (language === 'am' ? 'ፋይሎችን ማስተላለፍ አልተሳካም' : 'Failed to upload media files'),
      );
    } finally {
      setUploadingCount(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleSetPrimary = (index: number) => {
    const updated = media.map((item, idx) => ({
      ...item,
      isPrimary: idx === index && item.type !== 'VIDEO',
    }));
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const wasPrimary = media[index].isPrimary;
    const remaining = media.filter((_, idx) => idx !== index);

    // If removed item was primary, make the first available image primary
    if (wasPrimary && remaining.length > 0) {
      const firstImage = remaining.find((m) => m.type !== 'VIDEO');
      if (firstImage) firstImage.isPrimary = true;
    }

    // Re-index sortOrder
    const reordered = remaining.map((m, idx) => ({
      ...m,
      sortOrder: idx,
    }));

    onChange(reordered);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= media.length) return;

    const copy = [...media];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reordered = copy.map((m, idx) => ({
      ...m,
      sortOrder: idx,
    }));

    onChange(reordered);
  };

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-brand-500 bg-brand-50/60 shadow-glow scale-[1.01]'
            : 'border-slate-200 hover:border-brand-400 hover:bg-slate-50/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          multiple
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-brand-500/20 animate-pulse-subtle">
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800">
              {language === 'am'
                ? 'ምስሎችን እና ቪዲዮዎችን ይጫኑ ወይም ይጎትቱ'
                : 'Click to upload or drag & drop multiple photos and videos'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'am'
                ? 'ምስሎች (JPG, PNG, WebP እስከ 10MB) • ቪዲዮዎች (MP4, WebM እስከ 50MB) • እስከ 10 ፋይሎች'
                : 'Photos (JPG, PNG, WebP up to 10MB) • Videos (MP4, WebM up to 50MB) • Max 10 items'}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
              <ImageIcon className="w-3 h-3" />
              {language === 'am' ? 'ብዙ ምስሎች' : 'Multi-Image'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
              <Video className="w-3 h-3" />
              {language === 'am' ? 'የምርት ቪዲዮ' : 'Product Video'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <Star className="w-3 h-3 fill-amber-500" />
              {language === 'am' ? 'ዋና ምስል መምረጫ' : 'Primary Selector'}
            </span>
          </div>
        </div>

        {uploadingCount > 0 && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs font-bold text-slate-700">
              {language === 'am'
                ? `${uploadingCount} ፋይሎች በመጫን ላይ ናቸው...`
                : `Uploading ${uploadingCount} media files...`}
            </p>
          </div>
        )}
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs animate-shake">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preset Quick-Picker */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {language === 'am' ? 'ፈጣን የኢትዮጵያ ምርት ፎቶዎች እና ቪዲዮ ማሳያ:' : 'Ethiopian Commerce Presets:'}
          </span>
          <span className="text-[10px] text-slate-400">1-click demo media</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset.items)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:border-brand-500 hover:text-brand-600 hover:shadow-sm transition flex items-center gap-1.5"
            >
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Media Thumbnails Gallery */}
      {media.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">
              {language === 'am'
                ? `የተመረጡ ሚዲያዎች (${media.length}/${maxFiles})`
                : `Selected Media Gallery (${media.length}/${maxFiles})`}
            </span>
            <span className="text-[11px] text-slate-500">
              {language === 'am'
                ? '⭐ ጠቅ በማድረግ ዋናውን ፎቶ ይምረጡ'
                : 'Click ⭐ to designate primary store photo'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {media.map((item, index) => (
              <div
                key={index}
                className={`relative group rounded-2xl border-2 overflow-hidden bg-slate-900 shadow-sm transition-all duration-200 ${
                  item.isPrimary
                    ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-glow-amber'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                {/* Media Preview Stage */}
                <div className="aspect-square relative overflow-hidden flex items-center justify-center bg-slate-950">
                  {item.type === 'VIDEO' ? (
                    <div className="w-full h-full relative flex items-center justify-center">
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePreviewVideo(item.url);
                        }}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                          <Play className="w-5 h-5 fill-slate-900 ml-0.5" />
                        </div>
                      </button>
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.title || `Media ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  )}

                  {/* Primary Badge */}
                  {item.isPrimary && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md">
                        <Star className="w-3 h-3 fill-white" />
                        {language === 'am' ? 'ዋና ፎቶ' : 'Primary'}
                      </span>
                    </div>
                  )}

                  {/* Media Type Badge */}
                  <div className="absolute bottom-2 left-2 z-10">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md uppercase tracking-wider text-white ${
                        item.type === 'VIDEO' ? 'bg-sky-600/90' : 'bg-black/60'
                      }`}
                    >
                      {item.type === 'VIDEO' ? '🎬 Video' : `📸 #${index + 1}`}
                    </span>
                  </div>

                  {/* Action Overlay */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="w-7 h-7 rounded-xl bg-red-600/90 text-white flex items-center justify-center shadow hover:bg-red-700 transition"
                      title={language === 'am' ? 'ሰርዝ' : 'Remove'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Footer Controls: Star & Reorder */}
                <div className="p-2 bg-white flex items-center justify-between border-t border-slate-100">
                  {item.type !== 'VIDEO' ? (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(index)}
                      className={`text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-lg transition ${
                        item.isPrimary
                          ? 'text-amber-600 bg-amber-50'
                          : 'text-slate-500 hover:text-amber-600 hover:bg-slate-50'
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          item.isPrimary ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-[10px]">
                        {item.isPrimary
                          ? language === 'am'
                            ? 'ዋና'
                            : 'Primary'
                          : language === 'am'
                          ? 'ዋና አድርግ'
                          : 'Set Primary'}
                      </span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-sky-600 font-semibold px-2 py-1 bg-sky-50 rounded-lg">
                      {language === 'am' ? 'ቪዲዮ' : 'Video Clip'}
                    </span>
                  )}

                  {/* Reorder Arrows */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'left')}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 transition"
                      title="Move left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === media.length - 1}
                      onClick={() => handleMove(index, 'right')}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 transition"
                      title="Move right"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {activePreviewVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Video className="w-4 h-4 text-sky-400" />
                <span>{language === 'am' ? 'የምርት ቪዲዮ ቅድመ እይታ' : 'Product Video Preview'}</span>
              </div>
              <button
                onClick={() => setActivePreviewVideo(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center">
              <video
                src={activePreviewVideo}
                controls
                autoPlay
                playsInline
                className="max-h-[60vh] w-full rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
