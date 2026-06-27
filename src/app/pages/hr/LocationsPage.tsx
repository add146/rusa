import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Button, Input, Spinner, Badge } from '../../components/atoms';
import { toast } from 'sonner';
import { useState } from 'react';

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: number;
}

export default function LocationsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: '100'
  });

  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => apiFetch('/locations'),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (editingId) {
        return apiFetch(`/locations/${editingId}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return apiFetch('/locations', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success(editingId ? 'Lokasi diperbarui' : 'Lokasi ditambahkan');
      closeModal();
    },
    onError: () => toast.error('Terjadi kesalahan')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/locations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Lokasi dihapus');
    },
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: '', latitude: '', longitude: '', radius_meters: '100' });
  };

  const handleEdit = (loc: Location) => {
    setEditingId(loc.id);
    setFormData({
      name: loc.name,
      latitude: loc.latitude.toString(),
      longitude: loc.longitude.toString(),
      radius_meters: loc.radius_meters.toString()
    });
    setShowModal(true);
  };

  const getCurrentLocation = () => {
    toast.info('Mengambil koordinat GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toString(),
          longitude: pos.coords.longitude.toString()
        }));
        toast.success('Koordinat berhasil diambil');
      },
      (err) => toast.error('Gagal mengambil lokasi: ' + err.message),
      { enableHighAccuracy: true }
    );
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-h2 font-h2 text-primary">Manajemen Lokasi GPS</h1>
          <p className="text-on-surface-variant text-body-md">Atur titik absensi untuk karyawan kantor.</p>
        </div>
        <Button onClick={() => setShowModal(true)} leftIcon="add_location">Tambah Lokasi</Button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Nama Lokasi</th>
              <th className="px-6 py-4">Koordinat</th>
              <th className="px-6 py-4">Radius</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {locations?.map((loc) => (
              <tr key={loc.id} className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-4 font-bold text-on-surface">{loc.name}</td>
                <td className="px-6 py-4 text-sm font-mono text-on-surface-variant">
                  {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                </td>
                <td className="px-6 py-4 text-sm">{loc.radius_meters}m</td>
                <td className="px-6 py-4">
                  <Badge variant={loc.is_active ? 'success' : 'neutral'}>
                    {loc.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(loc)} leftIcon="edit" />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-error border-error/20 hover:bg-error/10" 
                    onClick={() => confirm('Hapus lokasi ini?') && deleteMutation.mutate(loc.id)} 
                    leftIcon="delete" 
                  />
                </td>
              </tr>
            ))}
            {locations?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant italic">
                  Belum ada lokasi yang ditambahkan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-primary/5">
              <h3 className="text-xl font-bold text-primary">{editingId ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}</h3>
              <Button variant="ghost" leftIcon="close" onClick={closeModal} />
            </div>
            
            <div className="p-6 space-y-4">
              <Input 
                label="Nama Lokasi" 
                placeholder="Contoh: Kantor Pusat" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Latitude" 
                  value={formData.latitude}
                  onChange={e => setFormData({...formData, latitude: e.target.value})}
                />
                <Input 
                  label="Longitude" 
                  value={formData.longitude}
                  onChange={e => setFormData({...formData, longitude: e.target.value})}
                />
              </div>

              <Button 
                variant="outline" 
                className="w-full" 
                leftIcon="my_location" 
                onClick={getCurrentLocation}
                type="button"
              >
                Gunakan Lokasi Saya Saat Ini
              </Button>

              <Input 
                label="Radius Absensi (Meter)" 
                type="number"
                value={formData.radius_meters}
                onChange={e => setFormData({...formData, radius_meters: e.target.value})}
              />

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" className="flex-1" onClick={closeModal}>Batal</Button>
                <Button 
                  className="flex-1" 
                  loading={mutation.isPending}
                  onClick={() => mutation.mutate(formData)}
                  disabled={!formData.name || !formData.latitude || !formData.longitude}
                >
                  {editingId ? 'Update' : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
