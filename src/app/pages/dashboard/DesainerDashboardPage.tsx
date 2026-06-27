import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { StatCard } from '../../components/molecules';
import { Spinner, Button, Badge } from '../../components/atoms';
import { formatDate } from '../../lib/format';
import type { Order, Client, OrderItem, Product, User, DesignApproval } from '../../../shared/types';

type ProductionOrder = Order & {
  client: Client;
  sales: User;
  items: (OrderItem & { 
    product: Product;
    designApproval?: DesignApproval;
  })[];
};

export default function DesainerDashboardPage() {
  const { data: orders, isLoading } = useQuery<ProductionOrder[]>({
    queryKey: ['production'],
    queryFn: () => apiFetch('/production'),
  });

  if (isLoading) return <Spinner />;

  // Filter orders only in "locked" (Antrean) or "production" (Dalam Proses) column
  const activeOrders = orders?.filter(o => o.status === 'locked' || o.status === 'production') ?? [];

  let pendingItemsCount = 0;
  let approvedItemsCount = 0;
  let fullyApprovedOrdersCount = 0;

  const ordersNeedAttention: (ProductionOrder & { approvedCount: number; totalCount: number })[] = [];

  activeOrders.forEach(order => {
    const totalCount = order.items.length;
    const approvedCount = order.items.filter(i => i.designApproval?.is_approved === 1).length;
    
    pendingItemsCount += (totalCount - approvedCount);
    approvedItemsCount += approvedCount;

    if (totalCount > 0 && approvedCount === totalCount) {
      fullyApprovedOrdersCount++;
    } else if (totalCount > 0) {
      ordersNeedAttention.push({
        ...order,
        approvedCount,
        totalCount
      });
    }
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h2 font-h2 text-primary">Desainer Dashboard</h1>
        <p className="text-on-surface-variant text-body-md">Pantau status persetujuan desain produk sebelum diproduksi.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Desain Pending" 
          value={pendingItemsCount} 
          icon="pending" 
        />
        <StatCard 
          title="Desain Ter-ACC" 
          value={approvedItemsCount} 
          icon="check_circle" 
        />
        <StatCard 
          title="Pesanan Aktif" 
          value={activeOrders.length} 
          icon="factory" 
        />
        <StatCard 
          title="Pesanan Siap Produksi" 
          value={fullyApprovedOrdersCount} 
          icon="task_alt" 
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-on-surface">Antrean Desain yang Perlu Tindakan</h3>
            <Button as={Link} to="/production" variant="primary" size="sm" leftIcon="conveyor_belt">
              Buka Monitor Produksi
            </Button>
          </div>

          {ordersNeedAttention.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-label-md text-on-surface-variant uppercase tracking-wider text-xs">
                    <th className="px-4 py-3 font-bold">No. Pesanan</th>
                    <th className="px-4 py-3 font-bold">Pelanggan</th>
                    <th className="px-4 py-3 font-bold">Sales</th>
                    <th className="px-4 py-3 font-bold">Deadline</th>
                    <th className="px-4 py-3 font-bold">Kolom</th>
                    <th className="px-4 py-3 font-bold">Progress Desain</th>
                    <th className="px-4 py-3 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {ordersNeedAttention.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-container-low/30 transition-colors text-sm">
                      <td className="px-4 py-3 font-bold text-primary">{order.order_number}</td>
                      <td className="px-4 py-3 font-semibold text-on-surface">{order.client?.company_name}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{order.sales?.full_name}</td>
                      <td className="px-4 py-3 text-xs">{order.deadline ? formatDate(order.deadline) : '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={order.status === 'locked' ? 'info' : 'warning'} pill>
                          {order.status === 'locked' ? 'Antrean' : 'Proses'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-surface-container-high rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${(order.approvedCount / order.totalCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-on-surface-variant">
                            {order.approvedCount}/{order.totalCount} ACC
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button as={Link} to="/production" variant="ghost" size="sm" rightIcon="chevron_right">
                          ACC Desain
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-on-surface-variant/30 italic">
              Semua desain pesanan aktif telah ter-ACC! Kerja bagus!
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-on-surface mb-2 italic">Prosedur Desain</h3>
        <p className="text-sm text-on-surface-variant">
          Pekerjaan produksi di bengkel (mulai pengerjaan/cetak) hanya boleh dimulai setelah seluruh item dalam pesanan tersebut selesai ditinjau dan dicentang ACC oleh Desainer. Harap koordinasi dengan tim Sales jika rincian deskripsi atau spesifikasi produk di pesanan belum jelas.
        </p>
      </div>
    </div>
  );
}
