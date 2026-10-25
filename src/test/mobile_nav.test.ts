import { describe, expect, it } from 'vitest';
import { activeTab } from '../components/layout/MobileTabBar';
import { homePathForRole } from '../lib/access';

describe('phone tab bar', () => {
  it('highlights the tab that owns the current route, including deep links', () => {
    expect(activeTab('/')).toBe('home');
    expect(activeTab('/lab-tests')).toBe('lab');
    expect(activeTab('/lab-tests/orders/LAB-261026-ABC123')).toBe('lab');
    expect(activeTab('/pathology-lab')).toBe('lab');
    expect(activeTab('/book-appointment')).toBe('book');
    expect(activeTab('/booking/SH-261026-ABC123')).toBe('book');
    expect(activeTab('/patient/lab-orders')).toBe('profile');
    expect(activeTab('/patient/login')).toBe('profile');
    expect(activeTab('/lab-orders')).toBe('profile');
    expect(activeTab('/staff')).toBe('profile');
  });

  it('does not claim unrelated pages', () => {
    expect(activeTab('/contact')).toBeNull();
    expect(activeTab('/doctors')).toBeNull();
    expect(activeTab('/staffing')).toBeNull();
  });

  it('sends Profile to the signed-in role’s own workspace', () => {
    expect(homePathForRole('patient')).toBe('/patient/dashboard');
    expect(homePathForRole('reception')).toBe('/staff');
    expect(homePathForRole('pathology')).toBe('/lab-orders');
    expect(homePathForRole('admin')).toBe('/admin');
  });
});
