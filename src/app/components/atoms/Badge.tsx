interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  pill?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  pill = false,
  className = ''
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 text-xs font-bold transition-colors';
  
  const variants = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    neutral: 'bg-slate-100 text-slate-700',
  };

  const rounded = pill ? 'rounded-full' : 'rounded-sm';

  return (
    <span className={`${baseStyles} ${variants[variant]} ${rounded} ${className}`}>
      {children}
    </span>
  );
}
