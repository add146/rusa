import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import type { Product } from '../../../shared/types';
import { Button, Spinner, Badge, ImageLightbox } from '../../components/atoms';
import { SearchBar, EmptyState } from '../../components/molecules';
import { useRole } from '../../hooks/useAuth';
import { formatRupiah } from '../../lib/format';
import { toast } from 'sonner';

export default function ProductListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { isOwner, isAdmin } = useRole();

  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => apiFetch('/products'),
  });

  const filteredProducts = products?.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <Spinner />;
  if (error) {
    toast.error('Gagal mengambil data produk');
    return <EmptyState title="Error" description="Terjadi kesalahan." icon="error" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-h2 font-h2 text-primary">Master Produk</h1>
          <p className="text-on-surface-variant text-body-md">Kelola katalog produk haji dan umroh.</p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <Button as={Link} to="/products/hpp" variant="outline" leftIcon="calculate">
              HPP Manager
            </Button>
          )}
          {(isOwner || isAdmin) && (
            <Button as={Link} to="/products/new" leftIcon="add_shopping_cart">
              Tambah Produk
            </Button>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
          <SearchBar 
            placeholder="Cari SKU atau nama produk..." 
            onSearch={setSearchTerm}
            className="w-full max-w-md"
          />
        </div>

        <div className="overflow-x-auto">
          {filteredProducts && filteredProducts.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-label-md text-on-surface-variant uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Produk</th>
                  <th className="px-6 py-4 font-bold">Kategori</th>
                  <th className="px-6 py-4 font-bold">Satuan</th>
                  <th className="px-6 py-4 font-bold">Harga Publish</th>
                  {isOwner && <th className="px-6 py-4 font-bold">HPP Base</th>}
                  <th className="px-6 py-4 font-bold">Status</th>
                  {(isOwner || isAdmin) && <th className="px-6 py-4 font-bold text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-surface-container-low/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center text-on-surface-variant overflow-hidden border border-outline-variant">
                          {product.image_url ? (
                            <ImageLightbox src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined">inventory_2</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{product.name}</p>
                          <p className="text-xs text-on-surface-variant font-mono uppercase">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-on-surface">{product.category || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-on-surface">{product.unit}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-on-surface">
                      {product.publish_price ? formatRupiah(product.publish_price) : '-'}
                    </td>
                    {isOwner && (
                      <td className="px-6 py-4 font-semibold text-primary">
                        {product.hpp_base ? formatRupiah(product.hpp_base) : '-'}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <Badge variant={product.is_active ? 'success' : 'neutral'} pill>
                        {product.is_active ? 'Aktif' : 'Non-aktif'}
                      </Badge>
                    </td>
                    {(isOwner || isAdmin) && (
                      <td className="px-6 py-4 text-right">
                        <Link 
                          to={`/products/${product.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-on-surface-variant hover:bg-primary-container hover:text-on-primary transition-all"
                        >
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState 
              title="Tidak ada produk" 
              description={searchTerm ? `Pencarian "${searchTerm}" tidak ditemukan.` : "Katalog produk masih kosong."}
              icon="inventory_2"
            />
          )}
        </div>
      </div>
    </div>
  );
}
