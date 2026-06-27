import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import type { Client, Product, ClientAddress } from '../../../shared/types';
import { Button, Input } from '../../components/atoms';
import { formatRupiah } from '../../lib/format';
import { toast } from 'sonner';

export default function OrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  
  // Form State
  const [clientId, setClientId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [items, setItems] = useState<{ product_id: string; quantity: number; price: number; name: string }[]>([]);
  const [shippingAddressId, setShippingAddressId] = useState('');
  
  // DP State
  const [dpMode, setDpMode] = useState<'percent' | 'nominal'>('percent');
  const [dpPercentage, setDpPercentage] = useState(50);
  const [dpNominal, setDpNominal] = useState(0);

  // Search State
  const [productSearch, setProductSearch] = useState('');

  // Queries
  const { data: clients } = useQuery<Client[]>({ queryKey: ['clients'], queryFn: () => apiFetch('/clients') });
  const { data: products } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => apiFetch('/products') });
  
  const { data: clientAddresses } = useQuery<ClientAddress[]>({
    queryKey: ['client-addresses', clientId],
    queryFn: () => apiFetch(`/client-addresses?client_id=${clientId}`),
    enabled: !!clientId,
  });

  const { data: order } = useQuery<any>({
    queryKey: ['orders', id],
    queryFn: () => apiFetch(`/orders/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (order && isEdit) {
      setClientId(order.client_id || '');
      setDeadline(order.deadline ? order.deadline.split('T')[0] : '');
      setDpPercentage(order.dp_percentage || 50);
      setDpNominal(order.dp_amount || 0);
      setDpMode(order.dp_percentage ? 'percent' : 'nominal');
      setShippingAddressId(order.shipping_address_id || '');
      if (order.items) {
        setItems(order.items.map((item: any) => ({
          product_id: item.product_id,
          name: item.product?.name || '',
          quantity: item.quantity_ordered,
          price: item.unit_price,
        })));
      }
    }
  }, [order, isEdit]);

  // Auto set default shipping address if available when clientId changes
  useEffect(() => {
    if (clientAddresses && clientAddresses.length > 0 && !shippingAddressId && !isEdit) {
      const defaultAddr = clientAddresses.find(a => a.is_default === 1);
      if (defaultAddr) {
        setShippingAddressId(defaultAddr.id);
      }
    }
  }, [clientAddresses, shippingAddressId, isEdit]);

  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const dpAmount = dpMode === 'percent' 
    ? (totalPrice * dpPercentage) / 100 
    : dpNominal;

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (isEdit) {
        return apiFetch(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return apiFetch('/orders', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['orders', id] });
        toast.success('Pesanan berhasil diperbarui');
      } else {
        toast.success('Pesanan berhasil dibuat');
      }
      navigate('/orders');
    },
    onError: () => toast.error(isEdit ? 'Gagal memperbarui pesanan' : 'Gagal membuat pesanan')
  });

  const addItem = (product: Product) => {
    if (items.find(i => i.product_id === product.id)) {
      toast.error('Produk sudah ada dalam daftar');
      return;
    }
    setItems([...items, { product_id: product.id, name: product.name, quantity: 1, price: product.publish_price || 0 }]);
  };

  const updateItem = (id: string, field: 'quantity' | 'price', value: number) => {
    setItems(items.map(i => i.product_id === id ? { ...i, [field]: value } : i));
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.product_id !== id));

  const handleNext = () => {
    if (step === 1 && !clientId) return toast.error('Pilih klien terlebih dahulu');
    if (step === 2 && items.length === 0) return toast.error('Tambahkan minimal satu produk');
    setStep(step + 1);
  };

  const handleSubmit = () => {
    const calculatedPercentage = dpMode === 'percent' 
      ? dpPercentage 
      : totalPrice > 0 ? Math.round((dpNominal / totalPrice) * 100) : 0;

    mutation.mutate({
      client_id: clientId,
      deadline,
      total_price: totalPrice,
      dp_amount: dpAmount,
      dp_percentage: calculatedPercentage,
      final_amount: totalPrice - dpAmount,
      shipping_address_id: shippingAddressId || null,
      items: items.map(i => ({
        product_id: i.product_id,
        quantity_ordered: i.quantity,
        unit_price: i.price,
        subtotal: i.price * i.quantity
      }))
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step >= i ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}>
              {i}
            </div>
            {i < 3 && <div className={`w-12 h-1 ${step > i ? 'bg-primary' : 'bg-surface-container-high'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-h3 font-h3 text-primary">Informasi Dasar</h2>
            <div className="space-y-4">
              <label className="text-label-md text-on-surface">Pilih Klien</label>
              <select 
                className="w-full p-3 bg-surface border border-outline-variant rounded-default focus:ring-2 focus:ring-primary outline-none"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setShippingAddressId('');
                }}
              >
                <option value="">-- Pilih Klien --</option>
                {clients?.map(c => <option key={c.id} value={c.id}>{c.company_name} ({c.pic_name})</option>)}
              </select>
            </div>

            {clientId && clientAddresses && clientAddresses.length > 0 && (
              <div className="space-y-4">
                <label className="text-label-md text-on-surface">Alamat Pengiriman</label>
                <select 
                  className="w-full p-3 bg-surface border border-outline-variant rounded-default focus:ring-2 focus:ring-primary outline-none"
                  value={shippingAddressId}
                  onChange={(e) => setShippingAddressId(e.target.value)}
                >
                  <option value="">-- Gunakan Alamat Utama Klien --</option>
                  {clientAddresses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.address})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Input 
              label="Deadline Produksi" 
              type="date" 
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-h3 font-h3 text-primary">Daftar Produk</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4 border-r border-outline-variant pr-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-on-surface-variant">Pilih Produk</p>
                  <input 
                    type="text"
                    placeholder="Cari produk..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full bg-surface border border-outline rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {products?.filter(p => p.is_active && p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                    <div 
                      key={p.id} 
                      className="p-3 bg-surface-container-low hover:bg-primary-container/20 rounded-lg cursor-pointer flex justify-between items-center transition-colors"
                      onClick={() => addItem(p)}
                    >
                      <span className="text-sm font-semibold">{p.name}</span>
                      <span className="material-symbols-outlined text-primary">add_circle</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm font-bold text-on-surface-variant">Item Terpilih</p>
                {items.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic p-4 text-center">Belum ada item ditambahkan</p>
                ) : (
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.product_id} className="p-3 border border-outline-variant rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold">{item.name}</span>
                          <button onClick={() => removeItem(item.product_id)} className="text-error"><span className="material-symbols-outlined">delete</span></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input label="Qty" type="number" value={item.quantity} onChange={(e) => updateItem(item.product_id, 'quantity', parseInt(e.target.value))} containerClassName="!space-y-0" />
                          <Input label="Harga Satuan" type="number" value={item.price} onChange={(e) => updateItem(item.product_id, 'price', parseInt(e.target.value))} containerClassName="!space-y-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-h3 font-h3 text-primary">Ringkasan & DP</h2>
            <div className="bg-surface-container-low p-4 rounded-lg space-y-2">
              {items.map(item => (
                <div key={item.product_id} className="flex justify-between text-sm">
                  <span>{item.name} (x{item.quantity})</span>
                  <span>{formatRupiah(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-outline-variant pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatRupiah(totalPrice)}</span>
              </div>
            </div>
            
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <label className="text-label-md text-on-surface">Pilih Persentase DP (%)</label>
                {dpMode === 'nominal' && (
                  <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-bold uppercase">Manual</span>
                )}
              </div>
              <div className="flex gap-4">
                {[30, 50, 70, 100].map(p => (
                  <button 
                    key={p} 
                    type="button"
                    className={`flex-1 py-3 rounded-lg border font-bold transition-all ${
                      dpMode === 'percent' && dpPercentage === p ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-outline-variant text-on-surface'
                    }`}
                    onClick={() => {
                      setDpPercentage(p);
                      setDpMode('percent');
                    }}
                  >
                    {p}%
                  </button>
                ))}
              </div>
              
              <div className="pt-2">
                <Input 
                  label="Nominal DP Manual (Rp)" 
                  type="number" 
                  value={dpMode === 'nominal' ? dpNominal : Math.round(dpAmount)}
                  onChange={(e) => {
                    setDpNominal(Number(e.target.value));
                    setDpMode('nominal');
                  }}
                  containerClassName="!space-y-1"
                />
              </div>

              <div className="bg-primary-container/10 p-4 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Estimasi DP</span>
                  <span className="text-h3 font-h3 text-primary">{formatRupiah(dpAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => step > 1 ? setStep(step - 1) : navigate('/orders')}
        >
          {step === 1 ? 'Batal' : 'Kembali'}
        </Button>
        <Button 
          onClick={step === 3 ? handleSubmit : handleNext}
          loading={mutation.isPending}
        >
          {step === 3 ? (isEdit ? 'Perbarui Pesanan' : 'Buat Pesanan Sekarang') : 'Lanjut'}
        </Button>
      </div>
    </div>
  );
}
