import { getHospitalDateWithOffset } from './tokens';

export type DateFilter = 'today' | 'tomorrow' | 'yesterday' | 'week' | 'month' | 'upcoming' | 'past' | 'all' | 'date' | 'range';

export interface DateRange {
  from: string | null;
  to: string | null;
}

/**
 * Inclusive appointment-date range (IST calendar dates, YYYY-MM-DD) for a
 * reception filter. `today` is the hospital's IST date, so midnight in
 * Prayagraj — not UTC — decides which day is "today".
 */
export function rangeFor(filter: DateFilter, today: string, custom: { date?: string; from?: string; to?: string } = {}): DateRange {
  switch (filter) {
    case 'today':
      return { from: today, to: today };
    case 'tomorrow': {
      const t = getHospitalDateWithOffset(1, today);
      return { from: t, to: t };
    }
    case 'yesterday': {
      const y = getHospitalDateWithOffset(-1, today);
      return { from: y, to: y };
    }
    case 'week': {
      // Monday-start week in IST, up to today.
      const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday
      return { from: getHospitalDateWithOffset(-((dow + 6) % 7), today), to: today };
    }
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today };
    case 'upcoming':
      return { from: getHospitalDateWithOffset(1, today), to: null };
    case 'past':
      return { from: null, to: getHospitalDateWithOffset(-1, today) };
    case 'date':
      return custom.date ? { from: custom.date, to: custom.date } : { from: today, to: today };
    case 'range': {
      const a = custom.from || null;
      const b = custom.to || null;
      // A reversed range is still the user's intent; both ends stay included.
      return a && b && a > b ? { from: b, to: a } : { from: a, to: b };
    }
    default:
      return { from: null, to: null };
  }
}

const fmt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** Human label for the active range, shown above the results. */
export function rangeLabel({ from, to }: DateRange): string {
  if (!from && !to) return 'All dates';
  if (from && to) return from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;
  return from ? `From ${fmt(from)} onward` : `Up to ${fmt(to!)}`;
}
