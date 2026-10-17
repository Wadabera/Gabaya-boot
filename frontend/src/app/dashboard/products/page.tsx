'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Video,
  Eye,
  Star,
  Sparkles,
  Layers,
  ChevronRight,
  X,
  Play,
  SlidersHorizontal,
  Share2,
  Facebook,
  Send,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Download,
} from 'lucide-react';
import MediaUploader, { MediaItem } from '@/components/media-uploader';
import ProductGalleryModal from '@/components/product-gallery-modal';

export default function ProductsPage() {
  const { shop, language, t } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Auto-Post to Social Media State
  const [autoShareAfterCreate, setAutoShareAfterCreate] = useState(true);
  const [newlyCreatedProduct, setNewlyCreatedProduct] = useState<any | null>(null);
  const [copiedPostCaption, setCopiedPostCaption] = useState(false);
  const [copiedPostLink, setCopiedPostLink] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [options, setOptions] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Gallery Quick-View Lightbox state
  const [galleryProduct, setGalleryProduct] = useState<any | null>(null);

  useEffect(() => {
    if (shop?.id) {
      loadProducts();
    }
  }, [shop?.id, selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/shops/${shop!.id}/products`, {
        params: {
          categoryId: selectedCategory || undefined,
          search: search || undefined,
        },
      });
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStock = async (product: any) => {
    try {
      await api.patch(`/shops/${shop!.id}/products/${product.id}/stock-toggle`, {
        isOutOfStock: !product.isOutOfStock,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, isOutOfStock: !p.isOutOfStock } : p,
        ),
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle stock status');
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPrice('');
    setStock('15');
    setOptions('');
    setCategoryName('');
    setMediaList([]);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setPrice(String(product.price));
    setStock(String(product.stock));
    setOptions(product.options || '');
    setCategoryName(product.category?.name || '');

    // Map existing product media
    if (product.media && product.media.length > 0) {
      setMediaList(
        product.media.map((m: any, idx: number) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
          isPrimary: m.isPrimary,
          sortOrder: m.sortOrder ?? idx,
          title: m.title,
        })),
      );
    } else {
      const fallbackList: MediaItem[] = [];
      if (product.photoUrl) {
        fallbackList.push({
          type: 'IMAGE',
          url: product.photoUrl,
          isPrimary: true,
          sortOrder: 0,
        });
      }
      if (product.videoUrl) {
        fallbackList.push({
          type: 'VIDEO',
          url: product.videoUrl,
          isPrimary: false,
          sortOrder: 1,
        });
      }
      setMediaList(fallbackList);
    }

    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      // Find primary photo and first video
      const primaryImage =
        mediaList.find((m) => m.isPrimary && m.type !== 'VIDEO') ||
        mediaList.find((m) => m.type !== 'VIDEO');
      const firstVideo = mediaList.find((m) => m.type === 'VIDEO');

      const payload = {
        name,
        description: description || undefined,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        options: options || undefined,
        categoryName: categoryName || undefined,
        photoUrl: primaryImage?.url || undefined,
        videoUrl: firstVideo?.url || undefined,
        media: mediaList.map((m, idx) => ({
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl || undefined,
          isPrimary: m.isPrimary ?? (primaryImage ? m.url === primaryImage.url : idx === 0),
          sortOrder: idx,
          title: m.title || undefined,
        })),
      };

      if (editingProduct) {
        await api.patch(`/shops/${shop!.id}/products/${editingProduct.id}`, payload);
      } else {
        const createRes = await api.post(`/shops/${shop!.id}/products`, payload);
        if (autoShareAfterCreate && createRes.data) {
          setNewlyCreatedProduct(createRes.data);
        }
      }

      setModalOpen(false);
      await loadProducts();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm(t.confirmDeleteProduct)) return;
    try {
      await api.delete(`/shops/${shop!.id}/products/${productId}`);
      await loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  // Resolve primary image for live preview
  const livePrimaryMedia =
    mediaList.find((m) => m.isPrimary && m.type !== 'VIDEO') ||
    mediaList.find((m) => m.type !== 'VIDEO') ||
    mediaList[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {t.productsTitle}
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {products.length} {language === 'am' ? 'ምርቶች' : 'Products'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'am'
              ? 'የምርት ካታሎግ፣ ፎቶዎች፣ ቪዲዮዎች፣ ስቶክ እና ዋጋዎችን በዘመናዊ መንገድ ያስተዳድሩ'
              : 'Manage multimedia product catalog, stock limits, and prices'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
              placeholder={t.search}
              className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-44 sm:w-60 shadow-sm transition"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow glow-btn-primary transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNewProduct}</span>
          </button>
        </div>
      </div>

      {/* Product List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-4 border border-slate-200/70 space-y-3">
              <div className="h-48 rounded-2xl skeleton-shimmer" />
              <div className="h-4 w-3/4 rounded-md skeleton-shimmer" />
              <div className="h-3 w-1/2 rounded-md skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 mx-auto mb-4 flex items-center justify-center shadow-md">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="font-black text-slate-800 text-base mb-1">
            {language === 'am' ? 'ምንም ምርት አልተገኘም' : 'No products found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
            {language === 'am'
              ? 'የመጀመሪያውን ምርትዎን በብዙ ፎቶዎች እና ቪዲዮ በማካተት አሁኑኑ ይመዝግቡ'
              : 'Add your first product with rich photos and video clips to start selling on Telegram'}
          </p>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-black shadow-glow glow-btn-primary transition"
          >
            {t.addNewProduct}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => {
            const mediaCount = product.media?.length || (product.photoUrl ? 1 : 0);
            const hasVideo = product.videoUrl || product.media?.some((m: any) => m.type === 'VIDEO');
            const primaryPhoto =
              product.media?.find((m: any) => m.isPrimary && m.type !== 'VIDEO')?.url ||
              product.photoUrl ||
              product.media?.[0]?.url;

            return (
              <div
                key={product.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between hover-lift group relative transition duration-300"
              >
                <div>
                  {/* Media Preview Box with Zoom & Badges */}
                  <div className="h-52 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                    {primaryPhoto ? (
                      <img
                        src={primaryPhoto}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <ImageIcon className="w-10 h-10 mb-1" />
                        <span className="text-[10px]">No photo</span>
                      </div>
                    )}

                    {/* Gradient Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {/* Stock Status Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md backdrop-blur-sm ${
                          product.isOutOfStock || product.stock <= 0
                            ? 'bg-red-500/90 text-white'
                            : 'bg-emerald-500/90 text-white shadow-glow'
                        }`}
                      >
                        {product.isOutOfStock || product.stock <= 0
                          ? t.outOfStock
                          : `${t.inStock} (${product.stock})`}
                      </span>
                    </div>

                    {/* Category & Media Count Badges */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      {product.category && (
                        <span className="text-[10px] font-semibold bg-black/60 text-white px-2 py-0.5 rounded-md backdrop-blur-md">
                          {product.category.name}
                        </span>
                      )}
                      {mediaCount > 1 && (
                        <span className="text-[10px] font-bold bg-slate-900/80 text-white px-2 py-0.5 rounded-md backdrop-blur-md flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-brand-400" />
                          <span>{mediaCount}</span>
                        </span>
                      )}
                      {hasVideo && (
                        <span className="text-[10px] font-bold bg-sky-600/90 text-white px-2 py-0.5 rounded-md backdrop-blur-md flex items-center gap-1 shadow-sm">
                          <Video className="w-3 h-3" />
                          <span>Clip</span>
                        </span>
                      )}
                    </div>

                    {/* Quick Lightbox View Button */}
                    <button
                      type="button"
                      onClick={() => setGalleryProduct(product)}
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-900 font-bold text-xs shadow-lg backdrop-blur-md flex items-center gap-1.5 transition transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 hover:scale-105"
                    >
                      <Eye className="w-3.5 h-3.5 text-brand-600" />
                      <span>{language === 'am' ? 'ጋለሪ' : 'View Gallery'}</span>
                    </button>
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1 group-hover:text-brand-600 transition">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                      {product.description || (language === 'am' ? 'ምንም ዝርዝር መግለጫ የለም' : 'No description provided')}
                    </p>

                    <div className="flex items-baseline justify-between pt-1">
                      <div className="flex items-baseline gap-1 text-base font-black text-brand-700">
                        <span>{Number(product.price).toLocaleString()}</span>
                        <span className="text-xs font-semibold text-slate-400">ETB</span>
                      </div>
                      {product.options && (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {product.options}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
                  {/* Stock Switch */}
                  <button
                    onClick={() => handleToggleStock(product)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border transition ${
                      product.isOutOfStock
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    {product.isOutOfStock
                      ? language === 'am'
                        ? 'ስቶክ አለ አድርግ'
                        : 'Set In-Stock'
                      : language === 'am'
                      ? 'አልቋል አድርግ'
                      : 'Set Out-of-Stock'}
                  </button>

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/dashboard/posting-kit?productId=${product.id}`}
                      className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                      title={language === 'am' ? 'በማህበራዊ ሚዲያ አስተዋውቅ (P01)' : 'Post on FB & TikTok (P01)'}
                    >
                      <Share2 className="w-4 h-4 text-sky-600" />
                    </Link>
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                      title={t.edit}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Media Gallery Lightbox */}
      <ProductGalleryModal
        isOpen={!!galleryProduct}
        onClose={() => setGalleryProduct(null)}
        product={galleryProduct}
        language={language}
      />

      {/* Professional Multimedia Product Builder Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingProduct
                      ? language === 'am'
                        ? 'ምርት ማስተካከያ'
                        : 'Edit Product Details'
                      : language === 'am'
                      ? 'አዲስ ምርት መመዝገቢያ'
                      : 'Create New Product'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {language === 'am'
                      ? 'ምስሎችን፣ ቪዲዮዎችን እና የምርት ዝርዝሮችን ያስገቡ'
                      : 'Add high-res photos, video clip, and catalog information'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-300 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200 animate-shake">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} id="productForm" className="space-y-6">
                {/* 1. Basic Product Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[11px] font-bold flex items-center justify-center">1</span>
                    {language === 'am' ? 'የምርት መረጃ' : 'Basic Product Information'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.productNameLabel} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Bole Genuine Leather Handbag"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.productCategoryLabel}
                      </label>
                      <input
                        type="text"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="e.g. Leather Goods, Coffee, Clothing"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {language === 'am' ? 'ዝርዝር ማብራሪያ (Description)' : 'Product Description'}
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={
                        language === 'am'
                          ? 'የምርቱን ጥራት፣ መጠን እና ዝርዝር መረጃ ያስገቡ...'
                          : 'Provide details about materials, origin, and craftsmanship...'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                    />
                  </div>
                </div>

                {/* 2. Price, Stock & Options */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[11px] font-bold flex items-center justify-center">2</span>
                    {language === 'am' ? 'ዋጋ እና ስቶክ' : 'Pricing & Inventory'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.price} (ETB) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="1"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="2500"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.stock} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        placeholder="10"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {language === 'am' ? 'አማራጮች (Options / Sizes)' : 'Options / Sizes'}
                      </label>
                      <input
                        type="text"
                        value={options}
                        onChange={(e) => setOptions(e.target.value)}
                        placeholder="e.g. S, M, L, XL or 250g, 500g"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Multimedia Gallery & Video Upload */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[11px] font-bold flex items-center justify-center">3</span>
                    {language === 'am' ? 'የምርት ፎቶዎች እና ቪዲዮ (Multimedia Gallery)' : 'Multimedia Gallery (Photos & Video)'}
                  </h4>

                  <MediaUploader
                    media={mediaList}
                    onChange={setMediaList}
                    language={language}
                    maxFiles={10}
                  />
                </div>

                {/* 4. Live Customer Preview Card */}
                {name && (
                  <div className="pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      {language === 'am' ? 'የደንበኛ ቅድመ እይታ (Live Customer Preview)' : 'Live Customer Preview'}
                    </h4>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center">
                      <div className="w-32 h-32 rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                        {livePrimaryMedia ? (
                          livePrimaryMedia.type === 'VIDEO' ? (
                            <div className="w-full h-full relative flex items-center justify-center">
                              <video src={livePrimaryMedia.url} className="w-full h-full object-cover" muted />
                              <Play className="w-6 h-6 text-white absolute" />
                            </div>
                          ) : (
                            <img src={livePrimaryMedia.url} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-500" />
                        )}
                        <span className="absolute top-1 left-1 text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">
                          Primary
                        </span>
                      </div>

                      <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {categoryName || 'General'}
                        </span>
                        <h5 className="font-bold text-slate-900 text-sm truncate">{name}</h5>
                        <div className="text-sm font-black text-brand-600">
                          {price ? Number(price).toLocaleString() : '0'} ETB
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {mediaList.length} media items attached • {stock} in stock
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Auto-Post on Social Media Toggle (P01 - P09) */}
                {!editingProduct && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between p-3.5 rounded-2xl bg-brand-50/70 border border-brand-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          {language === 'am' ? 'ከምዝገባ በኋላ በማህበራዊ ሚዲያ በ1-ክሊክ ፖስት አድርግ' : 'Auto-prepare Social Media Post after saving'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {language === 'am' ? 'ለፌስቡክ፣ ቲክቶክ እና ቴሌግራም ቻናል የተዘጋጀ ፅሁፍ እና ሊንክ ያቀርባል (P01 - P09)' : 'Generates instant 1-click posting for Facebook, TikTok & Telegram'}
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoShareAfterCreate}
                        onChange={(e) => setAutoShareAfterCreate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="py-2.5 px-5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                form="productForm"
                disabled={isSubmitting}
                className="py-2.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-black shadow-glow glow-btn-primary transition disabled:opacity-50"
              >
                {isSubmitting ? t.loading : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO-POST SOCIAL MEDIA MODAL (FR-67, FR-68, P01 - P09) */}
      {newlyCreatedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-brand-600 to-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base leading-tight">
                    {language === 'am' ? '🎉 ምርቱ ተመዝግቧል! በማህበራዊ ሚዲያ ፖስት ያድርጉ' : '🎉 Product Published! Auto-Post to Social Media'}
                  </h3>
                  <p className="text-[11px] text-brand-100">
                    {language === 'am' ? 'የሱቅዎን የቴሌግራም መግዣ ሊንክ በ1-ክሊክ ያጋሩ (P01 - P09)' : 'Instantly share to Facebook, TikTok, & Telegram channels with deep order link'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNewlyCreatedProduct(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Product mini card */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-16 h-16 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {newlyCreatedProduct.photoUrl ? (
                    <img src={newlyCreatedProduct.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {newlyCreatedProduct.name}
                  </h4>
                  <div className="text-xs font-black text-brand-600 mt-0.5">
                    {Number(newlyCreatedProduct.price).toLocaleString()} ETB
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {newlyCreatedProduct.options ? `Options: ${newlyCreatedProduct.options}` : 'In Stock'}
                  </span>
                </div>
              </div>

              {/* Ready-made social caption */}
              {(() => {
                const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'gebayawa_bot';
                const shareUrl = shop?.botLink || `https://t.me/${botUsername}?start=prod_${newlyCreatedProduct.id}`;
                const captionText = `🔥 አዲስ እቃ ገብቷል! ${newlyCreatedProduct.name} - ${Number(newlyCreatedProduct.price).toLocaleString()} ETB\n${
                  newlyCreatedProduct.description ? `${newlyCreatedProduct.description}\n` : ''
                }\n🛒 በቴሌግራም በቀጥታ እዚህ ይዘዙ / Order directly inside Telegram:\n👉 ${shareUrl}\n\n📍 ${shop?.area || 'አዲስ አበባ'} | 🚚 ፈጣን ማድረሻ አለን`;

                const handleCopyCaption = () => {
                  navigator.clipboard.writeText(captionText);
                  setCopiedPostCaption(true);
                  setTimeout(() => setCopiedPostCaption(false), 2500);
                };

                const handleShareTelegram = () => {
                  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(captionText)}`;
                  window.open(tgUrl, '_blank', 'noopener,noreferrer');
                };

                const handleShareFacebook = () => {
                  handleCopyCaption();
                  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                  window.open(fbUrl, '_blank', 'noopener,noreferrer');
                };

                const handleShareTikTok = () => {
                  handleCopyCaption();
                  window.open('https://www.tiktok.com/upload', '_blank', 'noopener,noreferrer');
                };

                const handleNativeShare = () => {
                  if (typeof navigator !== 'undefined' && (navigator as any).share) {
                    (navigator as any).share({
                      title: newlyCreatedProduct.name,
                      text: captionText,
                      url: shareUrl,
                    }).catch(() => {});
                  } else {
                    handleCopyCaption();
                  }
                };

                return (
                  <div className="space-y-4">
                    {/* Caption Preview Box */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          {language === 'am' ? 'የተዘጋጀ የፖስት ፅሁፍ (Auto Caption)' : 'Ready-Made Post Caption'}
                        </span>
                        <button
                          onClick={handleCopyCaption}
                          className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                        >
                          {copiedPostCaption ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedPostCaption ? 'Copied!' : 'Copy Caption'}</span>
                        </button>
                      </div>

                      <textarea
                        readOnly
                        rows={4}
                        value={captionText}
                        className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans focus:outline-none"
                      />
                    </div>

                    {/* Social Media 1-Click Launch Grid */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">
                        {language === 'am' ? 'በ1-ክሊክ ማጋሪያ መንገዶች (1-Click Auto-Post)' : '1-Click Social Sharing Channels'}
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Telegram Channel Share */}
                        <button
                          onClick={handleShareTelegram}
                          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md transition active:scale-95"
                        >
                          <Send className="w-4 h-4" />
                          <span>{language === 'am' ? 'በቴሌግራም ቻናል አጋራ' : 'Share to Telegram'}</span>
                        </button>

                        {/* Facebook Post */}
                        <button
                          onClick={handleShareFacebook}
                          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition active:scale-95"
                        >
                          <Facebook className="w-4 h-4" />
                          <span>{language === 'am' ? 'ፌስቡክ ላይ ፖስት (P02)' : 'Post on Facebook'}</span>
                        </button>

                        {/* TikTok Post */}
                        <button
                          onClick={handleShareTikTok}
                          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition active:scale-95"
                        >
                          <Video className="w-4 h-4 text-pink-400" />
                          <span>{language === 'am' ? 'ቲክቶክ ላይ ፖስት (P03)' : 'Post on TikTok'}</span>
                        </button>

                        {/* Native Share on mobile */}
                        <button
                          onClick={handleNativeShare}
                          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-95"
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>{language === 'am' ? 'በስልክዎ ያጋሩ' : 'Mobile Share Sheet'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Full Posting Kit Shortcut */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href={`/dashboard/posting-kit?productId=${newlyCreatedProduct.id}`}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1.5"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{language === 'am' ? 'ሙሉ የማስተዋወቂያ ኪት ክፈት (P01 - P09)' : 'Open Full Social Posting Kit'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={() => {
                          setNewlyCreatedProduct(null);
                          openAddModal();
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition"
                      >
                        {language === 'am' ? '➕ ሌላ እቃ መዝግብ' : '➕ Add Another'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setNewlyCreatedProduct(null)}
                className="py-2 px-5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition"
              >
                {language === 'am' ? 'ተከናውኗል (Done)' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
