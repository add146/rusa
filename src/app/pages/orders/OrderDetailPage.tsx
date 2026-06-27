import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import type { Order, Client, User, Product } from '../../../shared/types';
import { Button, Spinner, Badge, ImageLightbox } from '../../components/atoms';
import { StatusBadge } from '../../components/molecules';
import { useAuth, useRole } from '../../hooks/useAuth';
import { formatRupiah, formatDate } from '../../lib/format';
import { toast } from 'sonner';
import { compressImageToBase64 } from '../../lib/imageCompressor';

type Payment = {
  id: string;
  order_id: string;
  type: 'dp' | 'full';
  amount: number;
  status: 'pending' | 'verified' | 'rejected';
  proof_url?: string;
  notes?: string;
  created_at: string;
};

type OrderItemWithProduct = {
  id: string;
  quantity_ordered: number;
  unit_price: number;
  subtotal: number;
  product: Product;
};

type OrderDetail = Order & {
  client: Client;
  sales: User;
  items: OrderItemWithProduct[];
  payments: Payment[];
  shippingAddress?: {
    id: string;
    label: string;
    address: string;
    city?: string;
  };
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOwner, isAdmin, isSales } = useRole();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'dp' | 'full'>('dp');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentImage, setPaymentImage] = useState<File | null>(null);
  const [paymentImagePreview, setPaymentImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: order, isLoading, error } = useQuery<OrderDetail>({
    queryKey: ['orders', id],
    queryFn: () => apiFetch(`/orders/${id}`),
  });

  const updateOrderMutation = useMutation({
    mutationFn: (payload: any) => apiFetch(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pesanan berhasil diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui pesanan'),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: () => apiFetch(`/orders/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pesanan berhasil dihapus');
      navigate('/orders');
    },
    onError: () => toast.error('Gagal menghapus pesanan'),
  });

  const submitPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      let finalData = { ...data };
      
      if (paymentImage) {
        setUploadingImage(true);
        try {
          const base64 = await compressImageToBase64(paymentImage, 0.8, 1000, 1000);
          const uploadRes = await apiFetch<{ url: string }>('/uploads/imgbb', {
            method: 'POST',
            body: JSON.stringify({ imageBase64: base64 }),
          });
          finalData.proof_url = uploadRes.url;
        } finally {
          setUploadingImage(false);
        }
      }

      return apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify(finalData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', id] });
      setShowPaymentModal(false);
      setPaymentNotes('');
      setPaymentImage(null);
      setPaymentImagePreview(null);
      toast.success('Bukti pembayaran berhasil dikirim untuk verifikasi');
    },
    onError: () => toast.error('Gagal mengirim bukti pembayaran'),
  });

  if (isLoading) return <Spinner />;
  if (error || !order) {
    return (
      <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant text-center">
        <h1 className="text-h2 font-h2 text-error mb-4">Error</h1>
        <p className="text-on-surface-variant">Gagal memuat detail pesanan atau pesanan tidak ditemukan.</p>
        <Button onClick={() => navigate('/orders')} className="mt-4" variant="outline">Kembali ke Daftar</Button>
      </div>
    );
  }

  const handleLockOrder = () => {
    if (window.confirm('Yakin ingin mengunci pesanan ini dan memindahkannya ke produksi?')) {
      updateOrderMutation.mutate({ status: 'locked' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate('/orders')} variant="ghost" size="sm" leftIcon="arrow_back" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-h2 font-h2 text-primary">{order.order_number}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-on-surface-variant text-body-md">Dibuat pada {formatDate(order.created_at)}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {order.status === 'pending' && (
            <>
              {order.payments?.some(p => p.type === 'dp' && p.status === 'pending') ? (
                <Button variant="outline" leftIcon="payments" disabled>
                  Verifikasi DP Diproses
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    setPaymentType('dp');
                    setPaymentAmount(order.dp_amount);
                    setShowPaymentModal(true);
                  }} 
                  variant="outline" 
                  leftIcon="payments"
                >
                  Upload Bukti DP
                </Button>
              )}
              
              {(isOwner || isAdmin || (isSales && user?.id === order.sales_id)) && (
                <>
                  <Button
                    as={Link}
                    to={`/orders/${order.id}/edit`}
                    variant="outline"
                    leftIcon="edit"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => {
                      if (window.confirm('Yakin ingin menghapus pesanan ini secara permanen?')) {
                        deleteOrderMutation.mutate();
                      }
                    }}
                    variant="ghost"
                    className="text-error border-error/20 hover:bg-error/5"
                    leftIcon="delete"
                    loading={deleteOrderMutation.isPending}
                  >
                    Hapus
                  </Button>
                </>
              )}
            </>
          )}

          {(order.status === 'shipped' || order.status === 'done') && (
            <Button 
              onClick={() => {
                setPaymentType('full');
                setPaymentAmount(order.final_amount);
                setShowPaymentModal(true);
              }} 
              variant="outline" 
              leftIcon="payments"
              disabled={order.payments?.some(p => p.type === 'full' && p.status === 'pending')}
            >
              {order.payments?.some(p => p.type === 'full' && p.status === 'pending') ? 'Verifikasi Pelunasan Diproses' : 'Upload Bukti Pelunasan'}
            </Button>
          )}

          {order.status === 'done' && (isOwner || isAdmin || (isSales && user?.id === order.sales_id)) && (
            <Button 
              onClick={() => {
                if(window.confirm('Konfirmasi bahwa pesanan sudah diterima customer dan tidak ada masalah?')) {
                  updateOrderMutation.mutate({ status: 'completed' });
                }
              }} 
              variant="success" 
              leftIcon="check_circle"
              loading={updateOrderMutation.isPending}
            >
              Pesanan Diterima Customer
            </Button>
          )}

          {(order.status === 'done' || order.status === 'shipped' || order.status === 'completed') && (isOwner || isAdmin || (isSales && user?.id === order.sales_id)) && (
            <Button 
              as={Link}
              to={`/returns/new?orderId=${order.id}`}
              variant="ghost" 
              className="text-error border-error/20 hover:bg-error/5"
              leftIcon="assignment_return"
            >
              Ajukan Retur
            </Button>
          )}

          {(isOwner || isAdmin) && order.status === 'pending' && (
            <Button onClick={handleLockOrder} loading={updateOrderMutation.isPending} leftIcon="lock">
              Lock Pesanan (Mulai Produksi)
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolom Kiri: Detail Klien & Info Pesanan */}
        <div className="space-y-6 md:col-span-1">
          {/* Info Klien */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-label-md text-on-surface uppercase tracking-wider font-bold border-b border-outline-variant pb-2">Informasi Klien</h3>
            <div>
              <p className="text-sm font-bold text-on-surface">{order.client?.company_name}</p>
              <p className="text-sm text-on-surface-variant">PIC: {order.client?.pic_name}</p>
              <p className="text-sm text-on-surface-variant">{order.client?.pic_phone}</p>
              <p className="text-sm text-on-surface-variant mt-2">Alamat Klien: {order.client?.address}, {order.client?.city}</p>
            </div>
            
            <div className="border-t border-outline-variant/30 pt-3 space-y-2">
              <p className="text-xs text-on-surface-variant uppercase font-bold">Alamat Pengiriman</p>
              {order.shipping_address_custom ? (
                <div className="bg-warning-container/10 p-2.5 rounded border border-warning/20">
                  <p className="text-[10px] text-warning font-bold uppercase mb-1">Custom Override Admin</p>
                  <p className="text-xs text-on-surface">{order.shipping_address_custom}</p>
                </div>
              ) : order.shippingAddress ? (
                <div>
                  <p className="text-xs font-bold text-primary">{order.shippingAddress.label}</p>
                  <p className="text-xs text-on-surface-variant">{order.shippingAddress.address}, {order.shippingAddress.city || ''}</p>
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant italic">Menggunakan Alamat Utama Klien</p>
              )}

              {(isOwner || isAdmin) && (
                <div className="pt-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    leftIcon="edit_square" 
                    className="text-[10px] !px-0"
                    onClick={() => {
                      const newAddr = window.prompt(
                        'Masukkan alamat pengiriman custom baru (mengoverride alamat default):',
                        order.shipping_address_custom || (order.shippingAddress ? order.shippingAddress.address : order.client?.address || '')
                      );
                      if (newAddr !== null) {
                        updateOrderMutation.mutate({ shipping_address_custom: newAddr || null });
                      }
                    }}
                  >
                    Ubah Alamat Pengiriman
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Info Sales & Waktu */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-label-md text-on-surface uppercase tracking-wider font-bold border-b border-outline-variant pb-2">Informasi Operasional</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-on-surface-variant">Sales Agent</p>
                <p className="text-sm font-semibold">{order.sales?.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Deadline Produksi</p>
                <p className="text-sm font-semibold">{order.deadline ? formatDate(order.deadline) : 'Belum ditentukan'}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Status Pembayaran</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {order.payments?.length > 0 ? (
                    order.payments.map(p => (
                      <Badge key={p.id} variant={p.status === 'verified' ? 'success' : (p.status === 'rejected' ? 'error' : 'warning')} pill>
                        {p.type.toUpperCase()}: {p.status}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-error">Belum ada setoran</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Rincian Item & Harga */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-label-md text-on-surface uppercase tracking-wider font-bold border-b border-outline-variant pb-2">Item Pesanan</h3>
            
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-outline-variant/50 last:border-0">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-surface-container-high rounded-lg flex items-center justify-center overflow-hidden border border-outline-variant">
                      {item.product?.image_url ? (
                        <ImageLightbox src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant text-2xl">inventory_2</span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface">{item.product?.name}</p>
                      <p className="text-xs text-on-surface-variant">SKU: {item.product?.sku} • {formatRupiah(item.unit_price)} / {item.product?.unit}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-on-surface">{item.quantity_ordered} {item.product?.unit}</p>
                    <p className="text-sm font-bold text-primary">{formatRupiah(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary-container/10 border border-primary/20 rounded-xl p-6 space-y-4">
            <h3 className="text-label-md text-primary uppercase tracking-wider font-bold border-b border-primary/20 pb-2">Ringkasan Biaya</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Total Harga</span>
                <span className="font-semibold">{formatRupiah(order.total_price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Persentase DP</span>
                <span className="font-semibold">{order.dp_percentage}%</span>
              </div>
              <div className="flex justify-between text-sm text-primary font-bold">
                <span>Nilai DP</span>
                <span>{formatRupiah(order.dp_amount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-primary/20 pt-2 font-bold text-on-surface">
                <span>Sisa Pelunasan</span>
                <span>{formatRupiah(order.final_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Upload Pembayaran */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-h3 font-h3 text-primary">Upload Bukti Pembayaran</h3>
              <Button onClick={() => setShowPaymentModal(false)} variant="ghost" size="sm" leftIcon="close" />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-label-md font-bold mb-1">Jenis Pembayaran</label>
                <p className="text-sm font-semibold text-on-surface-variant uppercase">{paymentType}</p>
              </div>
              
              <div>
                <label className="block text-label-md font-bold mb-1">Nominal Transfer (Rp)</label>
                <input 
                  type="number" 
                  value={paymentAmount} 
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-surface-container-low border border-outline rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              
              <div>
                <label className="block text-label-md font-bold mb-1">Catatan / No. Reff</label>
                <textarea 
                  value={paymentNotes} 
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Contoh: Transfer via BCA a/n Budi"
                  className="w-full bg-surface-container-low border border-outline rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-label-md font-bold mb-2">Foto Bukti Transfer (Opsional)</label>
                <div className="flex gap-4 items-center">
                  <div 
                    className="w-24 h-24 bg-surface-container rounded-lg border-2 border-dashed border-outline-variant overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => document.getElementById('payment-proof-input')?.click()}
                  >
                    {paymentImagePreview ? (
                      <img src={paymentImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-on-surface-variant text-3xl">add_a_photo</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input 
                      id="payment-proof-input"
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPaymentImage(file);
                          setPaymentImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => document.getElementById('payment-proof-input')?.click()}
                      leftIcon="upload"
                    >
                      Pilih Gambar
                    </Button>
                    <p className="text-[10px] text-on-surface-variant">Max 2MB, format JPG/PNG</p>
                  </div>
                </div>
              </div>

              <div className="bg-secondary-container/10 p-3 rounded-lg border border-secondary/20">
                <p className="text-xs text-secondary italic">
                  * Pembayaran akan diverifikasi oleh Admin/Keuangan sebelum status pesanan diperbarui.
                </p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentImage(null);
                  setPaymentImagePreview(null);
                }} variant="outline" className="flex-1">Batal</Button>
                <Button 
                  onClick={() => submitPaymentMutation.mutate({
                    order_id: id,
                    type: paymentType,
                    amount: paymentAmount,
                    notes: paymentNotes
                  })}
                  loading={submitPaymentMutation.isPending || uploadingImage}
                  className="flex-1"
                >
                  {uploadingImage ? 'Mengunggah...' : 'Kirim Bukti'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
