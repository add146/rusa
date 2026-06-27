import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Button, Input, Spinner } from '../../components/atoms';
import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';

export default function WASettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    wa_base_url: '',
    wa_api_key: '',
    wa_instance_name: '',
  });

  // State for WhatsApp Connection
  const [waStatus, setWaStatus] = useState<'open' | 'close' | 'connecting' | 'unknown'>('unknown');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false);

  // State for Test Message
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('Halo! Ini adalah pesan uji coba dari Rusamas ERP.');

  const { data: remoteSettings, isLoading } = useQuery<any[]>({
    queryKey: ['settings'],
    queryFn: () => apiFetch('/settings'),
  });

  useEffect(() => {
    if (remoteSettings) {
      const s: any = {};
      remoteSettings.forEach(item => {
        if (['wa_base_url', 'wa_api_key', 'wa_instance_name'].includes(item.key)) {
          s[item.key] = item.value;
        }
      });
      setSettings(prev => ({ ...prev, ...s }));
    }
  }, [remoteSettings]);

  const fetchStatus = useCallback(async () => {
    if (!settings.wa_base_url || !settings.wa_instance_name) return;
    setIsFetchingStatus(true);
    try {
      const data = await apiFetch<any>('/settings/wa/status');
      setWaStatus(data.instance?.state || 'close');
      if (data.instance?.state === 'open') setQrCode(null);
    } catch (error) {
      setWaStatus('unknown');
    } finally {
      setIsFetchingStatus(false);
    }
  }, [settings.wa_base_url, settings.wa_instance_name]);

  useEffect(() => {
    if (settings.wa_base_url && settings.wa_instance_name) {
      fetchStatus();
    }
  }, [settings.wa_base_url, settings.wa_instance_name, fetchStatus]);

  const mutation = useMutation({
    mutationFn: (data: any) => apiFetch('/settings/bulk', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Pengaturan WhatsApp disimpan');
      fetchStatus();
    },
    onError: () => toast.error('Gagal menyimpan pengaturan')
  });

  const qrMutation = useMutation({
    mutationFn: () => apiFetch<any>('/settings/wa/qr'),
    onSuccess: (data) => {
      if (data.base64) {
        setQrCode(data.base64);
        toast.info('QR Code berhasil dimuat. Silakan scan melalui WhatsApp.');
      } else {
        toast.error('Gagal mendapatkan QR Code. Pastikan instance sudah dibuat.');
      }
    },
    onError: () => toast.error('Gagal mengambil QR Code')
  });

  const testMutation = useMutation({
    mutationFn: () => apiFetch<any>('/settings/wa/test', {
      method: 'POST',
      body: JSON.stringify({ number: testNumber, message: testMessage }),
    }),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Pesan uji coba berhasil dikirim!');
      } else {
        toast.error('Gagal mengirim pesan: ' + (data.error || 'Terjadi kesalahan'));
      }
    },
    onError: () => toast.error('Gagal mengirim pesan uji coba')
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch<any>('/settings/wa/logout', { method: 'POST' }),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('WhatsApp berhasil diputus.');
        fetchStatus(); // Refresh status to show QR again
      } else {
        toast.error('Gagal memutus WhatsApp: ' + (data.error || 'Terjadi kesalahan'));
      }
    },
    onError: () => toast.error('Gagal memutus WhatsApp')
  });

  const handleSave = () => {
    const payload = Object.entries(settings).map(([key, value]) => ({ key, value }));
    mutation.mutate(payload);
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-h2 font-h2 text-primary">WhatsApp Gateway</h1>
        <p className="text-on-surface-variant text-body-md">Konfigurasi koneksi Evolution API untuk notifikasi otomatis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Kolom Kiri: Form Konfigurasi */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-6">
          <h3 className="text-label-md font-bold text-on-surface uppercase tracking-wider">Konfigurasi API</h3>
          <Input 
            label="Base URL Evolution API" 
            placeholder="https://api.whatsapp.anda.com"
            value={settings.wa_base_url}
            onChange={(e) => setSettings({ ...settings, wa_base_url: e.target.value })}
          />
          <Input 
            label="Global API Key" 
            type="password"
            placeholder="Masukkan API Key"
            value={settings.wa_api_key}
            onChange={(e) => setSettings({ ...settings, wa_api_key: e.target.value })}
          />
          <Input 
            label="Instance Name" 
            placeholder="rusamas_erp_instance"
            value={settings.wa_instance_name}
            onChange={(e) => setSettings({ ...settings, wa_instance_name: e.target.value })}
          />

          <Button 
            className="w-full" 
            onClick={handleSave} 
            loading={mutation.isPending}
            leftIcon="save"
          >
            Simpan Konfigurasi
          </Button>
        </div>

        {/* Kolom Kanan: Status & QR */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-6 flex flex-col">
          <div className="flex justify-between items-center">
            <h3 className="text-label-md font-bold text-on-surface uppercase tracking-wider">Status Koneksi</h3>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${
              waStatus === 'open' ? 'bg-green-100 text-green-700' : 
              waStatus === 'connecting' ? 'bg-amber-100 text-amber-700' : 
              'bg-red-100 text-red-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                waStatus === 'open' ? 'bg-green-600 animate-pulse' : 
                waStatus === 'connecting' ? 'bg-amber-600 animate-pulse' : 
                'bg-red-600'
              }`} />
              {waStatus === 'open' ? 'Connected' : waStatus === 'close' ? 'Disconnected' : waStatus === 'connecting' ? 'Connecting...' : 'Unknown'}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-outline-variant rounded-lg bg-surface-container-low min-h-[240px]">
            {qrCode ? (
              <div className="space-y-4 flex flex-col items-center">
                <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48 border-4 border-white shadow-md rounded-lg" />
                <p className="text-xs text-on-surface-variant text-center max-w-[200px]">Buka WhatsApp di HP Anda &gt; Menu &gt; Perangkat Tertaut &gt; Tautkan Perangkat.</p>
                <Button variant="outline" size="sm" onClick={() => setQrCode(null)}>Tutup QR</Button>
              </div>
            ) : waStatus === 'open' ? (
              <div className="flex flex-col items-center text-center gap-4">
                <span className="material-symbols-outlined text-6xl text-green-600">check_circle</span>
                <div>
                  <p className="font-bold text-on-surface">WhatsApp Terhubung</p>
                  <p className="text-xs text-on-surface-variant mt-1">Sistem dapat mengirimkan notifikasi otomatis.</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if(confirm('Yakin ingin memutus koneksi WhatsApp ini? Anda perlu scan ulang QR Code.')) {
                      logoutMutation.mutate();
                    }
                  }} 
                  loading={logoutMutation.isPending}
                  className="text-red-600 hover:bg-red-50 hover:border-red-200 mt-2"
                  leftIcon="phonelink_erase"
                >
                  Putus Koneksi (Logout)
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-4">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant/30">phonelink_setup</span>
                <div>
                  <p className="text-sm font-medium text-on-surface">Belum Terhubung</p>
                  <p className="text-xs text-on-surface-variant mt-1">Silakan simpan konfigurasi dan scan QR Code.</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => qrMutation.mutate()} 
                  loading={qrMutation.isPending}
                  disabled={!settings.wa_base_url}
                  leftIcon="qr_code_2"
                >
                  Generate QR Code
                </Button>
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={fetchStatus} loading={isFetchingStatus} leftIcon="refresh" className="w-full text-xs">
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Baris Bawah: Test Message */}
      {waStatus === 'open' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">send</span>
            <h3 className="text-label-md font-bold text-on-surface uppercase tracking-wider">Uji Coba Pengiriman Pesan</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Nomor WhatsApp (Tujuan)" 
              placeholder="Contoh: 081234567890"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
            />
            <Input 
              label="Isi Pesan" 
              placeholder="Masukkan pesan test..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={() => testMutation.mutate()} 
              loading={testMutation.isPending}
              disabled={!testNumber}
              leftIcon="forward_to_inbox"
            >
              Kirim Pesan Test
            </Button>
          </div>
        </div>
      )}

      <div className="bg-primary-container/10 border border-primary/20 rounded-xl p-4 flex gap-4">
        <span className="material-symbols-outlined text-primary">info</span>
        <div className="text-sm text-on-surface-variant">
          Pesan otomatis akan dikirim ke Klien saat pembayaran DP diverifikasi oleh Admin. Pastikan koneksi selalu <strong>CONNECTED</strong>.
        </div>
      </div>
    </div>
  );
}
