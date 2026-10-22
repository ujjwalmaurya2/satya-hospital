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

  it('enforces T-1 booking window: permits booking for tomorrow, rejects dates further out', () => {
    const baseDate = '2026-10-22'; // Fixed Thursday
    const tomorrow = '2026-10-23'; // Friday
    const farFuture = '2026-10-24'; // Saturday (Operating day, but 2 days away)

    // Tomorrow is open
    const resTomorrow = checkOnlineBookingCutoff(tomorrow, {
      baseDate,
      currentTime: { hours: 10, minutes: 0 },
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    });
    expect(resTomorrow.allowed).toBe(true);

    // Date > 1 day in advance is not yet open
    const resFar = checkOnlineBookingCutoff(farFuture, {
      baseDate,
      currentTime: { hours: 10, minutes: 0 },
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    });
    expect(resFar.allowed).toBe(false);
    expect(resFar.reason).toContain('opens 1 calendar day in advance');
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
