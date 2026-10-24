import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resolveAccess, homePathForRole } from '../../lib/access';
import { UserRole } from '../../types';
import { MedicalLoader } from '../common/MedicalLoader';

interface RequireRoleProps {
  roles: readonly UserRole[];
  /** Optional element; otherwise renders nested routes via <Outlet />. */
  children?: React.ReactNode;
}

/**
 * Client-side route guard. This is a UX boundary only: the real enforcement
 * is Supabase RLS and the role checks inside the queue RPCs.
 */
export const RequireRole: React.FC<RequireRoleProps> = ({ roles, children }) => {
  const location = useLocation();
  const { isLoading, isAuthenticated, role, user } = useAuth();
  const decision = resolveAccess({ isLoading, isAuthenticated, role }, roles);

  if (decision === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <MedicalLoader label="Verifying staff session..." />
      </div>
    );
  }

  if (decision === 'login') {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (decision === 'forbidden') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-[#E5ECEF] rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-bold text-[#193247]">This workspace is restricted</h1>
          <p className="text-sm text-[#647785]">
            {user?.fullName || 'Your account'} is signed in as <strong>{role}</strong>. This page needs one of:{' '}
            <strong>{roles.join(', ')}</strong>.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2 text-sm font-semibold">
            <Link to={homePathForRole(role)} className="text-[#3DA9DF] hover:underline">
              Go to my workspace
            </Link>
            <span className="text-[#CBD7DD]">|</span>
            <Link to="/staff/login" state={{ from: location.pathname }} className="text-[#3DA9DF] hover:underline">
              Sign in as someone else
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children ?? <Outlet />}</>;
};
