import { UserRole } from '../types';

export type AccessDecision = 'loading' | 'login' | 'forbidden' | 'allow';

/** Roles allowed into each guarded staff route. Admin can open every desk. */
export const ROUTE_ROLES = {
  staffDesk: ['reception', 'admin'],
  reception: ['reception', 'admin'],
  admin: ['admin'],
  doctor: ['doctor', 'admin'],
  pathology: ['pathology', 'admin'],
} as const satisfies Record<string, readonly UserRole[]>;

export function resolveAccess(
  auth: { isLoading: boolean; isAuthenticated: boolean; role: UserRole },
  allowedRoles: readonly UserRole[]
): AccessDecision {
  if (auth.isLoading) return 'loading';
  if (!auth.isAuthenticated) return 'login';
  return allowedRoles.includes(auth.role) ? 'allow' : 'forbidden';
}

/** Where a staff member lands after signing in. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case 'reception':
      return '/staff';
    case 'admin':
      return '/admin';
    case 'doctor':
      return '/doctor';
    case 'pathology':
      return '/pathology-dashboard';
    default:
      return '/patient/dashboard';
  }
}
