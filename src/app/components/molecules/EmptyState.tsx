import type { ReactNode } from 'react';
import { Button } from '../atoms/Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon = 'database_off',
  actionLabel,
  onAction,
  children
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl">
      <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center text-on-surface-variant/30 mb-6">
        <span className="material-symbols-outlined text-5xl">{icon}</span>
      </div>
      <h3 className="text-h3 font-h3 text-on-surface mb-2">{title}</h3>
      {description && (
        <p className="text-body-md text-on-surface-variant max-w-sm mb-8">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" leftIcon="add">
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}
