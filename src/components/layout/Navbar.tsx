import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  LayoutDashboard,
  MapPin,
  Menu,
  PhoneCall,
  ShieldCheck,
  UserRound,
  X, FlaskConical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { homePathForRole } from '../../lib/access';
import { phoneDisplay, phoneHref, to12h } from '../../lib/contact';
import { cn } from '../../lib/cn';
import { LinkButton } from '../common/Button';
import { BrandMark } from '../site/BrandMark';

export interface PrimaryNavItem {
  label: string;
  path: string;
}

/** The 10 primary sections, in the approved order (see navigation test). */
export const primaryNavItems: PrimaryNavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Doctor', path: '/doctors' },
  { label: 'Services', path: '/services' },
  { label: 'Journey', path: '/journey' },
  { label: 'Facilities', path: '/facilities' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Testimonials', path: '/testimonials' },
  { label: 'Contact', path: '/contact' },
  { label: 'Pathology', path: '/pathology-lab' },
];

const careLinks = [
  { label: 'Pediatric care', path: '/pediatric-care' },
  { label: 'Newborn & infant care', path: '/newborn-care' },
  { label: 'Hospital news', path: '/news' },
];

const patientLinks = [
  { label: 'My appointments', path: '/patient/appointments' },
  { label: 'Lab reports', path: '/patient/reports' },
  { label: 'Prescriptions', path: '/patient/prescriptions' },
];

/** On lg (1024–1279px) these four move into the "More" menu; on xl all 10 show. */
const OVERFLOW_FROM = 6;

function isActive(pathname: string, path: string) {
  if (path === '/') return pathname === '/';
  if (path === '/pathology-lab') return pathname === '/pathology-lab' || pathname === '/pathology';
  if (path === '/services') return pathname === '/services' || pathname === '/departments';
  return pathname.startsWith(path);
}

