import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import type { Product } from '../../../shared/types';
import { Button, Input, Spinner, ImageLightbox } from '../../components/atoms';
import { useRole } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { compressImageToBase64 } from '../../lib/imageCompressor';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOwner, isAdmin } = useRole();
  const isNew = id === 'new';

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['products', id],
    queryFn: () => apiFetch(`/products/${id}`),
    enabled: !isNew,
  });

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<Partial<Product>>();
  const imageUrl = watch('image_url');

  useEffect(() => {
    if (product) {
      reset(product);
      if (product.image_url) setImagePreview(product.image_url);
    }
  }, [product, reset]);

  const handleImageChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, WebP, dll)');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleImageChange(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleImageChange(e.dataTransfer.files[0]);
  };

  const uploadImageToImgBB = async (file: File): Promise<string> => {
    const base64 = await compressImageToBase64(file, 0.85, 1200, 1200);
    const res = await apiFetch<{ url: string }>('/uploads/imgbb', {
      method: 'POST',
      body: JSON.stringify({ imageBase64: base64 }),
    });
    return res.url;
  };

  const mutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      let finalData = { ...data };
      if (imageFile) {
        setImageUploading(true);
        try {
          toast.info('Mengunggah gambar produk...');
          finalData.image_url = await uploadImageToImgBB(imageFile);
        } finally {
          setImageUploading(false);
        }
      }
      return apiFetch(isNew ? '/products' : `/products/${id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(finalData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(isNew ? 'Produk berhasil dibuat' : 'Data produk diperbarui');
      navigate('/products');
    },
    onError: () => toast.error('Gagal menyimpan data produk'),
  });

  if (isLoading && !isNew) return <Spinner />;

  const currentImage = imagePreview || imageUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate('/products')} variant="ghost" size="sm" leftIcon="arrow_back" />
        <div>
          <h1 className="text-h2 font-h2 text-primary">
            {isNew ? 'Tambah Produk Baru' : product?.name}
          </h1>
          <p className="text-on-surface-variant text-body-md">
            {isNew ? 'Masukkan informasi produk untuk ditambahkan ke katalog.' : `SKU: ${product?.sku}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">

        {/* ─── Image Upload Section ─── */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-label-md text-on-surface uppercase tracking-wider font-bold">Foto Produk</h3>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Preview Box */}
            <div className="relative w-full md:w-48 h-48 bg-surface-container rounded-xl border-2 border-dashed border-outline-variant overflow-hidden flex-shrink-0 flex items-center justify-center group">
              {currentImage ? (
                <>
                  <ImageLightbox src={currentImage} alt="Preview produk" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-white text-xs font-bold flex flex-col items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-3xl">photo_camera</span>
                      Ganti Foto
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-on-surface-variant hover:text-primary transition-colors p-4 text-center w-full h-full justify-center"
                >
                  <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                  <span className="text-xs font-medium">Klik untuk unggah</span>
                </button>
              )}
            </div>

            {/* Drop Zone */}
            <div
              className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer min-h-[192px] select-none ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-outline-variant hover:border-primary/50 hover:bg-surface-container/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className={`material-symbols-outlined text-5xl mb-3 transition-colors ${isDragging ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                cloud_upload
              </span>
              <p className="text-sm font-semibold text-on-surface text-center">
                {isDragging ? 'Lepaskan file di sini' : 'Seret & lepas foto produk di sini'}
              </p>
              <p className="text-xs text-on-surface-variant mt-1 text-center">atau klik untuk pilih dari perangkat</p>
              <p className="text-[11px] text-on-surface-variant/50 mt-3 text-center">
                Mendukung: JPG, PNG, WebP · Akan dikompres otomatis (85%)
              </p>
              {imageFile && (
                <div className="mt-3 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {imageFile.name}
                </div>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {/* ─── Product Info ─── */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nama Produk"
              placeholder="Contoh: Gamis Umroh Premium"
              {...register('name', { required: 'Nama produk wajib diisi' })}
              error={errors.name?.message}
            />
            <Input
              label="SKU"
              placeholder="Contoh: GM-001"
              {...register('sku', { required: 'SKU wajib diisi' })}
              error={errors.sku?.message}
            />
            <Input
              label="Kategori"
              placeholder="Contoh: Perlengkapan Wanita"
              {...register('category')}
            />
            <Input
              label="Satuan"
              placeholder="Contoh: Pcs, Set, Kodi"
              {...register('unit', { required: 'Satuan wajib diisi' })}
              error={errors.unit?.message}
            />
          </div>

          <div className="pt-4 border-t border-outline-variant space-y-4">
            <h3 className="text-label-md text-on-surface uppercase tracking-wider font-bold">Deskripsi & Harga</h3>
            <Input
              label="Deskripsi"
              placeholder="Penjelasan singkat produk..."
              {...register('description')}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Harga Publish — visible to Admin & Owner */}
              <div className="space-y-1">
                <Input
                  label="Harga Publish (Rp)"
                  type="number"
                  placeholder="Harga jual yang ditawarkan ke klien"
                  {...register('publish_price', { valueAsNumber: true })}
                />
                <p className="text-[11px] text-on-surface-variant pl-1">Harga jual resmi yang tertera di penawaran & invoice.</p>
              </div>

              {/* HPP Base — Owner only */}
              {isOwner && (
                <div className="space-y-1">
                  <Input
                    label="HPP Base (Rp) — Rahasia"
                    type="number"
                    placeholder="Harga modal produksi"
                    {...register('hpp_base', { valueAsNumber: true })}
                  />
                  <p className="text-[11px] text-amber-600 pl-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    Hanya terlihat oleh Owner
                  </p>
                </div>
              )}
            </div>

            {/* Live Margin Calculator — Owner only */}
            {isOwner && (() => {
              const hpp = Number(watch('hpp_base')) || 0;
              const publish = Number(watch('publish_price')) || 0;
              const margin = publish - hpp;
              const pct = publish > 0 ? (margin / publish) * 100 : 0;
              const isGood = pct >= 30;

              return (
                <div className={`rounded-xl p-4 border ${isGood ? 'bg-green-50 border-green-200' : hpp > 0 && publish > 0 ? 'bg-red-50 border-red-200' : 'bg-surface-container border-outline-variant'}`}>
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">analytics</span>
                    Kalkulasi Margin Real-time
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] text-on-surface-variant">HPP Modal</p>
                      <p className="font-mono font-bold text-sm text-on-surface">
                        {hpp > 0 ? `Rp ${hpp.toLocaleString('id-ID')}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant">Harga Publish</p>
                      <p className="font-mono font-bold text-sm text-on-surface">
                        {publish > 0 ? `Rp ${publish.toLocaleString('id-ID')}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant">Laba Kotor</p>
                      <p className={`font-mono font-bold text-sm ${margin > 0 ? 'text-green-700' : margin < 0 ? 'text-red-600' : 'text-on-surface'}`}>
                        {hpp > 0 && publish > 0 ? `Rp ${margin.toLocaleString('id-ID')}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant">Margin %</p>
                      <p className={`font-mono font-bold text-lg ${isGood ? 'text-green-700' : margin < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {hpp > 0 && publish > 0 ? `${pct.toFixed(1)}%` : '—'}
                      </p>
                    </div>
                  </div>
                  {hpp > 0 && publish > 0 && (
                    <div className={`mt-3 text-xs font-medium flex items-center gap-1.5 ${isGood ? 'text-green-700' : margin < 0 ? 'text-red-600' : 'text-amber-700'}`}>
                      <span className="material-symbols-outlined text-sm">{isGood ? 'check_circle' : margin < 0 ? 'cancel' : 'warning'}</span>
                      {isGood ? 'Margin sehat (≥30%)' : margin < 0 ? 'RUGI! Harga publish lebih rendah dari HPP' : `Margin rendah — pertimbangkan naikkan harga (target ≥30%)`}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>


          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <label htmlFor="is_active" className="text-sm text-on-surface">Produk ini aktif dan dapat dipesan</label>
          </div>
        </div>

        {/* ─── Actions ─── */}
        {(isOwner || isAdmin) && (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/products')}>
              Batal
            </Button>
            <Button
              type="submit"
              loading={mutation.isPending || imageUploading}
              disabled={!isDirty && !isNew && !imageFile}
              leftIcon={imageUploading ? 'cloud_upload' : 'save'}
            >
              {imageUploading ? 'Mengunggah Gambar...' : 'Simpan Produk'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
