import { Badge } from '../atoms/Badge';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getVariant = () => {
    const s = status.toLowerCase();
    
    if (s === 'done' || s === 'shipped' || s === 'selesai' || s === 'verified') return 'success';
    if (s === 'pending' || s === 'production' || s === 'proses') return 'warning';
    if (s === 'cancelled' || s === 'rejected' || s === 'error') return 'error';
    if (s === 'locked' || s === 'masuk') return 'info';
    
    return 'neutral';
  };

  const getLabel = () => {
    // Map internal status to human-readable label if needed, 
    // but for now we'll just capitalize.
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Badge variant={getVariant()} pill>
      {getLabel()}
    </Badge>
  );
}
