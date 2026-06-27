import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { User } from '../../../shared/types';
import { Button, Spinner, Badge, Avatar, Input } from '../../components/atoms';
import { formatDate } from '../../lib/format';
import { useState } from 'react';
import { toast } from 'sonner';

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'sales' as any,
    phone: '',
    is_active: true
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => apiFetch('/auth/users'),
  });

  const registerMutation = useMutation({
    mutationFn: (data: any) => apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User berhasil dibuat');
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || 'Gagal membuat user')
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/auth/users/${editingUser?.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User berhasil diperbarui');
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || 'Gagal memperbarui user')
  });

  const closeModal = () => {
    setShowAddModal(false);
    setEditingUser(null);
    setFormData({ full_name: '', email: '', password: '', role: 'sales', phone: '', is_active: true });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '', // Kosongkan password saat edit
      role: user.role,
      phone: user.phone || '',
      is_active: user.is_active
    });
    setShowAddModal(true);
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-h2 font-h2 text-primary">Manajemen User</h1>
          <p className="text-on-surface-variant text-body-md">Kelola akses tim dan role pengguna.</p>
        </div>
        <Button leftIcon="person_add" onClick={() => setShowAddModal(true)}>Tambah User</Button>
      </div>

      {/* Add/Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-on-surface">
                {editingUser ? 'Edit User' : 'Tambah User Baru'}
              </h3>
              <button onClick={closeModal} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="space-y-4" onSubmit={(e) => { 
              e.preventDefault(); 
              if (editingUser) {
                const updateData = { ...formData };
                if (!updateData.password) delete (updateData as any).password;
                updateMutation.mutate(updateData);
              } else {
                registerMutation.mutate(formData); 
              }
            }}>
              <Input 
                label="Nama Lengkap" 
                required 
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Contoh: Ahmad Zakaria"
              />
              <Input 
                label="Email Perusahaan" 
                type="email" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@rusamas.com"
              />
              <Input 
                label={editingUser ? "Password Baru (Kosongkan jika tidak ganti)" : "Password Sementara"} 
                type="password" 
                required={!editingUser}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimal 6 karakter"
              />
              <Input 
                label="Nomor WhatsApp" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="628123456789"
              />
              <div className="space-y-2">
                <label className="text-label-md text-on-surface">Role / Jabatan</label>
                <select 
                  className="w-full p-3 bg-surface border border-outline-variant rounded-default focus:ring-2 focus:ring-primary outline-none"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                >
                  <option value="admin">Admin</option>
                  <option value="sales">Sales / Lapangan</option>
                  <option value="produksi">Produksi / Bengkel</option>
                  <option value="staff">Staff (Hanya Absensi)</option>
                  <option value="desainer">Desainer / Creative</option>
                </select>
              </div>

              {editingUser && (
                <div className="flex items-center gap-2 py-2">
                  <input 
                    type="checkbox" 
                    id="is_active" 
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-on-surface">Akun Aktif</label>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <Button variant="outline" className="flex-1" type="button" onClick={closeModal}>Batal</Button>
                <Button className="flex-1" type="submit" loading={registerMutation.isPending || updateMutation.isPending}>
                  {editingUser ? 'Simpan Perubahan' : 'Buat Akun'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-label-md text-on-surface-variant uppercase tracking-wider">
              <th className="px-6 py-4 font-bold">User</th>
              <th className="px-6 py-4 font-bold">Role</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold">Login Terakhir</th>
              <th className="px-6 py-4 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {users?.map((user) => (
              <tr key={user.id} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <Avatar name={user.full_name} src={user.avatar_url} size="sm" />
                  <div>
                    <p className="font-bold text-on-surface text-sm">{user.full_name}</p>
                    <p className="text-xs text-on-surface-variant">{user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={user.role === 'owner' ? 'error' : 'info'} pill>
                    {user.role.toUpperCase()}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs font-medium">{user.is_active ? 'Aktif' : 'Nonaktif'}</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-on-surface-variant">
                  {user.last_login_at ? formatDate(user.last_login_at) : 'Belum pernah login'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                    onClick={() => handleEdit(user)}
                  >
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
