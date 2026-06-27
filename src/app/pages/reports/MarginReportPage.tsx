import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { StatCard } from '../../components/molecules';
import { Spinner } from '../../components/atoms';
import { formatRupiah } from '../../lib/format';

export default function MarginReportPage() {
  const { data: margin, isLoading } = useQuery<any>({
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

  if (isLoading || isLoadingProducts || isLoadingOrders) return <Spinner />;

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h2 font-h2 text-primary">Laporan Margin & Profit</h1>
        <p className="text-on-surface-variant text-body-md">Analisis keuntungan bisnis berdasarkan HPP vs Harga Publish (Katalog) dan Harga Deal (Pesanan).</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        <div className="p-6 border-b border-outline-variant flex items-center justify-between">
          <div>
            <h3 className="font-bold text-on-surface">Margin Potensi per Produk (Katalog)</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Analisis berdasarkan Harga Publish yang diset di katalog</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 rounded-full border border-green-200 font-medium">● Sehat ≥30%</span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 rounded-full border border-amber-200 font-medium">● Rendah 15-30%</span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-700 rounded-full border border-red-200 font-medium">● Kritis &lt;15%</span>
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
                  <th className="px-6 py-3 text-center text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Margin %</th>
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
  );
}
