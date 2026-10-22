import React, { HTMLAttributes } from 'react';
import clsx from 'clsx';

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
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl',
        bordered && 'border border-[#E1E8ED]',
        'shadow-[0_2px_4px_rgba(36,52,71,0.04)]',
        hoverable && 'hover:shadow-[0_8px_16px_rgba(36,52,71,0.08)] hover:border-[#CBD5E1] transition-all duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={clsx('px-6 py-4 border-b border-[#E1E8ED] flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

export const CardBody: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={clsx('p-6', className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={clsx('px-6 py-4 border-t border-[#E1E8ED] bg-[#F8FAFC] rounded-b-xl flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);
