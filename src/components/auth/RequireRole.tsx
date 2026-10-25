import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resolveAccess, homePathForRole, STAFF_UNAUTHORIZED } from '../../lib/access';
import { UserRole } from '../../types';
import { MedicalLoader } from '../common/MedicalLoader';

interface RequireRoleProps {
  roles: readonly UserRole[];
  /** Where unauthenticated visitors are sent (defaults to staff sign-in). */
  loginPath?: string;
  /** Optional element; otherwise renders nested routes via <Outlet />. */
  children?: React.ReactNode;
}

/**
 * Client-side route guard. This is a UX boundary only: the real enforcement
 * is Supabase RLS and the role checks inside the queue RPCs.
 */
export const RequireRole: React.FC<RequireRoleProps> = ({ roles, loginPath = '/staff/login', children }) => {
  const location = useLocation();
  const { isLoading, isAuthenticated, role } = useAuth();
  const decision = resolveAccess({ isLoading, isAuthenticated, role }, roles);

  if (decision === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <MedicalLoader label="Checking your session…" />
      </div>
    );
  }

  if (decision === 'login') {
    return <Navigate to={loginPath} replace state={{ from: location.pathname + location.search }} />;
  }

  if (decision === 'forbidden') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-line rounded-3xl p-8 shadow-card text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-ink-900">This workspace is restricted</h1>
          {/* Deliberately generic: never reveal which roles a page needs. */}
          <p className="text-sm text-ink-500">{STAFF_UNAUTHORIZED}</p>
          <div className="flex items-center justify-center gap-3 pt-2 text-sm font-semibold">
            <Link to={homePathForRole(role)} className="link">
              Go to my workspace
            </Link>
            <span className="text-ink-300">|</span>
            <Link to={loginPath} state={{ from: location.pathname }} className="link">
              Sign in as someone else
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children ?? <Outlet />}</>;
};
