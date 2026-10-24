import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  bordered = true,
  hoverable = false,
  ...props
}) => (
  <div
    className={cn(
      'bg-white rounded-2xl shadow-soft',
      bordered && 'border border-line',
      hoverable && 'transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-lift',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={cn('px-5 sm:px-6 py-4 border-b border-line flex items-center justify-between gap-3', className)} {...props}>
    {children}
  </div>
);

export const CardBody: React.FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={cn('p-5 sm:p-6', className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div
    className={cn('px-5 sm:px-6 py-4 border-t border-line bg-ink-50/50 rounded-b-2xl flex items-center justify-between gap-3', className)}
    {...props}
  >
    {children}
  </div>
);