export const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const reduce = useReducedMotion();
  const { isAuthenticated, role, user } = useAuth();
  const { settings } = useHospital();
  const moreRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  // Move focus into the drawer on open and back to the menu button on close.
  useEffect(() => {
    if (!mobileOpen) return;
    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', onKey);
    const trigger = menuButtonRef.current;
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [mobileOpen]);

  const account =
    isAuthenticated && role === 'patient'
      ? { label: user?.fullName?.split(' ')[0] || 'My portal', to: '/patient/dashboard', icon: <UserRound className="w-3.5 h-3.5" /> }
      : isAuthenticated
        ? { label: 'Staff workspace', to: homePathForRole(role), icon: <LayoutDashboard className="w-3.5 h-3.5" /> }
        : { label: 'Patient login', to: '/patient/login', icon: <UserRound className="w-3.5 h-3.5" /> };

  const overflowActive = primaryNavItems.slice(OVERFLOW_FROM).some(i => isActive(location.pathname, i.path));

  const navLinkClass = (active: boolean) =>
    cn(
      'relative px-2 py-2 text-[14px] font-medium rounded-lg transition-colors whitespace-nowrap',
      active ? 'text-ink-900' : 'text-ink-600 hover:text-ink-900'
    );

  const Indicator = () => (
    <motion.span
      layoutId="nav-active"
      className="absolute left-2 right-2 -bottom-[15px] h-[2px] rounded-full bg-brand-500"
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
    />
  );

  return (
    <header className="sticky top-0 z-50">
      {/* Utility bar */}
      <div className="hidden lg:block bg-ink-800 text-[12.5px] text-white/70 whitespace-nowrap">
        <div className="container-page xl:max-w-[1360px] flex h-9 items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-300" aria-hidden="true" />
              OPD from <strong className="font-semibold text-white">{to12h(settings.opdStartTime)}</strong>, Mon–Sat
            </span>
            <span className="h-3 w-px bg-white/15" aria-hidden="true" />
            <span>
              Same-day online booking closes <strong className="font-semibold text-white">{to12h(settings.onlineCutoffTime)}</strong>
            </span>
            <span className="hidden xl:block h-3 w-px bg-white/15" aria-hidden="true" />
            <span className="hidden xl:inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-leaf-400" aria-hidden="true" />
              Civil Lines, Prayagraj
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a href={phoneHref(settings.phone)} className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
              <PhoneCall className="w-3.5 h-3.5 text-leaf-400" aria-hidden="true" />
              Reception <span className="font-semibold text-white">{phoneDisplay(settings.phone)}</span>
            </a>
            <Link to={account.to} className="hidden xl:inline-flex items-center gap-1.5 hover:text-white transition-colors">
              {account.icon}
              {account.label}
            </Link>
            <Link to="/staff/login" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Staff portal
            </Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div
        className={cn(
          'border-b transition-[background-color,border-color,box-shadow] duration-200',
          scrolled ? 'bg-white/92 backdrop-blur-md border-line shadow-[0_6px_20px_-12px_rgba(25,50,71,0.18)]' : 'bg-white border-transparent'
        )}
      >
        <div className="container-page xl:max-w-[1360px] flex h-16 lg:h-[72px] items-center justify-between gap-4">
          <BrandMark compact className="lg:hidden" />
          <BrandMark className="hidden lg:inline-flex" />

          {/* Desktop navigation */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-0.5">
            {primaryNavItems.map((item, i) => {
              const active = isActive(location.pathname, item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(navLinkClass(active), i >= OVERFLOW_FROM && 'hidden xl:inline-flex')}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                  {active && <Indicator />}
                </NavLink>
              );
            })}

            {/* "More" only on lg; on xl every item is already visible */}
            <div ref={moreRef} className="relative xl:hidden">
              <button
                type="button"
                onClick={() => setMoreOpen(o => !o)}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                className={cn(navLinkClass(overflowActive), 'inline-flex items-center gap-1 cursor-pointer')}
              >
                More
                <ChevronDown className={cn('w-4 h-4 transition-transform', moreOpen && 'rotate-180')} aria-hidden="true" />
                {overflowActive && <Indicator />}
              </button>
              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 top-full mt-3 w-60 rounded-2xl border border-line bg-white p-2 shadow-float"
                  >
                    {primaryNavItems.slice(OVERFLOW_FROM).map(item => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive(location.pathname, item.path) ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-ink-50'
                        )}
                      >
                        {item.label}
                        <ChevronRight className="w-4 h-4 text-ink-300" aria-hidden="true" />
                      </Link>
                    ))}
                    <div className="my-2 h-px bg-line" />
                    {careLinks.map(item => (
                      <Link key={item.path} to={item.path} className="block rounded-xl px-3 py-2 text-[13px] text-ink-500 hover:bg-ink-50 hover:text-ink-900">
                        {item.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <LinkButton to="/lab-tests" size="sm" variant="outline" className="hidden md:inline-flex h-10 px-4" leftIcon={<FlaskConical className="w-4 h-4" />}>
              Book lab tests
            </LinkButton>
            <LinkButton to="/book-appointment" size="sm" className="hidden sm:inline-flex h-10 px-4" leftIcon={<CalendarCheck className="w-4 h-4" />}>
              Book appointment
            </LinkButton>
            <a
              href={phoneHref(settings.phone)}
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
              aria-label={`Call reception ${phoneDisplay(settings.phone)}`}
            >
              <PhoneCall className="w-[18px] h-[18px]" />
            </a>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-800 hover:bg-ink-50 transition-colors cursor-pointer"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <Menu className="w-[22px] h-[22px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50" id="mobile-menu">
            <motion.div
              className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              initial={reduce ? { opacity: 0 } : { x: '100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 flex h-[100dvh] w-[88%] max-w-sm flex-col bg-white shadow-float"
            >
              <div className="flex h-16 items-center justify-between border-b border-line px-5">
                <BrandMark compact />
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink-50 cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-4">
                <nav aria-label="Primary mobile">
                  <ul>
                    {primaryNavItems.map(item => {
                      const active = isActive(location.pathname, item.path);
                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex min-h-12 items-center justify-between rounded-xl px-3 text-[15px] font-medium transition-colors',
                              active ? 'bg-brand-50 text-brand-800' : 'text-ink-800 hover:bg-ink-50'
                            )}
                          >
                            {item.label}
                            {active ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-ink-300" aria-hidden="true" />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                <p className="mt-6 mb-1 px-3 text-xs font-semibold text-ink-400">Care for children</p>
                {careLinks.map(item => (
                  <Link key={item.path} to={item.path} className="flex min-h-11 items-center rounded-xl px-3 text-sm text-ink-600 hover:bg-ink-50">
                    {item.label}
                  </Link>
                ))}

                <p className="mt-5 mb-1 px-3 text-xs font-semibold text-ink-400">Patient portal</p>
                {patientLinks.map(item => (
                  <Link key={item.path} to={item.path} className="flex min-h-11 items-center rounded-xl px-3 text-sm text-ink-600 hover:bg-ink-50">
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="border-t border-line p-4 space-y-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <LinkButton to="/book-appointment" size="lg" className="w-full" leftIcon={<CalendarCheck className="w-[18px] h-[18px]" />}>
                  Book appointment
                </LinkButton>
                <LinkButton to="/lab-tests" size="lg" variant="outline" className="w-full" leftIcon={<FlaskConical className="w-[18px] h-[18px]" />}>
                  Book lab tests
                </LinkButton>
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={phoneHref(settings.phone)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong text-sm font-semibold text-ink-800"
                  >
                    <PhoneCall className="w-4 h-4 text-brand-600" /> Call
                  </a>
                  <Link
                    to={account.to}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong text-sm font-semibold text-ink-800"
                  >
                    {account.icon} <span className="truncate">{account.label}</span>
                  </Link>
                </div>
                <p className="pt-1 text-center text-xs text-ink-500">
                  OPD from {to12h(settings.opdStartTime)} · <Link to="/staff/login" className="underline underline-offset-2">Staff portal</Link>
                </p>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
