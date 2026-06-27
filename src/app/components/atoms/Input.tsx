import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  containerClassName = '',
  className = '',
  id,
  ...props
}, ref) => {
  return (
    <div className={`space-y-1.5 w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="text-label-md text-on-surface">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={id}
          ref={ref}
          className={`
            w-full bg-surface border rounded-default outline-none transition-all
            px-4 py-2.5 text-body-md placeholder:text-on-surface-variant/50
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error 
              ? 'border-error ring-1 ring-error focus:ring-2' 
              : 'border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20'}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-error font-medium pl-1">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
