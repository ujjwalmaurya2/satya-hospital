import React, { ButtonHTMLAttributes } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'danger' | 'ghost' | 'dark' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center whitespace-nowrap font-semibold rounded-full select-none cursor-pointer ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white shadow-soft hover:bg-brand-800 focus-visible:outline-brand-500',
  accent: 'bg-leaf-700 text-white shadow-soft hover:bg-leaf-800 focus-visible:outline-leaf-500',
  dark: 'bg-ink-800 text-white shadow-soft hover:bg-ink-900 focus-visible:outline-brand-500',
  outline: 'border border-line-strong bg-white text-ink-800 hover:border-brand-500 hover:text-brand-700 focus-visible:outline-brand-500',
  soft: 'bg-brand-100 text-brand-800 hover:bg-brand-200/70 focus-visible:outline-brand-500',
  danger: 'bg-danger-600 text-white shadow-soft hover:bg-danger-700 focus-visible:outline-danger-600',
  ghost: 'text-ink-700 hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-brand-500',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'text-[13px] h-9 px-3.5 gap-1.5',
  md: 'text-sm h-11 px-5 gap-2',
  lg: 'text-[15px] h-12 px-6 gap-2.5',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className = '') {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => (
  <button
    className={buttonClasses(variant, size, className)}
    disabled={disabled || isLoading}
    aria-busy={isLoading || undefined}
    {...props}
  >
    {isLoading ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        <span>{loadingText ?? children}</span>
      </>
    ) : (
      <>
        {leftIcon && <span className="shrink-0 inline-flex" aria-hidden="true">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="shrink-0 inline-flex" aria-hidden="true">{rightIcon}</span>}
      </>
    )}
  </button>
);

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/** Router link styled as a button (avoids nesting <button> inside <a>). */
export const LinkButton: React.FC<LinkButtonProps> = ({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  children,
  ...props
}) => (
  <Link className={buttonClasses(variant, size, typeof className === 'string' ? className : '')} {...props}>
    {leftIcon && <span className="shrink-0 inline-flex" aria-hidden="true">{leftIcon}</span>}
    {children}
    {rightIcon && <span className="shrink-0 inline-flex" aria-hidden="true">{rightIcon}</span>}
  </Link>
);

interface AnchorButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/** External / tel: / mailto: link styled as a button. */
export const AnchorButton: React.FC<AnchorButtonProps> = ({
  variant = 'outline',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  children,
  ...props
}) => (
  <a className={buttonClasses(variant, size, className)} {...props}>
    {leftIcon && <span className="shrink-0 inline-flex" aria-hidden="true">{leftIcon}</span>}
    {children}
    {rightIcon && <span className="shrink-0 inline-flex" aria-hidden="true">{rightIcon}</span>}
  </a>
);
