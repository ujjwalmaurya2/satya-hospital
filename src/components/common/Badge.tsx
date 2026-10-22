import React from 'react';
import clsx from 'clsx';

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

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    'medical-blue': 'bg-[#E6F5EF] text-[#0F6B56] border border-[#C2EADE] font-semibold',
    'lime-green': 'bg-[#E6F5EF] text-[#0F6B56] border border-[#C2EADE] font-semibold',
    'teal': 'bg-[#E6F5EF] text-[#0F6B56] border border-[#C2EADE] font-semibold',
    'mint': 'bg-[#E6F5EF] text-[#0F6B56] border border-[#BFE8D8] font-semibold',
    'peach': 'bg-[#FFF0E7] text-[#9A3412] border border-[#FCD5C1] font-semibold',
    'sky-blue': 'bg-[#DFF3FA] text-[#0E6E8C] border border-[#BCE1F5] font-semibold',
    'success': 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    'warning': 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
    'danger': 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]',
    'info': 'bg-[#DFF3FA] text-[#0E6E8C] border border-[#BCE1F5]',
    'neutral': 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]',
  };

  const dotStyles: Record<BadgeVariant, string> = {
    'medical-blue': 'bg-[#168C8C]',
    'lime-green': 'bg-[#168C8C]',
    'teal': 'bg-[#168C8C]',
    'mint': 'bg-[#168C8C]',
    'peach': 'bg-[#EA580C]',
    'sky-blue': 'bg-[#0E6E8C]',
    'success': 'bg-[#22C55E]',
    'warning': 'bg-[#F59E0B]',
    'danger': 'bg-[#EF4444]',
    'info': 'bg-[#168C8C]',
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
