import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Spinner, Badge, Button } from '../../components/atoms';
import { formatDate } from '../../lib/format';
import { ShoppingBag, Star, Clock, Gift, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RewardsPage() {
  const queryClient = useQueryClient();
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const { data: products, isLoading: loadingProducts } = useQuery<any[]>({ 
    queryKey: ['rewards', 'products'], 
    queryFn: () => apiFetch('/rewards/products') 
  });

  const { data: stats, isLoading: loadingStats } = useQuery<any>({ 
    queryKey: ['gamification', 'stats'], 
    queryFn: () => apiFetch('/gamification/my-stats') 
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<any[]>({ 
    queryKey: ['rewards', 'orders'], 
    queryFn: () => apiFetch('/rewards/orders') 
  });

  const redeemMutation = useMutation({
    mutationFn: (productId: string) => apiFetch('/rewards/redeem', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity: 1 })
    }),
    onSuccess: () => {
      toast.success('Penukaran poin berhasil!');
      queryClient.invalidateQueries({ queryKey: ['gamification', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['rewards', 'orders'] });
      setRedeemingId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menukar poin');
      setRedeemingId(null);
    }
  });

  if (loadingProducts || loadingStats || loadingOrders) return <Spinner />;

  const userPoints = stats?.points_balance || 0;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-h2 text-primary">Points & Rewards</h1>
          <p className="text-on-surface-variant text-body-md">Tukarkan poin kerja keras Anda dengan hadiah menarik!</p>
        </div>
        <div className="bg-gradient-to-br from-primary to-primary-container p-6 rounded-3xl text-on-primary shadow-lg border border-white/10 min-w-[240px] relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Star size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Saldo Poin Anda</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{userPoints.toLocaleString()}</span>
              <span className="text-sm opacity-80">pts</span>
            </div>
            <p className="text-xs mt-3 bg-white/20 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
              Keep earning from daily check-ins!
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rewards Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <Gift className="text-primary" size={24} />
            <h3 className="text-xl font-bold text-on-surface">Hadiah Tersedia</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products?.length === 0 ? (
              <div className="col-span-2 text-center py-20 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant">
                <ShoppingBag className="mx-auto text-on-surface-variant/30 mb-4" size={48} />
                <p className="text-on-surface-variant">Belum ada hadiah yang tersedia saat ini.</p>
              </div>
            ) : products?.map((product) => {
              const canAfford = userPoints >= product.price_points;
              const hasStock = product.stock > 0;
              
              return (
                <div key={product.id} className="bg-surface-container-lowest border border-outline-variant rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                  <div className="h-48 bg-surface-container-low relative overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20">
                        <Gift size={64} />
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <Badge variant={hasStock ? 'success' : 'error'}>
                        {hasStock ? `Stok: ${product.stock}` : 'Habis'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div>
                      <h4 className="font-bold text-lg text-on-surface line-clamp-1">{product.name}</h4>
                      <p className="text-sm text-on-surface-variant line-clamp-2 h-10">{product.description || 'Tidak ada deskripsi.'}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 text-primary">
                        <Star size={18} className="fill-current" />
                        <span className="text-xl font-bold">{product.price_points.toLocaleString()}</span>
                        <span className="text-xs font-medium text-on-surface-variant ml-1">poin</span>
                      </div>
                      
                      <Button 
                        onClick={() => redeemMutation.mutate(product.id)}
                        disabled={!canAfford || !hasStock || redeemMutation.isPending}
                        loading={redeemMutation.isPending && redeemingId === product.id}
                        variant={canAfford ? 'primary' : 'outline'}
                        size="sm"
                        className="rounded-xl px-6"
                      >
                        {!hasStock ? 'Habis' : !canAfford ? 'Poin Kurang' : 'Tukar'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Redemption History */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Clock className="text-primary" size={24} />
            <h3 className="text-xl font-bold text-on-surface">Riwayat Penukaran</h3>
          </div>
          
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-sm min-h-[400px]">
            <div className="space-y-4">
              {orders?.length === 0 ? (
                <div className="text-center py-20 text-on-surface-variant/30">
                  <CheckCircle2 className="mx-auto mb-4" size={48} />
                  <p className="text-sm">Anda belum pernah menukarkan hadiah.</p>
                </div>
              ) : orders?.map((order) => (
                <div key={order.id} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/50 space-y-2">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-sm text-on-surface">{order.product_name}</p>
                    <Badge variant={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'error' : 'warning'}>
                      {order.status === 'completed' ? 'Selesai' : order.status === 'cancelled' ? 'Dibatalkan' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-on-surface-variant">
                    <span>{formatDate(order.created_at)}</span>
                    <span className="font-bold">{order.total_points} Poin</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
