import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { Order, Client, OrderItem, Product, ClientAddress, ShipmentBatch, ShipmentBatchItem } from '../../../shared/types';
import { Button, Spinner } from '../../components/atoms';
import { EmptyState, StatusBadge } from '../../components/molecules';
import { generateOrderPDF, generatePartialSJ } from '../../lib/pdf';
import { toast } from 'sonner';
import { formatDate } from '../../lib/format';

type Payment = {
  id: string;
  status: 'pending' | 'verified' | 'rejected';
  type: 'dp' | 'full';
};

type OrderWithDetails = Order & {
  client: Client;
  items: (OrderItem & { product: Product })[];
  payments: Payment[];
  sales?: { id: string; full_name: string };
  shippingAddress?: ClientAddress;
  sales_name?: string;
  shipmentBatches?: (ShipmentBatch & {
    items?: ShipmentBatchItem[];
  })[];
};

export default function DocumentListPage() {
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ['orders', 'with-items'],
    queryFn: () => apiFetch('/orders'),
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForSJ, setSelectedOrderForSJ] = useState<OrderWithDetails | null>(null);
  const [selectedOrderForPartialSJ, setSelectedOrderForPartialSJ] = useState<OrderWithDetails | null>(null);
  const [selectedBatchForPrint, setSelectedBatchForPrint] = useState<{ order: OrderWithDetails; batch: ShipmentBatch } | null>(null);

  const [sjAddressMode, setSjAddressMode] = useState<'saved' | 'custom'>('saved');
  const [sjSelectedAddressId, setSjSelectedAddressId] = useState<string>('');
  const [sjCustomAddress, setSjCustomAddress] = useState<string>('');

  const filteredOrders = orders?.filter(order => {
    const query = searchQuery.toLowerCase();
    const orderNumberMatch = order.order_number?.toLowerCase().includes(query);
    const clientMatch = order.client?.company_name?.toLowerCase().includes(query);
    return orderNumberMatch || clientMatch;
  });

  const activeClientId = selectedOrderForSJ?.client_id || selectedBatchForPrint?.order?.client_id;

  const { data: clientAddresses, isLoading: isLoadingAddresses } = useQuery<ClientAddress[]>({
    queryKey: ['client-addresses', activeClientId],
    queryFn: () => apiFetch(`/client-addresses?client_id=${activeClientId}`),
    enabled: !!activeClientId,
  });

  const updateBatchMutation = useMutation({
    mutationFn: ({ batchId, status, shipping_address }: { batchId: string; status: 'printed'; shipping_address: string }) => {
      return apiFetch(`/shipments/${batchId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, shipping_address }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'with-items'] });
      toast.success('Status Surat Jalan berhasil diperbarui');
      setSelectedBatchForPrint(null);
      // If we are currently managing partial SJ for an order, let's update that state too
      if (selectedOrderForPartialSJ) {
        const updatedOrder = orders?.find(o => o.id === selectedOrderForPartialSJ.id);
        if (updatedOrder) {
          setSelectedOrderForPartialSJ(updatedOrder);
        } else {
          setSelectedOrderForPartialSJ(null);
        }
      }
    },
    onError: () => {
      toast.error('Gagal memperbarui status Surat Jalan');
    }
  });

  // Keep selected partial order state updated when cache changes
  useEffect(() => {
    if (selectedOrderForPartialSJ && orders) {
      const current = orders.find(o => o.id === selectedOrderForPartialSJ.id);
      if (current) {
        setSelectedOrderForPartialSJ(current);
      }
    }
  }, [orders, selectedOrderForPartialSJ]);

  // When selected order changes, reset fields
  useEffect(() => {
    const order = selectedOrderForSJ || selectedBatchForPrint?.order;
    if (order) {
      setSjAddressMode(order.shipping_address_custom ? 'custom' : 'saved');
      setSjSelectedAddressId(order.shipping_address_id || '');
      setSjCustomAddress(order.shipping_address_custom || '');
    }
  }, [selectedOrderForSJ, selectedBatchForPrint]);

  // Set default selected address when clientAddresses is fetched
  useEffect(() => {
    if (clientAddresses && clientAddresses.length > 0 && !sjSelectedAddressId) {
      const defaultAddr = clientAddresses.find(a => a.is_default === 1) || clientAddresses[0];
      setSjSelectedAddressId(defaultAddr.id);
    }
  }, [clientAddresses, sjSelectedAddressId]);

  const handlePrintSJ = () => {
    if (!selectedOrderForSJ) return;

    let sjAddress = '';
    if (sjAddressMode === 'saved') {
      const selected = clientAddresses?.find(a => a.id === sjSelectedAddressId);
      if (selected) {
        sjAddress = selected.city ? `${selected.address}, ${selected.city}` : selected.address;
      } else {
        // Fallback to client main address
        sjAddress = selectedOrderForSJ.client?.address || '';
        if (selectedOrderForSJ.client?.city) {
          sjAddress += `, ${selectedOrderForSJ.client.city}`;
        }
      }
    } else {
      sjAddress = sjCustomAddress;
    }

    const orderWithSjAddress = {
      ...selectedOrderForSJ,
      sj_address: sjAddress,
      sales_name: selectedOrderForSJ.sales?.full_name || selectedOrderForSJ.sales_name
    };

    generateOrderPDF(orderWithSjAddress, 'SJ');
    setSelectedOrderForSJ(null);
  };

  const handlePrintPartialSJ = () => {
    if (!selectedBatchForPrint) return;
    const { order, batch } = selectedBatchForPrint;

    let sjAddress = '';
    if (sjAddressMode === 'saved') {
      const selected = clientAddresses?.find(a => a.id === sjSelectedAddressId);
      if (selected) {
        sjAddress = selected.city ? `${selected.address}, ${selected.city}` : selected.address;
      } else {
        sjAddress = order.client?.address || '';
        if (order.client?.city) {
          sjAddress += `, ${order.client.city}`;
        }
      }
    } else {
      sjAddress = sjCustomAddress;
    }

    const selectedItems = (batch.items || []).map(bi => {
      const originalItem = order.items.find(item => item.id === bi.order_item_id);
      return {
        product_name: originalItem?.product?.name || 'Item',
        quantity: bi.quantity_shipped,
        unit: originalItem?.product?.unit || 'PCS'
      };
    });

    const orderWithSalesName = {
      ...order,
      sales_name: order.sales?.full_name || order.sales_name
    };

    generatePartialSJ(orderWithSalesName, batch, selectedItems, sjAddress);

    // Call update status endpoint
    updateBatchMutation.mutate({
      batchId: batch.id,
      status: 'printed',
      shipping_address: sjAddress
    });
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2 font-h2 text-primary">Daftar Dokumen</h1>
        <p className="text-on-surface-variant text-body-md">Cetak dan unduh dokumen transaksi pesanan.</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/60">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute inset-y-0 left-3 flex items-center text-on-surface-variant pointer-events-none text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Cari No. Pesanan atau Klien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container text-on-surface placeholder-on-surface-variant/60 pl-10 pr-10 py-2.5 rounded-lg text-sm border border-outline-variant/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-label-md text-on-surface-variant uppercase tracking-wider">
              <th className="px-6 py-4 font-bold">No. Pesanan</th>
              <th className="px-6 py-4 font-bold">Klien</th>
              <th className="px-6 py-4 font-bold">Status Order</th>
              <th className="px-6 py-4 font-bold">SJ Parsial</th>
              <th className="px-6 py-4 font-bold text-right">Download Dokumen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filteredOrders?.map((order) => (
              <tr key={order.id} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-bold text-on-surface">{order.order_number}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-on-surface">{order.client?.company_name}</p>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-6 py-4">
                  {order.shipmentBatches && order.shipmentBatches.length > 0 ? (
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-[10px] font-semibold text-on-surface bg-surface-container px-2 py-0.5 rounded">
                        {order.shipmentBatches.length} batch ({order.shipmentBatches.filter(b => b.status === 'pending').length} pending)
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[10px] h-6 px-1.5 hover:bg-surface-container text-primary font-bold"
                        leftIcon="list_alt"
                        onClick={() => setSelectedOrderForPartialSJ(order)}
                      >
                        Kelola
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface-variant/40 italic">Tidak ada</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      leftIcon="description"
                      onClick={() => generateOrderPDF({
                        ...order,
                        sales_name: order.sales?.full_name || order.sales_name
                      }, 'PO')}
                      title="Pre-Order / Purchase Order"
                    >
                      PO
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      leftIcon="receipt_long"
                      onClick={() => generateOrderPDF({
                        ...order,
                        sales_name: order.sales?.full_name || order.sales_name
                      }, 'Invoice')}
                      disabled={!order.payments?.some(p => p.status === 'verified')}
                      title={!order.payments?.some(p => p.status === 'verified') ? 'Butuh verifikasi pembayaran' : 'Invoice Pembayaran'}
                    >
                      Invoice
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      leftIcon="local_shipping"
                      onClick={() => {
                        setSelectedOrderForSJ(order);
                        setSjCustomAddress(order.shipping_address_custom || '');
                        setSjAddressMode(order.shipping_address_custom ? 'custom' : 'saved');
                        setSjSelectedAddressId(order.shipping_address_id || '');
                      }}
                      disabled={order.status !== 'done' && order.status !== 'shipped' && order.status !== 'completed'}
                      title={order.status !== 'done' && order.status !== 'shipped' && order.status !== 'completed' ? 'Produksi belum selesai' : 'Surat Jalan'}
                    >
                      SJ
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(!filteredOrders || filteredOrders.length === 0) && (
              <tr>
                <td colSpan={5}>
                  <EmptyState 
                    title={orders && orders.length > 0 ? "Tidak ada hasil ditemukan" : "Belum ada pesanan"} 
                    description={orders && orders.length > 0 ? "Coba kata kunci pencarian yang lain." : "Dokumen akan muncul setelah pesanan dibuat."} 
                    icon={orders && orders.length > 0 ? "search_off" : "folder_off"} 
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Kelola SJ Parsial */}
      {selectedOrderForPartialSJ && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">local_shipping</span>
                <h3 className="text-h3 font-h3 text-primary">Kelola Surat Jalan Parsial</h3>
              </div>
              <Button onClick={() => setSelectedOrderForPartialSJ(null)} variant="ghost" size="sm" leftIcon="close" />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-surface-container-low p-3 rounded-lg border border-outline-variant">
              <div>
                <span className="text-on-surface-variant text-[11px] uppercase font-bold">No. Pesanan</span>
                <p className="font-bold text-on-surface text-sm">{selectedOrderForPartialSJ.order_number}</p>
              </div>
              <div>
                <span className="text-on-surface-variant text-[11px] uppercase font-bold">Klien</span>
                <p className="font-bold text-on-surface text-sm">{selectedOrderForPartialSJ.client?.company_name}</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {selectedOrderForPartialSJ.shipmentBatches && selectedOrderForPartialSJ.shipmentBatches.length > 0 ? (
                selectedOrderForPartialSJ.shipmentBatches.map((batch) => (
                  <div key={batch.id} className="border border-outline-variant/80 rounded-lg p-3 bg-surface-container-low/40 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-primary text-sm">Batch #{batch.batch_number}</span>
                        <p className="text-[10px] text-on-surface-variant">Dibuat: {formatDate(batch.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          batch.status === 'printed' 
                            ? 'bg-success/15 text-success border border-success/20' 
                            : 'bg-info/15 text-info border border-info/20'
                        }`}>
                          {batch.status === 'printed' ? 'Sudah Dicetak' : 'Menunggu Cetak'}
                        </span>
                        
                        <Button
                          size="sm"
                          variant={batch.status === 'printed' ? 'outline' : 'primary'}
                          leftIcon="print"
                          className="text-[11px] py-1 h-7 font-bold"
                          onClick={() => setSelectedBatchForPrint({ order: selectedOrderForPartialSJ, batch })}
                        >
                          {batch.status === 'printed' ? 'Cetak Ulang' : 'Pilih Alamat & Cetak'}
                        </Button>
                      </div>
                    </div>

                    {/* Batch Items List */}
                    <div className="bg-surface-container-lowest/80 p-2.5 rounded border border-outline-variant/30">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Item Dikirim:</p>
                      <div className="space-y-1.5">
                        {batch.items?.map((bi) => {
                          const originalItem = selectedOrderForPartialSJ.items.find(item => item.id === bi.order_item_id);
                          return (
                            <div key={bi.id} className="flex justify-between text-xs text-on-surface font-medium">
                              <span className="truncate max-w-[250px]">{originalItem?.product?.name || 'Item'}</span>
                              <span className="font-bold text-primary">Qty: {bi.quantity_shipped} {originalItem?.product?.unit || 'PCS'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {batch.notes && (
                      <p className="text-[10px] italic text-warning bg-warning/5 border border-warning/10 p-2 rounded">
                        Catatan Produksi: {batch.notes}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center py-6 italic text-sm text-on-surface-variant/50">Belum ada pengiriman parsial.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedOrderForPartialSJ(null)} variant="outline" className="px-6">Tutup</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pilih Alamat Surat Jalan (Full / Partial) */}
      {(selectedOrderForSJ || selectedBatchForPrint) && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-h3 font-h3 text-primary">
                {selectedBatchForPrint ? 'Pilih Alamat SJ Parsial' : 'Pilih Alamat Surat Jalan'}
              </h3>
              <Button onClick={() => {
                setSelectedOrderForSJ(null);
                setSelectedBatchForPrint(null);
              }} variant="ghost" size="sm" leftIcon="close" />
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant space-y-1">
              <p className="text-xs text-on-surface-variant uppercase font-bold">Informasi Pesanan</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-on-surface-variant text-xs">No. Pesanan:</span>
                  <p className="font-semibold text-on-surface">
                    {selectedOrderForSJ?.order_number || selectedBatchForPrint?.order?.order_number}
                  </p>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs">Klien:</span>
                  <p className="font-semibold text-on-surface">
                    {selectedOrderForSJ?.client?.company_name || selectedBatchForPrint?.order?.client?.company_name}
                  </p>
                </div>
              </div>
              {selectedBatchForPrint && (
                <div className="mt-2 pt-2 border-t border-outline-variant/30">
                  <span className="text-on-surface-variant text-xs">Pengiriman:</span>
                  <p className="font-bold text-primary text-xs">Batch #{selectedBatchForPrint.batch.batch_number}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-label-md font-bold mb-2">Metode Alamat</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input 
                      type="radio" 
                      name="sjAddressMode" 
                      value="saved" 
                      checked={sjAddressMode === 'saved'} 
                      onChange={() => setSjAddressMode('saved')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Alamat Tersimpan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input 
                      type="radio" 
                      name="sjAddressMode" 
                      value="custom" 
                      checked={sjAddressMode === 'custom'} 
                      onChange={() => setSjAddressMode('custom')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Alamat Custom (Tulis Manual)</span>
                  </label>
                </div>
              </div>

              {sjAddressMode === 'saved' ? (
                <div>
                  <label className="block text-label-md font-bold mb-1">Pilih Alamat</label>
                  {isLoadingAddresses ? (
                    <div className="py-2 flex items-center gap-2 text-sm text-on-surface-variant">
                      <div className="w-4 h-4 border-2 border-surface-container-high border-t-primary-container rounded-full animate-spin" />
                      <span>Memuat alamat...</span>
                    </div>
                  ) : clientAddresses && clientAddresses.length > 0 ? (
                    <select
                      value={sjSelectedAddressId}
                      onChange={(e) => setSjSelectedAddressId(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {clientAddresses.map((addr) => (
                        <option key={addr.id} value={addr.id}>
                          [{addr.label}] {addr.address}{addr.city ? `, ${addr.city}` : ''}
                        </option>
                      ))}
                      <option value="main_address">
                        [Alamat Utama Klien] {selectedOrderForSJ?.client?.address || selectedBatchForPrint?.order?.client?.address}{selectedOrderForSJ?.client?.city || selectedBatchForPrint?.order?.client?.city ? `, ${selectedOrderForSJ?.client?.city || selectedBatchForPrint?.order?.client?.city}` : ''}
                      </option>
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-warning">Tidak ada alamat pengiriman tersimpan untuk klien ini.</p>
                      <select
                        value="main_address"
                        disabled
                        className="w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none"
                      >
                        <option value="main_address">
                          [Alamat Utama Klien] {selectedOrderForSJ?.client?.address || selectedBatchForPrint?.order?.client?.address}{selectedOrderForSJ?.client?.city || selectedBatchForPrint?.order?.client?.city ? `, ${selectedOrderForSJ?.client?.city || selectedBatchForPrint?.order?.client?.city}` : ''}
                        </option>
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-label-md font-bold mb-1">Alamat Custom (Sementara)</label>
                  <textarea
                    value={sjCustomAddress}
                    onChange={(e) => setSjCustomAddress(e.target.value)}
                    placeholder="Contoh: Jalan Raya Darmo No. 45, Wonokromo, Surabaya"
                    className="w-full bg-surface-container-low border border-outline rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                  />
                  <p className="text-[10px] text-on-surface-variant italic mt-1">
                    * Alamat custom ini hanya berlaku untuk cetakan Surat Jalan saat ini dan tidak akan disimpan ke master data klien.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={() => {
                setSelectedOrderForSJ(null);
                setSelectedBatchForPrint(null);
              }} variant="outline" className="flex-1">Batal</Button>
              <Button 
                onClick={selectedBatchForPrint ? handlePrintPartialSJ : handlePrintSJ}
                className="flex-1 font-bold"
                disabled={(sjAddressMode === 'custom' && !sjCustomAddress.trim()) || updateBatchMutation.isPending}
                loading={updateBatchMutation.isPending}
              >
                Cetak Surat Jalan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
