import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Compass } from 'lucide-react';
import { LinkButton } from '../components/common/Button';

const shortcuts = [
  { label: 'Book an appointment', to: '/book-appointment' },
  { label: 'Our doctors', to: '/doctors' },
  { label: 'Pathology tests', to: '/pathology-lab' },
  { label: 'Contact & directions', to: '/contact' },
];

export const NotFound: React.FC = () => (
  <section className="container-page flex min-h-[70vh] items-center justify-center py-20">
    <div className="max-w-lg text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100" aria-hidden="true">
        <Compass className="h-7 w-7" />
      </span>
      <p className="mt-6 text-sm font-semibold text-brand-700">Error 404</p>
      <h1 className="display-2 mt-2">We couldn’t find that page</h1>
      <p className="lead mt-4">The page may have moved, or the link may be mistyped. These might help:</p>
      <ul className="mt-8 grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
        {shortcuts.map(s => (
          <li key={s.to}>
            <Link to={s.to} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink-800 hover:border-brand-200 hover:text-brand-700">
              {s.label}
              <ArrowRight className="h-4 w-4 text-ink-300" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <LinkButton to="/" variant="ghost" className="mt-8" leftIcon={<ArrowLeft className="h-4 w-4" />}>
        Back to the homepage
      </LinkButton>
    </div>
  </section>
);
