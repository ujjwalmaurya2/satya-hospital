import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

/* ---------------------------------------------------------------------------
   Section scaffolding for public pages. Keeps vertical rhythm, content widths
   and heading hierarchy consistent across the site.
   ------------------------------------------------------------------------- */

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  tone?: 'plain' | 'tint' | 'mint' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  container?: boolean;
}

const tones = {
  plain: '',
  tint: 'bg-brand-50/60 border-y border-brand-100',
  mint: 'bg-leaf-50 border-y border-leaf-100',
  navy: 'bg-ink-800 text-white',
};
const pads = { sm: 'py-12 sm:py-14', md: 'py-16 sm:py-20', lg: 'py-20 sm:py-28' };

export const Section: React.FC<SectionProps> = ({ tone = 'plain', size = 'md', container = true, className, children, ...props }) => (
  <section className={cn(tones[tone], pads[size], className)} {...props}>
    {container ? <div className="container-page">{children}</div> : children}
  </section>
);

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
  action?: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2';
  invert?: boolean;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  className,
  as: Tag = 'h2',
  invert = false,
}) => (
  <div
    className={cn(
      'flex flex-col gap-6',
      align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between',
      className
    )}
  >
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
      {eyebrow && <p className={cn('eyebrow mb-3', invert && 'text-brand-300')}>{eyebrow}</p>}
      <Tag className={cn('display-2', invert && 'text-white')}>{title}</Tag>
      {description && <p className={cn('lead mt-4', invert && 'text-white/70')}>{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export interface Crumb {
  label: string;
  to?: string;
}

export const Breadcrumbs: React.FC<{ items: Crumb[]; className?: string }> = ({ items, className }) => (
  <nav aria-label="Breadcrumb" className={className}>
    <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-500">
      <li>
        <Link to="/" className="hover:text-brand-700 transition-colors">
          Home
        </Link>
      </li>
      {items.map((c, i) => (
        <li key={c.label} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-ink-300" aria-hidden="true" />
          {c.to && i < items.length - 1 ? (
            <Link to={c.to} className="hover:text-brand-700 transition-colors">
              {c.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-medium text-ink-700">
              {c.label}
            </span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

interface PageHeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  crumbs: Crumb[];
  actions?: React.ReactNode;
  /** Optional image shown on the right (desktop) / below (mobile). */
  image?: { src: string; alt: string; position?: string };
  /** Optional aside content instead of an image (e.g. an info card). */
  aside?: React.ReactNode;
  children?: React.ReactNode;
}

/** Consistent header for inner pages. */
export const PageHero: React.FC<PageHeroProps> = ({ eyebrow, title, description, crumbs, actions, image, aside, children }) => {
  const hasVisual = Boolean(image || aside);
  return (
    <header className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand-50/70 via-canvas to-canvas">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] h-[420px] w-[620px] rounded-full bg-brand-200/25 blur-3xl"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-[-8%] h-72 w-96 rounded-full bg-leaf-100/70 blur-3xl" />
      <div className="container-page relative pt-8 pb-14 sm:pt-10 sm:pb-20">
        <Breadcrumbs items={crumbs} className="animate-fade" />
        <div className={cn('mt-8 grid gap-10 items-center', hasVisual && 'lg:grid-cols-12 lg:gap-14')}>
          <div className={cn(hasVisual ? 'lg:col-span-7' : 'max-w-3xl')}>
            {eyebrow && <p className="eyebrow mb-4 animate-rise">{eyebrow}</p>}
            <h1 className="display-1 animate-rise [animation-delay:60ms]">{title}</h1>
            {description && <p className="lead mt-5 max-w-2xl animate-rise [animation-delay:120ms]">{description}</p>}
            {actions && <div className="mt-8 flex flex-wrap items-center gap-3 animate-rise [animation-delay:180ms]">{actions}</div>}
            {children}
          </div>
          {image && (
            <div className="lg:col-span-5 animate-rise [animation-delay:160ms]">
              <div className="relative overflow-hidden rounded-[28px] ring-1 ring-ink-900/5 shadow-lift aspect-[4/3] bg-ink-50">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: image.position || 'center' }}
                  loading="eager"
                />
              </div>
            </div>
          )}
          {!image && aside && <div className="lg:col-span-5 animate-rise [animation-delay:160ms]">{aside}</div>}
        </div>
      </div>
    </header>
  );
};

/** Icon tile used in feature lists. */
export const IconTile: React.FC<{ children: React.ReactNode; tone?: 'brand' | 'leaf' | 'ink'; className?: string }> = ({
  children,
  tone = 'brand',
  className,
}) => (
  <span
    className={cn(
      'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
      tone === 'brand' && 'bg-brand-50 text-brand-700 ring-brand-100',
      tone === 'leaf' && 'bg-leaf-50 text-leaf-700 ring-leaf-200/70',
      tone === 'ink' && 'bg-ink-50 text-ink-700 ring-ink-100',
      className
    )}
    aria-hidden="true"
  >
    {children}
  </span>
);
