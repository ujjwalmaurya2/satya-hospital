import React from 'react';
import { cn } from '../../lib/cn';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className={cn('animate-pulse bg-ink-100 rounded-lg motion-reduce:animate-none', className || 'h-4 w-full')}
        aria-hidden="true"
      />
    ))}
  </>
);

/** Placeholder rows for list/table loading states. */
export const SkeletonRows: React.FC<{ rows?: number; label?: string }> = ({ rows = 4, label = 'Loading' }) => (
  <div role="status" aria-label={label} className="divide-y divide-line">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-6 py-4">
        <Skeleton className="h-9 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    ))}
  </div>
);
