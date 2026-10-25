import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Activity, ExternalLink, FolderOpen, ListOrdered, LogOut, Menu, Microscope, Stethoscope, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { homePathForRole, ROLE_LABEL } from '../../lib/access';
import { cn } from '../../lib/cn';
import { Avatar } from '../dashboard/Dashboard';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const icon = 'h-[18px] w-[18px]';

const NAV: Record<Exclude<UserRole, 'patient'>, NavItem[]> = {
  reception: [
    { label: 'Queue desk', path: '/staff', icon: <ListOrdered className={icon} /> },
    { label: 'Records & uploads', path: '/reception', icon: <FolderOpen className={icon} /> },
  ],
  doctor: [{ label: 'Consultations', path: '/doctor', icon: <Stethoscope className={icon} /> }],
  pathology: [{ label: 'Lab worklist', path: '/pathology-dashboard', icon: <Microscope className={icon} /> }],
  admin: [
    { label: 'Overview', path: '/admin', icon: <Activity className={icon} /> },
    { label: 'Queue desk', path: '/staff', icon: <ListOrdered className={icon} /> },
    { label: 'Records & uploads', path: '/reception', icon: <FolderOpen className={icon} /> },
    { label: 'Consultations', path: '/doctor', icon: <Stethoscope className={icon} /> },
    { label: 'Lab worklist', path: '/pathology-dashboard', icon: <Microscope className={icon} /> },
  ],
};

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
}

export const StaffLayout: React.FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { user, role, logout, updateRole, isLiveSession } = useAuth();
  // Demo role switching is a development aid only; real staff keep their assigned role.
  const showRoleSwitcher = import.meta.env.DEV && !isLiveSession;

  const items = role === 'patient' ? [] : NAV[role];

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleLogout = async () => {
    await logout();
    navigate('/staff/login');
  };

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <Link to={homePathForRole(role)} className="flex items-center gap-3 px-5 pt-6 pb-5" onClick={onNavigate}>
        <img src="/favicon.svg" alt="" className="h-9 w-9 rounded-[11px]" />
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight text-white">Satya Hospital</span>
          <span className="block text-xs text-white/50">Staff workspace</span>
        </span>
      </Link>

      <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">Workspace</p>
        <ul className="space-y-0.5">
          {items.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                    isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-brand-400" aria-hidden="true" />}
                    <span className={isActive ? 'text-brand-300' : ''} aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {showRoleSwitcher && (
          <div className="mt-8 px-3">
            <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">Demo role</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['reception', 'doctor', 'pathology', 'admin'] as UserRole[]).map(r => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={role === r}
                  onClick={() => {
                    updateRole(r);
                    navigate(homePathForRole(r));
                    onNavigate?.();
                  }}
                  className={cn(
                    'h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                    role === r ? 'bg-brand-500/20 text-brand-200 ring-1 ring-inset ring-brand-400/40' : 'bg-white/5 text-white/55 hover:text-white'
                  )}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link to="/" className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] text-white/50 hover:text-white" onClick={onNavigate}>
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Public website
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <Avatar name={user?.fullName || 'Staff'} size="sm" className="from-brand-400/30 to-leaf-400/30 text-white" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.fullName || 'Staff member'}</p>
            <p className="truncate text-xs text-white/50">{ROLE_LABEL[role]}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F8F9] lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-ink-900 lg:block">{sidebar()}</aside>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-ink-950/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Workspace menu"
              className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-ink-900 shadow-float"
              initial={reduce ? { opacity: 0 } : { x: '-100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-5 flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar(() => setOpen(false))}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-50 lg:hidden cursor-pointer"
              aria-label="Open menu"
              aria-expanded={open}
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm text-ink-500">{todayLabel()}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600">
            <span className={cn('h-1.5 w-1.5 rounded-full', isLiveSession ? 'bg-leaf-500' : 'bg-ink-300')} aria-hidden="true" />
            <span className="hidden sm:inline">{isLiveSession ? 'Signed in' : 'Demo session'} · </span>
            {ROLE_LABEL[role]}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};
