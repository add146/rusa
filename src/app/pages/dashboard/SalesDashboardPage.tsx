import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { StatCard } from '../../components/molecules';
import { Spinner, Button } from '../../components/atoms';
import { formatRupiah } from '../../lib/format';

export default function SalesDashboardPage() {
  const { data: summary, isLoading } = useQuery<any>({
    queryKey: ['stats', 'summary'],
    queryFn: () => apiFetch('/stats/summary'),
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h2 font-h2 text-primary">Sales Dashboard</h1>
        <p className="text-on-surface-variant text-body-md">Pantau performa penjualan dan hubungan klien Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Pendapatan Saya" 
          value={formatRupiah(summary?.totalRevenue || 0)} 
          icon="payments" 
        />
        <StatCard 
          title="Pesanan Saya" 
          value={summary?.orderCount || 0} 
          icon="shopping_cart" 
        />
        <StatCard 
          title="Klien Saya" 
          value={summary?.clientCount || 0} 
          icon="groups" 
        />
        <StatCard 
          title="Total Produk" 
          value={summary?.productCount || 0} 
          icon="inventory_2" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Button as={Link} to="/orders/new" className="w-full" leftIcon="add_shopping_cart">Buat Pesanan Baru</Button>
        <Button as={Link} to="/clients" variant="outline" className="w-full" leftIcon="person_add">Data Klien</Button>
        <Button as={Link} to="/visits" variant="outline" className="w-full" leftIcon="location_on">Catat Kunjungan</Button>
      </div>

      <div className="bg-surface-container-low border border-primary/10 rounded-xl p-6 shadow-sm flex items-center gap-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined text-4xl">emoji_events</span>
        </div>
        <div>
          <h3 className="font-bold text-on-surface">Target Bulan Ini</h3>
          <p className="text-sm text-on-surface-variant">Capai minimal 4 closing bulan ini untuk mendapatkan bonus KPI sebesar 20 poin!</p>
        </div>
      </div>
    </div>
  );
}
