import { useAuth } from '../../hooks/useAuth';
import { Avatar, Button, Input } from '../../components/atoms';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <Avatar name={user.full_name} src={user.avatar_url} size="xl" className="mx-auto border-4 border-primary/10" />
        <div>
          <h1 className="text-h2 font-h2 text-primary">{user.full_name}</h1>
          <p className="text-on-surface-variant font-bold uppercase tracking-widest text-xs">{user.role}</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm space-y-6">
        <h3 className="font-bold text-on-surface border-b border-outline-variant pb-2">Informasi Akun</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Nama Lengkap" value={user.full_name} disabled />
          <Input label="Email" value={user.email} disabled />
          <Input label="Role Akses" value={user.role.toUpperCase()} disabled />
          <Input label="Status" value="Aktif" disabled />
        </div>
        
        <div className="pt-6 flex justify-end gap-4">
          <Button variant="outline">Ubah Password</Button>
          <Button>Simpan Perubahan</Button>
        </div>
      </div>

      <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/50">
        <h4 className="text-sm font-bold text-on-surface mb-2">Keamanan Sesi</h4>
        <p className="text-xs text-on-surface-variant mb-4">Sesi Anda aktif untuk 24 jam ke depan. Jangan berikan akses akun Anda kepada orang lain.</p>
        <Button variant="danger" size="sm" onClick={() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }}>Keluar dari Sistem</Button>
      </div>
    </div>
  );
}
