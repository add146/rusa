import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { Order, Client } from '../../../shared/types';
import { Button, Spinner, Badge } from '../../components/atoms';
import { EmptyState } from '../../components/molecules';
import { formatRupiah, formatDate } from '../../lib/format';
import { toast } from 'sonner';

type PaymentWithDetails = {
  id: string;
  order_id: string;
  type: string;
  amount: number;
  status: string;
  proof_url?: string;
  created_at: string;
  notes?: string;
  order: Order & { client: Client };
};

export default function PaymentVerificationPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [isDownloading, setIsDownloading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  
  // State removed as verification constraint is lifted

  const { data: payments, isLoading } = useQuery<PaymentWithDetails[]>({
    queryKey: ['payments', filter],
    queryFn: () => apiFetch(`/payments?status=${filter}`),
  });

  const [searchQuery, setSearchQuery] = useState('');

  const filteredPayments = payments?.filter(payment => {
    const query = searchQuery.toLowerCase();
    const orderNumberMatch = payment.order?.order_number?.toLowerCase().includes(query);
    const clientMatch = payment.order?.client?.company_name?.toLowerCase().includes(query);
    return orderNumberMatch || clientMatch;
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'verified' | 'rejected' }) => {
      return apiFetch(`/payments/${id}/verify`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Status pembayaran diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui status')
  });



  const handleDownloadCSV = async () => {
    setIsDownloading(true);
    try {
      const allPayments = await apiFetch<PaymentWithDetails[]>('/payments?status=all');
      
      const headers = ['Tanggal', 'No. Pesanan', 'Klien', 'Jenis', 'Nominal', 'Status', 'Catatan'];
      const rows = allPayments.map(p => [
        formatDate(p.created_at),
        p.order?.order_number,
        p.order?.client?.company_name,
        p.type.toUpperCase(),
        p.amount,
        p.status.toUpperCase(),
        p.notes?.replace(/,/g, ';') || ''
      ]);

      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `laporan-keuangan-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Laporan berhasil diunduh');
    } catch (error) {
      toast.error('Gagal mengunduh laporan');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-h2 font-h2 text-primary">Verifikasi Pembayaran</h1>
          <p className="text-on-surface-variant text-body-md">Konfirmasi bukti transfer dari sales atau klien.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleDownloadCSV} 
          loading={isDownloading}
          leftIcon="download"
        >
          Download Laporan CSV
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-outline-variant">
        {['pending', 'verified', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as any)}
            className={`px-4 py-2 text-sm font-bold capitalize transition-all border-b-2 whitespace-nowrap ${
              filter === s 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {/* Search bar inside the card */}
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

        {filteredPayments && filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-label-md text-on-surface-variant uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold text-center w-16">Bukti</th>
                  <th className="px-4 py-3 font-bold">Klien & No. Order</th>
                  <th className="px-4 py-3 font-bold">Tanggal</th>
                  <th className="px-4 py-3 font-bold text-center">Jenis</th>
                  <th className="px-4 py-3 font-bold text-right">Nominal</th>
                  <th className="px-4 py-3 font-bold text-center w-[180px]">Aksi / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-surface-container-low/30 transition-colors">
                    {/* Column 1: Proof */}
                    <td className="px-4 py-2.5 text-center">
                      <div 
                        className="w-10 h-10 bg-primary-container/10 rounded-lg flex items-center justify-center text-primary overflow-hidden border border-outline-variant cursor-pointer hover:ring-2 hover:ring-primary transition-all mx-auto"
                        onClick={() => payment.proof_url && setProofUrl(payment.proof_url)}
                        title="Klik untuk perbesar bukti"
                      >
                        {payment.proof_url ? (
                          <img src={payment.proof_url} alt="Bukti" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-xl">payments</span>
                        )}
                      </div>
                    </td>

                    {/* Column 2: Client & Order */}
                    <td className="px-4 py-2.5">
                      <div className="min-w-[150px]">
                        <p className="font-bold text-sm text-on-surface line-clamp-1">{payment.order?.client?.company_name}</p>
                        <p className="text-xs text-primary font-mono font-semibold">{payment.order?.order_number}</p>
                      </div>
                    </td>

                    {/* Column 3: Date */}
                    <td className="px-4 py-2.5">
                      <p className="text-xs text-on-surface-variant whitespace-nowrap">{formatDate(payment.created_at)}</p>
                    </td>

                    {/* Column 4: Type */}
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={payment.type === 'dp' ? 'info' : 'success'} className="text-[10px] py-0.5 px-2">
                        {payment.type.toUpperCase()}
                      </Badge>
                    </td>

                    {/* Column 5: Amount */}
                    <td className="px-4 py-2.5 text-right">
                      <p className="font-bold text-sm text-on-surface whitespace-nowrap">{formatRupiah(payment.amount)}</p>
                      <p className="text-[10px] text-on-surface-variant leading-none mt-0.5">
                        {payment.type === 'dp' ? 'Down Payment' : 'Pelunasan'}
                      </p>
                    </td>

                    {/* Column 6: Actions / Status */}
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 min-w-[160px]">
                        {payment.status === 'pending' ? (
                          <>
                            <Button 
                              size="sm" 
                              variant="danger"
                              className="text-[10px] h-7 py-1 px-2.5 font-bold"
                              loading={mutation.isPending}
                              onClick={() => mutation.mutate({ id: payment.id, status: 'rejected' })}
                            >
                              Tolak
                            </Button>
                            <Button 
                              size="sm" 
                              className="text-[10px] h-7 py-1 px-2.5 font-bold"
                              loading={mutation.isPending}
                              onClick={() => mutation.mutate({ id: payment.id, status: 'verified' })}
                              leftIcon="check_circle"
                            >
                              Verifikasi
                            </Button>
                          </>
                        ) : (
                          <Badge variant={payment.status === 'verified' ? 'success' : 'error'} pill className="text-[10px] py-0.5 px-3">
                            {payment.status.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            title={payments && payments.length > 0 ? "Tidak ada hasil ditemukan" : "Tidak ada pembayaran"} 
            description={payments && payments.length > 0 ? "Coba kata kunci pencarian yang lain." : "Setoran pembayaran tidak ditemukan."}
            icon={payments && payments.length > 0 ? "search_off" : "task_alt"}
          />
        )}
      </div>

      {proofUrl && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setProofUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center">
            <button 
              className="absolute -top-12 right-0 text-white hover:text-primary transition-colors flex items-center gap-2 font-bold"
              onClick={() => setProofUrl(null)}
            >
              <span className="material-symbols-outlined">close</span>
              Tutup
            </button>
            <img
              src={proofUrl}
              alt="Bukti Transfer"
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
