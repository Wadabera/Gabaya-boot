'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
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
} from 'lucide-react';

export default function ProductsPage() {
  const { shop, language, t } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [categoryName, setCategoryName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      await api.patch(`/shops/${shop!.id}/products/${product.id}/stock-toggle`);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, isOutOfStock: !p.isOutOfStock } : p
        )
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
    setStock('10');
    setCategoryName('');
    setPhotoFile(null);
    setPhotoPreview('');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setPrice(String(product.price));
    setStock(String(product.stock));
    setCategoryName(product.category?.name || '');
    setPhotoFile(null);
    setPhotoPreview(product.photoUrl || '');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      let uploadedUrl = editingProduct?.photoUrl || undefined;
      if (photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        const uploadRes = await api.post('/storage/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrl = uploadRes.data.url;
      }

      if (editingProduct) {
        // Update product
        await api.patch(`/shops/${shop!.id}/products/${editingProduct.id}`, {
          name,
          description,
          price: parseFloat(price),
          stock: parseInt(stock, 10),
          categoryName: categoryName || undefined,
          photoUrl: uploadedUrl,
        });
      } else {
        // Create product
        await api.post(`/shops/${shop!.id}/products`, {
          name,
          description,
          price: parseFloat(price),
          stock: parseInt(stock, 10),
          categoryName: categoryName || undefined,
          photoUrl: uploadedUrl,
        });
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

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.productsTitle}</h2>
          <p className="text-xs text-slate-500">
            {language === 'am' ? 'ምርቶችዎን ያስተዳድሩ፣ ስቶክ እና ዋጋዎችን ይቆጣጠሩ' : 'Manage catalog, stock limits, and prices'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
              placeholder={t.search}
              className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-44 sm:w-60"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNewProduct}</span>
          </button>
        </div>
      </div>

      {/* Product List Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm mb-1">
            {language === 'am' ? 'ምንም ምርት አልተገኘም' : 'No products found'}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {language === 'am' ? 'የመጀመሪያውን ምርትዎን አሁኑኑ ይመዝግቡ' : 'Add your first product to start selling'}
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
          >
            {t.addNewProduct}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                {/* Image */}
                <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                  {product.photoUrl ? (
                    <img
                      src={product.photoUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  )}

                  {/* Stock Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                        product.isOutOfStock || product.stock <= 0
                          ? 'bg-red-500 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {product.isOutOfStock || product.stock <= 0 ? t.outOfStock : `${t.inStock} (${product.stock})`}
                    </span>
                  </div>

                  {product.category && (
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-medium bg-black/60 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
                        {product.category.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{product.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {product.description || (language === 'am' ? 'ምንም ዝርዝር መግለጫ የለም' : 'No description provided')}
                  </p>
                  <div className="flex items-baseline gap-1 text-base font-black text-brand-700">
                    <span>{product.price}</span>
                    <span className="text-xs font-semibold text-slate-400">ETB</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
                {/* Out of Stock Toggle */}
                <button
                  onClick={() => handleToggleStock(product)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                    product.isOutOfStock
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {product.isOutOfStock ? (language === 'am' ? 'ስቶክ አለ አድርግ' : 'Set In-Stock') : (language === 'am' ? 'አልቋል አድርግ' : 'Set Out-of-Stock')}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(product)}
                    className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
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
          ))}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-base mb-4">
              {editingProduct ? t.edit : t.addNewProduct}
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.productNameLabel}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.price} (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.stock}</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.productCategoryLabel}</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Shoes, Electronics, Clothes"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'am' ? 'ዝርዝር መግለጫ (Description)' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.productPhotoLabel}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPhotoFile(e.target.files[0]);
                      setPhotoPreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700"
                />
                {photoPreview && (
                  <div className="mt-2 w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? t.loading : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
