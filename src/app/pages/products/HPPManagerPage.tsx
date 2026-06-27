import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import type { Product } from '../../../shared/types';
import { Button, Spinner, Input } from '../../components/atoms';
import { toast } from 'sonner';
import { useState } from 'react';
import { formatRupiah } from '../../lib/format';

export default function HPPManagerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editedHpp, setEditedHpp] = useState<Record<string, number>>({});

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => apiFetch('/products'),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      // In a real app, we'd have a bulk update endpoint.
      // For now, we simulate multiple requests or just log the intent.
      const promises = Object.entries(editedHpp).map(([id, hpp]) => 
        apiFetch(`/products/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ hpp_base: hpp }),
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Harga HPP berhasil diperbarui');
      setEditedHpp({});
    },
    onError: () => {
      toast.error('Gagal memperbarui HPP');
    }
  });

  const handleHppChange = (id: string, value: string) => {
    const num = parseFloat(value) || 0;
    setEditedHpp(prev => ({ ...prev, [id]: num }));
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-h2 font-h2 text-primary">HPP Manager</h1>
          <p className="text-on-surface-variant text-body-md">Perbarui harga modal dasar untuk seluruh produk.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/products')}>Batal</Button>
          <Button 
            disabled={Object.keys(editedHpp).length === 0} 
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
            leftIcon="done_all"
          >
            Simpan Semua Perubahan
          </Button>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-label-md text-on-surface-variant uppercase tracking-wider">
              <th className="px-6 py-4 font-bold">Produk</th>
              <th className="px-6 py-4 font-bold">SKU</th>
              <th className="px-6 py-4 font-bold">HPP Lama</th>
              <th className="px-6 py-4 font-bold w-[200px]">HPP Baru (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {products?.map((product) => (
              <tr key={product.id} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="px-6 py-4 font-semibold text-on-surface">{product.name}</td>
                <td className="px-6 py-4 text-sm font-mono text-on-surface-variant">{product.sku}</td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  {formatRupiah(product.hpp_base || 0)}
                </td>
                <td className="px-6 py-4">
                  <Input 
                    type="number"
                    value={editedHpp[product.id] ?? product.hpp_base ?? ''}
                    onChange={(e) => handleHppChange(product.id, e.target.value)}
                    className="!py-1.5 !text-sm border-primary/20 focus:border-primary"
                    containerClassName="!space-y-0"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
