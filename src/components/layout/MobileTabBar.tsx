import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarPlus, FlaskConical, House, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { homePathForRole } from '../../lib/access';
import { cn } from '../../lib/cn';

const STAFF_PATHS = ['/staff', '/admin', '/reception', '/doctor', '/pathology-dashboard', '/lab-orders'];

/** Which tab the current route belongs to (exported for tests). */
export function activeTab(pathname: string): 'home' | 'lab' | 'book' | 'profile' | null {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/lab-tests') || pathname.startsWith('/pathology')) return 'lab';
  if (pathname.startsWith('/book-appointment') || pathname.startsWith('/booking/')) return 'book';
  if (pathname.startsWith('/patient') || STAFF_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) return 'profile';
  return null;
}

/**
 * Phone-only primary navigation. "Profile" opens the signed-in user's own
 * workspace (role from the loaded profile) or the Google sign-in screen;
 * access itself is still decided by RequireRole and the database.
 */
export const MobileTabBar: React.FC = () => {
  const { pathname } = useLocation();
  const { isAuthenticated, role } = useAuth();
  const reduce = useReducedMotion();
  const current = activeTab(pathname);

  const tabs = [
    { id: 'home', label: 'Home', to: '/', icon: House },
    { id: 'lab', label: 'Pathology', to: '/lab-tests', icon: FlaskConical },
    { id: 'book', label: 'Book', to: '/book-appointment', icon: CalendarPlus },
    { id: 'profile', label: 'Profile', to: isAuthenticated ? homePathForRole(role) : '/patient/login', icon: UserRound },
  ] as const;

  return (
    <nav
      aria-label="App navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden print:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4 px-2">
        {tabs.map(t => {
          const on = current === t.id;
          const Icon = t.icon;
          return (
            <li key={t.id} className="flex">
              <Link
                to={t.to}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[11.5px] font-semibold transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand-500 active:scale-95 motion-reduce:active:scale-100',
                  on ? 'text-brand-800' : 'text-ink-500'
                )}
              >
                <span className="relative flex h-8 w-14 items-center justify-center">
                  {on && (
                    <motion.span
                      layoutId={reduce ? undefined : 'tabbar-pill'}
                      className="absolute inset-0 rounded-full bg-brand-100"
                      transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                      aria-hidden="true"
                    />
                  )}
                  <Icon className="relative h-6 w-6" strokeWidth={on ? 2.2 : 1.9} aria-hidden="true" />
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
