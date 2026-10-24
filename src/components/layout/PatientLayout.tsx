import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarCheck, CalendarDays, FileText, Home, LogOut, Microscope, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LinkButton } from '../common/Button';
import { BrandMark } from '../site/BrandMark';
import { Avatar } from '../dashboard/Dashboard';
import { cn } from '../../lib/cn';

const tabs = [
  { label: 'Overview', path: '/patient/dashboard', icon: <Home className="h-4 w-4" /> },
  { label: 'Appointments', path: '/patient/appointments', icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Lab reports', path: '/patient/reports', icon: <Microscope className="h-4 w-4" /> },
  { label: 'Prescriptions', path: '/patient/prescriptions', icon: <FileText className="h-4 w-4" /> },
  { label: 'Profile', path: '/patient/profile', icon: <UserRound className="h-4 w-4" /> },
  { label: 'Privacy', path: '/patient/consent-and-privacy', icon: <ShieldCheck className="h-4 w-4" /> },
];

export const PatientLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, patientProfile, logout } = useAuth();
  const name = patientProfile?.fullName || user?.fullName || 'Patient';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F8F9]">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <BrandMark compact subtitle="Patient portal" />
          <div className="flex items-center gap-2">
            <LinkButton to="/book-appointment" size="sm" className="hidden sm:inline-flex" leftIcon={<CalendarCheck className="h-4 w-4" />}>
              Book appointment
            </LinkButton>
            <div className="hidden items-center gap-2.5 border-l border-line pl-3 md:flex">
              <Avatar name={name} size="sm" />
              <div className="leading-tight">
                <p className="max-w-[10rem] truncate text-sm font-semibold text-ink-900">{name}</p>
                {patientProfile?.patientId && <p className="font-mono text-[11px] text-ink-500">{patientProfile.patientId}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-ink-50 hover:text-ink-900 cursor-pointer"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
        <nav aria-label="Patient portal" className="mx-auto max-w-6xl px-2 sm:px-4">
          <ul className="no-scrollbar flex gap-1 overflow-x-auto">
            {tabs.map(t => (
              <li key={t.path} className="shrink-0">
                <NavLink
                  to={t.path}
                  className={({ isActive }) =>
                    cn('relative inline-flex h-11 items-center gap-2 px-3 text-sm font-medium transition-colors', isActive ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={isActive ? 'text-brand-600' : ''} aria-hidden="true">
                        {t.icon}
                      </span>
                      {t.label}
                      {isActive && <motion.span layoutId="patient-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-[13px] text-ink-500 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Satya Hospital &amp; Pathology, Prayagraj</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-leaf-600" aria-hidden="true" /> Records handled in line with the DPDP Act ·{' '}
            <Link to="/privacy-policy" className="link">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
};
