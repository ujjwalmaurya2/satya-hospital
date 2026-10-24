import React from 'react';
import { FileSearch } from 'lucide-react';
import { LinkButton, Button } from './Button';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
  /** Optional custom icon (defaults to a document search icon). */
  icon?: React.ReactNode;
  /** @deprecated kept for API compatibility; empty states are now static. */
  iconSize?: number;
  className?: string;
}

/** Calm, static empty state (no looping animation). */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  actionLink,
  onAction,
  icon,
  className = '',
}) => (
  <div className={cn('px-6 py-12 text-center flex flex-col items-center justify-center', className)}>
    <div className="relative mb-4">
      <div className="absolute inset-0 -m-3 rounded-full bg-brand-100/60 blur-xl" aria-hidden="true" />
      <div className="relative w-14 h-14 rounded-2xl bg-white ring-1 ring-line shadow-soft flex items-center justify-center text-brand-600">
        {icon ?? <FileSearch className="w-6 h-6" aria-hidden="true" />}
      </div>
    </div>
    <h3 className="text-base font-semibold text-ink-900 tracking-tight">{title}</h3>
    <p className="text-sm text-ink-500 leading-relaxed mt-1.5 max-w-md">{description}</p>
    {actionLabel && (
      <div className="pt-5">
        {actionLink ? (
          <LinkButton to={actionLink} size="sm">
            {actionLabel}
          </LinkButton>
        ) : (
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    )}
  </div>
);
