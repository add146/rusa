import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { StatCard } from '../../components/molecules';
import { Spinner } from '../../components/atoms';
import { formatRupiah, formatDate } from '../../lib/format';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

export default function OwnerDashboardPage() {
  const { data: summary, isLoading: isLoadingSummary } = useQuery<any>({
    queryKey: ['stats', 'summary'],
    queryFn: () => apiFetch('/stats/summary'),
  });

  const { data: margin, isLoading: isLoadingMargin } = useQuery<any>({
    queryKey: ['stats', 'margin'],
    queryFn: () => apiFetch('/stats/margin'),
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery<any[]>({
    queryKey: ['products', 'margin'],
    queryFn: () => apiFetch('/products?limit=100'),
  });

  const { data: orderMargins, isLoading: isLoadingOrders } = useQuery<any[]>({
    queryKey: ['stats', 'margin-orders'],
    queryFn: () => apiFetch('/stats/margin-orders'),
  });

  const { data: recentPayments, isLoading: isLoadingPayments } = useQuery<any[]>({
    queryKey: ['payments', 'recent'],
    queryFn: () => apiFetch('/payments'),
  });

  if (isLoadingSummary || isLoadingMargin || isLoadingProducts || isLoadingOrders || isLoadingPayments) return <Spinner />;

  // Filter produk yang punya HPP dan harga publish
  const productsWithMargin = (products || []).filter(
    (p: any) => p.hpp_base > 0 && p.publish_price > 0
  ).map((p: any) => ({
    ...p,
    margin: p.publish_price - p.hpp_base,
    marginPct: ((p.publish_price - p.hpp_base) / p.publish_price) * 100,
  })).sort((a: any, b: any) => b.marginPct - a.marginPct);

  const avgMargin = productsWithMargin.length > 0
    ? productsWithMargin.reduce((s: number, p: any) => s + p.marginPct, 0) / productsWithMargin.length
    : 0;

  const getMarginBadge = (pct: number) => {
    if (pct >= 30) return 'bg-green-100 text-green-700 border-green-200';
    if (pct >= 15) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'shipped': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  // Generate real revenue growth chart data
  const chartData = (() => {
    if (!orderMargins || orderMargins.length === 0) return [];
    
    // Sort orderMargins by date ascending
    const sorted = [...orderMargins].sort((a, b) => {
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

    // Group by month
    const monthlyGroups: Record<string, number> = {};
    sorted.forEach(o => {
      if (!o.created_at) return;
      const date = new Date(o.created_at);
      const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyGroups[label] = (monthlyGroups[label] || 0) + o.total_revenue;
    });

    // If grouping by month results in only 1 data point, group by date instead for better visualization
    if (Object.keys(monthlyGroups).length <= 1) {
      const dailyGroups: Record<string, number> = {};
      sorted.forEach(o => {
        if (!o.created_at) return;
        const date = new Date(o.created_at);
        const label = date.toLocaleDateString('default', { day: '2-digit', month: '2-digit' });
        dailyGroups[label] = (dailyGroups[label] || 0) + o.total_revenue;
      });
      return Object.entries(dailyGroups).map(([name, value]) => ({ name, value }));
    }

    return Object.entries(monthlyGroups).map(([name, value]) => ({ name, value }));
  })();

  // Aggregate real activities from payments and order margins
  const activities = (() => {
    const list: { type: 'payment' | 'order'; title: string; subtitle: string; date: string; icon: string; color: string }[] = [];
    
    if (recentPayments) {
      recentPayments.forEach((p: any) => {
        let statusText = 'dikirim';
        let color = 'bg-amber-100 text-amber-700';
        let icon = 'schedule';
        
        if (p.status === 'verified') {
          statusText = 'diverifikasi';
          color = 'bg-green-15 text-green-700';
          icon = 'check';
        } else if (p.status === 'rejected') {
          statusText = 'ditolak';
          color = 'bg-red-15 text-red-700';
          icon = 'close';
        }

        list.push({
          type: 'payment',
          title: `Pembayaran ${p.type?.toUpperCase()} ${statusText}`,
          subtitle: `${p.order?.client?.company_name || 'Klien'} - ${formatRupiah(p.amount)}`,
          date: p.created_at || p.payment_date || new Date().toISOString(),
          icon,
          color
        });
      });
    }

    if (orderMargins) {
      orderMargins.forEach((o: any) => {
        list.push({
          type: 'order',
          title: `Pesanan Baru ${o.order_number}`,
          subtitle: `Status: ${o.status.toUpperCase()} - Nilai: ${formatRupiah(o.total_revenue)}`,
          date: o.created_at || new Date().toISOString(),
          icon: 'shopping_cart',
          color: 'bg-blue-15 text-blue-700'
        });
      });
    }

    // Sort by date descending and get top 5
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  })();

  const formatYAxis = (v: number) => {
    if (v >= 1000000000) {
      const val = v / 1000000000;
      const formatted = new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 2
      }).format(val);
      return `Rp ${formatted} M`;
    }
    if (v >= 1000000) {
      const val = v / 1000000;
      const formatted = new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 2
      }).format(val);
      return `Rp ${formatted} Jt`;
    }
    if (v >= 1000) {
      const val = v / 1000;
      const formatted = new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 2
      }).format(val);
      return `Rp ${formatted} Rb`;
    }
    return `Rp ${v}`;
  };

  return (
    <div className="space-y-10 pb-12">
      {/* SECTION 1: EXECUTIVE OVERVIEW */}
      <div className="space-y-6">
        <div>
          <h1 className="text-h2 font-h2 text-primary">Executive Dashboard</h1>
          <p className="text-on-surface-variant text-body-md">Ringkasan performa bisnis Rusamas ERP secara keseluruhan.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Pendapatan" 
            value={formatRupiah(summary?.totalRevenue || 0)} 
            icon="payments" 
            trend={{ value: '12%', isUp: true }}
          />
          <StatCard 
            title="Total Pesanan" 
            value={summary?.orderCount || 0} 
            icon="shopping_cart" 
            trend={{ value: '5%', isUp: true }}
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Real Area Chart */}
          <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="font-bold text-on-surface text-sm uppercase tracking-wider mb-4">Grafik Pertumbuhan Pendapatan</h3>
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-on-surface-variant/20 italic h-[220px]">
                  <span className="material-symbols-outlined text-6xl mb-2">analytics</span>
                  Belum ada data grafik
                </div>
              ) : (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0B57D0" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0B57D0" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E3E3" />
                      <XAxis dataKey="name" stroke="#5E5E5E" fontSize={10} tickLine={false} />
                      <YAxis stroke="#5E5E5E" fontSize={10} tickLine={false} tickFormatter={formatYAxis} />
                      <Tooltip formatter={(value) => [formatRupiah(value as number), 'Pendapatan']} />
                      <Area type="monotone" dataKey="value" stroke="#0B57D0" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Real Recent Activities */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="font-bold text-on-surface text-sm uppercase tracking-wider mb-4">Aktivitas Terkini</h3>
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-on-surface-variant/30 italic py-12 text-xs">
                  <span className="material-symbols-outlined text-4xl mb-2">history</span>
                  Belum ada aktivitas terbaru
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((act, i) => (
                    <div key={i} className="flex gap-3 items-start text-left">
                      <div className={`w-8 h-8 ${act.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className="material-symbols-outlined text-sm">{act.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-on-surface truncate">{act.title}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">{act.subtitle}</p>
                        <p className="text-[9px] text-on-surface-variant/60">{formatDate(act.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <hr className="border-outline-variant/60" />

      {/* SECTION 2: MARGIN & PROFITABILITY REPORT */}
      <div className="space-y-6">
        <div>
          <h2 className="text-h3 font-h3 text-primary">Laporan Margin & Profitabilitas</h2>
          <p className="text-on-surface-variant text-body-md">Analisis keuntungan bisnis berdasarkan HPP vs Harga Publish (Katalog) dan Harga Deal (Pesanan).</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Penjualan" value={formatRupiah(margin?.revenue || 0)} icon="sell" />
          <StatCard title="Total Modal (HPP)" value={formatRupiah(margin?.cost || 0)} icon="account_balance_wallet" />
          <StatCard
            title="Laba Kotor"
            value={formatRupiah(margin?.profit || 0)}
            icon="monetization_on"
            trend={{ value: `${margin?.marginPercentage?.toFixed(1) || 0}% Margin`, isUp: (margin?.marginPercentage || 0) >= 30 }}
          />
          <StatCard
            title="Rata-rata Margin Produk"
            value={`${avgMargin.toFixed(1)}%`}
            icon="percent"
            trend={{ value: productsWithMargin.length + ' produk terkonfigurasi', isUp: avgMargin >= 30 }}
          />
        </div>

        {/* Per-Order Realized Margin Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-outline-variant">
            <h3 className="font-bold text-on-surface">Margin Realisasi per Pesanan</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Keuntungan aktual berdasarkan harga deal di setiap pesanan</p>
          </div>

          {orderMargins?.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 block text-on-surface-variant/30">shopping_cart</span>
              <p className="text-sm">Belum ada data pesanan untuk dihitung marginnya.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">No. Pesanan</th>
                    <th className="px-6 py-3 text-center text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total Deal</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total HPP</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Laba Kotor</th>
                    <th className="px-6 py-3 text-center text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {orderMargins?.map((o: any) => (
                    <tr key={o.order_id} className="hover:bg-surface-container/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm text-primary">{o.order_number}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadge(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-on-surface">
                        {formatRupiah(o.total_revenue)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-on-surface-variant">
                        {formatRupiah(o.total_cost)}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono text-sm font-bold ${o.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {formatRupiah(o.profit)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getMarginBadge(o.margin_pct)}`}>
                          {o.margin_pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Per-Product Margin Table (Catalog) */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-on-surface">Margin Potensi per Produk (Katalog)</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Analisis berdasarkan Harga Publish yang diset di katalog</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] sm:text-xs">
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200 font-medium">● Sehat ≥30%</span>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200 font-medium">● Rendah 15-30%</span>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full border border-red-200 font-medium">● Kritis &lt;15%</span>
            </div>
          </div>

          {productsWithMargin.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 block text-on-surface-variant/30">inventory_2</span>
              <p className="text-sm">Belum ada produk dengan HPP dan Harga Publish yang dikonfigurasi.</p>
              <p className="text-xs mt-1">Buka halaman Produk dan isi kolom HPP Base serta Harga Publish.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Produk</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">HPP Modal</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Harga Publish</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Laba / unit</th>
                    <th className="px-6 py-3 text-center text-[11px] font-bold text-on-surface-wider">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {productsWithMargin.map((p: any) => (
                    <tr key={p.id} className="hover:bg-surface-container/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">inventory_2</span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-sm text-on-surface">{p.name}</p>
                            <p className="text-[11px] text-on-surface-variant">{p.category || 'Tanpa Kategori'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-surface-container px-2 py-1 rounded">{p.sku}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-on-surface-variant">
                        {formatRupiah(p.hpp_base)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-on-surface">
                        {formatRupiah(p.publish_price)}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono text-sm font-bold ${p.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {p.margin >= 0 ? '+' : ''}{formatRupiah(p.margin)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getMarginBadge(p.marginPct)}`}>
                          {p.marginPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Confidential Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4">
          <span className="material-symbols-outlined text-amber-600">warning</span>
          <div className="text-xs text-amber-800 italic">
            Laporan ini bersifat <strong>RAHASIA</strong> dan hanya dapat diakses oleh akun Owner. Data HPP adalah informasi sensitif bisnis. Pastikan Anda tidak membagikan halaman ini kepada pihak luar.
          </div>
        </div>
      </div>
    </div>
  );
}
