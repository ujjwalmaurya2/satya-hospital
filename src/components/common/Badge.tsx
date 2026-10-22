import React from 'react';
import clsx from 'clsx';

export type BadgeVariant = 
  | 'medical-blue'
  | 'lime-green'
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

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    'medical-blue': 'bg-[#EBF6FC] text-[#1E78A4] border border-[#BCE1F5]',
    'lime-green': 'bg-[#F3F8EC] text-[#4A6B1A] border border-[#D5E8B5] font-semibold',
    'success': 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    'warning': 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
    'danger': 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]',
    'info': 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]',
    'neutral': 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]',
  };

  const dotStyles: Record<BadgeVariant, string> = {
    'medical-blue': 'bg-[#3DA9DF]',
    'lime-green': 'bg-[#91BB40]',
    'success': 'bg-[#22C55E]',
    'warning': 'bg-[#F59E0B]',
    'danger': 'bg-[#EF4444]',
    'info': 'bg-[#0EA5E9]',
    'neutral': 'bg-[#94A3B8]',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded-full font-medium',
    md: 'text-xs px-2.5 py-1 rounded-full font-medium',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 transition-colors',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
