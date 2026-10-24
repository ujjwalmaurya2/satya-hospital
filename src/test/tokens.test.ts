import { describe, it, expect } from 'vitest';
import { 
  generatePatientId, 
  generateAppointmentCode, 
  generateAccessionNumber, 
  isValidIndianPhone,
  checkOnlineBookingCutoff,
  getHospitalTodayDate,
  getNextEligibleOpdDate,
  getHospitalDateWithOffset,
  isOperatingDay
} from '../lib/tokens';

describe('Satya Hospital - Identifier & Scheduling Rules', () => {
  it('generates immutable collision-safe Hospital Patient IDs (SH-YYYY-XXXXX)', () => {
    const currentYear = new Date().getFullYear();
    const pid1 = generatePatientId(1);
    const pid42 = generatePatientId(42);
    const pid999 = generatePatientId(999);

    expect(pid1).toBe(`SH-${currentYear}-00001`);
    expect(pid42).toBe(`SH-${currentYear}-00042`);
    expect(pid999).toBe(`SH-${currentYear}-00999`);
  });

  it('generates standardized Appointment and Lab Accession codes', () => {
    const currentYear = new Date().getFullYear();
    const apt = generateAppointmentCode(105);
    const acc = generateAccessionNumber(312);

    expect(apt).toBe(`APT-${currentYear}-0105`);
    expect(acc).toBe(`ACC-${currentYear}-0312`);
  });

  it('validates 10-digit Indian mobile numbers accurately', () => {
    expect(isValidIndianPhone('9839123456')).toBe(true);
    expect(isValidIndianPhone('6200112233')).toBe(true);
    expect(isValidIndianPhone('7890123456')).toBe(true);
    expect(isValidIndianPhone('8912345678')).toBe(true);

    // Invalid numbers
    expect(isValidIndianPhone('1234567890')).toBe(false); // Starts with 1
    expect(isValidIndianPhone('5555555555')).toBe(false); // Starts with 5
    expect(isValidIndianPhone('9839123')).toBe(false); // Too short
    expect(isValidIndianPhone('983912345678')).toBe(false); // Too long
    expect(isValidIndianPhone('abcdefghij')).toBe(false); // Letters
  });

  it('rejects appointments scheduled for past dates', () => {
    const res = checkOnlineBookingCutoff('2020-01-01', '09:00');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('past dates');
  });

  it('allows advance booking several days ahead and rejects dates beyond the window', () => {
    const baseDate = '2026-10-20'; // Tuesday
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Five days ahead is open (no longer limited to the day before)
    const resAhead = checkOnlineBookingCutoff('2026-10-24', { baseDate, currentTime: { hours: 10, minutes: 0 }, operatingDays: days });
    expect(resAhead.allowed).toBe(true);

    // Beyond the configured advance window is rejected
    const resFar = checkOnlineBookingCutoff('2026-11-30', { baseDate, currentTime: { hours: 10, minutes: 0 }, operatingDays: days, maxAdvanceDays: 30 });
    expect(resFar.allowed).toBe(false);
    expect(resFar.reason).toContain('up to 30 days ahead');
  });

  it('enforces 09:00 AM cutoff for same-day online booking and suggests next eligible date', () => {
    const baseDate = '2026-10-22'; // Thursday

    // Before 09:00 AM (e.g. 08:30 AM): Allowed
    const resBefore = checkOnlineBookingCutoff(baseDate, {
      baseDate,
      currentTime: { hours: 8, minutes: 30 },
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    });
    expect(resBefore.allowed).toBe(true);

    // After 09:00 AM (e.g. 09:05 AM): Cutoff enforced, suggests tomorrow (2026-10-23)
    const resAfter = checkOnlineBookingCutoff(baseDate, {
      baseDate,
      currentTime: { hours: 9, minutes: 5 },
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    });
    expect(resAfter.allowed).toBe(false);
    expect(resAfter.reason).toContain('closed at 09:00 AM');
    expect(resAfter.nextEligibleDate).toBe('2026-10-23');
  });

  it('calculates getNextEligibleOpdDate correctly skipping closed days or post-cutoff time', () => {
    const baseDate = '2026-10-24'; // Saturday
    // After 09:00 AM on Saturday:
    // Sunday (2026-10-25) is closed by default. Next eligible must be Monday (2026-10-26)!
    const nextDate = getNextEligibleOpdDate({
      baseDate,
      currentTime: { hours: 11, minutes: 0 },
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      holidays: [],
    });
    expect(nextDate).toBe('2026-10-26');
  });

  it('correctly provides current hospital date in Asia/Kolkata timezone', () => {
    const todayStr = getHospitalTodayDate();
    expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
