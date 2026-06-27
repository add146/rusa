import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/templates/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json() as any;

      if (!res.ok) {
        throw new Error(data.error || 'Gagal masuk. Periksa email dan password Anda.');
      }

      login(data.token);
      toast.success(`Selamat datang, ${data.user.full_name}!`);
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Gagal masuk. Periksa kembali email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-label-md text-on-surface" htmlFor="email">
            Email Perusahaan
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              mail
            </span>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@rusamas.com"
              className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-default focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-label-md text-on-surface" htmlFor="password">
              Password
            </label>
            <a href="#" className="text-[12px] font-bold text-primary hover:underline">
              Lupa Password?
            </a>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              lock
            </span>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-default focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 py-1">
          <input type="checkbox" id="remember" className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
          <label htmlFor="remember" className="text-sm text-on-surface-variant">Ingat saya di perangkat ini</label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 bg-primary-container text-on-primary rounded-default text-label-md hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              Memproses...
            </>
          ) : (
            'Masuk ke Dashboard'
          )}
        </button>

        <div className="pt-2 text-center">
          <p className="text-sm text-on-surface-variant">
            {/* Kendala akses dihilangkan sesuai request */}
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
