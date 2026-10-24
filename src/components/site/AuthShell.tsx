import React from 'react';
import { BrandMark } from './BrandMark';

interface AuthShellProps {
  title: string;
  description: string;
  image: { src: string; alt: string; position?: string };
  quote?: { heading: string; text: string };
  children: React.ReactNode;
}

/** Split-screen sign-in layout: photograph on large screens, form column always. */
export const AuthShell: React.FC<AuthShellProps> = ({ title, description, image, quote, children }) => (
  <div className="container-page py-10 sm:py-14 lg:py-16">
    <div className="grid grid-cols-1 overflow-hidden rounded-[32px] border border-line bg-white shadow-card lg:grid-cols-2">
      <div className="relative hidden min-h-[640px] lg:block">
        <img src={image.src} alt={image.alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: image.position || 'center' }} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/20 to-ink-950/10" />
        <div className="absolute left-8 top-8">
          <BrandMark tone="dark" />
        </div>
        {quote && (
          <div className="absolute inset-x-8 bottom-8 text-white">
            <p className="text-2xl font-semibold leading-snug tracking-tight">{quote.heading}</p>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/70">{quote.text}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 sm:py-14 xl:px-16">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-ink-900">{title}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  </div>
);
