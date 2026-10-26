import { UserRole } from '../types';

/** Display names. 'admin' is the Super Admin (hospital owner); reception/doctor/pathology are staff. */
export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Super Admin',
  reception: 'Reception',
  doctor: 'Doctor',
  pathology: 'Pathology',
  patient: 'Patient',
};

export const STAFF_UNAUTHORIZED = 'Your account is not authorized to access this portal. Please contact the hospital administrator.';

export type AccessDecision = 'loading' | 'login' | 'forbidden' | 'allow';

/** Roles allowed into each guarded staff route. Admin can open every desk. */
export const ROUTE_ROLES = {
  staffDesk: ['reception', 'admin'],
  reception: ['reception', 'admin'],
  admin: ['admin'],
  doctor: ['doctor', 'admin'],
  pathology: ['pathology', 'admin'],
  labOrders: ['reception', 'pathology', 'admin'],
  sales: ['reception', 'pathology', 'admin'],
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
      return '/lab-orders';
    default:
      return '/patient/dashboard';
  }
}
