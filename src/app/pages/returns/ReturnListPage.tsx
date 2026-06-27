import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { Order, Client, Product, User } from '../../../shared/types';
import { Button, Spinner, Badge, ImageLightbox } from '../../components/atoms';
import { EmptyState } from '../../components/molecules';
import { formatDate } from '../../lib/format';
import { useRole } from '../../hooks/useAuth';
import { toast } from 'sonner';

type ReturnItem = {
  id: string;
  product: Product;
  quantity: number;
  reason: string;
  action_taken?: string;
  repair_cost?: number;
};

type ReturnWithDetails = {
  id: string;
  return_number: string;
  order_id: string;
  status: 'pending' | 'verified' | 'in_repair' | 'done' | 'rejected';
  reason: string;
  photo_url?: string;
  total_repair_cost: number;
  created_at: string;
  order: Order & { client: Client };
  items: ReturnItem[];
  reportedBy: User;
  verifiedBy?: User;
  notes?: string;
};

export default function ReturnListPage() {
  const queryClient = useQueryClient();
  const { isOwner, isAdmin } = useRole();
  const [selectedReturn, setSelectedReturn] = useState<ReturnWithDetails | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'verified' | 'rejected'>('verified');
  const [verifyNotes, setVerifyNotes] = useState('');

  // Action states
  const [itemActions, setItemActions] = useState<Record<string, { action_taken: string; repair_cost: number }>>({});

  const { data: returns, isLoading } = useQuery<ReturnWithDetails[]>({
    queryKey: ['returns'],
    queryFn: () => apiFetch('/returns'),
  });

  const verifyMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/returns/${selectedReturn?.id}/verify`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      setShowVerifyModal(false);
      setVerifyNotes('');
      toast.success('Status retur diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui status')
  });

  const actionMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/returns/${selectedReturn?.id}/action`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      setShowActionModal(false);
      toast.success('Tindakan retur berhasil disimpan');
    },
    onError: () => toast.error('Gagal menyimpan tindakan')
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-h2 font-h2 text-primary">Daftar Retur</h1>
          <p className="text-on-surface-variant text-body-md">Kelola pengembalian barang dan klaim garansi.</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-label-md text-on-surface-variant uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">No. Retur / Pesanan</th>
                <th className="px-6 py-4 font-bold">Klien</th>
                <th className="px-6 py-4 font-bold">Items</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Tanggal</th>
                <th className="px-6 py-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {returns?.map((item) => (
                <tr key={item.id} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-primary">{item.return_number}</p>
                    <p className="text-xs text-on-surface-variant">Order: {item.order?.order_number}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-on-surface">{item.order?.client?.company_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-error">{item.items?.length || 0} Item</p>
                    <p className="text-[10px] text-on-surface-variant truncate max-w-[150px]">{item.reason}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={
                      item.status === 'done' ? 'success' : 
                      item.status === 'rejected' ? 'error' : 
                      item.status === 'pending' ? 'warning' : 'info'
                    } pill>
                      {item.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-on-surface-variant">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {item.status === 'pending' && (isOwner || isAdmin) && (
                        <Button size="sm" onClick={() => {
                          setSelectedReturn(item);
                          setShowVerifyModal(true);
                        }}>Verifikasi</Button>
                      )}
                      {item.status === 'verified' && (isOwner || isAdmin) && (
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelectedReturn(item);
                          setShowActionModal(true);
                          // Initialize item actions
                          const initial: any = {};
                          item.items.forEach(i => {
                            initial[i.id] = { action_taken: 'repair', repair_cost: 0 };
                          });
                          setItemActions(initial);
                        }}>Tindak Lanjut</Button>
                      )}
                      <Button size="sm" variant="ghost" leftIcon="visibility" onClick={() => {
                        // View detail logic if needed, or just modal
                        setSelectedReturn(item);
                        setShowVerifyModal(true); // Reusing modal for view
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
              {(!returns || returns.length === 0) && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="Tidak ada retur" description="Belum ada data pengembalian barang." icon="assignment_return" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Verifikasi / Detail */}
      {showVerifyModal && selectedReturn && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <div>
                <h2 className="text-h3 font-h3 text-primary">Detail Retur {selectedReturn.return_number}</h2>
                <p className="text-xs text-on-surface-variant">Diajukan oleh {selectedReturn.reportedBy?.full_name}</p>
              </div>
              <button onClick={() => setShowVerifyModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Alasan Retur</p>
                    <p className="text-sm font-semibold">{selectedReturn.reason}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">List Item</p>
                    <div className="space-y-2 mt-2">
                      {selectedReturn.items?.map(item => (
                        <div key={item.id} className="text-xs bg-surface-container-low p-2 rounded border border-outline-variant">
                          <p className="font-bold">{item.product.name}</p>
                          <p className="text-error font-bold">Qty: {item.quantity} {item.product.unit}</p>
                          {item.reason && <p className="italic text-on-surface-variant mt-1">"{item.reason}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Foto Bukti</p>
                  <div className="aspect-video bg-surface-container rounded-lg overflow-hidden border border-outline-variant">
                    {selectedReturn.photo_url ? (
                      <ImageLightbox src={selectedReturn.photo_url} alt="Bukti Retur" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant/30">
                        <span className="material-symbols-outlined text-4xl">no_photography</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedReturn.status === 'pending' && (isOwner || isAdmin) && (
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-4">
                  <h4 className="text-sm font-bold text-primary">Keputusan Verifikasi</h4>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={verifyStatus === 'verified'} onChange={() => setVerifyStatus('verified')} className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">Terima / Disetujui</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={verifyStatus === 'rejected'} onChange={() => setVerifyStatus('rejected')} className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-error">Tolak Retur</span>
                    </label>
                  </div>
                  <textarea 
                    placeholder="Berikan catatan verifikasi..."
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <Button 
                    className="w-full" 
                    onClick={() => verifyMutation.mutate({ status: verifyStatus, notes: verifyNotes })}
                    loading={verifyMutation.isPending}
                  >
                    Simpan Verifikasi
                  </Button>
                </div>
              )}

              {selectedReturn.status !== 'pending' && (
                <div className="p-4 rounded-xl border border-outline-variant space-y-2">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Hasil Verifikasi</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedReturn.status === 'rejected' ? 'error' : 'success'}>
                      {selectedReturn.status.toUpperCase()}
                    </Badge>
                    <p className="text-xs font-bold text-on-surface-variant">oleh {selectedReturn.verifiedBy?.full_name}</p>
                  </div>
                  {selectedReturn.notes && <p className="text-sm italic text-on-surface mt-2 bg-surface-container-low p-2 rounded">"{selectedReturn.notes}"</p>}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-outline-variant flex justify-end">
              <Button onClick={() => setShowVerifyModal(false)} variant="outline">Tutup</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tindak Lanjut */}
      {showActionModal && selectedReturn && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h2 className="text-h3 font-h3 text-primary">Tindak Lanjut Retur</h2>
              <button onClick={() => setShowActionModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <p className="text-sm text-on-surface-variant mb-4">Pilih tindakan penyelesaian untuk masing-masing item retur.</p>
              
              {selectedReturn.items.map(item => (
                <div key={item.id} className="p-4 border border-outline-variant rounded-xl bg-surface-container-low space-y-3">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-on-surface">{item.product.name} ({item.quantity} {item.product.unit})</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Tindakan</label>
                      <select 
                        value={itemActions[item.id]?.action_taken}
                        onChange={(e) => setItemActions(prev => ({ ...prev, [item.id]: { ...prev[item.id], action_taken: e.target.value } }))}
                        className="w-full bg-surface-container-lowest border border-outline rounded px-3 py-2 text-sm"
                      >
                        <option value="repair">Perbaikan (Repair)</option>
                        <option value="replace">Ganti Baru (Replace)</option>
                        <option value="refund">Ganti Uang (Refund)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Biaya (Jika ada)</label>
                      <input 
                        type="number"
                        value={itemActions[item.id]?.repair_cost}
                        onChange={(e) => setItemActions(prev => ({ ...prev, [item.id]: { ...prev[item.id], repair_cost: parseInt(e.target.value) || 0 } }))}
                        className="w-full bg-surface-container-lowest border border-outline rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-outline-variant flex justify-end gap-2">
              <Button onClick={() => setShowActionModal(false)} variant="outline">Batal</Button>
              <Button onClick={() => {
                const items = Object.entries(itemActions).map(([id, val]) => ({ id, ...val }));
                const totalCost = items.reduce((acc, curr) => acc + curr.repair_cost, 0);
                actionMutation.mutate({ items, total_repair_cost: totalCost });
              }} loading={actionMutation.isPending} leftIcon="task_alt">Selesaikan Retur</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
