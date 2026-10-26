import { afterEach, describe, expect, it, vi } from 'vitest';
import { rangeFor, rangeLabel } from '../lib/dateFilters';
import { getHospitalTodayDate } from '../lib/tokens';

afterEach(() => vi.useRealTimers());

describe('reception date filters (Asia/Kolkata)', () => {
  it('uses the IST calendar day at the UTC/IST midnight boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T18:29:00Z')); // 23:59 IST on the 26th
    expect(getHospitalTodayDate()).toBe('2026-10-26');
    vi.setSystemTime(new Date('2026-10-26T18:31:00Z')); // 00:01 IST on the 27th (still the 26th in UTC)
    expect(getHospitalTodayDate()).toBe('2026-10-27');
  });

  it('maps each quick filter to an inclusive appointment-date range', () => {
    const t = '2026-10-31';
    expect(rangeFor('today', t)).toEqual({ from: t, to: t });
    expect(rangeFor('tomorrow', t)).toEqual({ from: '2026-11-01', to: '2026-11-01' }); // month rollover
    expect(rangeFor('upcoming', t)).toEqual({ from: '2026-11-01', to: null });
    expect(rangeFor('yesterday', t)).toEqual({ from: '2026-10-30', to: '2026-10-30' });
    expect(rangeFor('week', t)).toEqual({ from: '2026-10-26', to: t }); // 31 Oct 2026 is a Saturday; week starts Monday 26th
    expect(rangeFor('week', '2026-10-26')).toEqual({ from: '2026-10-26', to: '2026-10-26' });
    expect(rangeFor('week', '2026-11-01')).toEqual({ from: '2026-10-26', to: '2026-11-01' }); // Sunday
    expect(rangeFor('month', t)).toEqual({ from: '2026-10-01', to: t });
    expect(rangeFor('yesterday', '2026-11-01')).toEqual({ from: '2026-10-31', to: '2026-10-31' });
    expect(rangeFor('past', t)).toEqual({ from: null, to: '2026-10-30' });
    expect(rangeFor('all', t)).toEqual({ from: null, to: null });
    expect(rangeFor('date', t, { date: '2026-09-15' })).toEqual({ from: '2026-09-15', to: '2026-09-15' });
    expect(rangeFor('range', t, { from: '2026-10-01', to: '2026-10-07' })).toEqual({ from: '2026-10-01', to: '2026-10-07' });
    expect(rangeFor('range', t, { from: '2026-10-07', to: '2026-10-01' })).toEqual({ from: '2026-10-01', to: '2026-10-07' });
    expect(rangeFor('range', t, { from: '2026-10-07' })).toEqual({ from: '2026-10-07', to: null });
  });

  it('labels the active range', () => {
    expect(rangeLabel({ from: null, to: null })).toBe('All dates');
    expect(rangeLabel({ from: '2026-10-27', to: '2026-10-27' })).toMatch(/27 Oct,? 2026/);
    expect(rangeLabel({ from: '2026-11-01', to: null })).toMatch(/^From .* onward$/);
    expect(rangeLabel({ from: null, to: '2026-10-30' })).toMatch(/^Up to /);
  });
});
