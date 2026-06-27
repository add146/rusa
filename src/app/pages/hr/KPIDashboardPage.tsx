import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Spinner, Badge, Button } from '../../components/atoms';
import { formatDate } from '../../lib/format';
import { 
  Trophy, TrendingUp, Flame, Zap, 
  Calendar, Star, Info
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Line 
} from 'recharts';

export default function KPIDashboardPage() {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all_time'>('all_time');

  const { data: stats, isLoading: loadingStats } = useQuery<any>({ 
    queryKey: ['gamification', 'stats'], 
    queryFn: () => apiFetch('/gamification/my-stats') 
  });

  const { data: leaderboard, isLoading: loadingLeaderboard } = useQuery<any[]>({ 
    queryKey: ['gamification', 'leaderboard', period], 
    queryFn: () => apiFetch(`/gamification/leaderboard?period=${period}`) 
  });

  const { data: history, isLoading: loadingHistory } = useQuery<any[]>({ 
    queryKey: ['gamification', 'history'], 
    queryFn: () => apiFetch('/gamification/points-history') 
  });

  if (loadingStats || loadingLeaderboard || loadingHistory) return <Spinner />;

  // Mock trend data if real one isn't ready in backend yet
  const trendData = [
    { name: 'W1', earned: 40, spent: 0 },
    { name: 'W2', earned: 30, spent: 10 },
    { name: 'W3', earned: 60, spent: 0 },
    { name: 'W4', earned: 45, spent: 20 },
    { name: 'W5', earned: 90, spent: 5 },
    { name: 'W6', earned: 75, spent: 0 },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Level Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-h2 text-primary">KPI Performance</h1>
          <p className="text-on-surface-variant text-body-md">Pantau performa dan raih peringkat terbaik!</p>
        </div>
        <div className="flex items-center gap-4 bg-primary-container text-on-primary-container px-6 py-3 rounded-2xl border border-primary/20 shadow-sm">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-inner">
            {stats?.current_streak > 20 ? (
              <span className="material-symbols-outlined text-[28px] text-amber-300 leading-none">crown</span>
            ) : stats?.current_streak > 10 ? (
              <span className="material-symbols-outlined text-[28px] text-amber-300 leading-none">emoji_events</span>
            ) : (
              <span className="material-symbols-outlined text-[28px] text-green-300 leading-none">eco</span>
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">Level Progres</p>
            <p className="text-lg font-bold">Level {Math.floor((stats?.points_balance || 0) / 100) + 1}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-medium">Poin Bulan Ini</p>
            <p className="text-xl font-bold text-on-surface">{stats?.points_this_month?.toLocaleString() || 0}</p>
          </div>
        </div>

        <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-medium">Streak Saat Ini</p>
            <p className="text-xl font-bold text-on-surface">{stats?.current_streak || 0} Hari</p>
          </div>
        </div>

        <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-medium">Kehadiran (Bulan Ini)</p>
            <p className="text-xl font-bold text-on-surface">{stats?.attendance_this_month || 0} Hari</p>
          </div>
        </div>

        <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-on-surface-variant font-medium">Multiplier Streak</p>
              <div className="group relative">
                <Info size={12} className="text-on-surface-variant/50 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-on-surface text-surface text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  Bonus pengali poin dari konsistensi aktivitas harian (seperti absensi). Semakin panjang streak, semakin besar poin yang didapat!
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-on-surface" />
                </div>
              </div>
            </div>
            <p className="text-xl font-bold text-on-surface">x{stats?.streak_multiplier || '1.0'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leaderboard Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-outline-variant flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="text-primary" size={24} />
                <h3 className="text-lg font-bold text-on-surface">Peringkat Teratas</h3>
              </div>
              <div className="flex bg-surface-container-high rounded-xl p-1">
                {(['all_time', 'monthly', 'weekly'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setPeriod(opt)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      period === opt ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-primary/5'
                    }`}
                  >
                    {opt === 'all_time' ? 'Semua' : opt === 'monthly' ? 'Bulanan' : 'Mingguan'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low text-xs text-on-surface-variant uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Karyawan</th>
                    <th className="px-6 py-4 text-right">Total Poin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {leaderboard?.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-10 text-center text-on-surface-variant">Belum ada data peringkat</td></tr>
                  ) : leaderboard?.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4 font-bold text-on-surface-variant">
                        {idx === 0 ? (
                          <span className="material-symbols-outlined text-amber-500 font-bold text-[20px] leading-none" title="Peringkat 1">emoji_events</span>
                        ) : idx === 1 ? (
                          <span className="material-symbols-outlined text-slate-400 font-bold text-[20px] leading-none" title="Peringkat 2">emoji_events</span>
                        ) : idx === 2 ? (
                          <span className="material-symbols-outlined text-amber-700 font-bold text-[20px] leading-none" title="Peringkat 3">emoji_events</span>
                        ) : (
                          `#${idx + 1}`
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                            {entry.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface text-sm">{entry.full_name}</p>
                            <p className="text-xs text-on-surface-variant capitalize">{entry.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-primary">
                        {entry.points?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="text-primary" size={24} />
              <h3 className="text-lg font-bold text-on-surface">Tren Performa (Weekly)</h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorEarned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--color-on-surface-variant)'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--color-on-surface-variant)'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  />
                  <Area type="monotone" dataKey="earned" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorEarned)" />
                  <Line type="monotone" dataKey="spent" stroke="var(--color-error)" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Points History */}
        <div className="space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Star className="text-primary" size={24} />
                <h3 className="text-lg font-bold text-on-surface">Riwayat Poin</h3>
              </div>
              <Badge variant="info">{stats?.points_balance?.toLocaleString()} Total</Badge>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {history?.length === 0 ? (
                <div className="text-center py-10 text-on-surface-variant/50">
                  <span className="material-symbols-outlined text-4xl mb-2">history</span>
                  <p className="text-sm">Belum ada riwayat poin.</p>
                </div>
              ) : history?.map((log) => (
                <div key={log.id} className="flex justify-between items-center p-4 bg-surface-container-low rounded-2xl border border-outline-variant/50 group hover:border-primary/30 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-on-surface leading-none">{log.description}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{formatDate(log.created_at)}</p>
                  </div>
                  <div className={`font-bold ${log.amount > 0 ? 'text-primary' : 'text-error'}`}>
                    {log.amount > 0 ? `+${log.amount}` : log.amount}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Button as={Link} to="/rewards" variant="primary" className="w-full rounded-2xl py-4" leftIcon="redeem">
                Tukar Reward
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
