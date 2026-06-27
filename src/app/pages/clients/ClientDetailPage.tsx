import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import type { Client, ClientAddress } from '../../../shared/types';
import { Button, Input, Spinner } from '../../components/atoms';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ClientAddress | null>(null);
  const [addressLabel, setAddressLabel] = useState('');
  const [addressValue, setAddressValue] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressIsDefault, setAddressIsDefault] = useState(false);

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ['clients', id],
    queryFn: () => apiFetch(`/clients/${id}`),
    enabled: !isNew,
  });

  const { data: addresses, refetch: refetchAddresses } = useQuery<ClientAddress[]>({
    queryKey: ['client-addresses', id],
    queryFn: () => apiFetch(`/client-addresses?client_id=${id}`),
    enabled: !isNew,
  });

  const addAddressMutation = useMutation({
    mutationFn: (data: any) => apiFetch('/client-addresses', {
      method: 'POST',
      body: JSON.stringify({ ...data, client_id: id }),
    }),
    onSuccess: () => {
      refetchAddresses();
      setShowAddressModal(false);
      resetAddressForm();
      toast.success('Alamat berhasil ditambahkan');
    },
    onError: () => toast.error('Gagal menambahkan alamat'),
  });

  const updateAddressMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/client-addresses/${data.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, client_id: id }),
    }),
    onSuccess: () => {
      refetchAddresses();
      setShowAddressModal(false);
      resetAddressForm();
      toast.success('Alamat berhasil diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui alamat'),
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (addressId: string) => apiFetch(`/client-addresses/${addressId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      refetchAddresses();
      toast.success('Alamat berhasil dihapus');
    },
    onError: () => toast.error('Gagal menghapus alamat'),
  });

  const resetAddressForm = () => {
    setEditingAddress(null);
    setAddressLabel('');
    setAddressValue('');
    setAddressCity('');
    setAddressIsDefault(false);
  };

  const handleEditAddress = (addr: ClientAddress) => {
    setEditingAddress(addr);
    setAddressLabel(addr.label);
    setAddressValue(addr.address);
    setAddressCity(addr.city || '');
    setAddressIsDefault(addr.is_default === 1);
    setShowAddressModal(true);
  };

  const handleSaveAddress = () => {
    if (!addressLabel || !addressValue) {
      toast.error('Label dan Alamat wajib diisi');
      return;
    }
    const payload = {
      label: addressLabel,
      address: addressValue,
      city: addressCity,
      is_default: addressIsDefault ? 1 : 0,
    };
    if (editingAddress) {
      updateAddressMutation.mutate({ ...payload, id: editingAddress.id });
    } else {
      addAddressMutation.mutate(payload);
    }
  };

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Partial<Client>>();

  useEffect(() => {
    if (client) reset(client);
  }, [client, reset]);

  const mutation = useMutation({
    mutationFn: (data: Partial<Client>) => {
      return apiFetch(isNew ? '/clients' : `/clients/${id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(isNew ? 'Klien berhasil ditambahkan' : 'Data klien diperbarui');
      if (isNew) navigate('/clients');
    },
    onError: () => {
      toast.error('Gagal menyimpan data klien');
    }
  });

  if (isLoading && !isNew) return <Spinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate('/clients')} variant="ghost" size="sm" leftIcon="arrow_back" />
        <div>
          <h1 className="text-h2 font-h2 text-primary">
            {isNew ? 'Tambah Klien Baru' : client?.company_name}
          </h1>
          <p className="text-on-surface-variant text-body-md">
            {isNew ? 'Lengkapi informasi untuk mendaftarkan klien baru.' : `ID: ${client?.id}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Nama Perusahaan" 
              placeholder="Contoh: PT. Maju Jaya"
              {...register('company_name', { required: 'Nama perusahaan wajib diisi' })}
              error={errors.company_name?.message}
            />
            <Input 
              label="Nama PIC" 
              placeholder="Contoh: Bpk. Ahmad"
              {...register('pic_name', { required: 'Nama PIC wajib diisi' })}
              error={errors.pic_name?.message}
            />
            <Input 
              label="Nama Owner" 
              placeholder="Contoh: Bpk. Hermawan"
              {...register('owner_name')}
            />
            <Input 
              label="WhatsApp PIC" 
              placeholder="Contoh: 08123456789"
              {...register('pic_phone')}
            />
            <Input 
              label="Email PIC" 
              type="email"
              placeholder="pic@perusahaan.com"
              {...register('pic_email')}
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-outline-variant">
            <h3 className="text-label-md text-on-surface uppercase tracking-wider">Informasi Alamat</h3>
            <Input 
              label="Alamat Lengkap" 
              placeholder="Jl. Raya No. 123..."
              {...register('address')}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Kota" 
                placeholder="Contoh: Jakarta"
                {...register('city')}
              />
              <Input 
                label="Catatan Tambahan" 
                placeholder="Informasi khusus klien..."
                {...register('notes')}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/clients')}>
            Batal
          </Button>
          <Button 
            type="submit" 
            loading={mutation.isPending} 
            disabled={!isDirty && !isNew}
            leftIcon="save"
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>

      {!isNew && (
        <>
          <div className="pt-8 space-y-6">
            <div className="flex justify-between items-center border-b border-outline-variant pb-2">
              <h3 className="text-h3 font-h3 text-on-surface">Daftar Alamat Pengiriman</h3>
              <Button 
                type="button" 
                onClick={() => {
                  resetAddressForm();
                  setShowAddressModal(true);
                }} 
                size="sm" 
                leftIcon="add"
              >
                Tambah Alamat
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses && addresses.length > 0 ? (
                addresses.map((addr) => (
                  <div key={addr.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-sm text-on-surface">{addr.label}</p>
                        {addr.is_default === 1 && (
                          <span className="text-[10px] bg-success-container text-on-success-container px-2 py-0.5 rounded font-bold uppercase">Default</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{addr.address}</p>
                      {addr.city && (
                        <p className="text-xs font-semibold text-on-surface-variant mt-1">Kota: {addr.city}</p>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-2 border-t border-outline-variant/30 pt-3">
                      {addr.is_default !== 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateAddressMutation.mutate({ ...addr, is_default: 1 })}
                          loading={updateAddressMutation.isPending}
                          className="text-[10px]"
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAddress(addr)}
                        leftIcon="edit"
                        className="text-[10px]"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('Hapus alamat pengiriman ini?')) {
                            deleteAddressMutation.mutate(addr.id);
                          }
                        }}
                        leftIcon="delete"
                        className="text-error hover:bg-error/5 text-[10px]"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant italic text-sm">
                  Belum ada alamat pengiriman tambahan.
                </div>
              )}
            </div>
          </div>

          <div className="pt-8 space-y-4">
            <h3 className="text-h3 font-h3 text-on-surface">Riwayat Pesanan</h3>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant italic">
              Fitur riwayat pesanan akan tersedia setelah modul Pesanan diimplementasikan.
            </div>
          </div>
        </>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-h3 font-h3 text-primary">
                {editingAddress ? 'Edit Alamat Pengiriman' : 'Tambah Alamat Pengiriman'}
              </h3>
              <Button onClick={() => { setShowAddressModal(false); resetAddressForm(); }} variant="ghost" size="sm" leftIcon="close" />
            </div>
            
            <div className="space-y-4">
              <Input 
                label="Label Alamat" 
                placeholder="Contoh: Gudang Utama, Kantor Cabang" 
                value={addressLabel} 
                onChange={(e) => setAddressLabel(e.target.value)}
              />
              <Input 
                label="Alamat Lengkap" 
                placeholder="Jalan, No, RT/RW, Kecamatan, Kelurahan" 
                value={addressValue} 
                onChange={(e) => setAddressValue(e.target.value)}
              />
              <Input 
                label="Kota" 
                placeholder="Contoh: Tangerang" 
                value={addressCity} 
                onChange={(e) => setAddressCity(e.target.value)}
              />
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input 
                  type="checkbox" 
                  checked={addressIsDefault} 
                  onChange={(e) => setAddressIsDefault(e.target.checked)}
                  className="rounded border-outline-variant text-primary focus:ring-primary"
                />
                <span className="text-sm font-semibold text-on-surface">Jadikan Alamat Default</span>
              </label>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={() => { setShowAddressModal(false); resetAddressForm(); }} variant="outline" className="flex-1">Batal</Button>
                <Button 
                  onClick={handleSaveAddress}
                  loading={addAddressMutation.isPending || updateAddressMutation.isPending}
                  className="flex-1"
                >
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
