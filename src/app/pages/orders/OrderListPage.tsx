import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import type { Order, Client, User } from '../../../shared/types';
import { Button, Spinner } from '../../components/atoms';
import { SearchBar, StatusBadge, EmptyState } from '../../components/molecules';
import { formatRupiah, formatDate } from '../../lib/format';
import { toast } from 'sonner';

type OrderWithDetails = Order & {
  client: Client;
  sales: User;
};

export default function OrderListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const { data: orders, isLoading, error } = useQuery<OrderWithDetails[]>({
    queryKey: ['orders', activeTab],
    queryFn: () => apiFetch(`/orders?status=${activeTab}`),
  });

  const filteredOrders = orders?.filter(order => 
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.client?.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <Spinner />;
  if (error) {
    toast.error('Gagal mengambil data pesanan');
    return <EmptyState title="Error" description="Gagal memuat data." icon="error" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-h2 font-h2 text-primary">Pesanan</h1>
          <p className="text-on-surface-variant text-body-md">Pantau semua pesanan dan status pembayarannya.</p>
        </div>
        <Button as={Link} to="/orders/new" leftIcon="add_shopping_cart">
          Pesanan Baru
        </Button>
      </div>

      <div className="flex gap-2 border-b border-outline-variant">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'active' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          Aktif
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'archived' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          Arsip
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
          <SearchBar 
            placeholder="Cari No. Pesanan atau Klien..." 
            onSearch={setSearchTerm}
            className="w-full max-w-md"
          />
        </div>

        <div className="overflow-x-auto">
          {filteredOrders && filteredOrders.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-label-md text-on-surface-variant uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">No. Pesanan</th>
                  <th className="px-6 py-4 font-bold">Klien</th>
                  <th className="px-6 py-4 font-bold">Total</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Deadline</th>
                  <th className="px-6 py-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-container-low/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-on-surface">{order.order_number}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase">{formatDate(order.created_at)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-on-surface">{order.client?.company_name}</p>
                      <p className="text-[10px] text-on-surface-variant">Sales: {order.sales?.full_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-primary">{formatRupiah(order.total_price)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-on-surface">{order.deadline ? formatDate(order.deadline) : '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/orders/${order.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-on-surface-variant hover:bg-primary-container hover:text-on-primary transition-all"
                      >
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState 
              title="Tidak ada pesanan" 
              description={searchTerm ? `Pencarian "${searchTerm}" tidak ditemukan.` : "Belum ada pesanan yang masuk."}
              icon="shopping_cart_off"
            />
          )}
        </div>
      </div>
    </div>
  );
}
