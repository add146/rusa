import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Button, Spinner, Input } from '../../components/atoms';
import { EmptyState } from '../../components/molecules';
import { toast } from 'sonner';
import { useState } from 'react';

interface PointRule {
  id: string;
  rule_key: string;
  label: string;
  description: string;
  point_value: number;
  target_value: number | null;
  applicable_roles: string; // JSON string
  is_active: number;
}

export default function PointRulesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ point_value: number; target_value: number | null }>({
    point_value: 0,
    target_value: null,
  });

  const { data: rules, isLoading } = useQuery<PointRule[]>({
    queryKey: ['point-rules'],
    queryFn: () => apiFetch('/point-rules'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; point_value: number; target_value: number | null }) => {
      return apiFetch(`/point-rules/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          point_value: data.point_value,
          target_value: data.target_value,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['point-rules'] });
      setEditingId(null);
      toast.success('Aturan poin berhasil diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui aturan'),
  });

  if (isLoading) return <Spinner />;

  const handleEdit = (rule: PointRule) => {
    setEditingId(rule.id);
    setFormData({
      point_value: rule.point_value,
      target_value: rule.target_value,
    });
  };

  const handleSave = (id: string) => {
    updateMutation.mutate({ id, ...formData });
  };

  const categories = [
    { title: 'Kehadiran & Disiplin', keys: ['ontime_checkin', 'full_8h_work'] },
    { title: 'Bonus Harian Per Role', keys: ['role_bonus_sales', 'role_bonus_produksi', 'role_bonus_admin', 'role_bonus_staff'] },
    { title: 'Target Penjualan (KPI)', keys: ['sales_closing_target', 'sales_target_count'] },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2 font-h2 text-primary">Aturan Poin (Gamifikasi)</h1>
        <p className="text-on-surface-variant text-body-md">Konfigurasi poin yang didapatkan karyawan berdasarkan performa dan disiplin.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-4">
            <h2 className="text-label-md font-bold text-primary uppercase tracking-widest px-1">{cat.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules?.filter(r => cat.keys.includes(r.rule_key)).map(rule => (
                <div key={rule.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-on-surface">{rule.label}</h3>
                      <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase">
                        {rule.point_value} Poin
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant mb-6">{rule.description}</p>
                  </div>

                  {editingId === rule.id ? (
                    <div className="space-y-4 border-t border-outline-variant pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          label="Nilai Poin" 
                          type="number" 
                          value={formData.point_value} 
                          onChange={(e) => setFormData({ ...formData, point_value: parseInt(e.target.value) || 0 })}
                        />
                        {rule.target_value !== null && (
                          <Input 
                            label="Target (Qty)" 
                            type="number" 
                            value={formData.target_value || 0} 
                            onChange={(e) => setFormData({ ...formData, target_value: parseInt(e.target.value) || 0 })}
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(rule.id)} loading={updateMutation.isPending && editingId === rule.id} className="w-full">Simpan</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="w-full">Batal</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" leftIcon="edit" onClick={() => handleEdit(rule)} className="w-full">Edit Aturan</Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {rules?.length === 0 && (
        <EmptyState title="Belum ada aturan" description="Silakan hubungi administrator untuk inisialisasi aturan poin." icon="tune" />
      )}
    </div>
  );
}
