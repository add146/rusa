import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Spinner, Badge, Button, Input } from '../../components/atoms';
import { formatDate } from '../../lib/format';
import { Plus, Edit, Package, ListChecks, Check, X, Store, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { compressImageToBase64 } from '../../lib/imageCompressor';

export default function RewardManagementPage() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_points: 0,
    stock: 0,
    image_url: ''
  });

  const { data: products, isLoading: loadingProducts } = useQuery<any[]>({ 
    queryKey: ['admin', 'rewards', 'products'], 
    queryFn: () => apiFetch('/rewards/products') 
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<any[]>({ 
    queryKey: ['admin', 'rewards', 'orders'], 
    queryFn: () => apiFetch('/rewards/orders/all') // I'll need to make sure this route exists in backend
  });

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

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      let finalData = { ...data };
      if (imageFile) {
        setImageUploading(true);
        try {
          toast.info('Mengunggah gambar hadiah...');
          finalData.image_url = await uploadImageToImgBB(imageFile);
        } finally {
          setImageUploading(false);
        }
      }
      
      const method = editingId ? 'PUT' : 'POST';
      const endpoint = editingId ? `/rewards/products/${editingId}` : '/rewards/products';
      
      return apiFetch(endpoint, {
        method,
        body: JSON.stringify(finalData)
      });
    },
    onSuccess: () => {
      toast.success(editingId ? 'Hadiah berhasil diperbarui!' : 'Hadiah berhasil ditambahkan!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'rewards', 'products'] });
      handleCloseModal();
    },
    onError: () => toast.error('Gagal menyimpan hadiah')
  });

  const handleCloseModal = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', description: '', price_points: 0, stock: 0, image_url: '' });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleEditClick = (p: any) => {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      description: p.description || '',
      price_points: p.price_points,
      stock: p.stock,
      image_url: p.image_url || ''
    });
    setImagePreview(p.image_url || null);
    setIsAdding(true);
  };

  const updateOrderStatus = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => apiFetch(`/rewards/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
    onSuccess: () => {
      toast.success('Status order diperbarui!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'rewards', 'orders'] });
    }
  });

  if (loadingProducts || loadingOrders) return <Spinner />;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-h2 font-h2 text-primary">Kelola Rewards</h1>
          <p className="text-on-surface-variant text-body-md">Atur katalog hadiah dan proses penukaran poin karyawan.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} leftIcon={<Plus size={18} />}>
          Tambah Hadiah
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Catalog Table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Store className="text-primary" size={24} />
            <h3 className="text-xl font-bold text-on-surface">Katalog Hadiah</h3>
          </div>
          
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low text-xs text-on-surface-variant uppercase">
                <tr>
                  <th className="px-6 py-4">Produk</th>
                  <th className="px-6 py-4 text-center">Harga (Poin)</th>
                  <th className="px-6 py-4 text-center">Stok</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {products?.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-on-surface-variant">Belum ada hadiah di katalog.</td></tr>
                ) : products?.map((p) => (
                  <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-high overflow-hidden flex-shrink-0">
                          {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-on-surface">{p.name}</p>
                          <p className="text-xs text-on-surface-variant line-clamp-1">{p.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-primary">{p.price_points.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={p.stock > 0 ? 'success' : 'error'}>{p.stock}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(p)} leftIcon={<Edit size={16} />} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Processing */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ListChecks className="text-primary" size={24} />
            <h3 className="text-xl font-bold text-on-surface">Proses Penukaran</h3>
          </div>
          
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-4 shadow-sm space-y-4">
            {orders?.length === 0 ? (
              <div className="text-center py-20 text-on-surface-variant/30">
                <Package className="mx-auto mb-2" size={40} />
                <p className="text-sm">Belum ada antrean penukaran.</p>
              </div>
            ) : orders?.map((o) => (
              <div key={o.id} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm text-on-surface">{o.product_name}</p>
                    <p className="text-xs text-on-surface-variant">Oleh: {o.user_id}</p>
                  </div>
                  <Badge variant={o.status === 'completed' ? 'success' : o.status === 'cancelled' ? 'error' : 'warning'}>
                    {o.status}
                  </Badge>
                </div>
                
                {o.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1 rounded-xl" 
                      variant="primary" 
                      size="sm" 
                      onClick={() => updateOrderStatus.mutate({ id: o.id, status: 'completed' })}
                    >
                      <Check size={16} className="mr-1" /> Selesai
                    </Button>
                    <Button 
                      className="flex-1 rounded-xl" 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateOrderStatus.mutate({ id: o.id, status: 'cancelled' })}
                    >
                      <X size={16} className="mr-1" /> Tolak
                    </Button>
                  </div>
                )}
                
                <div className="text-[10px] text-on-surface-variant pt-1 border-t border-outline-variant/30 text-right">
                  {formatDate(o.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Tambah/Edit Hadiah */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low sticky top-0 z-10">
              <h3 className="text-xl font-bold text-primary">{editingId ? 'Edit Hadiah' : 'Tambah Hadiah Baru'}</h3>
              <Button variant="ghost" onClick={handleCloseModal} leftIcon={<X size={20} />} />
            </div>
            
            <div className="p-6 space-y-4">
              <Input label="Nama Hadiah" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Contoh: Voucher Belanja" />
              <Input label="Deskripsi" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Detail hadiah..." />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Harga Poin" type="number" value={formData.price_points} onChange={(e) => setFormData({...formData, price_points: parseInt(e.target.value)})} />
                <Input label="Stok Awal" type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface">Gambar Hadiah</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    isDragging 
                      ? 'border-primary bg-primary/5' 
                      : 'border-outline-variant hover:bg-surface-container-low'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileInput}
                    accept="image/*"
                  />
                  {(imagePreview || formData.image_url) ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                      <img 
                        src={imagePreview || formData.image_url} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white flex items-center gap-2">
                          <Edit size={20} /> Ganti Gambar
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-on-surface-variant cursor-pointer">
                      <ImageIcon size={32} />
                      <p className="text-sm font-medium">Klik atau tarik gambar ke sini</p>
                      <p className="text-xs opacity-70">JPG, PNG, WebP (Maks. 5MB)</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-4 sticky bottom-0 bg-surface-container-lowest border-t border-outline-variant -mx-6 -mb-6 p-6 mt-4">
                <Button className="w-full py-4 rounded-2xl" onClick={() => saveMutation.mutate(formData)} loading={saveMutation.isPending || imageUploading}>
                  {editingId ? 'Simpan Perubahan' : 'Simpan Produk'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
