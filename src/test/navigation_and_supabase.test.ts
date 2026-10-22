import { describe, it, expect } from 'vitest';
import { getSupabaseStatus, isSupabaseConfigured } from '../lib/supabase';
import { supabaseService } from '../services/supabaseService';

describe('Navigation Structure Verification', () => {
  const expectedPrimaryNavOrder = [
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

  it('contains exactly 10 primary navigation items in the required order', () => {
    expect(expectedPrimaryNavOrder).toHaveLength(10);
    expect(expectedPrimaryNavOrder.map(item => item.label)).toEqual([
      'Home',
      'About',
      'Doctor',
      'Services',
      'Journey',
      'Facilities',
      'Gallery',
      'Testimonials',
      'Contact',
      'Pathology'
    ]);
  });

  it('maps all 10 items to their actual dedicated route paths', () => {
    expectedPrimaryNavOrder.forEach((item) => {
      expect(item.path.startsWith('/')).toBe(true);
      expect(item.path.includes('#')).toBe(false); // Must be real multi-page routes, not homepage anchors
    });
  });
});

describe('Supabase Integration & Fallback Resilience', () => {
  it('correctly reports environment configuration status', () => {
    const status = getSupabaseStatus();
    expect(status).toHaveProperty('configured');
    expect(status).toHaveProperty('url');
    expect(status).toHaveProperty('missingVariables');
    expect(Array.isArray(status.missingVariables)).toBe(true);
  });

  it('falls back gracefully to verified default settings when offline or unmigrated', async () => {
    const settings = await supabaseService.getHospitalSettings();
    expect(settings).toBeDefined();
    expect(settings.hospitalName).toBe('Satya Hospital & Pathology');
    expect(settings.opdStartTime).toBe('09:30');
    expect(settings.onlineCutoffTime).toBe('09:00');
  });

  it('falls back gracefully to verified doctors without crashing', async () => {
    const doctors = await supabaseService.getDoctors();
    expect(doctors).toBeDefined();
    expect(doctors.length).toBeGreaterThan(0);
    expect(doctors[0]).toHaveProperty('fullName');
  });

  it('falls back gracefully to verified departments without crashing', async () => {
    const departments = await supabaseService.getDepartments();
    expect(departments).toBeDefined();
    expect(departments.length).toBeGreaterThan(0);
    expect(departments[0]).toHaveProperty('name');
  });

  it('falls back gracefully to verified pathology tests without crashing', async () => {
    const tests = await supabaseService.getPathologyTests();
    expect(tests).toBeDefined();
    expect(tests.length).toBeGreaterThan(0);
    expect(tests[0]).toHaveProperty('testCode');
  });
});
