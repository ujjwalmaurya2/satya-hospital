import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

interface BrandMarkProps {
  /** light = on white surfaces, dark = on navy surfaces */
  tone?: 'light' | 'dark';
  compact?: boolean;
  subtitle?: string;
  className?: string;
  to?: string;
}

/**
 * Wordmark using the project's existing favicon tile. (The hospital's official
 * "S" logo is only available in the building photograph, so it is not redrawn.)
 */
export const BrandMark: React.FC<BrandMarkProps> = ({
  tone = 'light',
  compact = false,
  subtitle = 'Hospital & Pathology · Prayagraj',
  className = '',
  to = '/',
}) => (
  <Link
    to={to}
    className={cn('group inline-flex items-center gap-3 rounded-xl shrink-0 focus-visible:outline-offset-4', className)}
    aria-label="Satya Hospital & Pathology — home"
  >
    <img
      src="/favicon.svg"
      alt=""
      width={40}
      height={40}
      className={cn('shrink-0 rounded-[12px] shadow-soft', compact ? 'w-9 h-9' : 'w-10 h-10')}
    />
    <span className="flex flex-col leading-none">
      <span
        className={cn(
          'font-bold tracking-[-0.02em] whitespace-nowrap',
          compact ? 'text-[17px]' : 'text-[19px]',
          tone === 'light' ? 'text-ink-900' : 'text-white'
        )}
      >
        Satya
        <span className={tone === 'light' ? 'text-brand-600' : 'text-brand-300'}> Hospital</span>
      </span>
      {!compact && (
        <span className={cn('mt-1 text-[11.5px] font-medium whitespace-nowrap', tone === 'light' ? 'text-ink-500' : 'text-white/60')}>
          {subtitle}
        </span>
      )}
    </span>
  </Link>
);
