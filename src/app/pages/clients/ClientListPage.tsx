import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import type { Client } from '../../../shared/types';
import { Button, Spinner } from '../../components/atoms';
import { SearchBar, EmptyState } from '../../components/molecules';
import { toast } from 'sonner';

export default function ClientListPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: clients, isLoading, error } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => apiFetch('/clients'),
  });

  const filteredClients = clients?.filter(client => 
    client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.pic_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <Spinner />;
  if (error) {
    toast.error('Gagal mengambil data klien');
    return <EmptyState title="Error" description="Terjadi kesalahan saat memuat data." icon="error" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-h2 font-h2 text-primary">Master Klien</h1>
          <p className="text-on-surface-variant text-body-md">Kelola data pelanggan dan informasi kontak.</p>
        </div>
        <div className="flex gap-2">
          <Button as={Link} to="/clients/import" variant="outline" leftIcon="upload">
            Import CSV
          </Button>
          <Button as={Link} to="/clients/new" leftIcon="person_add">
            Tambah Klien
          </Button>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
          <SearchBar 
            placeholder="Cari perusahaan atau PIC..." 
            onSearch={setSearchTerm}
            className="w-full max-w-md"
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon="filter_list">Filter</Button>
            <Button variant="outline" size="sm" leftIcon="download">Export</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredClients && filteredClients.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-label-md text-on-surface-variant uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Nama Perusahaan</th>
                  <th className="px-6 py-4 font-bold">PIC / Kontak</th>
                  <th className="px-6 py-4 font-bold">Kota</th>
                  <th className="px-6 py-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-surface-container-low/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-on-surface">{client.company_name}</p>
                      <p className="text-xs text-on-surface-variant line-clamp-1">{client.address || 'Tanpa alamat'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-on-surface">{client.pic_name}</span>
                        <span className="text-xs text-on-surface-variant">{client.pic_phone || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-on-surface">{client.city || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/clients/${client.id}`}
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
              title="Tidak ada klien" 
              description={searchTerm ? `Pencarian "${searchTerm}" tidak ditemukan.` : "Mulai dengan menambahkan klien baru."}
              icon="person_search"
              actionLabel={searchTerm ? undefined : "Tambah Klien"}
              onAction={() => setSearchTerm('')}
            />
          )}
        </div>
        
        <div className="p-4 border-t border-outline-variant bg-surface-container-low flex items-center justify-between text-xs text-on-surface-variant">
          <p>Menampilkan {filteredClients?.length || 0} dari {clients?.length || 0} klien</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>Prev</Button>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
