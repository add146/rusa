import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { Order, Client, OrderItem, Product, User, DesignApproval, ShipmentBatch, ShipmentBatchItem } from '../../../shared/types';
import { Button, Spinner, Badge } from '../../components/atoms';
import { formatDate } from '../../lib/format';
import { toast } from 'sonner';
import { useRole } from '../../hooks/useAuth';

type ProductionOrder = Order & {
  client: Client;
  sales: User;
  items: (OrderItem & { 
    product: Product;
    designApproval?: DesignApproval;
  })[];
  shipmentBatches?: (ShipmentBatch & {
    items?: ShipmentBatchItem[];
  })[];
};

export default function ProductionMonitorPage() {
  const queryClient = useQueryClient();
  const { isProduction, isDesainer } = useRole();
  const canEdit = isProduction;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Expand/collapse states
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Partial SJ creation modal states
  const [selectedOrderForSJ, setSelectedOrderForSJ] = useState<ProductionOrder | null>(null);
  const [sjItems, setSjItems] = useState<Record<string, number>>({}); // order_item_id -> quantity_shipped
  const [sjNotes, setSjNotes] = useState('');

  // Expand/Collapse individual history batches
  const [expandedHistoryBatches, setExpandedHistoryBatches] = useState<Set<string>>(new Set());

  const { data: orders, isLoading } = useQuery<ProductionOrder[]>({
    queryKey: ['production'],
    queryFn: () => apiFetch('/production'),
  });

  const mutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) => {
      return apiFetch(`/production/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production'] });
      toast.success('Status produksi diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui status')
  });

  const designMutation = useMutation({
    mutationFn: ({ orderItemId, isApproved }: { orderItemId: string; isApproved: number }) => {
      return apiFetch(`/design/approvals/${orderItemId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_approved: isApproved }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production'] });
      toast.success('Status desain diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui status desain')
  });

  const itemDoneMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string }) => {
      return apiFetch(`/production/items/${itemId}/done`, {
        method: 'PUT',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production'] });
      toast.success('Status pengerjaan item diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui pengerjaan item')
  });

  const createShipmentMutation = useMutation({
    mutationFn: (data: { order_id: string; items: { order_item_id: string; quantity_shipped: number }[]; notes?: string }) => {
      return apiFetch('/shipments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production'] });
      toast.success('Surat Jalan parsial berhasil dibuat');
      setSelectedOrderForSJ(null);
      setSjItems({});
      setSjNotes('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal membuat Surat Jalan');
    }
  });

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const expandAll = (orderIds: string[]) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      orderIds.forEach(id => next.add(id));
      return next;
    });
  };

  const collapseAll = (orderIds: string[]) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      orderIds.forEach(id => next.delete(id));
      return next;
    });
  };

  const toggleHistoryBatch = (batchId: string) => {
    setExpandedHistoryBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  // Helper: calculate total previously shipped items
  const getRemainingToShip = (item: OrderItem, order: ProductionOrder) => {
    let shipped = 0;
    (order.shipmentBatches || []).forEach(batch => {
      (batch.items || []).forEach(bi => {
        if (bi.order_item_id === item.id) {
          shipped += bi.quantity_shipped;
        }
      });
    });
    return Math.max(0, (item.quantity_ordered || 0) - shipped);
  };

  // Helper: check if order is ready for partial SJ
  const hasShippableItems = (order: ProductionOrder) => {
    return order.items.some(item => {
      if (item.is_production_done === 1) {
        const remaining = getRemainingToShip(item, order);
        return remaining > 0;
      }
      return false;
    });
  };

  const openSJModal = (order: ProductionOrder) => {
    setSelectedOrderForSJ(order);
    const initialQuantities: Record<string, number> = {};
    order.items.forEach(item => {
      if (item.is_production_done === 1) {
        const remaining = getRemainingToShip(item, order);
        if (remaining > 0) {
          initialQuantities[item.id] = remaining;
        }
      }
    });
    setSjItems(initialQuantities);
    setSjNotes('');
  };

  // Helper to determine deadline badges
  const getDeadlineBadge = (deadline?: string) => {
    if (!deadline) return null;
    const now = new Date();
    const dl = new Date(deadline);
    const diffMs = dl.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: 'OVERDUE',
        className: 'bg-error text-white font-bold border border-error/50',
        icon: 'error'
      };
    }
    if (diffDays <= 3) {
      return {
        label: `${diffDays} hari lagi`,
        className: 'bg-error/15 text-error font-bold border border-error/20',
        icon: 'warning'
      };
    }
    if (diffDays <= 5) {
      return {
        label: `${diffDays} hari lagi`,
        className: 'bg-warning/15 text-warning font-bold border border-warning/20',
        icon: 'schedule'
      };
    }
    return null;
  };

  // Client-side search filtering
  const filteredOrders = orders?.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.client?.company_name?.toLowerCase().includes(q) ||
      o.client?.pic_name?.toLowerCase().includes(q) ||
      o.items.some(i => i.product?.name?.toLowerCase().includes(q))
    );
  });

  const columns = [
    { id: 'locked', label: 'Antrean (Locked)', icon: 'list_alt', color: 'text-info' },
    { id: 'production', label: 'Dalam Proses', icon: 'conveyor_belt', color: 'text-warning' },
    { id: 'done', label: 'Selesai Produksi', icon: 'check_circle', color: 'text-success' },
  ];

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6 h-full flex flex-col pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-h2 font-h2 text-primary">Monitor Produksi</h1>
          <p className="text-on-surface-variant text-body-md">Pantau alur kerja manufaktur secara real-time.</p>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </span>
          <input
            type="text"
            placeholder="Cari order, klien, produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container text-on-surface placeholder-on-surface-variant/60 pl-10 pr-10 py-1.5 rounded-lg text-sm border border-outline-variant/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {columns.map((col) => {
          const ordersInCol = filteredOrders?.filter(o => o.status === col.id) ?? [];
          const ordersIdsInCol = ordersInCol.map(o => o.id);
          const fullyApprovedCount = ordersInCol.filter(o => 
            o.items.length > 0 && o.items.every(i => i.designApproval?.is_approved === 1)
          ).length;

          return (
            <div key={col.id} className="bg-surface-container-low rounded-xl flex flex-col border border-outline-variant/50 max-h-[calc(100vh-200px)]">
              {/* Column Header */}
              <div className="p-4 border-b border-outline-variant flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`material-symbols-outlined ${col.color}`}>{col.icon}</span>
                  <h3 className="font-bold text-on-surface uppercase tracking-wider text-xs truncate">{col.label}</h3>
                  {(col.id === 'locked' || col.id === 'production') && fullyApprovedCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded flex-shrink-0" title={`${fullyApprovedCount} pesanan siap diproduksi karena semua desain ACC`}>
                      <span>{fullyApprovedCount} ACC</span>
                      <span className="material-symbols-outlined text-[10px] leading-none font-bold">check</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle Expand/Collapse All */}
                  {ordersInCol.length > 0 && (() => {
                    const allExpanded = ordersIdsInCol.every(id => expandedOrders.has(id));
                    return (
                      <button
                        onClick={() => allExpanded ? collapseAll(ordersIdsInCol) : expandAll(ordersIdsInCol)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-highest hover:text-primary transition-all flex items-center justify-center border border-outline-variant/40 bg-surface-container"
                        title={allExpanded ? "Tutup semua kartu di kolom ini" : "Buka semua kartu di kolom ini"}
                      >
                        <span className="material-symbols-outlined text-[15px] block">
                          {allExpanded ? 'close_fullscreen' : 'open_in_full'}
                        </span>
                      </button>
                    );
                  })()}
                  <Badge variant="neutral" pill>
                    {ordersInCol.length}
                  </Badge>
                </div>
              </div>
              
              {/* Cards Container */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {ordersInCol.map((order) => {
                  const isExpanded = expandedOrders.has(order.id);
                  const totalItems = order.items.length;
                  const approvedItems = order.items.filter(i => i.designApproval?.is_approved === 1).length;
                  const allApproved = totalItems > 0 && approvedItems === totalItems;
                  
                  const doneProdItems = order.items.filter(i => i.is_production_done === 1).length;
                  const allProdDone = totalItems > 0 && doneProdItems === totalItems;

                  const dlInfo = getDeadlineBadge(order.deadline);

                  // RENDER COLLAPSED VIEW
                  if (!isExpanded) {
                    return (
                      <div 
                        key={order.id} 
                        onClick={() => toggleExpand(order.id)}
                        className="bg-surface-container-lowest border border-outline-variant/80 rounded-lg p-2.5 shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-between text-[11px] hover:border-outline-variant-highest group"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="material-symbols-outlined text-[14px] text-on-surface-variant flex-shrink-0 group-hover:text-primary transition-colors">
                            chevron_right
                          </span>
                          <span className="font-bold text-primary flex-shrink-0">{order.order_number}</span>
                          <span className="text-on-surface-variant/40 flex-shrink-0">·</span>
                          <span className="text-on-surface font-semibold truncate max-w-[110px]">{order.client?.company_name}</span>
                          <span className="text-on-surface-variant/40 flex-shrink-0">·</span>
                          <span className="text-on-surface-variant flex-shrink-0 font-medium">{totalItems} item</span>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          {allApproved && (
                            <span className="w-4.5 h-4.5 bg-success/10 text-success border border-success/20 rounded-[4px] font-bold flex items-center justify-center flex-shrink-0" title="Semua Desain ACC">
                              <span className="material-symbols-outlined text-[12px] leading-none font-bold">check</span>
                            </span>
                          )}
                          {dlInfo && (
                            <span className={`${dlInfo.className} px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold`}>
                              {dlInfo.label}
                            </span>
                          )}
                          
                          {/* Design completion mini indicator */}
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-surface-container px-1 py-0.5 rounded text-on-surface-variant/80" title="Progress Desain ACC">
                            <span className="material-symbols-outlined text-[12px] leading-none text-on-surface-variant/80">palette</span>
                            <span>{approvedItems}/{totalItems}</span>
                          </span>
                          {/* Production completion mini indicator */}
                          <span className={`inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded ${allProdDone ? 'bg-success/15 text-success font-bold' : 'bg-surface-container text-on-surface-variant/80'}`} title="Progress Produksi Selesai">
                            <span className={`material-symbols-outlined text-[12px] leading-none ${allProdDone ? 'text-success' : 'text-on-surface-variant/80'}`}>build</span>
                            <span>{doneProdItems}/{totalItems}</span>
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // RENDER EXPANDED VIEW
                  return (
                    <div key={order.id} className="bg-surface-container-lowest border-2 border-primary/45 rounded-lg p-4 shadow-md transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            expand_more
                          </span>
                          <p className="font-bold text-primary text-sm">{order.order_number}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {dlInfo && (
                            <span className={`${dlInfo.className} px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1`}>
                              <span className="material-symbols-outlined text-[12px]">{dlInfo.icon}</span>
                              {dlInfo.label}
                            </span>
                          )}
                          <p className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                            DL: {order.deadline ? formatDate(order.deadline) : '-'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mb-3 p-2 bg-surface-container-low rounded-md border border-outline-variant/30">
                        <p className="text-sm font-bold text-on-surface">{order.client?.company_name}</p>
                        <p className="text-[10px] text-on-surface-variant">Sales: <span className="font-semibold">{order.sales?.full_name}</span></p>
                        {order.notes && (
                          <div className="mt-1 text-[10px] text-warning bg-warning/5 border border-warning/10 p-1.5 rounded italic">
                            Catatan: {order.notes}
                          </div>
                        )}
                      </div>
                      
                      {/* Order Items Table */}
                      <div className="space-y-2 mb-4">
                        {order.items.map(item => {
                          const isApproved = item.designApproval?.is_approved === 1;
                          const isInteractiveDesign = isDesainer && (col.id === 'locked' || col.id === 'production');
                          
                          // Production checkboxes (Only for 'production' column and 'produksi' role)
                          const isInteractiveProd = isProduction && col.id === 'production';
                          const isItemDone = item.is_production_done === 1;
                          const remainingToShip = getRemainingToShip(item, order);

                          return (
                            <div 
                              key={item.id} 
                              className={`flex flex-col text-xs bg-surface-container-low/40 p-2 rounded border border-outline-variant/30 ${
                                isItemDone ? 'bg-success/5 border-success/20' : ''
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {/* Design Approval Checkbox */}
                                  {isInteractiveDesign ? (
                                    <button
                                      type="button"
                                      onClick={() => designMutation.mutate({
                                        orderItemId: item.id,
                                        isApproved: isApproved ? 0 : 1
                                      })}
                                      className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                                        isApproved
                                          ? 'bg-success border-success text-white'
                                          : 'border-outline-variant hover:border-primary'
                                      }`}
                                      title={isApproved ? 'Klik untuk batal ACC desain' : 'Klik untuk ACC Desain'}
                                      disabled={designMutation.isPending}
                                    >
                                      {isApproved && (
                                        <span className="material-symbols-outlined text-[10px] leading-none">check</span>
                                      )}
                                    </button>
                                  ) : (
                                    <div className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                                      isApproved
                                        ? 'bg-success border-success text-white'
                                        : 'border-outline-variant bg-surface'
                                    }`}>
                                      {isApproved && (
                                        <span className="material-symbols-outlined text-[10px] leading-none">check</span>
                                      )}
                                    </div>
                                  )}
                                  <span className={`text-on-surface truncate font-medium ${isItemDone ? 'line-through text-on-surface-variant/50' : ''}`}>
                                    {item.product.name}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  {isApproved && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded">
                                      <span>ACC</span>
                                      <span className="material-symbols-outlined text-[10px] leading-none font-bold">check</span>
                                    </span>
                                  )}
                                  <span className="font-bold text-on-surface-variant">Qty: {item.quantity_ordered}</span>
                                </div>
                              </div>

                              {/* Production checkbox section */}
                              {col.id === 'production' && (
                                <div className="mt-1.5 pt-1.5 border-t border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest/60 p-1.5 rounded">
                                  <div className="flex items-center gap-1.5">
                                    {isInteractiveProd ? (
                                      <button
                                        type="button"
                                        onClick={() => itemDoneMutation.mutate({ itemId: item.id })}
                                        className={`flex-shrink-0 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                                          isItemDone
                                            ? 'bg-success border-success text-white shadow-sm'
                                            : 'border-outline hover:border-success/60'
                                        }`}
                                        title={isItemDone ? 'Batal Selesai Produksi' : 'Tandai Selesai Produksi'}
                                        disabled={itemDoneMutation.isPending}
                                      >
                                        <span className="material-symbols-outlined text-[12px] leading-none">build_circle</span>
                                      </button>
                                    ) : (
                                      <span className={`material-symbols-outlined text-sm ${isItemDone ? 'text-success' : 'text-on-surface-variant/40'}`}>
                                        {isItemDone ? 'check_circle' : 'build_circle'}
                                      </span>
                                    )}
                                    <span className={`text-[10px] font-semibold ${isItemDone ? 'text-success' : 'text-on-surface-variant'}`}>
                                      {isItemDone ? 'Selesai Manufaktur' : 'Proses Produksi'}
                                    </span>
                                  </div>

                                  <div className="text-[9px] text-on-surface-variant font-medium">
                                    Sisa Kirim: <span className="font-bold text-primary">{remainingToShip}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Progress bar desain ACC */}
                      <div className="mt-2 pt-2 border-t border-outline-variant/30 space-y-2">
                        {(() => {
                          const approvedPercent = totalItems > 0 ? (approvedItems / totalItems) * 100 : 0;
                          return (
                            <div>
                              <div className="flex justify-between text-[9px] text-on-surface-variant mb-0.5">
                                <span>Status ACC Desain</span>
                                <span className={allApproved ? 'text-success font-bold' : ''}>
                                  {approvedItems}/{totalItems} ACC ({Math.round(approvedPercent)}%)
                                </span>
                              </div>
                              <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${allApproved ? 'bg-success' : 'bg-primary'}`}
                                  style={{ width: `${approvedPercent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Progress bar produksi selesai (hanya di kolom production) */}
                        {col.id === 'production' && (
                          <div>
                            <div className="flex justify-between text-[9px] text-on-surface-variant mb-0.5">
                              <span>Pengerjaan Manufaktur</span>
                              <span className={allProdDone ? 'text-success font-bold' : ''}>
                                {doneProdItems}/{totalItems} Selesai ({Math.round(totalItems > 0 ? (doneProdItems / totalItems) * 100 : 0)}%)
                              </span>
                            </div>
                            <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                              <div 
                                  className={`h-full rounded-full transition-all ${allProdDone ? 'bg-success' : 'bg-warning'}`}
                                  style={{ width: `${totalItems > 0 ? (doneProdItems / totalItems) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Shipment Batches History */}
                      {order.shipmentBatches && order.shipmentBatches.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-outline-variant/30">
                          <p className="text-[10px] font-bold text-on-surface uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">local_shipping</span>
                            Riwayat Pengiriman ({order.shipmentBatches.length})
                          </p>
                          <div className="space-y-1.5">
                            {order.shipmentBatches.map((batch) => {
                              const batchExpanded = expandedHistoryBatches.has(batch.id);
                              const batchItemsCount = batch.items?.reduce((sum, i) => sum + i.quantity_shipped, 0) || 0;
                              
                              return (
                                <div key={batch.id} className="bg-surface-container border border-outline-variant/40 rounded p-1.5 text-[10px]">
                                  <div 
                                    className="flex justify-between items-center cursor-pointer"
                                    onClick={() => toggleHistoryBatch(batch.id)}
                                  >
                                    <div className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[12px] text-on-surface-variant">
                                        {batchExpanded ? 'expand_more' : 'chevron_right'}
                                      </span>
                                      <span className="font-bold text-primary">SJ Batch #{batch.batch_number}</span>
                                      <span className="text-on-surface-variant">({batchItemsCount} item)</span>
                                    </div>
                                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                      batch.status === 'printed' 
                                        ? 'bg-success/10 text-success border border-success/20' 
                                        : 'bg-info/10 text-info border border-info/20'
                                    }`}>
                                      {batch.status === 'printed' ? (
                                        <>
                                          <span className="material-symbols-outlined text-[9px] leading-none font-bold">check</span>
                                          <span>Dicetak</span>
                                        </>
                                      ) : 'Menunggu Cetak'}
                                    </span>
                                  </div>

                                  {batchExpanded && batch.items && (
                                    <div className="mt-1.5 pt-1.5 border-t border-outline-variant/20 space-y-1">
                                      {batch.items.map((bi) => {
                                        const originalItem = order.items.find(item => item.id === bi.order_item_id);
                                        return (
                                          <div key={bi.id} className="flex justify-between text-on-surface-variant/80">
                                            <span className="truncate max-w-[150px]">{originalItem?.product?.name || 'Item'}</span>
                                            <span className="font-semibold text-on-surface">Qty: {bi.quantity_shipped}</span>
                                          </div>
                                        );
                                      })}
                                      {batch.notes && (
                                        <p className="text-[9px] italic text-warning bg-warning/5 p-1 rounded mt-1">
                                          Catatan: {batch.notes}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2 mt-4 border-t border-outline-variant/30 pt-4">
                        {col.id === 'production' && (
                          <>
                            {/* Make Partial SJ Button */}
                            {hasShippableItems(order) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs font-semibold border-success/40 text-success hover:bg-success/5"
                                leftIcon="local_shipping"
                                onClick={() => openSJModal(order)}
                              >
                                Buat Surat Jalan
                              </Button>
                            )}
                          </>
                        )}

                        {canEdit && (
                          <>
                            {col.id === 'locked' && (
                              <Button 
                                size="sm" 
                                className="w-full text-xs font-semibold" 
                                onClick={() => mutation.mutate({ orderId: order.id, status: 'masuk' })}
                                loading={mutation.isPending}
                              >
                                Mulai Produksi
                              </Button>
                            )}
                            {col.id === 'production' && (
                              <div className="flex flex-col w-full gap-2">
                                <Button 
                                  size="sm" 
                                  className="w-full text-xs font-semibold" 
                                  onClick={() => mutation.mutate({ orderId: order.id, status: 'selesai' })}
                                  loading={mutation.isPending}
                                  disabled={!allProdDone}
                                  title={!allProdDone ? 'Tandai semua item selesai produksi terlebih dahulu' : ''}
                                >
                                  Selesaikan Produksi
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="w-full text-[10px] text-on-surface-variant hover:text-error" 
                                  onClick={() => {
                                    if(window.confirm('Batalkan proses dan kembalikan ke antrean?')) {
                                      mutation.mutate({ orderId: order.id, status: 'batal_proses' });
                                    }
                                  }}
                                  loading={mutation.isPending}
                                  leftIcon="undo"
                                >
                                  Kembalikan ke Antrean
                                </Button>
                              </div>
                            )}
                            {col.id === 'done' && (
                              <div className="flex flex-col w-full gap-2 text-center">
                                <div className="py-2 text-xs font-bold text-success flex items-center justify-center gap-1">
                                  <span className="material-symbols-outlined text-sm">verified</span>
                                  Siap Kirim / Pelunasan
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="w-full text-[10px] text-on-surface-variant hover:text-error" 
                                  onClick={() => {
                                    if(window.confirm('Batalkan status selesai dan kembalikan ke proses produksi?')) {
                                      mutation.mutate({ orderId: order.id, status: 'batal_selesai' });
                                    }
                                  }}
                                  loading={mutation.isPending}
                                  leftIcon="undo"
                                >
                                  Batal Selesai
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                        
                        {!canEdit && col.id === 'done' && (
                          <div className="text-center">
                            <div className="py-2 text-xs font-bold text-success flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-sm">verified</span>
                              Siap Kirim / Pelunasan
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {ordersInCol.length === 0 && (
                  <div className="text-center py-8 text-on-surface-variant/30 italic text-xs">Kosong</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Partial SJ Modal */}
      {selectedOrderForSJ && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface-container rounded-xl max-w-lg w-full border border-outline-variant shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-success">local_shipping</span>
                <h3 className="font-bold text-on-surface text-lg">Buat Surat Jalan Parsial</h3>
              </div>
              <button 
                onClick={() => setSelectedOrderForSJ(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">No. Order</p>
                <p className="font-bold text-primary text-sm">{selectedOrderForSJ.order_number}</p>
                <p className="text-xs text-on-surface mt-1 font-semibold">{selectedOrderForSJ.client?.company_name}</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Item Yang Siap Dikirim</p>
                
                {selectedOrderForSJ.items
                  .filter(item => item.is_production_done === 1)
                  .map(item => {
                    const remaining = getRemainingToShip(item, selectedOrderForSJ);
                    const qtyShipped = sjItems[item.id] || 0;
                    const isIncluded = qtyShipped > 0;

                    if (remaining === 0) return null;

                    return (
                      <div 
                        key={item.id} 
                        className={`p-3 rounded-lg border flex flex-col gap-2 transition-all ${
                          isIncluded 
                            ? 'bg-success/5 border-success/35' 
                            : 'bg-surface-container-low border-outline-variant/60'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <label className="flex items-start gap-2 cursor-pointer select-none min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSjItems(prev => ({ ...prev, [item.id]: remaining }));
                                } else {
                                  setSjItems(prev => {
                                    const next = { ...prev };
                                    delete next[item.id];
                                    return next;
                                  });
                                }
                              }}
                              className="mt-0.5 accent-success rounded cursor-pointer"
                            />
                            <div>
                              <p className="text-xs font-bold text-on-surface">{item.product.name}</p>
                              <p className="text-[10px] text-on-surface-variant">
                                Total: {item.quantity_ordered} · Tersisa: <span className="font-semibold text-primary">{remaining}</span>
                              </p>
                            </div>
                          </label>
                        </div>

                        {isIncluded && (
                          <div className="flex items-center justify-between gap-4 mt-1 bg-surface-container-high/40 p-2 rounded">
                            <span className="text-[10px] font-medium text-on-surface-variant">Jumlah Kirim:</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSjItems(prev => ({ ...prev, [item.id]: Math.max(1, qtyShipped - 1) }))}
                                className="w-7 h-7 bg-surface-container rounded border border-outline-variant flex items-center justify-center font-bold text-xs hover:bg-surface-container-highest"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={remaining}
                                value={qtyShipped}
                                onChange={(e) => {
                                  const val = Math.min(remaining, Math.max(1, parseInt(e.target.value) || 1));
                                  setSjItems(prev => ({ ...prev, [item.id]: val }));
                                }}
                                className="w-16 bg-surface-container text-center py-1 rounded text-xs border border-outline font-semibold"
                              />
                              <button
                                type="button"
                                onClick={() => setSjItems(prev => ({ ...prev, [item.id]: Math.min(remaining, qtyShipped + 1) }))}
                                className="w-7 h-7 bg-surface-container rounded border border-outline-variant flex items-center justify-center font-bold text-xs hover:bg-surface-container-highest"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Catatan Pengiriman (Notes)</label>
                <textarea
                  placeholder="Misal: Batch 1 - kirim bagian pertama dahulu"
                  value={sjNotes}
                  onChange={(e) => setSjNotes(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface border border-outline p-2.5 rounded-lg text-xs placeholder-on-surface-variant/40 focus:outline-none focus:border-primary min-h-[60px]"
                />
              </div>
            </div>

            <div className="p-5 border-t border-outline-variant flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setSelectedOrderForSJ(null)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-success hover:bg-success-hover text-white border-success"
                disabled={!Object.values(sjItems).some(qty => qty > 0) || createShipmentMutation.isPending}
                loading={createShipmentMutation.isPending}
                onClick={() => {
                  const itemsToShip = Object.entries(sjItems)
                    .filter(([_, qty]) => qty > 0)
                    .map(([itemId, qty]) => ({
                      order_item_id: itemId,
                      quantity_shipped: qty
                    }));
                  createShipmentMutation.mutate({
                    order_id: selectedOrderForSJ.id,
                    items: itemsToShip,
                    notes: sjNotes
                  });
                }}
              >
                Buat Surat Jalan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
