interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  loading = false
}: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="w-12 h-12 bg-surface-container-high rounded-xl animate-pulse" />
          <div className="w-16 h-6 bg-surface-container-high rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="w-24 h-4 bg-surface-container-high rounded animate-pulse" />
          <div className="w-32 h-8 bg-surface-container-high rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
            trend.isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <span className="material-symbols-outlined text-sm">
              {trend.isUp ? 'trending_up' : 'trending_down'}
            </span>
            {trend.value}
          </div>
        )}
      </div>
      
      <div>
        <p className="text-label-md text-on-surface-variant mb-1">{title}</p>
        <h3 className={`text-on-surface truncate ${
          String(value).length > 12 
            ? 'text-lg sm:text-xl lg:text-2xl font-bold tracking-tight' 
            : 'text-h2 font-h2'
        }`} title={String(value)}>
          {value}
        </h3>
      </div>
    </div>
  );
}
