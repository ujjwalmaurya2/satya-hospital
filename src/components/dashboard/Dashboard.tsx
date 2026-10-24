import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { BadgeVariant } from '../common/Badge';
import { AppointmentStatus, PathologyReportStatus } from '../../types';

/* ---------------------------------------------------------------------------
   Shared building blocks for staff and patient workspaces.
   ------------------------------------------------------------------------- */

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, eyebrow, actions, className }) => (
  <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
    <div className="min-w-0">
      {eyebrow && <p className="mb-1.5 text-[13px] font-medium text-ink-500">{eyebrow}</p>}
      <h1 className="text-[1.6rem] font-bold leading-tight tracking-[-0.02em] text-ink-900 sm:text-[1.85rem]">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-ink-500">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
  </div>
);

interface PanelProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  flush?: boolean;
}

/** White surface with an optional header row. `flush` removes body padding (for lists/tables). */
export const Panel: React.FC<PanelProps> = ({ title, description, actions, flush, className, children, ...props }) => (
  <section className={cn('rounded-2xl border border-line bg-white shadow-soft', className)} {...props}>
    {(title || actions) && (
      <header className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          {title && <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">{title}</h2>}
          {description && <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    )}
    <div className={flush ? '' : 'p-5 sm:p-6'}>{children}</div>
  </section>
);

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'brand' | 'leaf' | 'warning' | 'ink' | 'danger';
}

const toneStyles = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  leaf: 'bg-leaf-50 text-leaf-700 ring-leaf-200/70',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200',
  ink: 'bg-ink-50 text-ink-600 ring-ink-100',
  danger: 'bg-danger-50 text-danger-700 ring-danger-200',
};

/** Static (non-animated) metric tile. Numbers are plain typography by design. */
export const StatCard: React.FC<StatCardProps> = ({ label, value, hint, icon, tone = 'ink' }) => (
  <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
    <div className="flex items-start justify-between gap-3">
      <p className="text-[13px] font-medium text-ink-500">{label}</p>
      {icon && (
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', toneStyles[tone])} aria-hidden="true">
          {icon}
        </span>
      )}
    </div>
    <p className="mt-2 text-[1.75rem] font-bold leading-none tracking-tight tabular-nums text-ink-900">{value}</p>
    {hint && <p className="mt-2 text-xs text-ink-500">{hint}</p>}
  </div>
);

interface TabsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: React.ReactNode; count?: number }[];
  layoutId: string;
  label: string;
  className?: string;
}

/** Underlined tab bar with an animated indicator. */
export function Tabs<T extends string>({ value, onChange, items, layoutId, label, className }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn('no-scrollbar flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map(it => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.id)}
            className={cn(
              'relative inline-flex h-11 shrink-0 items-center gap-2 px-3 text-sm font-medium transition-colors cursor-pointer',
              on ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800'
            )}
          >
            {it.label}
            {it.count !== undefined && (
              <span className={cn('rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums', on ? 'bg-brand-100 text-brand-800' : 'bg-ink-50 text-ink-500')}>
                {it.count}
              </span>
            )}
            {on && <motion.span layoutId={layoutId} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          </button>
        );
      })}
    </div>
  );
}

/** Pill segmented control. */
export function Segmented<T extends string>({ value, onChange, items, layoutId, label, className }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn('no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-ink-50 p-1', className)}>
      {items.map(it => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.id)}
            className={cn('relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors cursor-pointer', on ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800')}
          >
            {on && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-white shadow-soft" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            <span className="relative">{it.label}</span>
            {it.count !== undefined && <span className="relative text-[11px] font-semibold tabular-nums text-ink-400">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export const APPOINTMENT_BADGE: Record<AppointmentStatus, { label: string; variant: BadgeVariant }> = {
  booked: { label: 'Booked', variant: 'neutral' },
  checked_in: { label: 'Checked-in', variant: 'warning' },
  in_consultation: { label: 'In consultation', variant: 'medical-blue' },
  completed: { label: 'Completed', variant: 'success' },
  no_show: { label: 'No-show', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
};

export const REPORT_BADGE: Record<PathologyReportStatus, { label: string; variant: BadgeVariant }> = {
  unmatched: { label: 'Unmatched', variant: 'peach' },
  pending_verification: { label: 'Awaiting verification', variant: 'warning' },
  published: { label: 'Published', variant: 'success' },
  superseded: { label: 'Superseded', variant: 'neutral' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

export function initialsOf(name: string) {
  return name
    .replace(/^(Dr|Mohd)\.?\s*/i, '')
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase())
    .join('');
}

export const Avatar: React.FC<{ name: string; size?: 'sm' | 'md'; className?: string }> = ({ name, size = 'md', className }) => (
  <span
    aria-hidden="true"
    className={cn(
      'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-leaf-100 font-semibold text-brand-800',
      size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-xs',
      className
    )}
  >
    {initialsOf(name)}
  </span>
);
