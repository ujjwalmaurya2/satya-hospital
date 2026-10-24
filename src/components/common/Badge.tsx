import React from 'react';
import { cn } from '../../lib/cn';

export type BadgeVariant =
  | 'medical-blue'
  | 'lime-green'
  | 'teal'
  | 'mint'
  | 'peach'
  | 'sky-blue'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

const tone = {
  blue: 'bg-brand-50 text-brand-800 ring-brand-200/80',
  leaf: 'bg-leaf-50 text-leaf-800 ring-leaf-200',
  peach: 'bg-[#FFF4ED] text-[#9A3412] ring-[#FCD5C1]',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200',
  danger: 'bg-danger-50 text-danger-700 ring-danger-200',
  neutral: 'bg-ink-50 text-ink-600 ring-ink-200',
};

const variantStyles: Record<BadgeVariant, string> = {
  'medical-blue': tone.blue,
  teal: tone.blue,
  'sky-blue': tone.blue,
  info: tone.blue,
  'lime-green': tone.leaf,
  mint: tone.leaf,
  success: tone.leaf,
  peach: tone.peach,
  warning: tone.warning,
  danger: tone.danger,
  neutral: tone.neutral,
};

const dotStyles: Record<BadgeVariant, string> = {
  'medical-blue': 'bg-brand-500',
  teal: 'bg-brand-500',
  'sky-blue': 'bg-brand-500',
  info: 'bg-brand-500',
  'lime-green': 'bg-leaf-500',
  mint: 'bg-leaf-500',
  success: 'bg-leaf-500',
  peach: 'bg-[#EA580C]',
  warning: 'bg-[#F59E0B]',
  danger: 'bg-danger-600',
  neutral: 'bg-ink-400',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'md', className = '', dot = false }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset whitespace-nowrap',
      size === 'sm' ? 'text-[11px] leading-4 px-2 py-0.5' : 'text-xs leading-4 px-2.5 py-1',
      variantStyles[variant],
      className
    )}
  >
    {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])} aria-hidden="true" />}
    {children}
  </span>
);
