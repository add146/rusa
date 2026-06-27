import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Button, Input, Spinner } from '../../components/atoms';
import { EmptyState } from '../../components/molecules';
import type { Client } from '../../../shared/types';
import { toast } from 'sonner';
import { useState } from 'react';
import { formatDate } from '../../lib/format';

export default function VisitLogPage() {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [summary, setSummary] = useState('');

  const { data: clients } = useQuery<Client[]>({ queryKey: ['clients'], queryFn: () => apiFetch('/clients') });
  
  const { data: visits, isLoading } = useQuery<any[]>({ 
    queryKey: ['visits'], 
    queryFn: () => apiFetch('/visits') // Need to create this API
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Get GPS
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const res = await apiFetch('/visits', { 
                method: 'POST', 
                body: JSON.stringify({ 
                  ...data, 
                  latitude: pos.coords.latitude, 
                  longitude: pos.coords.longitude 
                }) 
              });
              resolve(res);
            } catch (e) { reject(e); }
          },
          () => reject(new Error('Gagal mendapatkan lokasi GPS')),
          { enableHighAccuracy: true }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      setClientId('');
      setSummary('');
      toast.success('Kunjungan dicatat');
    },
    onError: (err: any) => toast.error(err.message || 'Gagal mencatat kunjungan')
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-h2 font-h2 text-primary">Visit Log</h1>
          <p className="text-on-surface-variant text-body-md">Catat setiap kunjungan ke klien lapangan.</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-on-surface">Catat Kunjungan Baru</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase">Pilih Klien</label>
            <select 
              className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">-- Pilih Klien --</option>
              {clients?.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <Input 
            label="Catatan / Hasil Kunjungan" 
            placeholder="Contoh: Diskusi penawaran gamis..." 
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            containerClassName="!space-y-1"
          />
        </div>
        <Button 
          className="w-full" 
          disabled={!clientId || !summary} 
          loading={mutation.isPending}
          onClick={() => mutation.mutate({ client_id: clientId, summary })}
          leftIcon="location_on"
        >
          Submit Visit (Ambil Lokasi)
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-on-surface">Riwayat Kunjungan</h3>
        <div className="space-y-3">
          {visits && visits.length > 0 ? (
            visits.map((visit) => (
              <div key={visit.id} className="bg-surface-container-low border border-outline-variant/50 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-on-surface">{visit.client?.company_name}</p>
                  <p className="text-sm text-on-surface-variant">{visit.summary}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary uppercase">{formatDate(visit.created_at)}</p>
                  <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold justify-end">
                    <span className="material-symbols-outlined text-xs">verified_user</span>
                    Verified Location
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Belum ada riwayat" description="Kunjungan Anda akan muncul di sini." icon="history" />
          )}
        </div>
      </div>
    </div>
  );
}
