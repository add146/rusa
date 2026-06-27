import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import type { Order, Client, Product, OrderItem } from '../../../shared/types';
import { Button, Spinner } from '../../components/atoms';
import { formatRupiah } from '../../lib/format';
import { toast } from 'sonner';
import { compressImageToBase64 } from '../../lib/imageCompressor';

type OrderDetail = Order & {
  client: Client;
  items: (OrderItem & { product: Product })[];
};

export default function ReturnFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; reason: string; checked: boolean }>>({});
  const [generalReason, setGeneralReason] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ['orders', orderId],
    queryFn: () => apiFetch(`/orders/${orderId}`),
    enabled: !!orderId,
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      let photo_url = '';
      if (photo) {
        setUploading(true);
        try {
          const base64 = await compressImageToBase64(photo, 0.8, 1000, 1000);
          const uploadRes = await apiFetch<{ url: string }>('/uploads/imgbb', {
            method: 'POST',
            body: JSON.stringify({ imageBase64: base64 }),
          });
          photo_url = uploadRes.url;
        } finally {
          setUploading(false);
        }
      }

      return apiFetch('/returns', {
        method: 'POST',
        body: JSON.stringify({ ...data, photo_url }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Pengajuan retur berhasil dikirim');
      navigate('/returns');
    },
    onError: () => toast.error('Gagal mengajukan retur')
  });

  const handleToggleItem = (itemId: string, maxQty: number) => {
    setSelectedItems(prev => {
      const isChecked = !prev[itemId]?.checked;
      return {
        ...prev,
        [itemId]: {
          checked: isChecked,
          quantity: isChecked ? maxQty : 0,
          reason: prev[itemId]?.reason || ''
        }
      };
    });
  };

  const handleQtyChange = (itemId: string, qty: number, maxQty: number) => {
    const safeQty = Math.min(Math.max(1, qty), maxQty);
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: safeQty }
    }));
  };

  const handleItemReasonChange = (itemId: string, reason: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], reason }
    }));
  };

  const handleSubmit = () => {
    const items = Object.entries(selectedItems)
      .filter(([_, val]) => val.checked && val.quantity > 0)
      .map(([id, val]) => {
        const orderItem = order?.items.find(i => i.id === id);
        return {
          order_item_id: id,
          product_id: orderItem?.product_id,
          quantity: val.quantity,
          reason: val.reason || generalReason
        };
      });

    if (items.length === 0) {
      toast.error('Pilih minimal 1 item untuk diretur');
      return;
    }

    if (!generalReason) {
      toast.error('Isi alasan retur secara umum');
      return;
    }

    mutation.mutate({
      order_id: orderId,
      reason: generalReason,
      items
    });
  };

  if (isLoading) return <Spinner />;
  if (!order) return <div className="p-8 text-center">Pesanan tidak ditemukan</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate(-1)} variant="ghost" size="sm" leftIcon="arrow_back" />
        <div>
          <h1 className="text-h2 font-h2 text-primary">Ajukan Retur</h1>
          <p className="text-on-surface-variant text-body-md">Pesanan: {order.order_number} • {order.client?.company_name}</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-label-lg font-bold mb-4">Pilih Item yang Diretur</h3>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className={`p-4 border rounded-xl transition-all ${selectedItems[item.id]?.checked ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-low'}`}>
                <div className="flex items-start gap-4">
                  <input 
                    type="checkbox" 
                    checked={!!selectedItems[item.id]?.checked}
                    onChange={() => handleToggleItem(item.id, item.quantity_ordered)}
                    className="mt-1 w-5 h-5 rounded border-outline text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-bold text-on-surface">{item.product.name}</p>
                      <p className="text-sm font-bold text-primary">{formatRupiah(item.unit_price)}</p>
                    </div>
                    <p className="text-xs text-on-surface-variant mb-3">Dipesan: {item.quantity_ordered} {item.product.unit}</p>
                    
                    {selectedItems[item.id]?.checked && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 animate-in slide-in-from-top-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Jumlah Retur</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              value={selectedItems[item.id].quantity}
                              onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value), item.quantity_ordered)}
                              className="w-20 bg-surface-container-lowest border border-outline rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <span className="text-xs text-on-surface-variant">{item.product.unit}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Alasan Spesifik (Opsional)</label>
                          <input 
                            type="text"
                            placeholder="Contoh: Jahitan lepas di lengan"
                            value={selectedItems[item.id].reason}
                            onChange={(e) => handleItemReasonChange(item.id, e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-label-md font-bold mb-1">Alasan Utama Retur</label>
              <textarea 
                value={generalReason}
                onChange={(e) => setGeneralReason(e.target.value)}
                placeholder="Jelaskan alasan pengembalian barang secara detail..."
                className="w-full bg-surface-container-low border border-outline rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[120px]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-label-md font-bold mb-1">Foto Bukti Kerusakan</label>
            <div 
              className="aspect-video bg-surface-container-low border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-all overflow-hidden"
              onClick={() => document.getElementById('photo-input')?.click()}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">add_a_photo</span>
                  <p className="text-xs text-on-surface-variant mt-2">Klik untuk upload foto</p>
                </>
              )}
            </div>
            <input 
              id="photo-input"
              type="file" 
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPhoto(file);
                  setPhotoPreview(URL.createObjectURL(file));
                }
              }}
            />
          </div>
        </div>

        <div className="flex gap-4 pt-6 border-t border-outline-variant">
          <Button onClick={() => navigate(-1)} variant="outline" className="flex-1">Batal</Button>
          <Button 
            onClick={handleSubmit} 
            loading={mutation.isPending || uploading}
            className="flex-1"
            leftIcon="send"
          >
            {uploading ? 'Mengunggah...' : 'Kirim Pengajuan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
