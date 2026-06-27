import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  as?: any;
  to?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  as: Component = 'button',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-default font-label-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
  
  const variants = {
    primary: 'bg-primary-container text-on-primary hover:bg-primary shadow-sm hover:shadow-md',
    secondary: 'bg-secondary text-on-secondary hover:bg-secondary-container shadow-sm hover:shadow-md',
    outline: 'bg-transparent border border-outline-variant text-on-surface hover:bg-surface-container-low hover:border-primary/30',
    ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
    danger: 'bg-error text-on-primary hover:bg-error/90 shadow-sm',
    success: 'bg-green-600 text-white hover:bg-green-700 shadow-sm',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-body-md',
  };

  return (
    <Component
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      )}
      {!loading && leftIcon && <span className="material-symbols-outlined text-[1.25em]">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="material-symbols-outlined text-[1.25em]">{rightIcon}</span>}
    </Component>
  );
}
