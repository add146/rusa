import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { StatCard } from '../../components/molecules';
import { Spinner, Button } from '../../components/atoms';
import { formatRupiah } from '../../lib/format';

export default function AdminDashboardPage() {
  const { data: summary, isLoading } = useQuery<any>({
    queryKey: ['stats', 'summary'],
    queryFn: () => apiFetch('/stats/summary'),
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h2 font-h2 text-primary">Admin Dashboard</h1>
        <p className="text-on-surface-variant text-body-md">Pantau operasional dan rincian transaksi harian.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Pendapatan" 
          value={formatRupiah(summary?.totalRevenue || 0)} 
          icon="payments" 
        />
        <StatCard 
          title="Total Pesanan" 
          value={summary?.orderCount || 0} 
          icon="shopping_cart" 
        />
        <StatCard 
          title="Total Klien" 
          value={summary?.clientCount || 0} 
          icon="groups" 
        />
        <StatCard 
          title="Total Produk" 
          value={summary?.productCount || 0} 
          icon="inventory_2" 
        />
        <StatCard 
          title="Pembayaran Pending" 
          value={summary?.pendingPayments || 0} 
          icon="hourglass_empty" 
        />
        <StatCard 
          title="Produksi Aktif" 
          value={summary?.activeProduction || 0} 
          icon="conveyor_belt" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Button as={Link} to="/orders" variant="outline" className="w-full" leftIcon="list_alt">Daftar Pesanan</Button>
        <Button as={Link} to="/finance/verify" variant="outline" className="w-full" leftIcon="account_balance_wallet">Verifikasi Pembayaran</Button>
        <Button as={Link} to="/production" variant="outline" className="w-full" leftIcon="factory">Monitor Produksi</Button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-on-surface mb-4 italic">Bantuan Operasional</h3>
        <p className="text-sm text-on-surface-variant">Pastikan semua pembayaran DP diverifikasi tepat waktu agar tim produksi dapat segera memulai pengerjaan pesanan sesuai antrean.</p>
      </div>
    </div>
  );
}
